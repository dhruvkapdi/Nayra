// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type InviteEntry = { email: string; full_name?: string; workspace_name?: string; role?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerData, error: callerErr } = await supabaseAuth.auth.getUser();
    if (callerErr || !callerData?.user) throw new Error("Unauthorized");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (callerProfile?.role !== "HR Admin") {
      return new Response(JSON.stringify({ error: "Only HR Admin can invite users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const invites: InviteEntry[] = Array.isArray(body.invites) ? body.invites : [body];

    const results: { email: string; status: "sent" | "error" | "skipped"; message?: string }[] = [];

    for (const inv of invites) {
      const email = (inv.email ?? "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        results.push({ email: inv.email ?? "", status: "error", message: "Invalid email" });
        continue;
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        results.push({ email, status: "skipped", message: "User already exists" });
        continue;
      }

      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: inv.full_name ?? email.split("@")[0],
          workspace_name: inv.workspace_name ?? null,
          role: inv.role ?? "Employee",
        },
        redirectTo: Deno.env.get("INVITE_REDIRECT_URL") ?? undefined,
      });

      if (error) {
        results.push({ email, status: "error", message: error.message });
      } else {
        results.push({ email, status: "sent" });
      }
    }

    return new Response(JSON.stringify({ results }), {
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
