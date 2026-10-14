# Waklum

AI-native project management. Workspaces, projects, Kanban boards and docs, with an AI
project manager built in, and an MCP connector so Claude, ChatGPT or any MCP client can
create and update your projects, tasks and docs straight from a conversation.

Next.js 16 (App Router) + MongoDB (Mongoose) + any S3-compatible bucket. Open source under
the MIT licence. (The project started life as ProjectWrite, which is why API keys and
OAuth client ids start with `pw_`.)

## Features

**Workspaces and teams**: create workspaces (organizations), invite people by email and
give them a role: owner, admin, manager, member or guest. Projects have their own members
and roles (owner, admin, member, viewer); permissions are checked server-side
(`src/lib/permissions.js`, `src/lib/rbac.js`).

**Projects and tasks**: a Kanban board with drag and drop (backlog, to do, in progress,
review, done), plus list, timeline and summary views. Tasks carry a priority, a due date,
several assignees, comments, attachments and an activity history. Assigning someone
notifies them in the app and by email.

**Docs and files**: project docs, written by you or by the AI (which can embed generated
SVG diagrams), and a project file area with folders.

**AI project manager**: an in-app assistant (Gemini) that reads your workspace and acts on
it with tools: create projects and tasks, assign people, move cards, write docs. It keeps
long-term memories of your preferences and decisions and compresses long chats, so
context carries across conversations.

**MCP connector**: `/api/mcp` is a stateless Streamable HTTP MCP server with tools to list
and create organizations, projects, tasks and docs, and to update tasks and docs. Clients
connect with an API key (Settings → API keys, sent as a Bearer token) or through the
built-in OAuth 2.0 flow: discovery metadata under `/.well-known/`, dynamic client
registration, PKCE (S256) and an approval page. No client ids or redirect URLs are hard-coded;
clients register their own.

**Also**: notifications, workspace analytics, a command palette, search, a contact form,
an admin dashboard (users, workspaces, subscriptions, contact messages) for the addresses
in `ADMIN_EMAILS`, and optional Stripe billing.

### Plans

Limits are per user plan and live in code (`src/lib/stripe.js`, `src/app/api/mcp/route.js`,
`src/app/dashboard/billing/page.js`):

| Plan | Workspaces | Projects | Members | MCP calls / month |
| --- | --- | --- | --- | --- |
| Free | 1 | 2 | 3 | 100 |
| Pro | 3 | unlimited | 25 | 1,000 |
| Team | unlimited | unlimited | unlimited | unlimited |

Without Stripe configured everyone stays on Free and the upgrade buttons answer "Billing is
not configured on this server". To sell plans, create a monthly Price per paid plan in your
own Stripe account, set `STRIPE_PRICE_PRO` and `STRIPE_PRICE_TEAM`, and point a Stripe
webhook at `/api/billing/webhook` with the `checkout.session.completed`,
`customer.subscription.updated` and `customer.subscription.deleted` events.

## Getting started

Requirements: Node 20.9 or newer and a MongoDB database.

```bash
npm install
cp .env.example .env.local   # set MONGODB_URI at least
npm run dev
```

Open http://localhost:3000 and sign up. Every variable is documented in `.env.example`:

- `MONGODB_URI` (required) and `JWT_SECRET` (required in production).
- `NEXT_PUBLIC_APP_URL`: the public origin. Email links, the OAuth metadata AI assistants
  read and the connector URL on the home page are built from it. It is inlined at build
  time, so set it before `npm run build`.
- `GOOGLE_GENERATIVE_AI_API_KEY`: a Gemini key for the AI assistant and diagrams.
- `STORAGE_*`: any S3-compatible bucket for project files and attachments (up to 25 MB
  per file; only members of a project can upload to it).
- `HARAKUMO_API_KEY`: email (invites, password resets, notifications) through Harakumo
  Mail.
- `ADMIN_EMAILS` and the optional `STRIPE_*` values.

Indexes declared on the models are built on first use. On a database that already holds a
lot of data, build them before deploying a change with `npm run db:indexes`.

Production: `npm run build && npm start`, or the `Dockerfile` (standalone output, listens on
port 8080; pass `NEXT_PUBLIC_APP_URL` as a build arg).

## Run Waklum on Harakumo

Waklum is open source (MIT) and is published on
[Nucleus](https://nucleus.harakumo.com/-/explore), Harakumo's code home. Its email already
goes through Harakumo Mail (`src/lib/harakumo.js`, one `HARAKUMO_API_KEY`).

Waklum is a Node server (Next.js), so on Harakumo it runs as a **server app (Pro plan and
up)**, not a static site.

1. **Create a project** at [harakumo.com/dashboard](https://harakumo.com/dashboard) →
   Projects → New project.
2. **Create an API key** (Settings → API keys) and add it to the project's environment as
   `HARAKUMO_API_KEY`. Turn on Mail for the project so invites and password resets go out.
3. **Add the rest of the environment** (Project → Environment), from `.env.example`:
   - `MONGODB_URI`: a MongoDB database (include the database name in the path). MongoDB is
     required for now: Waklum stores everything in it.
   - `JWT_SECRET`: a long random string (`openssl rand -hex 32`).
   - `NEXT_PUBLIC_APP_URL`: the project's public URL, so email links and the connector
     point at it.
   - The S3-compatible `STORAGE_*` values. Uploads must go to object storage: a server
     app's disk is not kept between deploys.
   - Optional: `GOOGLE_GENERATIVE_AI_API_KEY` for the AI features, `ADMIN_EMAILS`, and the
     `STRIPE_*` values for billing.
4. **Deploy** from the folder with the CLI, or ask your AI assistant with the Harakumo
   connector:

   ```bash
   npm i -g @harakumo/cli
   harakumo login --key <your API key>
   harakumo deploy <project id> .
   ```

   Every deploy is saved as a commit in the project's private Nucleus repo.

Then add `https://<your app>/api/mcp` as a custom connector in Claude or ChatGPT and approve
access on the page it opens.

Notes:

- **Your MongoDB must accept the server's connections**: allow its address range, and use a
  database user limited to this database with a long password.
- **Rate limits**: sign-up, sign-in, password reset and the contact form are limited per IP.
  The counters live in MongoDB (`src/lib/rateLimit.js`), so they hold across restarts and
  instances.

## Project layout

```
src/
  app/                 pages (App Router) and API routes
    api/mcp/           the MCP server
    api/oauth/         OAuth: register, authorize, approve, token
    .well-known/       OAuth discovery metadata
    api/chat/          the in-app AI assistant
    dashboard/         the signed-in app
    admin/             admin dashboard (ADMIN_EMAILS)
  components/          UI
  lib/                 auth, database, permissions, email, storage, Stripe, rate limits
  models/              Mongoose models
  proxy.js             sign-in gate for pages and API routes
scripts/
  ensure-indexes.mjs   builds every declared index (npm run db:indexes)
```

## Licence

MIT, see [LICENSE](LICENSE).
