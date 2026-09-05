# Ledger — personal finance tracker

A private, single-login finance tracker: salary/income, expenses, a "cash I gave / cash I took"
ledger for informal loans, savings goals, and a dashboard tying it together.

**Stack:** React + Vite + Tailwind (frontend) · Netlify Functions running Express (API) ·
MongoDB (Atlas) via Mongoose · JWT login.

## Features

* **Single-User Security:** Built explicitly for single-user deployment with self-locking registration (`/auth/register`) after the initial account is created.
* **Financial Dashboard:** Real-time aggregation of income, expenses, net worth, and high-level summaries.
* **Income & Expense Tracking:** Categorized tracking for recurring income, daily expenses, and salary management.
* **Cash Ledger:** Track lent and borrowed money with built-in settled flags.
* **Savings Goals:** Set goals and track incremental contributions over time.
* **AI Assistant:**  Gemini integration for all the financial data to be asked in a chat interface.
* **Serverless Architecture:** Fully optimized for Netlify Functions with single-file Express routing and lightweight Mongoose models.

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free (M0) cluster.
3. Under **Database Access**, create a database user with a username/password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) — Netlify Functions
   run from changing IPs, so this is the simplest option for a personal project.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
   Add a database name before the `?`, e.g. `.../ledger?retryWrites=true...`.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
MONGODB_URI=mongodb+srv://...your-connection-string.../ledger?retryWrites=true&w=majority
JWT_SECRET=any-long-random-string
```

Generate a random secret quickly with: `openssl rand -hex 32`

## 3. Run it locally

The API only runs as a Netlify Function, so local development uses the Netlify CLI
(it runs the functions and the Vite dev server together):

```bash
npm install
npm install -g netlify-cli   # one-time
netlify dev
```

Open the URL it prints (usually http://localhost:8888). The first time you visit,
you'll be asked to create your account (email + password) — this only works once;
after that, it's a normal login screen.

## 4. Deploy to Netlify

**Option A — via GitHub (recommended):**

1. Push this project to a new GitHub repository.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build command: `npm run build`, publish directory: `dist` (already set in `netlify.toml`).
4. Under **Site configuration → Environment variables**, add `MONGODB_URI` and `JWT_SECRET`.
5. Deploy. Visit your site, set your login on first visit.

**Option B — via CLI, no GitHub:**

```bash
npm install -g netlify-cli
netlify init          # or: netlify deploy --build --prod
```

Set the same two environment variables in the Netlify dashboard (or via
`netlify env:set MONGODB_URI "..."` and `netlify env:set JWT_SECRET "..."`) before deploying.

## How the pieces fit together

- `netlify/functions/api.js` — one Express app (auth, transactions, cash ledger, savings,
  dashboard aggregation), bundled as a single serverless function and mounted at `/api/*`
  via a redirect in `netlify.toml`.
- `netlify/functions/models.js` — Mongoose schemas: `User`, `Transaction` (income/expense —
  salary is just an income entry with category "Salary"), `CashEntry` (lent/borrowed, with a
  settled flag), `SavingsGoal` (with embedded contributions).
- `src/` — the React app: a dashboard, and one page each for income, expenses, cash, and
  savings, all talking to the API through `src/api.js`.

## Notes

- This is intentionally single-user: the `/auth/register` endpoint locks itself once a user
  exists, so there's no open signup form sitting on the internet.
- All money amounts are stored as plain numbers in one currency — if you need multi-currency,
  that's the main place to extend the `Transaction`/`CashEntry` schemas.
