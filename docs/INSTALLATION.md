# MindClash Installation Guide (Teammates)

This guide is for teammates cloning the project from GitHub for the first time.

## 1) Prerequisites

Install these tools before setup:

- Node.js `20.x` or newer
- npm `10.x` or newer
- Git
- A Clerk account/project (for auth keys)
- Convex account/project (for deployment URL and local dev linkage)

Verify your environment:

```bash
node -v
npm -v
git --version
```

## 2) Clone the repository

```bash
git clone https://github.com/P4ndro/MindClash.git
cd MindClash/mindclash
```

If your folder name differs, just make sure you run commands where `package.json` exists.

## 3) Install dependencies

```bash
npm install
```

## 4) Configure environment variables

Copy the template and fill real values:

```bash
cp .env.example .env.local
```

Windows PowerShell alternative:

```powershell
Copy-Item .env.example .env.local
```

Required values in `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

Optional admin bootstrap:

```env
ADMIN_CLERK_IDS=
```

Notes:
- Keep `.env.local` private. Never commit secrets.
- `CLERK_FRONTEND_API_URL` is the Clerk instance domain (issuer).
- `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` come from `npx convex dev` after linking.

## 5) Start local services

Open two terminals from `mindclash/`:

Terminal 1:

```bash
npx convex dev
```

Terminal 2:

```bash
npm run dev
```

App runs on `http://localhost:3000`.

## 6) Quick verification checklist

- App loads at `http://localhost:3000`.
- You can sign in through Clerk.
- Matchmaking page loads topics/options.
- Starting matchmaking routes to `/arena?matchId=...`.

For full realtime verification, run:
- `docs/DUEL_CERTIFICATION_CHECKLIST.md`

## 7) Common setup issues

- **Missing env keys**: app shows auth or Convex errors on load/actions.
- **Wrong Convex deployment**: queries/mutations fail or point to wrong data.
- **Profile not synced yet**: first sign-in may need a short wait before matchmaking unlocks.
- **Port in use**: change or free port `3000` before running `npm run dev`.

## 8) Team onboarding recommendation

When a new teammate joins:

1. Share `.env.example`-based setup steps only (never raw secrets in chat).
2. Rotate any leaked credentials immediately.
3. Ask them to run at least one duel certification pass before shipping gameplay changes.
