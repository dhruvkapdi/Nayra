// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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
  if (!r.ok) {
    const errText = await r.text();
    console.error(`[embed] HTTP ${r.status}:`, errText);
    throw new Error(`embed failed ${r.status}: ${errText}`);
  }
  const j = await r.json();
  const values = j.embedding?.values ?? [];
  if (!Array.isArray(values) || values.length === 0) {
    console.error("[embed] empty embedding response:", JSON.stringify(j).slice(0, 500));
    throw new Error("embed returned empty values");
  }
  return values.map((n: any) => Number(n));
}

function chunkText(text: string, size = 800, overlap = 150): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out.filter((c) => c.trim().length > 20);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let documentId: string | null = null;

  try {
    const body = await req.json();
    const { document_id, workspace_id, user_id, storage_path } = body;
    documentId = document_id;
    console.log("[ingest] start", { document_id, storage_path });
    if (!document_id || !storage_path) throw new Error("missing fields");

    // Clear any old chunks (re-index scenario)
    await supabase.from("document_chunks").delete().eq("document_id", document_id);
    await supabase.from("documents").update({ status: "processing" }).eq("id", document_id);

    console.log("[ingest] downloading PDF…");
    const { data: file, error: dlErr } = await supabase.storage
      .from("documents")
      .download(storage_path);
    if (dlErr || !file) throw new Error(`download failed: ${dlErr?.message}`);

    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const totalPages = pdf.numPages;
    console.log(`[ingest] PDF loaded, ${totalPages} pages`);

    const pageTexts: string[] = [];
    for (let p = 1; p <= totalPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const t = tc.items.map((it: any) => it.str).join(" ");
      pageTexts.push(t);
    }
    console.log(`[ingest] extracted text for ${pageTexts.length} pages`);

    let chunkIndex = 0;
    let inserted = 0;
    for (let p = 0; p < pageTexts.length; p++) {
      const chunks = chunkText(pageTexts[p]);
      console.log(`[ingest] page ${p + 1}: ${chunks.length} chunks`);
      for (const c of chunks) {
        try {
          const embedding = await embed(c);
          console.log(`[ingest] embed chunk ${chunkIndex} len=${embedding.length}`);
          const { error: insErr } = await supabase.from("document_chunks").insert({
            document_id,
            user_id,
            workspace_id,
            content: c,
            chunk_index: chunkIndex,
            page_number: p + 1,
            embedding: `[${embedding.join(",")}]`,
          });
          if (insErr) {
            console.error(`[ingest] insert chunk ${chunkIndex} failed:`, insErr.message);
          } else {
            inserted++;
          }
          chunkIndex++;
        } catch (e) {
          console.error(`[ingest] chunk ${chunkIndex} failed:`, String(e));
          chunkIndex++;
        }
      }
    }

    console.log(`[ingest] complete: ${inserted}/${chunkIndex} chunks stored`);

    await supabase
      .from("documents")
      .update({ status: inserted > 0 ? "indexed" : "failed", pages: totalPages })
      .eq("id", document_id);

    return new Response(JSON.stringify({ ok: true, pages: totalPages, chunks: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ingest] fatal:", String(e));
    if (documentId) {
      await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
