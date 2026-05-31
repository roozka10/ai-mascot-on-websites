const FEATURE_REQUEST_TO = "aroozka@gmail.com";

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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

async function sendEmail({ to, replyTo, subject, text, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, missingConfig: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.FEATURE_REQUEST_FROM || "Yeti Guide <onboarding@resend.dev>",
      to: [to],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  return { ok: response.ok };
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
  const replyTo = isEmail(accountEmail) ? accountEmail : contactEmail;

  if (!isEmail(replyTo)) {
    res.status(400).json({ error: "Please include an email so we can reply." });
    return;
  }

  const subject = `Yeti feature request from ${accountEmail || replyTo}`;
  const text = [
    "New Yeti feature request",
    "",
    `Account email: ${accountEmail || "Not signed in"}`,
    `Reply email: ${replyTo}`,
    `Input mode: ${inputMode || "unknown"}`,
    `Page: ${pageUrl || "unknown"}`,
    "",
    "Request:",
    message,
  ].join("\n");
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
      <h2>New Yeti feature request</h2>
      <p><strong>Account email:</strong> ${escapeHtml(accountEmail || "Not signed in")}</p>
      <p><strong>Reply email:</strong> ${escapeHtml(replyTo)}</p>
      <p><strong>Input mode:</strong> ${escapeHtml(inputMode || "unknown")}</p>
      <p><strong>Page:</strong> ${escapeHtml(pageUrl || "unknown")}</p>
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
  `;

  const sent = await sendEmail({
    to: process.env.FEATURE_REQUEST_TO || FEATURE_REQUEST_TO,
    replyTo,
    subject,
    text,
    html,
  });

  if (sent.missingConfig) {
    res.status(500).json({ error: "Email is not configured yet. Add RESEND_API_KEY in Vercel." });
    return;
  }

  if (!sent.ok) {
    res.status(500).json({ error: "Could not send feature request right now." });
    return;
  }

  res.status(200).json({ ok: true });
}
