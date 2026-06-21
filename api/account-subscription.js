import { FREE_PLAN } from "./free-plan.js";

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getSupabaseUser(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !apiKey || !accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

async function getWebsiteUsage(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return 0;

  try {
    const response = await fetch(
      `${url}/rest/v1/yeti_configs?user_email=eq.${encodeURIComponent(email)}&select=id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "count=exact",
        },
      },
    );

    if (!response.ok) return 0;
    const range = response.headers.get("content-range") || "";
    const total = range.split("/")[1];
    return Number(total || 0);
  } catch {
    return 0;
  }
}

async function getQuestionUsage(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return 0;

  const month = new Date().toISOString().slice(0, 7);

  try {
    const response = await fetch(
      `${url}/rest/v1/yeti_usage_monthly?user_email=eq.${encodeURIComponent(
        email,
      )}&month=eq.${month}&select=questions_used&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!response.ok) return 0;
    const rows = await response.json();
    return Array.isArray(rows) ? Number(rows[0]?.questions_used || 0) : 0;
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    const user = await getSupabaseUser(accessToken);

    if (!user?.email) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }

    const [websitesUsed, questionsUsed] = await Promise.all([
      getWebsiteUsage(user.email),
      getQuestionUsage(user.email),
    ]);

    res.status(200).json({
      email: user.email,
      subscription: {
        plan: FREE_PLAN.plan,
        status: FREE_PLAN.status,
        websites_limit: FREE_PLAN.websites_limit,
        questions_limit: FREE_PLAN.questions_limit,
      },
      credits: {
        websites_used: websitesUsed,
        websites_limit: FREE_PLAN.websites_limit,
        questions_used: questionsUsed,
        questions_limit: FREE_PLAN.questions_limit,
      },
    });
  } catch {
    res.status(500).json({ error: "Could not load account usage" });
  }
}
