const PLAN_LIMITS = {
  starter: { websites_limit: 3, questions_limit: 1000 },
  growth: { websites_limit: 10, questions_limit: 5000 },
  agency: { websites_limit: 50, questions_limit: 25000 },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function isActiveSubscription(subscription) {
  return Boolean(subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
}

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
      )}&select=stripe_subscription_id,plan,status,websites_limit,questions_limit,updated_at&order=updated_at.desc&limit=20`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!response.ok) return null;

    const rows = await response.json();
    if (!Array.isArray(rows)) return null;
    return rows.find(isActiveSubscription) || rows[0] || null;
  } catch {
    return null;
  }
}

function stripePath(path, params = {}) {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function stripeRequest(path, params) {
  const response = await fetch(`https://api.stripe.com/v1${stripePath(path, params)}`, {
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

async function resolveProductName(subscription) {
  const price = subscription?.items?.data?.[0]?.price;
  if (!price) return "";

  if (typeof price.product === "object" && price.product?.name) {
    return price.product.name;
  }
  if (price.nickname) return price.nickname;

  const productId = typeof price.product === "string" ? price.product : null;
  if (!productId) return "";

  try {
    const product = await stripeRequest(`/products/${productId}`);
    return product.name || "";
  } catch {
    return "";
  }
}

async function getSubscriptionFromStripe(email) {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const customers = await stripeRequest("/customers", {
      email,
      limit: "100",
    });
    const matchingCustomers = Array.isArray(customers.data) ? customers.data : [];
    if (!matchingCustomers.length) return null;

    let matchedCustomer = null;
    let matchedSubscription = null;
    let fallbackCustomer = null;
    let fallbackSubscription = null;

    for (const customer of matchingCustomers) {
      if (!customer?.id) continue;

      const subscriptions = await stripeRequest("/subscriptions", {
        customer: customer.id,
        status: "all",
        limit: "100",
      });

      const data = Array.isArray(subscriptions.data) ? subscriptions.data : [];
      const subscription = data.find(isActiveSubscription);

      if (subscription?.id) {
        matchedCustomer = customer;
        matchedSubscription = subscription;
        break;
      }

      if (!fallbackSubscription && data[0]?.id) {
        fallbackCustomer = customer;
        fallbackSubscription = data[0];
      }
    }

    matchedCustomer = matchedCustomer || fallbackCustomer;
    matchedSubscription = matchedSubscription || fallbackSubscription;

    if (!matchedSubscription?.id || !matchedCustomer?.id) return null;

    const metadataPlan = matchedSubscription.metadata?.plan;
    const productName = await resolveProductName(matchedSubscription);
    const plan = metadataPlan || planFromLabel(productName) || "starter";

    const record = buildSubscriptionRecord({
      stripeSubscriptionId: matchedSubscription.id,
      stripeCustomerId: matchedCustomer.id,
      email,
      plan,
      status: matchedSubscription.status,
    });

    await saveSubscription(record);
    return record;
  } catch {
    return null;
  }
}

async function getSubscription(email) {
  const fromDb = await getSubscriptionFromSupabase(email);
  if (isActiveSubscription(fromDb)) return fromDb;

  const fromStripe = await getSubscriptionFromStripe(email);
  if (isActiveSubscription(fromStripe)) return fromStripe;

  return fromStripe || fromDb;
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

async function getFreeCredits(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) {
    return {
      has_spun: false,
      websites_granted: 0,
      questions_granted: 0,
      questions_available_this_month: 0,
      reward_label: null,
    };
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/yeti_free_credit_spins?user_email=eq.${encodeURIComponent(email)}&select=month,websites_granted,questions_granted,reward_label,created_at&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!response.ok) {
      return {
        has_spun: false,
        websites_granted: 0,
        questions_granted: 0,
        questions_available_this_month: 0,
        reward_label: null,
      };
    }

    const rows = await response.json();
    const spin = Array.isArray(rows) ? rows[0] : null;
    const isCurrentMonth = spin?.month === new Date().toISOString().slice(0, 7);
    return {
      has_spun: Boolean(spin),
      websites_granted: Number(spin?.websites_granted || 0),
      questions_granted: Number(spin?.questions_granted || 0),
      questions_available_this_month: isCurrentMonth ? Number(spin?.questions_granted || 0) : 0,
      reward_label: spin?.reward_label || null,
      month: spin?.month || null,
    };
  } catch {
    return {
      has_spun: false,
      websites_granted: 0,
      questions_granted: 0,
      questions_available_this_month: 0,
      reward_label: null,
    };
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
    const hasActivePlan = isActiveSubscription(subscription);
    const [websitesUsed, questionsUsed, freeCredits] = await Promise.all([
      getWebsiteUsage(user.email),
      getQuestionUsage(user.email),
      getFreeCredits(user.email),
    ]);
    const websiteLimit =
      (hasActivePlan ? Number(subscription?.websites_limit || 0) : 0) +
      freeCredits.websites_granted;
    const questionLimit =
      (hasActivePlan ? Number(subscription?.questions_limit || 0) : 0) +
      freeCredits.questions_available_this_month;

    res.status(200).json({
      email: user.email,
      subscription,
      free_credits: freeCredits,
      credits: {
        websites_used: websiteLimit > 0 ? websitesUsed : 0,
        websites_limit: websiteLimit,
        questions_used: questionLimit > 0 ? questionsUsed : 0,
        questions_limit: questionLimit,
      },
    });
  } catch {
    res.status(500).json({ error: "Could not load subscription" });
  }
}
