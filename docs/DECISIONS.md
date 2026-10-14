# Decisions

One entry per decision that the code or README shows. The repository starts with a single
commit, "Initial open-source release", on 2026-10-13, so every entry carries that date: it is
when the decision was published, not necessarily when it was first made. Earlier history is
not in the repo. Each entry names the code that shows it.

---

## 1. One Next.js server for the web app and the API

- **Date:** 2026-10-13
- **Decision:** Build everything as one Next.js 16 App Router app: pages, JSON API routes, the
  MCP server and the OAuth endpoints are all route handlers in `src/app/`. Ship it as Next's
  standalone output (`next.config.ts`, `Dockerfile`).
- **Options weighed:** a separate API server next to a front end; one full-stack app.
- **Why:** one codebase and one deployable. The README's hosting notes describe a single
  Node server app, and the Dockerfile builds one image that listens on port 8080.

## 2. MongoDB as the only datastore, with embedded arrays

- **Date:** 2026-10-13
- **Decision:** Store everything in one MongoDB database through Mongoose (`src/models/`,
  `src/lib/db.js`). Keep workspace members and invites, project members, board columns and
  project files as arrays inside their parent document.
- **Options weighed:** a relational database with join tables; separate collections for
  memberships and files.
- **Why:** one document holds what a page needs (a project with its members, columns and
  files). The README says MongoDB is required "for now". The cost is the 16 MB document cap
  on those arrays (see `SYSTEM-DESIGN.md`).

## 3. Signed JWT cookies for sessions, checked twice

- **Date:** 2026-10-13
- **Decision:** A successful sign-in sets an `httpOnly` cookie holding an HS256 JWT valid
  7 days (`src/lib/auth.js`). `src/proxy.js` checks it on every request as an optimistic gate,
  and protected routes check it again.
- **Options weighed:** sessions stored in the database; a signed token with no server state.
- **Why:** no session table to read on each request, and any instance can verify any
  request. The trade-off is that a token cannot be revoked before it expires. Production
  refuses to sign or verify sessions without `JWT_SECRET`; the built-in secret is for `npm run dev` only, because
  anyone who knows it could forge a session.

## 4. Password sign-in only; Google sign-in retired

- **Date:** 2026-10-13
- **Decision:** Sign in with email or username and password (bcrypt). Google sign-in is gone;
  `User.authProvider` and `User.googleId` remain for old accounts, which set a password
  through "Forgot password?" (`src/app/api/auth/login/route.js`).
- **Options weighed:** keep an outside identity provider; passwords only.
- **Why:** the code records the retirement but not its reason. What it shows is that the app
  now needs no identity-provider setup to run.

## 5. A stateless Streamable HTTP MCP server

- **Date:** 2026-10-13
- **Decision:** `/api/mcp` builds a new MCP server and transport for every POST, with no
  session id (`src/app/api/mcp/route.js`). The API key is accepted only in the
  `Authorization` header.
- **Options weighed:** the earlier in-memory map of transports plus a legacy SSE transport;
  a stateless transport.
- **Why:** the code comment says the old design broke intermittently in production when
  requests landed on different server instances, and leaked the API key into the SSE
  endpoint URL. Stateless requests work on any instance and keep the key out of URLs and logs.

## 6. OAuth with dynamic registration and PKCE S256; the access token is an API key

- **Date:** 2026-10-13
- **Decision:** Implement OAuth 2.0 discovery (`/.well-known/*`), dynamic client
  registration, an approval page and an authorization-code token endpoint
  (`src/app/api/oauth/*`). PKCE is required and only S256 is accepted. The token issued is a
  normal API key.
- **Options weighed:** API keys only; OAuth with pre-registered clients; OAuth with dynamic
  registration.
- **Why:** AI assistants such as Claude and ChatGPT discover and register themselves, so no
  client ids or redirect URLs are hard-coded (README). Reusing API keys means the MCP server
  has one way to authenticate.

## 7. Connector tokens do not expire

- **Date:** 2026-10-13
- **Decision:** The token endpoint returns no `expires_in` and no refresh token; the key lasts
  until it is deleted (`src/app/api/oauth/token/route.js`).
- **Options weighed:** short-lived access tokens with refresh tokens; long-lived revocable keys.
- **Why:** simpler for clients and for the server, which already validates API keys. The
  cost: a leaked token stays valid, and the app has no screen yet to list or revoke keys.

## 8. Billing per user; a workspace takes its owner's plan

- **Date:** 2026-10-13
- **Decision:** Keep the plan on `User.subscription`. A workspace's effective plan is its
  owner's plan (`resolveOrgPlan` in `src/app/api/mcp/route.js`). `Organization.plan` and the
  Stripe fields on `Organization` are legacy; the portal route falls back to them for older
  subscribers and copies the customer id onto the user.
- **Options weighed:** billing per workspace; billing per user.
- **Why:** code comments refer to a "per-user billing migration". One subscription covers all
  of a user's workspaces, as the billing page says.

## 9. Stripe is optional and the server chooses the Price

- **Date:** 2026-10-13
- **Decision:** Read Price ids from `STRIPE_PRICE_PRO` and `STRIPE_PRICE_TEAM`. Checkout takes
  a plan name, never a Price id. Without `STRIPE_SECRET_KEY` everyone stays on Free and
  upgrades answer 503 (`src/lib/stripe.js`, `src/app/api/billing/*`).
- **Options weighed:** Price ids in code; Price ids from the client; Price ids from the
  server's environment.
- **Why:** anyone running the open-source app uses their own Stripe account, and a caller
  cannot check out against an arbitrary Price in that account.

## 10. Plan limits live in code and are metered on the connector

- **Date:** 2026-10-13
- **Decision:** Count connector calls per workspace per calendar month in `McpUsage` and stop
  at the plan limit (Free 100, Pro 1,000, Team unlimited). Limit workspace and project
  creation through the connector by plan.
- **Options weighed:** limits in the database per workspace (`Organization.limits` exists but
  is never read); limits in code.
- **Why:** the README says limits live in code. As built, only the connector enforces them;
  the project, member, storage and AI-call limits on the billing page are not enforced in the
  web app.

## 11. Any S3-compatible bucket for files, members only

- **Date:** 2026-10-13
- **Decision:** Store project files and attachments in a bucket configured by generic
  `STORAGE_*` variables (`src/lib/storage.js`). The UI uploads through the server
  (`/api/upload/direct`); API clients can get a presigned PUT (`/api/upload`) with the size
  signed in. Only project members may upload; files are capped at 25 MB.
- **Options weighed:** the server's own disk; one specific storage provider; any
  S3-compatible bucket.
- **Why:** a server app's disk is not kept between deploys (README), and a generic S3
  configuration works with whichever provider the operator picks.

## 12. Email through Harakumo Mail, never blocking

- **Date:** 2026-10-13
- **Decision:** Send every email with one HTTP call to Harakumo Mail using
  `HARAKUMO_API_KEY` (`src/lib/harakumo.js`, `src/lib/email.js`). A failure is logged and the
  action that caused it still succeeds.
- **Options weighed:** an SMTP server; an email provider SDK; one HTTP API key.
- **Why:** one key and no mail server to run. Invites are saved even when the email fails.

## 13. The AI assistant runs on Gemini through the AI SDK, with tools

- **Date:** 2026-10-13
- **Decision:** `/api/chat` streams `gemini-flash-latest` through the AI SDK (`ai`,
  `@ai-sdk/google`) with 13 tools that read and change the active workspace, up to 5 steps
  per message, and streams the model's thought summaries to the page.
- **Options weighed:** a chat that only answers; an assistant that acts through tools.
- **Why:** the product's point is an AI project manager that creates projects and tasks,
  assigns people, moves cards and writes docs (README). The system prompt tells it to propose
  one complete plan and act on confirmation.

## 14. Long-term memory by compressing old messages

- **Date:** 2026-10-13
- **Decision:** Keep one conversation per user per workspace. Above 40 messages, extract facts
  and a summary with Gemini into `ChatMemory`, keep the last 15 messages, and put the memory
  into the next system prompt.
- **Options weighed:** send the full history every time; drop old messages; summarize into
  memory.
- **Why:** context carries across conversations without the prompt growing without bound
  (README: "compresses long chats").

## 15. AI diagrams are SVG inside Markdown, shown as images

- **Date:** 2026-10-13
- **Decision:** Store generated diagrams as SVG between `<!-- SVG_VISUAL -->` markers in the
  doc's Markdown, and render them as `<img>` data URIs
  (`src/app/dashboard/projects/[id]/docs/page.js`).
- **Options weighed:** inject the SVG into the page as HTML; render it as an image.
- **Why:** doc content can come from any editor or the connector. The code comment explains
  that image-loaded SVG runs in a static mode with no scripts, which neutralizes stored XSS.

## 16. Rate limits kept in MongoDB, failing open

- **Date:** 2026-10-13
- **Decision:** Fixed-window counters in the `RateLimit` collection, updated with one atomic
  pipeline update and swept by a TTL index (`src/lib/rateLimit.js`). If the check fails, the
  request is allowed.
- **Options weighed:** in-memory counters; a separate cache service; the existing database.
- **Why:** counters hold across restarts and instances without another service (README). It
  fails open so a database outage does not lock everyone out of sign-in.

## 17. No realtime transport

- **Date:** 2026-10-13
- **Decision:** No websockets or server-sent events. The top bar polls notifications every
  5 minutes and when the tab regains focus; pages refetch after the user's own changes.
- **Options weighed:** push updates to open boards; poll.
- **Why:** the code comment records slowing the poll from 30 seconds to 5 minutes. Nothing in
  the repo explains the choice beyond that.

## 18. Indexes declared on the models, with a script to build them

- **Date:** 2026-10-13
- **Decision:** Declare indexes in each schema, let Mongoose build them on first use, and
  provide `npm run db:indexes` (`scripts/ensure-indexes.mjs`) to build them before a deploy.
- **Options weighed:** build on first use only; manage indexes by hand.
- **Why:** on a large collection, building an index during live traffic is slow; the script is
  idempotent and runs ahead of time.

## 19. Open source under MIT, keeping the old `pw_` prefixes

- **Date:** 2026-10-13
- **Decision:** Publish the code under the MIT licence as Waklum. Keep the `pw_sk_` API-key
  and `pw_client_` client-id prefixes from the project's earlier name, ProjectWrite.
- **Options weighed:** rename the prefixes; keep them.
- **Why:** the README gives the history of the prefixes; changing them would change the format
  of keys and client ids already issued. The repo does not state a reason for open-sourcing
  beyond publishing it on Nucleus with instructions to run it yourself.

## 20. Vendor-neutral, self-hostable configuration

- **Date:** 2026-10-13
- **Decision:** Every outside service is configured by environment variables documented in
  `.env.example`; storage uses generic `STORAGE_*` names; all public links come from
  `NEXT_PUBLIC_APP_URL`; no client ids or redirect URLs are hard-coded; the Docker build needs
  no secrets. Each optional service degrades to a clear message when it is missing.
- **Options weighed:** settings tied to one deployment; neutral settings anyone can fill in.
- **Why:** anyone running the open-source code brings their own database, bucket, AI key, mail
  key and Stripe account.

## 21. Security hardening in the released code

- **Date:** 2026-10-13
- **Decision:** The first public commit includes these protections, each explained in a code
  comment:
  - one central redirect-URI check for `/authorize` and `/approve` (`OAuthClient.findForRedirect`);
  - PKCE required with S256 only, codes bound to their client and redirect URI, single-use
    redemption in one atomic update, and revocation of the minted key on replay;
  - an approval page that escapes the self-chosen client name, shows where approval is sent,
    and cannot be framed;
  - API keys only in the `Authorization` header, never in a URL;
  - uploads limited to project members, with the size signed into presigned URLs;
  - checkout restricted to the server's own Price ids;
  - `JWT_SECRET` required in production;
  - rate limits on sign-in, sign-up, password reset and the contact form;
  - HTML escaping in emails and image-only rendering of stored SVG.
- **Options weighed:** publish as-is; harden the OAuth, upload and billing paths first.
- **Why:** an open repository and an OAuth endpoint that AI assistants register with are both
  exposed to anyone. Gaps that remain are listed under "Known gaps" in `SYSTEM-DESIGN.md`.
