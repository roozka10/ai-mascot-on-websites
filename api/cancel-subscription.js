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

async function cancelAtPeriodEnd(subscriptionId, reason) {
  const body = new URLSearchParams(
    encodeStripeParams({
      cancel_at_period_end: true,
      metadata: {
        cancel_reason: reason.slice(0, 500),
      },
    }),
  ).toString();

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2026-04-22.dahlia",
    },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Could not cancel subscription");
  }
  return data;
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

    const subscription = await getSubscription(user.email, subscriptionId);
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found for this account." });
      return;
    }

    const stripeSubscription = await cancelAtPeriodEnd(subscriptionId, cleanReason);
    res.status(200).json({
      status: stripeSubscription.status,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("[Account] Cancel subscription failed", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Could not cancel subscription" });
  }
}
