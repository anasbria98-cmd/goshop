# Goshop.ma / GO ELEC

Production-oriented Moroccan electrical ecommerce storefront built with Next.js App Router, TypeScript, Supabase Postgres, Auth, Storage, and Row Level Security.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill the three keys.
3. Apply all files in `supabase/migrations` in filename order. The third migration enforces safe order status transitions and stock release/restocking.
4. Run `supabase/seed.sql`. It creates the GO ELEC category hierarchy, dynamic filter definitions, and store settings. It creates no products.
5. Promote the first administrator once, from the SQL editor:

```sql
update public.profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

6. Start the app:

```sh
npm ci
npm run dev
```

In Supabase Auth URL Configuration, set the production Site URL and add `https://your-domain/auth/callback` plus `http://localhost:3000/auth/callback` to Redirect URLs. Keep email confirmation enabled for production.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `SUPABASE_SECRET_KEY`: server-only secret/service key. Never expose this to the browser.

## Architecture

- `supabase/migrations`: normalized commerce schema, constraints, indexes, triggers, RLS, Storage policies, inventory RPC, and atomic checkout RPC.
- `supabase/seed.sql`: real navigation hierarchy and configuration defaults; no demo products.
- `lib/supabase`: browser, authenticated server, and server-only privileged clients.
- `lib/catalog.ts`: database-backed storefront catalogue adapter.
- `app/admin`: protected operational dashboard and management screens.
- `app/api/cart` and `app/api/favorites`: persistent cart and favorites synchronization.
- `lib/category-navigation.ts`: shared database-driven desktop, mobile and all-categories navigation. Admin category settings control visibility, hierarchy and ordering.

Product prices and inventory are always recalculated by the database during checkout. Client totals are display-only. Checkout creates pending orders and reserves stock; it never invents a successful payment.

## Checks

```sh
npm run typecheck
npm run lint
npm run build -- --webpack
```

The default Turbopack build may require local worker port permissions. The Webpack build is the deterministic CI fallback.

## Deployment

This application requires a Next.js server runtime. It is no longer a static export. Configure all three environment variables on the hosting platform before building. Apply migrations and seed data before exposing the storefront. The legacy `.openai/hosting.json` describes the previous static prototype and must not be used for this dynamic release.
