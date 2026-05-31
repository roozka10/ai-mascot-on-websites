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

async function getSubscription(email, subscriptionId) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !email || !subscriptionId) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/yeti_subscriptions?user_email=eq.${encodeURIComponent(
      email,
    )}&stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=stripe_subscription_id&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function updateStoredSubscription(subscriptionId, status) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !subscriptionId) return;

  await fetch(
    `${supabaseUrl}/rest/v1/yeti_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        status,
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

function encodeStripeParams(params, prefix) {
  const pairs = [];
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      pairs.push(...encodeStripeParams(value, name));
    } else {
      pairs.push([name, String(value)]);
    }
  }
  return pairs;
}

async function stripeRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      "Stripe-Version": "2026-04-22.dahlia",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe request failed");
  }
  return data;
}

async function getStripeSubscription(subscriptionId) {
  return stripeRequest(`/subscriptions/${subscriptionId}`);
}

async function getStripeCustomer(customerId) {
  if (!customerId) return null;
  return stripeRequest(`/customers/${customerId}`);
}

async function saveCancelReason(subscriptionId, reason) {
  const body = new URLSearchParams(
    encodeStripeParams({
      metadata: {
        cancel_reason: reason.slice(0, 500),
      },
    }),
  ).toString();

  await stripeRequest(`/subscriptions/${subscriptionId}`, {
    method: "POST",
    body,
  });
}

async function cancelImmediately(subscriptionId) {
  return stripeRequest(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "Stripe is not configured" });
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

    const { subscriptionId, reason } = req.body || {};
    const cleanReason = String(reason || "").trim();

    if (!subscriptionId || cleanReason.length < 3) {
      res.status(400).json({ error: "Please tell us why before cancelling." });
      return;
    }

    const storedSubscription = await getSubscription(user.email, subscriptionId);
    const stripeSubscription = await getStripeSubscription(subscriptionId);
    const stripeCustomer = await getStripeCustomer(
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id,
    );
    const stripeEmail = String(stripeCustomer?.email || "").toLowerCase();

    if (!storedSubscription && stripeEmail !== user.email.toLowerCase()) {
      res.status(404).json({ error: "Subscription not found for this account." });
      return;
    }

    if (stripeSubscription.status === "canceled") {
      await updateStoredSubscription(subscriptionId, "canceled");
      res.status(200).json({
        status: "canceled",
        cancel_at_period_end: false,
      });
      return;
    }

    await saveCancelReason(subscriptionId, cleanReason);
    const canceledSubscription = await cancelImmediately(subscriptionId);
    await updateStoredSubscription(subscriptionId, canceledSubscription.status || "canceled");

    res.status(200).json({
      status: canceledSubscription.status,
      cancel_at_period_end: canceledSubscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("[Account] Cancel subscription failed", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not cancel subscription" });
  }
}
