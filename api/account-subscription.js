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

async function getSubscription(email) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !email) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/yeti_subscriptions?user_email=eq.${encodeURIComponent(
      email,
    )}&select=stripe_subscription_id,plan,status,websites_limit,questions_limit,updated_at&order=updated_at.desc&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Could not load subscription: ${response.status}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getWebsiteUsage(email) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !email) return 0;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/yeti_configs?user_email=eq.${encodeURIComponent(email)}&select=id`,
    {
      method: "HEAD",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "count=exact",
      },
    },
  );

  if (!response.ok) return 0;
  const range = response.headers.get("content-range") || "";
  return Number(range.split("/")[1] || 0);
}

async function getQuestionUsage(email) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !email) return 0;

  const month = new Date().toISOString().slice(0, 7);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/yeti_usage_monthly?user_email=eq.${encodeURIComponent(
      email,
    )}&month=eq.${month}&select=questions_used&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) return 0;
  const rows = await response.json();
  return Array.isArray(rows) ? Number(rows[0]?.questions_used || 0) : 0;
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

    const subscription = await getSubscription(user.email);
    const [websitesUsed, questionsUsed] = await Promise.all([
      getWebsiteUsage(user.email),
      getQuestionUsage(user.email),
    ]);

    res.status(200).json({
      email: user.email,
      subscription,
      credits: {
        websites_used: websitesUsed,
        websites_limit: subscription?.websites_limit || 0,
        questions_used: questionsUsed,
        questions_limit: subscription?.questions_limit || 0,
      },
    });
  } catch (error) {
    console.error("[Account] Subscription lookup failed", error);
    res.status(500).json({ error: "Could not load subscription" });
  }
}
