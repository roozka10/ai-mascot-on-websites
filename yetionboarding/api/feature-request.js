function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
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

async function saveFeatureRequest(record) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error("Supabase is not configured");

  const response = await fetch(`${url}/rest/v1/yeti_feature_requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) throw new Error("Could not save feature request");
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

  const message = cleanText(req.body?.message, 2400);
  const contactEmail = cleanText(req.body?.contactEmail, 160).toLowerCase();
  const providedAccountEmail = cleanText(req.body?.accountEmail, 160).toLowerCase();
  const inputMode = cleanText(req.body?.inputMode, 30);
  const pageUrl = cleanText(req.body?.pageUrl, 300);

  if (message.length < 5) {
    res.status(400).json({ error: "Please describe the feature request." });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const user = await getSupabaseUser(accessToken);
  const accountEmail = cleanText(user?.email || providedAccountEmail, 160).toLowerCase();
  const replyEmail = accountEmail || contactEmail;

  if (!isEmail(replyEmail)) {
    res.status(400).json({ error: "Please include an email so we can reply." });
    return;
  }

  try {
    await saveFeatureRequest({
      account_email: isEmail(accountEmail) ? accountEmail : null,
      contact_email: isEmail(contactEmail) ? contactEmail : replyEmail,
      message,
      input_mode: inputMode || "unknown",
      page_url: pageUrl || null,
      updated_at: new Date().toISOString(),
    });

    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: "Could not save feature request right now." });
  }
}
