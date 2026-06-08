const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-3B-Instruct/v1/chat/completions";
const GEMINI_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const DEMO_SYSTEM_PROMPT =
  "You are Yeti Guide's landing page demo. Answer ONLY questions about Yeti Guide itself: what it does, why voice is better, setup, website scanning, embed script, and the mission to replace annoying chatbots. If asked anything unrelated, politely say you can only explain Yeti Guide. Keep it one short, friendly, fun sentence.";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function cleanReply(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function callProvider(url, headers, model, question) {
  const messages = [
    {
      role: "system",
      content: DEMO_SYSTEM_PROMPT,
    },
    { role: "user", content: question },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 50,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider failed with ${response.status}`);
  }

  const data = await response.json();
  return cleanReply(data.choices?.[0]?.message?.content);
}

async function callGemini(question) {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `${GEMINI_URL_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: DEMO_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.6,
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

  const question = String(req.body?.question || "").trim().slice(0, 220);
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      try {
        const reply = await callGemini(question);
        if (reply) {
          res.status(200).json({ reply });
          return;
        }
      } catch {
        // Fall through to existing providers.
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
        question,
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
        question,
      );

      if (reply) {
        res.status(200).json({ reply });
        return;
      }
    }

    res.status(200).json({
      reply:
        "Yeti Guide scans your website and gives visitors short spoken answers, without the usual chatbot headache.",
    });
  } catch {
    res.status(200).json({
      reply:
        "Yeti Guide scans your website and gives visitors short spoken answers, without the usual chatbot headache.",
    });
  }
};
