const crypto = require("node:crypto");

const REWARDS = [
  {
    threshold: 7000,
    websites_granted: 0,
    questions_granted: 25,
    reward_label: "Tiny Snowflake",
  },
  {
    threshold: 9000,
    websites_granted: 0,
    questions_granted: 75,
    reward_label: "Small Yeti Boost",
  },
  {
    threshold: 9700,
    websites_granted: 1,
    questions_granted: 100,
    reward_label: "Starter Taste",
  },
  {
    threshold: 9900,
    websites_granted: 1,
    questions_granted: 200,
    reward_label: "Lucky Trail",
  },
  {
    threshold: 9980,
    websites_granted: 2,
    questions_granted: 300,
    reward_label: "Rare Mountain Hit",
  },
  {
    threshold: 10000,
    websites_granted: 3,
    questions_granted: 500,
    reward_label: "Mythical Yeti Hit",
  },
];

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

async function getExistingSpin(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return null;

  const response = await fetch(
    `${url}/rest/v1/yeti_free_credit_spins?user_email=eq.${encodeURIComponent(email)}&select=month,websites_granted,questions_granted,reward_label,created_at&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

function pickReward() {
  const roll = crypto.randomInt(1, 10001);
  return REWARDS.find((reward) => roll <= reward.threshold) || REWARDS[0];
}

async function saveSpin(email, reward) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) throw new Error("Supabase is not configured");

  const response = await fetch(`${url}/rest/v1/yeti_free_credit_spins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_email: email,
      month: new Date().toISOString().slice(0, 7),
      websites_granted: reward.websites_granted,
      questions_granted: reward.questions_granted,
      reward_label: reward.reward_label,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const existing = await getExistingSpin(email);
    if (existing) return existing;
    throw new Error("Could not save spin");
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
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

    const existing = await getExistingSpin(user.email);
    if (req.method === "GET" || existing) {
      res.status(200).json({
        has_spun: Boolean(existing),
        reward: existing,
      });
      return;
    }

    const reward = await saveSpin(user.email, pickReward());
    res.status(200).json({
      has_spun: true,
      reward,
    });
  } catch {
    res.status(500).json({ error: "Could not spin for credits" });
  }
};
