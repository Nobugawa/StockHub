# Private Stock Research Database

Private single-user research dashboard for retaining stock candidates, dated fundamentals, news, insider/institutional activity, technical screen results and research notes.

## Design principles
- Persistent Postgres data; research is stored as dated snapshots, not overwritten.
- Private authentication via Supabase email/password.
- Password visibility toggle on login.
- Browser receives only the Supabase publishable key; never put a secret/service-role key in the frontend.
- Row Level Security enabled on every table; anonymous access revoked.
- `noindex, nofollow, noarchive, nosnippet` metadata for the site.
- Technical screen definitions are data, so new screens can be added without redesigning the database.
- Permanent universe floor is stored centrally: US stocks, NYSE/NASDAQ/AMEX, price >= $5, market cap >= $300M. Average daily dollar-volume threshold is left configurable because no exact floor is encoded here.

## Included data model
`stocks`, `fundamental_snapshots`, `research_snapshots`, `screen_definitions`, `technical_snapshots`, `news_items`, `insider_activity`, `institutional_activity`, `screen_runs`, `screen_hits`, `app_settings`.

## Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Authentication, create the one authorized user. Disable public sign-ups if this is to remain single-user.
4. Copy `.env.example` to `.env.local` and add the project URL + **publishable** key.
5. Run `npm install`, then `npm run dev`.
6. Deploy to Netlify. Put the two VITE variables in Netlify environment variables, not source control.

## Netlify
`netlify.toml` sets the Vite build command to `npm run build`, publishes `dist`, uses Node 20, and adds the SPA fallback so deep links do not return Netlify's generic 404.

## Important security note
The eye icon only shows/hides what is typed into the password field; it is not the security boundary. The real protection is Supabase Auth + database RLS + no anonymous grants. Search-engine `noindex` is an additional privacy convention, not authentication.

## Maintaining data with ChatGPT
The production database is separate from this chat. ChatGPT can research candidates and produce/update structured records, but direct database writes require an authorized connection to the Supabase project (for example, a connected Supabase MCP/integration or a secure app-side ingestion mechanism). Until that is connected, the web UI can write directly after login, and ChatGPT can generate import-ready records/migrations without needing database secrets in chat.

## Next build layer
- Structured “Add Research Update” form that writes fundamentals/news/technical/ownership in one transaction.
- Saved screen-run page showing every symbol that hit RSI7, MA, MACD, etc. on each run date.
- Compare snapshots over time.
- Automatic staleness flags.
- Import/export CSV/JSON.
- Source-link capture for every research fact.
