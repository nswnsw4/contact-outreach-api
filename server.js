const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_MAX_PAGES = 10;
const MAX_ALLOWED_PAGES = 25;
const MAX_ALLOWED_WEBSITES = 20;
const REQUEST_TIMEOUT_MS = 10000;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const LINK_REGEX = /<a\b[^>]*href=["']([^"']+)["']/gi;
const ASSET_EMAIL_REGEX = /\.(?:png|jpe?g|gif|webp|webm|svg|ico|css|js|mjs|map|mp|mp4|mov|m4v|avi|wav|mp3|woff2?|ttf|eot|otf|zip|gz|br)$/i;
const PLACEHOLDER_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org"
]);
const ENDPOINTS = {
  all: "POST /",
  downloadCsv: "POST /download-csv",
  emails: "POST /scrape-emails",
  whatsapp: "POST /scrape-whatsapp",
  linkedin: "POST /scrape-linkedin",
  twitter: "POST /scrape-twitter",
  facebook: "POST /scrape-facebook",
  instagram: "POST /scrape-instagram",
  trustpilot: "POST /scrape-trustpilot",
  tiktok: "POST /scrape-tiktok",
  youtube: "POST /scrape-youtube",
  pinterest: "POST /scrape-pinterest",
  github: "POST /scrape-github"
};

function normalizeWebsite(website) {
  if (!website || typeof website !== "string") {
    throw new Error("website is required");
  }

  const trimmed = website.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("website must use http or https");
  }

  url.hash = "";
  return url;
}

function getRequestedWebsites(body) {
  const websites = body.websites || body.domains || body.website || body.domain;
  const websiteList = Array.isArray(websites) ? websites : [websites];
  const cleaned = websiteList
    .filter(website => typeof website === "string")
    .map(website => website.trim())
    .filter(Boolean);

  if (cleaned.length === 0) {
    throw new Error("website, websites, domain, or domains is required");
  }

  if (cleaned.length > MAX_ALLOWED_WEBSITES) {
    throw new Error(`A maximum of ${MAX_ALLOWED_WEBSITES} websites can be scraped at once`);
  }

  return [...new Set(cleaned)].map(normalizeWebsite);
}

function normalizeEmail(email) {
  return email.toLowerCase().replace(/[.,;:)]+$/, "");
}

function isValidEmail(email) {
  if (email.length > 254 || ASSET_EMAIL_REGEX.test(email)) {
    return false;
  }

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain || email.split("@").length !== 2) {
    return false;
  }

  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    localPart.includes("%40") ||
    domain.includes("..")
  ) {
    return false;
  }

  const domainLabels = domain.split(".");
  const topLevelDomain = domainLabels.at(-1);
  const firstDomainLabel = domainLabels[0];
  const normalizedDomain = domain.toLowerCase();

  if (!topLevelDomain || topLevelDomain.length < 2 || !/^[a-z]{2,24}$/i.test(topLevelDomain)) {
    return false;
  }

  if (
    /^\d+x(?:\d+)?$/i.test(firstDomainLabel) ||
    /^[a-f0-9]{24,}$/i.test(localPart) ||
    normalizedDomain.endsWith(".ingest.sentry.io") ||
    PLACEHOLDER_EMAIL_DOMAINS.has(normalizedDomain)
  ) {
    return false;
  }

  return domainLabels.every(label =>
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  );
}

function extractEmails(html) {
  const matches = html.match(EMAIL_REGEX) || [];
  return [...new Set(matches.map(normalizeEmail).filter(isValidEmail))];
}

function normalizeLinkedInUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "linkedin.com" && !hostname.endsWith(".linkedin.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractLinkedInLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeLinkedInUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeTwitterUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "twitter.com" && hostname !== "x.com" && !hostname.endsWith(".twitter.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractTwitterLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeTwitterUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeFacebookUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "facebook.com" && hostname !== "fb.com" && !hostname.endsWith(".facebook.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractFacebookLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeFacebookUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeInstagramUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "instagram.com" && !hostname.endsWith(".instagram.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractInstagramLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeInstagramUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeTrustpilotUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "trustpilot.com" && !hostname.endsWith(".trustpilot.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractTrustpilotLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeTrustpilotUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeTikTokUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "tiktok.com" && !hostname.endsWith(".tiktok.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractTikTokLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeTikTokUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeYouTubeUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "youtube.com" && hostname !== "youtu.be" && !hostname.endsWith(".youtube.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractYouTubeLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeYouTubeUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizePinterestUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "pinterest.com" && !hostname.endsWith(".pinterest.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractPinterestLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizePinterestUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeGitHubUrl(rawUrl, baseUrl) {
  try {
    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "github.com" && !hostname.endsWith(".github.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractGitHubLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeGitHubUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function normalizeWhatsAppUrl(rawUrl, baseUrl) {
  try {
    if (rawUrl.toLowerCase().startsWith("whatsapp://")) {
      return rawUrl;
    }

    const url = new URL(rawUrl, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "wa.me" && hostname !== "whatsapp.com" && !hostname.endsWith(".whatsapp.com")) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractWhatsAppLinks(html, baseUrl) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizeWhatsAppUrl(match[1], baseUrl);

    if (normalized) {
      links.push(normalized);
    }
  }

  return [...new Set(links)];
}

function getOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createEmailMessageLinks(emails, subject, message) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedMessage = encodeURIComponent(message);

  return emails.map(email => {
    const params = [];

    if (encodedSubject) {
      params.push(`subject=${encodedSubject}`);
    }

    if (encodedMessage) {
      params.push(`body=${encodedMessage}`);
    }

    return `mailto:${email}${params.length > 0 ? `?${params.join("&")}` : ""}`;
  });
}

function createGmailMessageLinks(emails, subject, message) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedMessage = encodeURIComponent(message);

  return emails.map(email => {
    const url = new URL("https://mail.google.com/mail/");

    url.searchParams.set("view", "cm");
    url.searchParams.set("fs", "1");
    url.searchParams.set("to", email);

    if (encodedSubject) {
      url.searchParams.set("su", subject);
    }

    if (encodedMessage) {
      url.searchParams.set("body", message);
    }

    return url.toString();
  });
}

function createOutlookMessageLinks(emails, subject, message) {
  return emails.map(email => {
    const url = new URL("https://outlook.live.com/mail/0/deeplink/compose");

    url.searchParams.set("to", email);

    if (subject) {
      url.searchParams.set("subject", subject);
    }

    if (message) {
      url.searchParams.set("body", message);
    }

    return url.toString();
  });
}

function createWhatsAppMessageLink(whatsappLink, message) {
  const encodedMessage = encodeURIComponent(message);

  if (!encodedMessage) {
    return whatsappLink;
  }

  try {
    const url = new URL(whatsappLink);
    url.searchParams.set("text", message);
    return url.toString();
  } catch {
    const separator = whatsappLink.includes("?") ? "&" : "?";
    return `${whatsappLink}${separator}text=${encodedMessage}`;
  }
}

function createWhatsAppMessageLinks(whatsappLinks, message) {
  return whatsappLinks.map(link => createWhatsAppMessageLink(link, message));
}

function createEmailContacts(emails, emailMessageLinks, gmailMessageLinks, outlookMessageLinks) {
  return emails.map((email, index) => ({
    email,
    mailtoLink: emailMessageLinks[index],
    gmailLink: gmailMessageLinks[index],
    outlookLink: outlookMessageLinks[index]
  }));
}

function createWhatsAppContacts(whatsappLinks, whatsappMessageLinks) {
  return whatsappLinks.map((whatsappLink, index) => ({
    whatsappLink,
    whatsappMessageLink: whatsappMessageLinks[index]
  }));
}

function getPageLimit(maxPages) {
  const requested = Number.parseInt(maxPages, 10);

  if (Number.isNaN(requested)) {
    return DEFAULT_MAX_PAGES;
  }

  return Math.min(Math.max(requested, 1), MAX_ALLOWED_PAGES);
}

function isHtmlResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html") || contentType.includes("application/xhtml+xml");
}

function normalizePageUrl(rawUrl, baseUrl, origin) {
  try {
    const url = new URL(rawUrl, baseUrl);

    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractSameSiteLinks(html, baseUrl, origin) {
  const links = [];
  let match;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const normalized = normalizePageUrl(match[1], baseUrl, origin);

    if (normalized) {
      links.push(normalized);
    }
  }

  return links;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "contact-outreach-api/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok || !isHtmlResponse(response)) {
      return null;
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeEmailsFromWebsite(startUrl, maxPages, outreachMessages) {
  const queue = [startUrl.toString()];
  const visited = new Set();
  const allEmails = new Set();
  const allWhatsAppLinks = new Set();
  const allLinkedInLinks = new Set();
  const allTwitterLinks = new Set();
  const allFacebookLinks = new Set();
  const allInstagramLinks = new Set();
  const allTrustpilotLinks = new Set();
  const allTikTokLinks = new Set();
  const allYouTubeLinks = new Set();
  const allPinterestLinks = new Set();
  const allGitHubLinks = new Set();

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();

    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);

    try {
      const html = await fetchHtml(currentUrl);

      if (!html) {
        continue;
      }

      const pageEmails = extractEmails(html);
      const pageWhatsAppLinks = extractWhatsAppLinks(html, currentUrl);
      const pageLinkedInLinks = extractLinkedInLinks(html, currentUrl);
      const pageTwitterLinks = extractTwitterLinks(html, currentUrl);
      const pageFacebookLinks = extractFacebookLinks(html, currentUrl);
      const pageInstagramLinks = extractInstagramLinks(html, currentUrl);
      const pageTrustpilotLinks = extractTrustpilotLinks(html, currentUrl);
      const pageTikTokLinks = extractTikTokLinks(html, currentUrl);
      const pageYouTubeLinks = extractYouTubeLinks(html, currentUrl);
      const pagePinterestLinks = extractPinterestLinks(html, currentUrl);
      const pageGitHubLinks = extractGitHubLinks(html, currentUrl);

      pageEmails.forEach(email => allEmails.add(email));
      pageWhatsAppLinks.forEach(link => allWhatsAppLinks.add(link));
      pageLinkedInLinks.forEach(link => allLinkedInLinks.add(link));
      pageTwitterLinks.forEach(link => allTwitterLinks.add(link));
      pageFacebookLinks.forEach(link => allFacebookLinks.add(link));
      pageInstagramLinks.forEach(link => allInstagramLinks.add(link));
      pageTrustpilotLinks.forEach(link => allTrustpilotLinks.add(link));
      pageTikTokLinks.forEach(link => allTikTokLinks.add(link));
      pageYouTubeLinks.forEach(link => allYouTubeLinks.add(link));
      pagePinterestLinks.forEach(link => allPinterestLinks.add(link));
      pageGitHubLinks.forEach(link => allGitHubLinks.add(link));

      const links = extractSameSiteLinks(html, currentUrl, startUrl.origin);

      links.forEach(link => {
        if (!visited.has(link) && !queue.includes(link) && visited.size + queue.length < maxPages) {
          queue.push(link);
        }
      });
    } catch {
      // Ignore individual page failures so one bad page does not fail the full scrape.
    }
  }

  const emails = [...allEmails].sort();
  const whatsappLinks = [...allWhatsAppLinks].sort();
  const emailMessageLinks = createEmailMessageLinks(
    emails,
    outreachMessages.emailSubject,
    outreachMessages.emailMessage
  );
  const gmailMessageLinks = createGmailMessageLinks(
    emails,
    outreachMessages.emailSubject,
    outreachMessages.emailMessage
  );
  const outlookMessageLinks = createOutlookMessageLinks(
    emails,
    outreachMessages.emailSubject,
    outreachMessages.emailMessage
  );
  const whatsappMessageLinks = createWhatsAppMessageLinks(whatsappLinks, outreachMessages.whatsappMessage);

  return {
    website: startUrl.toString(),
    pagesScanned: visited.size,
    emails,
    emailContacts: createEmailContacts(emails, emailMessageLinks, gmailMessageLinks, outlookMessageLinks),
    whatsappLinks,
    whatsappContacts: createWhatsAppContacts(whatsappLinks, whatsappMessageLinks),
    linkedinLinks: [...allLinkedInLinks].sort(),
    twitterLinks: [...allTwitterLinks].sort(),
    facebookLinks: [...allFacebookLinks].sort(),
    instagramLinks: [...allInstagramLinks].sort(),
    trustpilotLinks: [...allTrustpilotLinks].sort(),
    tiktokLinks: [...allTikTokLinks].sort(),
    youtubeLinks: [...allYouTubeLinks].sort(),
    pinterestLinks: [...allPinterestLinks].sort(),
    githubLinks: [...allGitHubLinks].sort()
  };
}

function getScrapeOptions(req) {
  return {
    startUrls: getRequestedWebsites(req.body),
    maxPages: getPageLimit(req.body.maxPages),
    outreachMessages: {
      emailSubject: getOptionalText(req.body.emailSubject),
      emailMessage: getOptionalText(req.body.emailMessage),
      whatsappMessage: getOptionalText(req.body.whatsappMessage)
    }
  };
}

function pickFields(result, fields) {
  const response = {
    website: result.website,
    pagesScanned: result.pagesScanned
  };

  fields.forEach(field => {
    response[field] = result[field];
  });

  return response;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function createCsv(results) {
  const columns = [
    "website",
    "pagesScanned",
    "type",
    "value",
    "mailtoLink",
    "gmailLink",
    "outlookLink",
    "whatsappMessageLink",
    "error"
  ];
  const rows = [];

  results.forEach(result => {
    const rowCountBeforeResult = rows.length;

    if (result.error) {
      rows.push([result.website, result.pagesScanned, "error", "", "", "", "", "", result.error]);
      return;
    }

    result.emailContacts.forEach(contact => {
      rows.push([
        result.website,
        result.pagesScanned,
        "email",
        contact.email,
        contact.mailtoLink,
        contact.gmailLink,
        contact.outlookLink,
        "",
        ""
      ]);
    });

    result.whatsappContacts.forEach(contact => {
      rows.push([
        result.website,
        result.pagesScanned,
        "whatsapp",
        contact.whatsappLink,
        "",
        "",
        "",
        contact.whatsappMessageLink,
        ""
      ]);
    });

    [
      ["linkedin", result.linkedinLinks],
      ["twitter", result.twitterLinks],
      ["facebook", result.facebookLinks],
      ["instagram", result.instagramLinks],
      ["trustpilot", result.trustpilotLinks],
      ["tiktok", result.tiktokLinks],
      ["youtube", result.youtubeLinks],
      ["pinterest", result.pinterestLinks],
      ["github", result.githubLinks]
    ].forEach(([type, links]) => {
      links.forEach(link => {
        rows.push([result.website, result.pagesScanned, type, link, "", "", "", "", ""]);
      });
    });

    if (rows.length === rowCountBeforeResult) {
      rows.push([result.website, result.pagesScanned, "none", "", "", "", "", "", ""]);
    }
  });

  return [columns, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");
}

function createCsvDownloadHandler() {
  return async (req, res) => {
    try {
      const { startUrls, maxPages, outreachMessages } = getScrapeOptions(req);
      const results = await Promise.all(
        startUrls.map(async startUrl => {
          try {
            return await scrapeEmailsFromWebsite(startUrl, maxPages, outreachMessages);
          } catch (error) {
            return {
              website: startUrl.toString(),
              error: error.message
            };
          }
        })
      );
      const csv = createCsv(results);
      const today = new Date().toISOString().slice(0, 10);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="contact-outreach-results-${today}.csv"`);
      res.send(`\ufeff${csv}`);
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  };
}

function createScrapeHandler(fields) {
  return async (req, res) => {
    try {
      const { startUrls, maxPages, outreachMessages } = getScrapeOptions(req);
      const results = await Promise.all(
        startUrls.map(async startUrl => {
          try {
            const result = await scrapeEmailsFromWebsite(startUrl, maxPages, outreachMessages);

            return fields ? pickFields(result, fields) : result;
          } catch (error) {
            return {
              website: startUrl.toString(),
              error: error.message
            };
          }
        })
      );

      res.json(startUrls.length === 1 ? results[0] : { results });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  };
}

app.get("/", (req, res) => {
  res.json({
    message: "Contact Outreach API is running",
    endpoints: ENDPOINTS
  });
});

app.post("/", createScrapeHandler());
app.post("/download-csv", createCsvDownloadHandler());
app.post("/scrape-emails", createScrapeHandler([
  "emails",
  "emailContacts"
]));
app.post("/scrape-whatsapp", createScrapeHandler(["whatsappLinks", "whatsappContacts"]));
app.post("/scrape-linkedin", createScrapeHandler(["linkedinLinks"]));
app.post("/scrape-twitter", createScrapeHandler(["twitterLinks"]));
app.post("/scrape-facebook", createScrapeHandler(["facebookLinks"]));
app.post("/scrape-instagram", createScrapeHandler(["instagramLinks"]));
app.post("/scrape-trustpilot", createScrapeHandler(["trustpilotLinks"]));
app.post("/scrape-tiktok", createScrapeHandler(["tiktokLinks"]));
app.post("/scrape-youtube", createScrapeHandler(["youtubeLinks"]));
app.post("/scrape-pinterest", createScrapeHandler(["pinterestLinks"]));
app.post("/scrape-github", createScrapeHandler(["githubLinks"]));

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });
}

module.exports = app;
