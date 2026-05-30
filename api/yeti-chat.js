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

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "Missing messages" });
    return;
  }

  try {
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
