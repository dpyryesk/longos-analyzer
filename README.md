# Longo's Receipt Analyzer

A local Next.js app that downloads your Longo's grocery receipts from Gmail, parses them, stores the data in SQLite, and visualizes your spending trends.

---

## Features

- **Gmail sync** — downloads receipts automatically via Gmail API
- **Smart parser** — extracts items, categories, prices, and sale flags
- **Deduplication** — never double-imports a receipt
- **Dashboard** — KPI cards, monthly/yearly spend line chart, category breakdown, top items
- **Items table** — sortable/filterable list of all products
- **Item detail** — price history chart, purchase log, sale frequency

---

## Quick Start

### 1. Set Up Google Cloud OAuth Credentials

You need a Google Cloud project with the Gmail API enabled and OAuth 2.0 credentials.

#### Step-by-step:

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in.
2. Click **"Select a project"** → **"New Project"** → name it anything, click **Create**.
3. In the left sidebar, go to **APIs & Services → Library**.
4. Search for **"Gmail API"**, click it, then click **Enable**.
5. Go to **APIs & Services → OAuth consent screen**.
   - Choose **External** → Click **Create**.
   - Fill in App name (e.g. "Longo's Analyzer"), user support email, developer contact email.
   - Click **Save and Continue** through all steps.
   - On the **Test users** screen, click **+ Add Users** and add your Gmail address.
   - Click **Save and Continue**.
6. Go to **APIs & Services → Credentials** → **Create Credentials → OAuth 2.0 Client IDs**.
   - Application type: **Web application**
   - Name: anything (e.g. "Longo's Analyzer Web")
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
   - Click **Create**.
7. Copy the **Client ID** and **Client Secret** shown in the popup.

### 2. Create `.env.local`

Create a file named `.env.local` in the project root:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Gmail search query — adjust if your receipts come from a different sender
GMAIL_SEARCH_QUERY=from:donotreply@longos.com
```

> **Tip:** To find the exact sender address, open a Longo's receipt in Gmail and check the "From:" field.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Connect Gmail & Sync

1. Click **"🔑 Connect Gmail"** on the dashboard.
2. You'll be redirected to Google's OAuth consent screen — approve access.
3. After approval, you'll be redirected back to the dashboard.
4. Click **"🔄 Sync Receipts"** — this will fetch up to 500 emails from the last 5 years.
5. The first sync may take a few minutes depending on how many receipts you have.

---

## Project Structure

```
app/                    # Next.js App Router pages + API routes
  page.tsx              # Dashboard
  items/page.tsx        # Items table
  items/[slug]/page.tsx # Item detail
  api/
    auth/               # OAuth2 routes
    sync/               # Gmail sync endpoint
    stats/              # Aggregate stats endpoints
    items/              # Item list + detail endpoints
components/             # React UI components
lib/
  db.ts                 # SQLite database (schema + singleton)
  auth.ts               # OAuth token management
  gmail.ts              # Gmail API client
  parser.ts             # Receipt plain-text parser
data/                   # SQLite database file (gitignored)
tokens.json             # OAuth tokens (gitignored)
```

---

## Data Storage

- **`data/receipts.db`** — SQLite database, created automatically on first run
- **`tokens.json`** — Google OAuth tokens, saved after first authorization

Both are gitignored and local to your machine.

---

## Adjusting the Gmail Search Query

If your receipts don't sync, update `GMAIL_SEARCH_QUERY` in `.env.local`:

```env
# Examples:
GMAIL_SEARCH_QUERY=from:donotreply@longos.com
GMAIL_SEARCH_QUERY=from:receipt@longos.com subject:receipt
GMAIL_SEARCH_QUERY=subject:"Thank you" from:longos
```
