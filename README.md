This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication (NextAuth) + Neon (Postgres) setup

This project includes a sample NextAuth configuration using the Prisma adapter and Google OAuth. It expects a Postgres-compatible `DATABASE_URL` (for example a Neon DB) in your environment.

Steps to enable locally:

1. Install the required dependencies:

```bash
npm install next-auth @next-auth/prisma-adapter prisma @prisma/client
```

2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET`.

3. Push Prisma schema to the database:

```bash
npx prisma db push
```

4. Run the dev server:

```bash
npm run dev
```

5. Visit `/login` to sign in or `/signup` to create a new account.

The app supports:

- Google sign-in
- Email/password sign-up and login
- Storing user accounts in the Neon/Postgres database via Prisma and NextAuth

Notes:

- The NextAuth route is at `/api/auth/[...nextauth]` and uses the Prisma adapter to persist sessions and accounts.
- If you deploy to production, ensure `NEXTAUTH_URL` is set and `NEXTAUTH_SECRET` is a secure random string.
