# TruthLayer

**See what the article is really saying.**

TruthLayer uses AI to dissect any news article — separating facts from opinions, spotting logical fallacies, measuring manipulation, and visualising it all as an interactive evidence board.

![TruthLayer](https://img.shields.io/badge/Next.js-14-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square) ![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-orange?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## The problem

You read a news article. Something feels off — but you can't pinpoint what. Is it biased? Are the claims backed by evidence? Is it using fear language to manipulate you? You don't have 20 minutes to fact-check it manually.

TruthLayer does it in 15 seconds.

---

## What it does

Paste any news article URL. TruthLayer:

- **Extracts every claim** and classifies each one as a fact, opinion, logical fallacy, or missing context
- **Renders an evidence board** — an interactive node graph where claims are colour-coded and logically connected
- **Scores manipulation** across 5 dimensions: fear language, urgency bait, false equivalence, missing sources, emotional appeals
- **Detects bias** — left, right, centre, or unclear
- **Compares two sources** on the same story and highlights where they contradict each other
- **Saves every analysis** to your personal dashboard with a shareable URL

---

## Screenshots

> Add screenshots here after first build. Recommended: landing page, evidence board, manipulation score card, dashboard.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components, API routes, file-based routing |
| Language | TypeScript (strict) | Type safety across the full stack |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, dark-mode-first UI |
| AI | Groq API (llama-3.3-70b-versatile) | Free tier, extremely fast inference |
| Scraping | Mozilla Readability + JSDOM | Same engine as Firefox Reader Mode |
| Graph UI | React Flow + Dagre | Interactive evidence board with auto-layout |
| Auth | Clerk | Google OAuth, session management, pre-built UI |
| Database | Neon Postgres + Prisma | Serverless Postgres, free tier, type-safe ORM |
| Deployment | Vercel | Zero-config Next.js deployment |

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Groq](https://console.groq.com) account (free)
- A [Clerk](https://clerk.com) account (free)
- A [Neon](https://neon.tech) account (free)

### 1. Clone the repo

```bash
git clone https://github.com/BhatAnkush/truthlayer.git
cd truthlayer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root:

```dotenv
# Groq
GROQ_API_KEY=your_groq_api_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database
DATABASE_URL=your_neon_postgres_connection_string
```

**Where to get each key:**
- `GROQ_API_KEY` → [console.groq.com](https://console.groq.com) → API Keys
- Clerk keys → [dashboard.clerk.com](https://dashboard.clerk.com) → your app → API Keys
- `DATABASE_URL` → [neon.tech](https://neon.tech) → your project → Connection string

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
truthlayer/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── dashboard/
│   │   └── page.tsx                    # User's analysis history
│   ├── analysis/
│   │   └── [id]/page.tsx               # Individual analysis view
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                    # Clerk sign-in page
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx                    # Clerk sign-up page
│   └── api/
│       ├── analyse/route.ts            # Scrape + Groq analysis
│       └── compare/route.ts            # Cross-source contradiction
├── components/
│   ├── EvidenceBoard.tsx               # React Flow graph
│   ├── ClaimNode.tsx                   # Custom coloured node
│   ├── ManipulationScore.tsx           # 5-dimension score card
│   ├── URLInput.tsx                    # URL input + paste fallback
│   ├── Navbar.tsx                      # Clerk auth buttons
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── scraper.ts                      # Readability + JSDOM
│   ├── chunker.ts                      # Token counting + chunking
│   ├── groq.ts                         # Groq SDK wrapper
│   └── prompts.ts                      # AI system prompts
├── prisma/
│   └── schema.prisma                   # Database schema
├── middleware.ts                       # Clerk route protection
└── .env.local                          # Environment variables
```

---

## How it works

### 1. Scraping pipeline

When a URL is submitted, the server:

1. Fetches the raw HTML using Node's `fetch` with a browser User-Agent header
2. Passes the HTML through Mozilla Readability — the same library Firefox Reader Mode uses — to strip ads, navbars, cookie banners, and extract clean article text
3. If the site blocks scraping (403, timeout, paywall), surfaces a paste fallback immediately — the user never sees a raw error

### 2. Long article handling

Articles over ~6,000 tokens would exceed optimal context. The chunker:

1. Estimates token count (roughly 4 characters per token)
2. For long articles: splits into 3,000-token chunks, summarises each chunk individually, combines the summaries
3. This means even a 15,000-word article gets accurate analysis — and it's the kind of engineering decision that comes up in interviews

### 3. AI analysis

The cleaned text is sent to Groq (llama-3.3-70b-versatile) with a structured prompt that forces JSON output. The response is validated with Zod before being saved, and retried once with a stricter prompt if validation fails.

Each analysis returns:
- 6–12 classified claims with confidence scores and reasoning
- Logical connections between related claims
- Manipulation score across 5 dimensions
- Overall bias direction
- One-sentence neutral summary

### 4. Evidence board

Claims become React Flow nodes. Dagre handles automatic layout so nodes never overlap. Edges between nodes show logical relationships. Node colour encodes claim type at a glance:

| Colour | Type |
|---|---|
| Teal | Fact |
| Amber | Opinion |
| Coral | Logical fallacy |
| Gray | Missing context |

Clicking a node opens a side drawer with the full claim text and the AI's reasoning for its classification.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for AI inference |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in redirect path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up redirect path |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | Post sign-in redirect |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | Post sign-up redirect |
| `DATABASE_URL` | Yes | Neon Postgres connection string |

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**. Vercel auto-detects Next.js — no config needed.

### After deploying

Run the database migration against production:

```bash
DATABASE_URL=your_production_url npx prisma db push
```

---

## Free tier limits

| Service | Free limit | Notes |
|---|---|---|
| Groq | 14,400 requests/day, 6,000 tokens/min | More than enough for a portfolio project |
| Clerk | 10,000 monthly active users | Free forever under this limit |
| Neon | 0.5GB storage, 190 compute hours/month | Enough for thousands of analyses |
| Vercel | 100GB bandwidth/month | Free for personal projects |

**Estimated cost at zero traffic: $0/month.**

---

## Known limitations

- **Paywalled articles** cannot be scraped automatically — paste fallback is shown instead
- **Sites that aggressively block bots** (some news outlets) may fail — paste fallback handles this
- **Very long articles** (15,000+ words) are summarised before analysis, which may lose some nuance
- **AI classification is not perfect** — confidence scores reflect this. Always read the reasoning

---

## Roadmap

- [ ] Browser extension — analyse any article without leaving the page
- [ ] Email digest — weekly summary of manipulation scores across your reading history
- [ ] Source reputation database — historical bias scores per publication
- [ ] PDF and Twitter thread support
- [ ] Public analysis feed — see what others are reading and analysing

---

## Contributing

Pull requests are welcome. For major changes please open an issue first.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m 'add: your feature description'
git push origin feature/your-feature-name
# Open a pull request
```

---

## License

MIT — do whatever you want with it.

---

## Acknowledgements

- [Mozilla Readability](https://github.com/mozilla/readability) — article extraction
- [React Flow](https://reactflow.dev) — evidence board graph
- [Groq](https://groq.com) — fast AI inference
- [Clerk](https://clerk.com) — authentication
- [shadcn/ui](https://ui.shadcn.com) — UI components
- [Neon](https://neon.tech) — serverless Postgres

---

*Built by [your name](https://github.com/yourusername)*