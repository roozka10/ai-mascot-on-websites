import crypto from "node:crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function subscriptionRecordFromObject(object) {
  const metadata = object.metadata || {};
  const periodEnd = object.current_period_end
    ? new Date(object.current_period_end * 1000).toISOString()
    : null;

  return {
    stripe_customer_id: typeof object.customer === "string" ? object.customer : object.customer?.id,
    stripe_subscription_id: object.id || object.subscription,
    stripe_checkout_session_id: object.object === "checkout.session" ? object.id : null,
    user_email: object.customer_details?.email || object.customer_email || null,
    plan: metadata.plan || null,
    billing_interval: metadata.billing || null,
    status: object.status || "checkout_completed",
    websites_limit: metadata.websites_limit ? Number(metadata.websites_limit) : null,
    questions_limit: metadata.questions_limit ? Number(metadata.questions_limit) : null,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };
}

async function upsertSubscription(record) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !record.stripe_subscription_id) return;

  const response = await fetch(
    `${url}/rest/v1/yeti_subscriptions?on_conflict=stripe_subscription_id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(record),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase subscription upsert failed: ${response.status} ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers["stripe-signature"];

  if (!verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
    res.status(400).json({ error: "Invalid Stripe signature" });
    return;
  }

  const event = JSON.parse(rawBody);

  try {
    if (event.type === "checkout.session.completed") {
      await upsertSubscription(subscriptionRecordFromObject(event.data.object));
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertSubscription(subscriptionRecordFromObject(event.data.object));
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Stripe] Webhook failed", error);
    res.status(500).json({ error: "Webhook handling failed" });
  }
}
