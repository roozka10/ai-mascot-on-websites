const dns = require("node:dns").promises;
const net = require("node:net");

const MAX_PAGES = 50;
const CRAWL_BUDGET_MS = 55000;
const PAGE_TIMEOUT_MS = 9000;

const PRIORITY_PATTERNS = [
  { pattern: /\b(pricing|plans?|packages?|subscribe|subscription)\b/i, score: 100 },
  { pattern: /\b(faq|faqs|questions)\b/i, score: 98 },
  { pattern: /\b(contact|support|help|customer-service)\b/i, score: 96 },
  { pattern: /\b(about|company|team|story|mission)\b/i, score: 92 },
  { pattern: /\b(features?|product|services?|solutions?)\b/i, score: 90 },
  { pattern: /\b(docs?|documentation|guide|how-it-works)\b/i, score: 88 },
  { pattern: /\b(terms|privacy|refund|returns?|policy|legal|guarantee)\b/i, score: 86 },
  { pattern: /\b(book|schedule|demo|get-started|signup|sign-up|checkout)\b/i, score: 84 },
  { pattern: /\b(hours|availability|locations?)\b/i, score: 82 },
];

const SKIP_PATH_RE =
  /\/(login|logout|signin|sign-in|signup|sign-up|register|cart|checkout|account|wp-admin|admin|api|cdn-cgi)(\/|$)/i;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

function normalizePageUrl(href, baseUrl) {
  if (!href || /^(mailto:|tel:|sms:|javascript:|#)/i.test(href)) return null;

  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;

    url.hash = "";
    url.search = "";

    if (
      /\.(pdf|png|jpe?g|gif|webp|svg|mp4|mov|zip|css|js|ico|xml|json|woff2?)$/i.test(url.pathname) ||
      SKIP_PATH_RE.test(url.pathname)
    ) {
      return null;
    }

    const normalized = url.toString().replace(/\/$/, "");
    return normalized === base.origin.replace(/\/$/, "") ? `${base.origin}/` : normalized;
  } catch {
    return null;
  }
}

function pagePathLabel(pageUrl, startUrl) {
  try {
    const path = new URL(pageUrl).pathname;
    if (!path || path === "/") return "Home";
    return path.replace(/^\/|\/$/g, "").slice(0, 80) || "Home";
  } catch {
    return startUrl;
  }
}

function scoreUrl(pageUrl) {
  const path = pageUrl.toLowerCase();
  let score = 10;
  for (const { pattern, score: boost } of PRIORITY_PATTERNS) {
    if (pattern.test(path)) score = Math.max(score, boost);
  }
  if (path.endsWith("/") || path.match(/\/$/)) score += 1;
  return score;
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
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    headers: {
      "User-Agent": "YetiGuide-Scanner/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 3) throw new Error("Too many redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("Invalid redirect");
    return fetchSafeText(new URL(location, url), redirects + 1);
  }

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
    return null;
  }

  return (await response.text()).slice(0, 200000);
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

function uniqueList(items, maxItems, maxLength = 220) {
  return [...new Set(items.map(cleanText).filter((item) => item.length > 2))]
    .map((item) => (item.length > maxLength ? `${item.slice(0, maxLength - 1)}...` : item))
    .slice(0, maxItems);
}

function extractLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    const normalized = normalizePageUrl(match[1], pageUrl);
    if (normalized) links.add(normalized);
  }
  return [...links];
}

function extractJsonLd(html) {
  const facts = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item.name) facts.push(`Name: ${item.name}`);
        if (item.description) facts.push(`Description: ${item.description}`);
        if (item.telephone) facts.push(`Phone: ${item.telephone}`);
        if (item.email) facts.push(`Email: ${item.email}`);
        if (item.priceRange) facts.push(`Price range: ${item.priceRange}`);
        if (item.offers?.price) facts.push(`Offer: ${item.offers.price}`);
        if (item.address?.streetAddress) facts.push(`Address: ${item.address.streetAddress}`);
      }
    } catch {
      /* skip invalid JSON-LD */
    }
  }
  return facts;
}

function extractFaqs(html) {
  const faqs = [];

  for (const match of html.matchAll(/<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) {
    const question = cleanText(match[1]);
    const answer = cleanText(match[2]);
    if (question && answer) faqs.push(`Q: ${question} A: ${answer}`);
  }

  const headingBlocks = [...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>([\s\S]{0,900})/gi)];
  for (const match of headingBlocks) {
    const heading = cleanText(match[1]);
    const body = cleanText(match[2]);
    if (heading.endsWith("?") && body.length > 20) {
      faqs.push(`Q: ${heading} A: ${body.slice(0, 240)}`);
    }
  }

  return uniqueList(faqs, 8, 280);
}

function extractPricingSnippets(html, textBlob) {
  const pricing = [];
  const priceMatches = textBlob.match(/\$\s?\d[\d,]*(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year))?/gi) || [];
  pricing.push(...priceMatches);

  for (const match of html.matchAll(/<(?:h[1-4]|strong|b)[^>]*>([^<]{0,80})<\/(?:h[1-4]|strong|b)>[\s\S]{0,500}?\$\s?\d[\d,]*/gi)) {
    pricing.push(cleanText(match[0]).slice(0, 180));
  }

  return uniqueList(pricing, 10, 180);
}

function extractContactSnippets(textBlob) {
  const contacts = [];
  const emails = textBlob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const phones = textBlob.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || [];
  contacts.push(...emails.slice(0, 3).map((email) => `Email: ${email}`));
  contacts.push(...phones.slice(0, 3).map((phone) => `Phone: ${phone}`));
  if (/\b24\/7\b/i.test(textBlob)) contacts.push("Available 24/7");
  if (/\bresponse time\b/i.test(textBlob)) {
    const response = textBlob.match(/response time[^.]{0,80}/i);
    if (response) contacts.push(cleanText(response[0]));
  }
  return uniqueList(contacts, 6, 120);
}

function extractPolicySnippets(textBlob) {
  const policies = [];
  const keywords = ["refund", "cancel", "return", "privacy", "terms", "guarantee", "warranty", "policy"];
  for (const keyword of keywords) {
    const regex = new RegExp(`[^.]{0,60}\\b${keyword}\\b[^.]{0,120}\\.`, "gi");
    const matches = textBlob.match(regex) || [];
    policies.push(...matches.map(cleanText));
  }
  return uniqueList(policies, 8, 200);
}

function extractPageScan(html, pageUrl, businessName) {
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || businessName);
  const description = cleanText(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      "",
  );

  const headings = uniqueList(
    [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((match) => match[1]),
    12,
    120,
  );

  const ctas = uniqueList(
    [...html.matchAll(/<(?:button|a)[^>]*>([\s\S]{2,80}?)<\/(?:button|a)>/gi)]
      .map((match) => match[1])
      .filter((text) => text.length <= 60),
    8,
    60,
  );

  const snippets = uniqueList(
    [...html.matchAll(/<(?:main|section|article)[^>]*>[\s\S]*?<\/(?:main|section|article)>/gi)]
      .flatMap((block) => [...block[0].matchAll(/<(?:p|li)[^>]*>([\s\S]{35,420}?)<\/(?:p|li)>/gi)].map((m) => m[1]))
      .concat([...html.matchAll(/<(?:p|li)[^>]*>([\s\S]{45,420}?)<\/(?:p|li)>/gi)].map((m) => m[1])),
    12,
    260,
  );

  const textBlob = cleanText(html);
  const structured = uniqueList(extractJsonLd(html), 8, 180);
  const faqs = extractFaqs(html);
  const pricing = extractPricingSnippets(html, textBlob);
  const contact = extractContactSnippets(textBlob);
  const policies = extractPolicySnippets(textBlob);

  return {
    url: pageUrl,
    path: pagePathLabel(pageUrl, pageUrl),
    title,
    description,
    headings,
    ctas,
    snippets,
    structured,
    faqs,
    pricing,
    contact,
    policies,
    internalUrls: extractLinks(html, pageUrl),
  };
}

function extractSitemapUrls(xml, baseUrl) {
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => normalizePageUrl(match[1].trim(), baseUrl))
    .filter(Boolean);
  return [...new Set(urls)];
}

async function discoverSitemapUrls(startUrl) {
  const origin = new URL(startUrl).origin;
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const discovered = new Set();

  for (const sitemapUrl of candidates) {
    const xml = await fetchSafeText(new URL(sitemapUrl));
    if (!xml) continue;

    const urls = extractSitemapUrls(xml, startUrl);
    if (!urls.length) continue;

    if (xml.includes("<sitemapindex")) {
      for (const childSitemap of urls.slice(0, 5)) {
        const childXml = await fetchSafeText(new URL(childSitemap));
        if (!childXml) continue;
        extractSitemapUrls(childXml, startUrl).forEach((url) => discovered.add(url));
      }
    } else {
      urls.forEach((url) => discovered.add(url));
    }
  }

  return [...discovered];
}

async function crawlWebsite(startUrl, businessName, onProgress) {
  const startedAt = Date.now();
  const visited = new Set();
  const scans = [];
  const queue = [];

  const pushCandidate = (pageUrl) => {
    const normalized = normalizePageUrl(pageUrl, startUrl) || pageUrl;
    if (!normalized || visited.has(normalized)) return;
    queue.push({ url: normalized, score: scoreUrl(normalized) });
  };

  onProgress?.("Scanning homepage...");
  const homeHtml = await fetchSafeText(new URL(startUrl));
  if (!homeHtml) return [];

  const homeUrl = normalizePageUrl(startUrl, startUrl) || startUrl;
  visited.add(homeUrl);
  const homeScan = extractPageScan(homeHtml, homeUrl, businessName);
  scans.push(homeScan);

  onProgress?.("Finding sitemap and important pages...");
  const sitemapUrls = await discoverSitemapUrls(startUrl);
  sitemapUrls.forEach(pushCandidate);
  homeScan.internalUrls.forEach(pushCandidate);

  queue.sort((a, b) => b.score - a.score);

  while (queue.length > 0 && scans.length < MAX_PAGES) {
    if (Date.now() - startedAt > CRAWL_BUDGET_MS) break;

    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;

    visited.add(next.url);
    const label = pagePathLabel(next.url, startUrl);
    onProgress?.(`Scanning ${label}...`);

    const html = await fetchSafeText(new URL(next.url));
    if (!html) continue;

    const scan = extractPageScan(html, next.url, businessName);
    scans.push(scan);

    for (const link of scan.internalUrls) {
      if (!visited.has(link)) {
        queue.push({ url: link, score: scoreUrl(link) });
      }
    }

    queue.sort((a, b) => b.score - a.score);
  }

  return scans;
}

function buildSiteBrain(businessName, startUrl, scans, ownerNotes = "") {
  const domain = new URL(startUrl).hostname.replace(/^www\./, "");
  const sections = scans
    .slice(0, MAX_PAGES)
    .map((page) => {
      const facts = [
        page.title && `Title: ${page.title}`,
        page.description && `About: ${page.description}`,
        page.headings.length && `Sections: ${page.headings.join(" | ")}`,
        page.pricing.length && `Pricing: ${page.pricing.join(" | ")}`,
        page.faqs.length && `FAQ: ${page.faqs.join(" | ")}`,
        page.contact.length && `Contact: ${page.contact.join(" | ")}`,
        page.policies.length && `Policies: ${page.policies.join(" | ")}`,
        page.ctas.length && `Actions: ${page.ctas.join(" | ")}`,
        page.structured.length && `Structured data: ${page.structured.join(" | ")}`,
        page.snippets.length && `Details: ${page.snippets.slice(0, 6).join(" | ")}`,
      ].filter(Boolean);

      return `## ${page.path}\n${facts.join("\n")}`.slice(0, 900);
    })
    .join("\n\n");

  const notes = ownerNotes.trim() ? `\n\nOwner notes:\n${ownerNotes.trim().slice(0, 2000)}` : "";

  return `You are Yeti, the website guide for ${businessName || domain}.

Site: ${domain}
Use ONLY the knowledge below. If something is missing, say you are not sure and suggest the best next step.

Website knowledge:
${sections || "- Limited public text was found. Ask one short clarifying question if needed."}${notes}

Answer rules:
- Sound human, warm, and easy to understand.
- Keep answers short: usually 1 sentence, max 2 short sentences.
- Use plain words. No jargon unless the site uses it.
- Prefer exact facts from the scanned pages and owner notes.
- Never invent prices, policies, guarantees, hours, refunds, or contact details.
- Mention clean domains only, like ${domain}. No https, www, slashes, or long paths.
- If unsure, say what you do know and what the visitor should do next.`.slice(0, 18000);
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

  const startUrl = normalizeWebsiteUrl(req.body?.url);
  const businessName = String(req.body?.businessName || "").trim().slice(0, 120);
  const ownerNotes = String(req.body?.ownerNotes || "").trim().slice(0, 3000);

  if (!startUrl) {
    res.status(400).json({ error: "Invalid website URL" });
    return;
  }

  try {
    await assertUrlSafe(startUrl);
    const scans = await crawlWebsite(startUrl.toString(), businessName);
    const pages = scans.map((scan) => scan.path).filter(Boolean);
    const brain = buildSiteBrain(businessName, startUrl.toString(), scans, ownerNotes);

    res.status(200).json({
      scans,
      pages,
      brain,
      pagesScanned: scans.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website scan failed";
    res.status(500).json({ error: message });
  }
};

module.exports.buildSiteBrain = buildSiteBrain;
module.exports.crawlWebsite = crawlWebsite;
