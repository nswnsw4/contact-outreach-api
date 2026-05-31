# Contact Outreach API

Contact Outreach API extracts publicly available contact and social profile links from websites. It can find email addresses, WhatsApp links, LinkedIn, Twitter/X, Facebook, Instagram, Trustpilot, TikTok, YouTube, Pinterest, and GitHub links.

The API is designed for outreach research, lead enrichment, and contact discovery workflows.

## Live API

```txt
https://contact-outreach-api.nswnsw4.workers.dev
```

## Features

- Scrape one website or multiple websites in one request
- Extract email addresses from public HTML pages
- Extract common social profile links
- Generate outreach-ready email, Gmail, Outlook, and WhatsApp message links
- Download results as CSV
- Limit crawl depth with `maxPages`
- Runs locally with Node.js
- Deployable to Cloudflare Workers

## Limits

- Default pages scanned per website: `10`
- Maximum pages scanned per website: `25`
- Maximum websites per request: `20`
- Request timeout per page: `10` seconds

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Health check and endpoint list |
| `POST` | `/` | Scrape all supported contact and social link types |
| `POST` | `/download-csv` | Scrape all supported fields and return a CSV file |
| `POST` | `/scrape-emails` | Return email addresses and email contact links |
| `POST` | `/scrape-whatsapp` | Return WhatsApp links and WhatsApp message links |
| `POST` | `/scrape-linkedin` | Return LinkedIn links |
| `POST` | `/scrape-twitter` | Return Twitter/X links |
| `POST` | `/scrape-facebook` | Return Facebook links |
| `POST` | `/scrape-instagram` | Return Instagram links |
| `POST` | `/scrape-trustpilot` | Return Trustpilot links |
| `POST` | `/scrape-tiktok` | Return TikTok links |
| `POST` | `/scrape-youtube` | Return YouTube links |
| `POST` | `/scrape-pinterest` | Return Pinterest links |
| `POST` | `/scrape-github` | Return GitHub links |

## Request Body

All `POST` endpoints accept JSON.

### Single Website

```json
{
  "website": "example.com",
  "maxPages": 5
}
```

### Multiple Websites

```json
{
  "websites": [
    "example.com",
    "example.org"
  ],
  "maxPages": 5
}
```

The API also accepts `domain`, `domains`, `website`, or `websites`.

### Outreach Message Fields

These optional fields are used to generate email, Gmail, Outlook, and WhatsApp message links:

```json
{
  "website": "example.com",
  "maxPages": 5,
  "emailSubject": "Quick question",
  "emailMessage": "Hi, I wanted to reach out.",
  "whatsappMessage": "Hi, I wanted to reach out."
}
```

## Example Response

```json
{
  "website": "https://example.com/",
  "pagesScanned": 3,
  "emails": [
    "hello@example.com"
  ],
  "emailContacts": [
    {
      "email": "hello@example.com",
      "mailtoLink": "mailto:hello@example.com",
      "gmailLink": "https://mail.google.com/mail/?view=cm&fs=1&to=hello%40example.com",
      "outlookLink": "https://outlook.live.com/mail/0/deeplink/compose?to=hello%40example.com"
    }
  ],
  "whatsappLinks": [],
  "whatsappContacts": [],
  "linkedinLinks": [],
  "twitterLinks": [],
  "facebookLinks": [],
  "instagramLinks": [],
  "trustpilotLinks": [],
  "tiktokLinks": [],
  "youtubeLinks": [],
  "pinterestLinks": [],
  "githubLinks": []
}
```

## cURL Examples

### Scrape All Contact Data

```bash
curl -X POST "https://contact-outreach-api.nswnsw4.workers.dev/" \
  -H "Content-Type: application/json" \
  -d "{\"website\":\"example.com\",\"maxPages\":5}"
```

### Scrape Emails Only

```bash
curl -X POST "https://contact-outreach-api.nswnsw4.workers.dev/scrape-emails" \
  -H "Content-Type: application/json" \
  -d "{\"website\":\"example.com\",\"maxPages\":5}"
```

### Download CSV

```bash
curl -X POST "https://contact-outreach-api.nswnsw4.workers.dev/download-csv" \
  -H "Content-Type: application/json" \
  -d "{\"website\":\"example.com\",\"maxPages\":5}" \
  -o contact-outreach-results.csv
```

## RapidAPI Setup

Use this value as the RapidAPI Base URL:

```txt
https://contact-outreach-api.nswnsw4.workers.dev
```

Add each endpoint path separately in RapidAPI, for example:

```txt
POST /scrape-emails
POST /scrape-linkedin
POST /download-csv
```

For `POST` endpoints, set the request body type to `application/json`.

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm start
```

The local API will run on:

```txt
http://localhost:3000
```

For development with automatic restart:

```bash
npm run dev
```

## Cloudflare Workers

This project includes:

- `worker.mjs`
- `wrangler.jsonc`

Deploy with Wrangler:

```bash
npm run cf:deploy
```

Run locally with Wrangler:

```bash
npm run cf:dev
```

## Notes

This API only extracts information available in publicly accessible web pages. Users are responsible for complying with target website terms, privacy laws, anti-spam regulations, and all applicable rules in their jurisdiction.

The API does not guarantee that every website will return contact data. Some websites block automated requests, require JavaScript rendering, or do not publish contact links in their HTML.

## License

ISC
