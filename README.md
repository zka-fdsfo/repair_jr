# RepairBot

AI chatbot for a device repair company (FoneFix). Customers describe their
device and problem; the bot always searches MongoDB first and generates
its reply only from what was actually retrieved — it never invents a
price. Backend calls the Groq REST API directly via `fetch` (no
`groq-sdk` package).

See [docs/](docs/) for the full design (project overview, architecture,
database schema, API contracts, AI tool/prompt design) and
[docs/TRACKER.md](docs/TRACKER.md) for detailed build/verification notes
on every piece below.

## Structure

- `server/` — Express API: chat endpoint (MongoDB retrieval → single Groq
  call, no tool-calling loop), admin CRUD for pricing data, MongoDB models
- `client/` — React + Vite chat widget
- `docs/` — design docs and the progress tracker

## Prerequisites

- Node.js 18+
- A MongoDB database (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster) — connection string as `MONGODB_URI`
- A [Groq](https://console.groq.com) API key

## Setup

### 1. Server

```
cd server
npm install
cp .env.example .env
```

Fill in `server/.env`:

| Variable              | Required | Notes                                                                                      |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `MONGODB_URI`          | yes      | Local (`mongodb://localhost:27017/repairbot`) or Atlas connection string                    |
| `GROQ_API_KEY`         | yes      | From console.groq.com                                                                        |
| `PORT`                 | yes      | Use **`5000`** — the client's Vite dev proxy is hardcoded to `http://localhost:5000`         |
| `CLIENT_URL`           | no       | Present for a future CORS origin restriction — **not currently read by any code** (`app.js` calls `cors()` with no options, which allows all origins). Leave blank or fill in for when that's wired up. |
| `JWT_SECRET`           | yes      | Any long random string — signs admin login tokens                                            |
| `ADMIN_EMAIL`          | yes      | The email you'll log in to `/api/admin/login` with                                           |
| `ADMIN_PASSWORD_HASH`  | yes      | A **bcrypt hash** of your admin password, not the plain password — generate one with:        |

```
node -e "require('bcryptjs').hash('your-chosen-password', 10).then(console.log)"
```

Run that from inside `server/` (so it can resolve `bcryptjs` from `node_modules`), then paste the output into `ADMIN_PASSWORD_HASH`.

### 2. Load pricing data

```
npm run import-data
```

Reads `server/src/seed/fonefix_rag_dataset.jsonl`, clears the `kb_entries` collection, and re-inserts all 87 records (device/brand/problem catalogs + price tiers). Safe to re-run any time the dataset changes.

### 3. Run the server

```
npm start        # or: npm run dev   (auto-restarts on file changes)
```

Starts on `http://localhost:5000`. Check it's alive: `curl http://localhost:5000/api/health` → `{"status":"ok"}`.

### 4. Client

In a second terminal:

```
cd client
npm install
npm run dev
```

Opens the Vite dev server (default `http://localhost:5173`), which proxies `/api/*` requests to the server on port 5000. Open that URL in a browser to use the chat widget.

## Admin API

Get a token, then use it for `kb_entries` management:

```
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-chosen-password"}'

curl http://localhost:5000/api/admin/kb-entries \
  -H "Authorization: Bearer <token from above>"
```

Supported: `GET /api/admin/kb-entries` (list, optional `?type=`), `GET /api/admin/kb-entries/:entryId`, `POST /api/admin/kb-entries` (create), `PUT /api/admin/kb-entries/:entryId` (update). Delete is intentionally not implemented.

## Known limitations

- The full chat → MongoDB retrieval → Groq → price flow has not been manually verified end-to-end with real credentials (this was built/tested in an environment with no live `GROQ_API_KEY` or `MONGODB_URI`). Once you're running with real ones, sanity-check both: a serviced + priced combo (e.g. "how much to fix a cracked screen on iPhone 15 Pro Max") should return a real price; a serviced-but-unpriced combo (e.g. "iPhone 12 screen") should get an honest "no price on file, let me connect you to a technician" reply, never an invented number. See `docs/TRACKER.md` Phase 4 and Phase 8 for details.
- Retrieval is recall-oriented and keyword-based, not a full device-model parser. A query with no number in it at all (e.g. "how much for an apple screen fix") can still surface *a* price match without certainty it's the exact device meant — the system prompt's "ask a follow-up if ambiguous" instruction is the only backstop, and that specific behavior hasn't been verified against a real Groq call. Queries that do include a model number (the common case) are protected: the quote shown to the client is gated so it can never present a price for a different model number than what was actually asked about.
- `CLIENT_URL` is not yet wired into CORS — see the table above.
- The client's `npm install` reports a moderate esbuild/Vite dev-server advisory; fixing it requires a breaking Vite 5→8 upgrade, not done here.
- Admin `kb_entries` routes have no delete.
- Rate limiting on `POST /api/chat` is a simple in-memory per-IP counter (20 req/min) — fine for one server instance, won't coordinate across multiple instances/processes.

Full build history, verification steps, and every deviation from the original plan are logged in [docs/TRACKER.md](docs/TRACKER.md).
