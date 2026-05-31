const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-3B-Instruct/v1/chat/completions";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function compactMessages(messages) {
  const [systemMessage, ...rest] = messages;
  const compactSystem =
    systemMessage?.role === "system"
      ? {
          ...systemMessage,
          content: String(systemMessage.content || "").slice(0, 2200),
        }
      : systemMessage;

  return [compactSystem, ...rest.slice(-3)].filter(Boolean);
}

function cleanReply(text) {
  return String(text || "")
    .replace(/\[(?:navigate|scroll):[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY,
  };
}

async function getYetiOwner(yetiId) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !yetiId) return null;

  const response = await fetch(
    `${url}/rest/v1/yeti_configs?yeti_id=eq.${encodeURIComponent(yetiId)}&select=user_email&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0]?.user_email || null : null;
}

async function getSubscriptionForEmail(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return null;

  const response = await fetch(
    `${url}/rest/v1/yeti_subscriptions?user_email=eq.${encodeURIComponent(
      email,
    )}&select=plan,status,questions_limit&order=updated_at.desc&limit=1`,
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

async function getQuestionUsage(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return 0;

  const month = new Date().toISOString().slice(0, 7);
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
}

async function incrementQuestionUsage(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return;

  await fetch(`${url}/rest/v1/rpc/increment_yeti_question_usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ p_user_email: email }),
  });
}

async function enforceQuestionCredits(yetiId) {
  const ownerEmail = await getYetiOwner(yetiId);
  if (!ownerEmail) return null;

  const subscription = await getSubscriptionForEmail(ownerEmail);
  const activeStatuses = new Set(["active", "trialing"]);
  if (!subscription || !activeStatuses.has(subscription.status)) {
    return "This Yeti is not on an active plan yet.";
  }

  const limit = Number(subscription.questions_limit || 0);
  const used = await getQuestionUsage(ownerEmail);
  if (limit > 0 && used >= limit) {
    return "This Yeti has used all AI question credits for this month.";
  }

  await incrementQuestionUsage(ownerEmail);
  return null;
}

async function findCachedAnswer(yetiId, question) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !yetiId || !question) return null;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/match_yeti_faq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        p_yeti_id: yetiId,
        p_question: question,
        p_threshold: 0.5,
      }),
    });
    if (!response.ok) return null;
    const matches = await response.json();
    return Array.isArray(matches) ? matches[0]?.answer || null : null;
  } catch {
    return null;
  }
}

async function saveCachedAnswer(yetiId, question, answer) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !yetiId || !question || !answer) return;

  try {
    await fetch(`${url}/rest/v1/rpc/upsert_yeti_faq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        p_yeti_id: yetiId,
        p_question: question,
        p_answer: answer,
      }),
    });
  } catch {
    // Cache is best-effort; never block chat.
  }
}

async function callProvider(url, headers, model, messages) {
  const compactedMessages = compactMessages(messages);
  const guidedMessages = [
    {
      role: "system",
      content:
        "Speed/style guardrail: reply in one short, easy sentence whenever possible. Be human, warm, fun, and useful. No long explanations. Say clean domains only, like example.com; never say https, www, slashes, or long paths. Never output bracket commands like [navigate:/] or [scroll:#id].",
    },
    ...compactedMessages,
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: guidedMessages,
      max_tokens: 45,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider failed with ${response.status}`);
  }

  const data = await response.json();
  return cleanReply(data.choices?.[0]?.message?.content);
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages, yeti_id: yetiId, question } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "Missing messages" });
    return;
  }

  try {
    const creditError = await enforceQuestionCredits(yetiId);
    if (creditError) {
      res.status(402).json({ error: creditError, reply: creditError });
      return;
    }

    const cached = await findCachedAnswer(yetiId, question);
    if (cached) {
      res.status(200).json({ reply: cleanReply(cached), cached: true });
      return;
    }

    if (process.env.OPENROUTER_API_KEY) {
      const reply = await callProvider(
        OPENROUTER_URL,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer":
            req.headers.origin || "https://ai-mascot-on-websites.vercel.app",
        },
        process.env.OPENROUTER_MODEL || "openrouter/owl-alpha",
        messages,
      );

      if (reply) {
        await saveCachedAnswer(yetiId, question, reply);
        res.status(200).json({ reply });
        return;
      }
    }

    if (process.env.HUGGINGFACE_API_KEY) {
      const reply = await callProvider(
        HUGGINGFACE_URL,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        "Qwen/Qwen2.5-3B-Instruct",
        messages,
      );

      if (reply) {
        await saveCachedAnswer(yetiId, question, reply);
        res.status(200).json({ reply });
        return;
      }
    }

    res.status(500).json({ error: "No AI provider is configured" });
  } catch (error) {
    console.error("[Yeti API] Chat failed", error);
    res.status(500).json({ error: "Yeti could not answer right now" });
  }
};
