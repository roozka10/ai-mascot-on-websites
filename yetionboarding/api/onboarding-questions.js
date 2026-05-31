import dns from "node:dns/promises";
import net from "node:net";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-3B-Instruct/v1/chat/completions";

const FALLBACK_QUESTIONS = [
  "What are 3 real questions visitors ask that your landing page does not already answer?",
  "Who is your best-fit customer, and who should Yeti politely say this is not for?",
  "What should Yeti tell visitors when it is not sure or needs to hand them to you?",
  "What rules, limits, refunds, guarantees, or safety details should Yeti never guess about?",
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

function getBusinessLabel(url, businessName, websiteSummary) {
  const title = websiteSummary.match(/^Title:\s*(.+)$/m)?.[1];
  return cleanText(businessName || title || url.hostname.replace(/^www\./, "")).slice(0, 80);
}

function getWebsiteSignals(websiteSummary) {
  return {
    pricing: /(\$\s?\d|\bprice\b|\bpricing\b|\bcost\b|\bplan\b|\bpackage\b|\btrial\b|\bfree\b|\bsubscription\b|\bper month\b)/i.test(websiteSummary),
    contact: /(\bcontact\b|\bemail\b|\bphone\b|\bcall\b|\bmessage\b|\bsupport\b|\bchat\b|\bhelp\b)/i.test(websiteSummary),
    booking: /(\bbook\b|\bschedule\b|\bappointment\b|\bdemo\b|\bcheckout\b|\bsign up\b|\bstart\b|\bget started\b|\border\b|\bbuy\b)/i.test(websiteSummary),
    hours: /(\bhours\b|\bopen\b|\bclosed\b|\bmon\b|\btue\b|\bwed\b|\bthu\b|\bfri\b|\bsat\b|\bsun\b|\b24\/7\b|\bresponse time\b)/i.test(websiteSummary),
    policies: /(\brefund\b|\bcancel\b|\breturn\b|\bprivacy\b|\bterms\b|\bguarantee\b|\bwarranty\b|\bpolicy\b|\bsecure\b)/i.test(websiteSummary),
  };
}

function getContextualQuestions(url, businessName, websiteSummary) {
  const label = getBusinessLabel(url, businessName, websiteSummary);
  const domain = url.hostname.replace(/^www\./, "");
  const signals = getWebsiteSignals(websiteSummary);
  const questions = [
    `What are 3 real questions visitors ask about ${label} that the landing page does not already answer?`,
    `Who is the best-fit customer for ${label}, and who should Yeti politely say it is not for?`,
  ];

  if (!signals.pricing) {
    questions.push(`What prices, plans, free trials, or quote details should Yeti know for ${label}?`);
  }

  if (!signals.booking) {
    questions.push(`What should Yeti tell visitors to do next on ${domain}, step by step?`);
  }

  if (!signals.contact) {
    questions.push(`How should visitors contact ${label} if Yeti cannot answer something?`);
  }

  if (!signals.hours) {
    questions.push(`Are there hours, response times, or availability limits Yeti should mention for ${label}?`);
  }

  if (!signals.policies) {
    questions.push(`What refund, cancellation, privacy, guarantee, or safety rules should Yeti explain for ${label}?`);
  }

  questions.push(`What tone should Yeti use for ${label}, and what should it never promise visitors?`);

  return questions.slice(0, 5);
}

function asksAboutKnownWebsiteFact(question, websiteSummary) {
  const signals = getWebsiteSignals(websiteSummary);
  const checks = [
    [signals.pricing, /\b(price|pricing|cost|plan|package|trial|subscription|offer)\b/i],
    [signals.contact, /\b(contact|email|phone|call|message|support)\b/i],
    [signals.booking, /\b(book|schedule|appointment|demo|checkout|sign up|get started|order|buy)\b/i],
    [signals.hours, /\b(hours|open|closed|availability|response time)\b/i],
    [signals.policies, /\b(refund|cancel|return|privacy|terms|guarantee|warranty|policy)\b/i],
  ];

  return checks.some(([isKnown, pattern]) => isKnown && pattern.test(question));
}

function isGenericQuestion(question, url, businessName, websiteSummary) {
  const lower = question.toLowerCase();
  const label = getBusinessLabel(url, businessName, websiteSummary).toLowerCase();
  const domain = url.hostname.replace(/^www\./, "").toLowerCase();

  if (label && lower.includes(label)) return false;
  if (domain && lower.includes(domain)) return false;

  return /your (business|company|customers|website|product|service)|what do you sell|who is it for|common question/i.test(question);
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
        "You create onboarding questions for a website AI support guide. Return ONLY a JSON array of exactly 5 short questions. First read the website notes and do NOT ask for facts already visible on the landing page. Ask for missing details the AI still needs, such as unanswered customer questions, ideal customer, limits, edge cases, support handoff, policies not shown, and tone. Every question must mention the actual business name, website domain, product, or a specific phrase found in the website notes. Never ask generic questions like 'what do your customers ask?' or 'what do you sell?'. If pricing, contact, booking, hours, or policies are already shown in the notes, do not ask for them. Do not include markdown.",
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
    const contextualQuestions = getContextualQuestions(url, businessName, summary);
    const questions =
      generated?.length === 5 &&
      !generated.some(
        (question) =>
          isGenericQuestion(question, url, businessName, summary) ||
          asksAboutKnownWebsiteFact(question, summary),
      )
        ? generated
        : contextualQuestions;
    res.status(200).json({ questions });
  } catch {
    res.status(200).json({ questions: FALLBACK_QUESTIONS });
  }
}
