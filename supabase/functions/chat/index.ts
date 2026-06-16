// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMBEDDING_MODEL = "models/gemini-embedding-001";

async function embed(text: string): Promise<number[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    },
  );
  if (!r.ok) throw new Error(`embed failed: ${await r.text()}`);
  const j = await r.json();
  const values =
    j.embedding?.values ??
    j.predictions?.[0]?.embeddings?.values ??
    j.predictions?.[0]?.embeddings?.[0]?.values ??
    [];
  return Array.isArray(values) ? values.map((n: any) => Number(n)) : [];
}

async function generate(prompt: string): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!r.ok) throw new Error(`generate failed: ${await r.text()}`);
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, workspace_id, user_id } = await req.json();
    if (!question || !workspace_id || !user_id) throw new Error("missing fields");
    console.log("[chat] question:", question, { workspace_id, user_id });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Detect short conversational messages (greetings, acknowledgments) — skip RAG
    const trimmed = question.trim().toLowerCase();
    const conversational = /^(hi|hello|hey|hii+|yo|ok|okay|k|thanks|thank you|thx|cool|nice|great|good|got it|alright|sure|yes|no|yep|yup|nope|bye|goodbye|good morning|good afternoon|good evening)[!.\s]*$/;
    if (conversational.test(trimmed)) {
      const replies: Record<string, string> = {
        hi: "Hey there! 👋 What would you like to know about your workspace documents?",
        hello: "Hello! How can I help you today?",
        hey: "Hey! What can I look up for you?",
        thanks: "You're welcome! Let me know if there's anything else you'd like to know.",
        "thank you": "You're welcome! Happy to help anytime.",
        thx: "Anytime! 🙂",
        ok: "Got it! Let me know if you have any questions about your workspace documents.",
        okay: "Got it! Feel free to ask me anything else.",
        cool: "Glad that helps! Anything else you'd like to know?",
        great: "Glad I could help! Let me know if you need anything else.",
        bye: "Goodbye! Feel free to come back anytime you have questions.",
        goodbye: "Take care! 👋",
      };
      const answer = replies[trimmed] ?? "Got it! Let me know if you have any questions about your workspace documents.";
      return new Response(JSON.stringify({ answer, sources: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qEmbedding = await embed(question);
    console.log("[chat] embedding len=", qEmbedding.length, "first5=", qEmbedding.slice(0, 5));

    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: `[${qEmbedding.join(",")}]`,
      match_workspace_id: workspace_id,
      match_user_id: user_id,
      match_count: 5,
    });
    if (error) {
      console.error("[chat] match_chunks error:", error);
      throw error;
    }
    console.log(`[chat] match_chunks returned ${chunks?.length ?? 0} rows`);

    const ctx = (chunks ?? [])
      .map((c: any) => `[Source: ${c.document_name}, Page ${c.page_number}]\n${c.content}`)
      .join("\n\n");

    const prompt = `You are Nayra, a friendly enterprise knowledge assistant. Answer the user's question based on the documents below.

Guidelines:
- If the documents contain relevant information, answer clearly and concisely, citing details from the documents.
- If the question is conversational, vague, or unrelated to the documents (e.g. small talk, follow-up remarks like "okay", "tell me more", "and?"), respond naturally and helpfully in a friendly tone — do not say you "cannot answer" abrupt acknowledgments.
- If the documents truly don't contain the information needed to answer a real question, say so politely and suggest what kind of document might help.
- Keep responses concise and professional, but warm.

Context:
${ctx || "(no relevant documents found)"}

Question: ${question}

Answer:`;

    const answer = (chunks?.length ?? 0) === 0
      ? "I couldn't find relevant information in your indexed documents. Try uploading more PDFs to this workspace, or rephrase your question."
      : await generate(prompt);

    const seen = new Set<string>();
    const sources: { name: string; page: number }[] = [];
    for (const c of chunks ?? []) {
      const k = `${c.document_name}::${c.page_number}`;
      if (seen.has(k)) continue;
      seen.add(k);
      sources.push({ name: c.document_name, page: c.page_number });
    }

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
