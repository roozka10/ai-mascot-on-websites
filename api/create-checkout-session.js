const PLANS = {
  starter: {
    name: "Starter",
    monthlyAmount: 900,
    yearlyAmount: 9000,
    websites: 3,
    questions: 1000,
  },
  growth: {
    name: "Growth",
    monthlyAmount: 1900,
    yearlyAmount: 19000,
    websites: 10,
    questions: 5000,
  },
  agency: {
    name: "Agency",
    monthlyAmount: 4900,
    yearlyAmount: 49000,
    websites: 50,
    questions: 25000,
  },
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function encodeStripeParams(params, prefix) {
  const pairs = [];
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        pairs.push(...encodeStripeParams(item, `${name}[${index}]`));
      });
    } else if (typeof value === "object") {
      pairs.push(...encodeStripeParams(value, name));
    } else {
      pairs.push([name, String(value)]);
    }
  }
  return pairs;
}

async function createStripeCheckoutSession(params) {
  const body = new URLSearchParams(encodeStripeParams(params)).toString();
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
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
    throw new Error(data?.error?.message || "Stripe checkout session failed");
  }
  return data;
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "Stripe is not configured" });
    return;
  }

  const { plan: planId, billing = "monthly", email } = req.body || {};
  const plan = PLANS[planId];
  const interval = billing === "yearly" ? "year" : "month";
  const unitAmount = billing === "yearly" ? plan?.yearlyAmount : plan?.monthlyAmount;

  if (!plan || !unitAmount) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const origin =
    req.headers.origin ||
    process.env.PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://ai-mascot-on-websites.vercel.app";
  const siteUrl = origin.startsWith("http") ? origin : `https://${origin}`;

  try {
    const session = await createStripeCheckoutSession({
      mode: "subscription",
      payment_method_collection: "if_required",
      allow_promotion_codes: true,
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            recurring: { interval },
            product_data: {
              name: `Yeti Guide ${plan.name}`,
              description: `${plan.websites} websites and ${plan.questions.toLocaleString()} AI questions/month`,
            },
          },
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          app: "yeti-guide",
          plan: planId,
          billing,
          websites_limit: plan.websites,
          questions_limit: plan.questions,
        },
      },
      metadata: {
        app: "yeti-guide",
        plan: planId,
        billing,
        websites_limit: plan.websites,
        questions_limit: plan.questions,
      },
      success_url: `${siteUrl}/?checkout=success&start=setup&plan=${encodeURIComponent(planId)}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Checkout failed", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Stripe checkout failed" });
  }
}
