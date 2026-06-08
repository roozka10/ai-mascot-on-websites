const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL =
  "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-3B-Instruct/v1/chat/completions";
const GEMINI_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_PROMPT_CHARS = 12000;
const ANSWER_STYLE_GUARDRAIL =
  "Answer like a friendly human guide: warm, clear, and easy to understand. Use plain words. Usually give 1 short sentence. Use 2 short sentences only when needed for accuracy. Stick to the website knowledge. Never invent prices, policies, hours, refunds, or contact details. Say clean domains only, like example.com; never say https, www, slashes, or long paths.";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function compactMessages(messages) {
  return messages
    .filter((message) => ["user", "assistant"].includes(message?.role))
    .slice(-4)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 1200),
    }))
    .filter((message) => message.content.trim());
}

function cleanReply(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, "")
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

async function getYetiPrompt(yetiId) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !yetiId) return null;

  const response = await fetch(
    `${url}/rest/v1/yeti_configs?yeti_id=eq.${encodeURIComponent(yetiId)}&select=prompt&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0]?.prompt || null : null;
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
    )}&select=plan,status,questions_limit&order=updated_at.desc&limit=20`,
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
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  return rows.find((row) => activeStatuses.has(row?.status)) || rows[0] || null;
}

async function getFreeQuestionCredits(email) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email) return 0;

  const response = await fetch(
    `${url}/rest/v1/yeti_free_credit_spins?user_email=eq.${encodeURIComponent(email)}&select=month,questions_granted&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) return 0;
  const rows = await response.json();
  const spin = Array.isArray(rows) ? rows[0] : null;
  return spin?.month === new Date().toISOString().slice(0, 7)
    ? Number(spin?.questions_granted || 0)
    : 0;
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

async function reserveQuestionCredit(email, limit) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !email || limit <= 0) return false;

  const reserveResponse = await fetch(`${url}/rest/v1/rpc/reserve_yeti_question_credit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ p_user_email: email, p_limit: limit }),
  });

  if (reserveResponse.ok) {
    const rows = await reserveResponse.json().catch(() => []);
    const result = Array.isArray(rows) ? rows[0] : rows;
    return Boolean(result?.reserved);
  }

  const rpcResponse = await fetch(`${url}/rest/v1/rpc/increment_yeti_question_usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ p_user_email: email }),
  });

  if (rpcResponse.ok) return true;

  const month = new Date().toISOString().slice(0, 7);
  const existingResponse = await fetch(
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

  if (!existingResponse.ok) return false;
  const rows = await existingResponse.json();
  const existing = Array.isArray(rows) ? rows[0] : null;

  if (existing) {
    const updateResponse = await fetch(
      `${url}/rest/v1/yeti_usage_monthly?user_email=eq.${encodeURIComponent(email)}&month=eq.${month}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          questions_used: Number(existing.questions_used || 0) + 1,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return updateResponse.ok;
  }

  const insertResponse = await fetch(`${url}/rest/v1/yeti_usage_monthly`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      user_email: email,
      month,
      questions_used: 1,
    }),
  });

  return insertResponse.ok;
}

async function enforceQuestionCredits(yetiId) {
  const ownerEmail = await getYetiOwner(yetiId);
  if (!ownerEmail) return "This Yeti is not on an active plan yet.";

  const subscription = await getSubscriptionForEmail(ownerEmail);
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const planLimit =
    subscription && activeStatuses.has(subscription.status)
      ? Number(subscription.questions_limit || 0)
      : 0;
  const freeLimit = await getFreeQuestionCredits(ownerEmail);
  const limit = planLimit + freeLimit;
  const used = await getQuestionUsage(ownerEmail);
  if (limit <= 0 || used >= limit) {
    return "This Yeti has used all AI question credits for this month.";
  }

  const reserved = await reserveQuestionCredit(ownerEmail, limit);
  if (!reserved) {
    const latestUsed = await getQuestionUsage(ownerEmail);
    return latestUsed >= limit
      ? "This Yeti has used all AI question credits for this month."
      : "This Yeti could not verify question credits right now.";
  }

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

async function callProvider(url, headers, model, systemPrompt, messages) {
  const compactedMessages = compactMessages(messages);
  const guidedMessages = [
    {
      role: "system",
      content: String(systemPrompt || "").slice(0, MAX_PROMPT_CHARS),
    },
    {
      role: "system",
      content: ANSWER_STYLE_GUARDRAIL,
    },
    ...compactedMessages,
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: guidedMessages,
      max_tokens: 90,
      temperature: 0.55,
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider failed with ${response.status}`);
  }

  const data = await response.json();
  return cleanReply(data.choices?.[0]?.message?.content);
}

async function callGemini(systemPrompt, messages) {
  const compactedMessages = compactMessages(messages);
  const contents = compactedMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `${GEMINI_URL_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                String(systemPrompt || "").slice(0, MAX_PROMPT_CHARS),
                ANSWER_STYLE_GUARDRAIL,
              ].join("\n\n"),
            },
          ],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 90,
          temperature: 0.55,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini failed with ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join(" ");
  return cleanReply(text);
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

  const { messages, yeti_id: yetiId, question } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "Missing messages" });
    return;
  }

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(String(yetiId || ""))) {
    res.status(400).json({ error: "Invalid Yeti id" });
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

    const systemPrompt = await getYetiPrompt(yetiId);
    if (!systemPrompt) {
      res.status(404).json({ error: "Yeti not found" });
      return;
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const reply = await callGemini(systemPrompt, messages);
        if (reply) {
          await saveCachedAnswer(yetiId, question, reply);
          res.status(200).json({ reply });
          return;
        }
      } catch {
        // Fall through to the existing providers.
      }
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
        systemPrompt,
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
        systemPrompt,
        messages,
      );

      if (reply) {
        await saveCachedAnswer(yetiId, question, reply);
        res.status(200).json({ reply });
        return;
      }
    }

    res.status(500).json({ error: "No AI provider is configured" });
  } catch {
    res.status(500).json({ error: "Yeti could not answer right now" });
  }
}
