const PLAN_LIMITS = {
  starter: { websites_limit: 3, questions_limit: 1000 },
  growth: { websites_limit: 10, questions_limit: 5000 },
  agency: { websites_limit: 50, questions_limit: 25000 },
};

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

function planFromLabel(label) {
  const lower = String(label || "").toLowerCase();
  if (lower.includes("agency")) return "agency";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("starter")) return "starter";
  return null;
}

function buildSubscriptionRecord({
  stripeSubscriptionId,
  stripeCustomerId,
  email,
  plan,
  status,
}) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  return {
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    user_email: email,
    plan,
    status,
    websites_limit: limits.websites_limit,
    questions_limit: limits.questions_limit,
    updated_at: new Date().toISOString(),
  };
}

async function saveSubscription(record) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !record?.stripe_subscription_id) return;

  await fetch(`${url}/rest/v1/yeti_subscriptions?on_conflict=stripe_subscription_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(record),
  });
}

async function getSubscriptionFromSupabase(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return null;

  try {
    const response = await fetch(
      `${url}/rest/v1/yeti_subscriptions?user_email=eq.${encodeURIComponent(
        email,
      )}&select=stripe_subscription_id,plan,status,websites_limit,questions_limit&order=updated_at.desc&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("[Account] Supabase subscription query failed", response.status, text);
      return null;
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch (error) {
    console.error("[Account] Supabase subscription query error", error);
    return null;
  }
}

async function stripeRequest(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2026-04-22.dahlia",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe request failed: ${response.status}`);
  }
  return data;
}

async function getSubscriptionFromStripe(email) {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const customers = await stripeRequest(
      `/customers?email=${encodeURIComponent(email)}&limit=1`,
    );
    const customer = customers.data?.[0];
    if (!customer?.id) return null;

    const subscriptions = await stripeRequest(
      `/subscriptions?customer=${encodeURIComponent(customer.id)}&status=all&limit=3&expand[]=data.items.data.price.product`,
    );

    const subscription =
      subscriptions.data?.find((item) =>
        ["active", "trialing", "past_due"].includes(item.status),
      ) || subscriptions.data?.[0];

    if (!subscription?.id) return null;

    const metadataPlan = subscription.metadata?.plan;
    const productName =
      subscription.items?.data?.[0]?.price?.product?.name ||
      subscription.items?.data?.[0]?.plan?.nickname ||
      "";
    const plan = metadataPlan || planFromLabel(productName) || "starter";

    const record = buildSubscriptionRecord({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      email,
      plan,
      status: subscription.status,
    });

    await saveSubscription(record);
    return record;
  } catch (error) {
    console.error("[Account] Stripe subscription lookup failed", error);
    return null;
  }
}

async function getSubscription(email) {
  const fromDb = await getSubscriptionFromSupabase(email);
  if (fromDb?.stripe_subscription_id) return fromDb;
  return getSubscriptionFromStripe(email);
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
    res.status(500).json({
      error: error instanceof Error ? error.message : "Could not load subscription",
    });
  }
}
