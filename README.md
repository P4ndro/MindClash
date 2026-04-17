# MindClash

MindClash is a real-time 1v1 math battle game where two players race to solve the same questions quickly and accurately.

## Tech Stack

- Next.js (App Router)
- React
- Clerk (authentication)
- Convex (backend + realtime database)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
copy .env.example .env.local
```

3. Fill in values in `.env.local` from Clerk and Convex:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_FRONTEND_API_URL=https://your-instance.clerk.accounts.dev
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

4. Start Convex and the Next.js app:

```bash
npx convex dev
npm run dev
```

## Project Notes

- Authentication is wired through Clerk.
- User data is stored in Convex (`convex/schema.ts`).
- App entry files are in `src/app`.

## Security and Safe Publishing

- Never commit real secrets. Keep them only in `.env.local`.
- `.env.local`, `env.local`, `.next`, and `node_modules` are ignored by git.
- If a secret was ever exposed, rotate it immediately in Clerk/Convex dashboards before publishing.
