# Campus Exchange

Campus Exchange is an industrial-style student marketplace for a single campus. It is built with React, Vite, React Router, Lucide, and a Supabase-ready data boundary.

## Run locally

```bash
npm install
npm run dev
```

The app runs immediately in demo mode. Listings, saves, and newly published listings are persisted in the browser with `localStorage`, so the core experience can be explored without credentials.

## Connect Supabase

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and anonymous key from Supabase.
3. Use `src/lib/supabase.js` as the shared client for Auth, Postgres listings, Storage uploads, and protected enquiries.

The current UI intentionally keeps the demo fallback usable when those variables are absent. Before production, replace the local persistence in `src/main.jsx` with Supabase queries and add Row Level Security policies for:

- Public reads of active listings.
- Insert/update/delete only for the listing owner.
- Private enquiries visible only to the buyer and seller.
- Reports visible to moderators.
- Storage upload paths scoped to the authenticated user.

## Authentication

The app now opens with a login page. When Supabase is configured, sign-in and account creation use Supabase Auth and sessions persist across reloads. Enable email/password authentication in the Supabase dashboard, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

Without Supabase credentials, the app runs in demo mode: any email and password with at least six characters can create a browser-local demo session. This fallback is for local exploration only and is not production authentication.

## Main flows

- Search, category browsing, condition/type filters, and saved items.
- Listing detail view with seller context and enquiry entry point.
- Publish a listing with title, category, price, condition, type, and description.
- Responsive navigation, empty states, toast feedback, and account/message panels.

The visual system is defined in `src/styles.css` using the `--dp-*` industrial design tokens from the product brief.
