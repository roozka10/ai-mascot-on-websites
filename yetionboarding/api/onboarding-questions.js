import dns from "node:dns/promises";
import net from "node:net";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-3B-Instruct/v1/chat/completions";

const FALLBACK_QUESTIONS = [
  "What do you sell, who is it for, and what makes it different?",
  "What questions do customers ask before they buy?",
  "What are your prices, packages, trials, guarantees, or refund rules?",
  "What should Yeti say about shipping, booking, hours, support, or contact info?",
  "What tone should Yeti use, and what should it never promise?",
];

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isPrivateIp(address) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }

  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

function normalizeWebsiteUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function assertUrlSafe(url) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Unsafe URL");
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("Unsafe URL");
  }

  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Unsafe URL");
  }
}

async function fetchSafeText(url, redirects = 0) {
  await assertUrlSafe(url);

  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(9000),
    headers: {
      "User-Agent": "YetiGuide-Onboarding/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 2) throw new Error("Too many redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("Invalid redirect");
    return fetchSafeText(new URL(location, url), redirects + 1);
  }

  if (!response.ok) throw new Error("Could not load website");
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
    throw new Error("Unsupported website content");
  }

  return (await response.text()).slice(0, 160000);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAllText(html, pattern) {
  return [...html.matchAll(pattern)]
    .map((match) => cleanText(match[1]))
    .filter((text) => text.length > 2);
}

function summarizeWebsite(html, url, businessName) {
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = cleanText(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
      "",
  );
  const headings = matchAllText(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).slice(0, 10);
  const buttons = matchAllText(html, /<(?:button|a)[^>]*>([\s\S]{2,80}?)<\/(?:button|a)>/gi)
    .filter((text) => text.length <= 60)
    .slice(0, 10);
  const paragraphs = matchAllText(html, /<(?:p|li)[^>]*>([\s\S]{40,320}?)<\/(?:p|li)>/gi).slice(0, 12);

  return [
    `Business name typed by owner: ${businessName || "Unknown"}`,
    `Website: ${url.hostname.replace(/^www\./, "")}`,
    title && `Title: ${title}`,
    description && `Description: ${description}`,
    headings.length && `Headings: ${headings.join(" | ")}`,
    buttons.length && `Buttons/actions: ${buttons.join(" | ")}`,
    paragraphs.length && `Useful copy: ${paragraphs.join(" | ")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

function cleanQuestion(value) {
  return String(value || "")
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseQuestions(text) {
  const raw = String(text || "").trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map(cleanQuestion).filter(Boolean).slice(0, 5);
      }
    } catch {
      /* fall back to line parsing */
    }
  }

  return raw
    .split(/\n+/)
    .map(cleanQuestion)
    .filter((line) => line.endsWith("?") && line.length <= 140)
    .slice(0, 5);
}

async function callProvider(url, headers, model, websiteSummary) {
  const messages = [
    {
      role: "system",
      content:
        "You create onboarding questions for a website AI support guide. Return ONLY a JSON array of exactly 5 short questions. Make each question simple, specific to the website, and easy for a small business owner to answer out loud. Ask about common customer questions, pricing/offers, booking/shipping/support, trust/policies, and tone/limits. Do not include markdown.",
    },
    {
      role: "user",
      content: `Website notes:\n${websiteSummary}`,
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 360,
      temperature: 0.45,
    }),
  });

  if (!response.ok) throw new Error("Question model failed");
  const data = await response.json();
  return parseQuestions(data.choices?.[0]?.message?.content);
}

async function generateQuestions(websiteSummary, origin) {
  if (process.env.OPENROUTER_API_KEY) {
    const questions = await callProvider(
      OPENROUTER_URL,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": origin || "https://www.yetiassistant.online",
      },
      process.env.OPENROUTER_MODEL || "openrouter/owl-alpha",
      websiteSummary,
    );
    if (questions.length === 5) return questions;
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    const questions = await callProvider(
      HUGGINGFACE_URL,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
      "Qwen/Qwen2.5-3B-Instruct",
      websiteSummary,
    );
    if (questions.length === 5) return questions;
  }

  return null;
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

  const url = normalizeWebsiteUrl(req.body?.url);
  const businessName = String(req.body?.businessName || "").trim().slice(0, 120);
  if (!url) {
    res.status(400).json({ error: "Invalid website URL", questions: FALLBACK_QUESTIONS });
    return;
  }

  try {
    const html = await fetchSafeText(url);
    const summary = summarizeWebsite(html, url, businessName);
    const generated = await generateQuestions(summary, req.headers.origin);
    const questions = [...(generated || []), ...FALLBACK_QUESTIONS].slice(0, 5);
    res.status(200).json({ questions });
  } catch {
    res.status(200).json({ questions: FALLBACK_QUESTIONS });
  }
}
