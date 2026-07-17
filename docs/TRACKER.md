
# RepairBot — Progress Tracker

> **Note:** this is a draft tracker generated from the folder-structure
> message alone — the actual TRACKER.md referenced as "attached" wasn't
> received. Replace this file with the real one, or confirm this draft is
> fine to build from.

## How to use this file

Work proceeds in small numbered steps ("pages"). Each session:
1. Read this file to find the next unchecked step.
2. Implement only that step.
3. Check it off and note any deviations before ending the session.

## Phase 0 — Scaffold

- [x] Folder structure created (`server/`, `client/`, `docs/`)
- [x] Root `CLAUDE.md`, `README.md`, `.gitignore`
- [x] `docs/01`–`05` placeholders created
- [ ] Real `docs/01-PROJECT-OVERVIEW.md` content
- [ ] Real `docs/02-ARCHITECTURE.md` content
- [ ] Real `docs/03-DATABASE-SCHEMA.md` content
- [ ] Real `docs/04-API-CONTRACTS.md` content
- [ ] Real `docs/05-AI-TOOLS-AND-PROMPT-DESIGN.md` content

## Phase 1 — Server foundation

- [x] Step 1.1 — Project init: `server/` ESM project, `package.json`
      (express, mongoose, dotenv, cors), `server/src/` folder skeleton,
      root `.gitignore`. Verified: `npm install` succeeds, all four deps
      import cleanly under ESM.
- [x] Step 1.2 — `server/src/app.js` (json body parser, cors, `/health`
      route) + `server/src/server.js` entrypoint (loads env, calls
      `connectDB()` stub, listens on `process.env.PORT`). Real Mongo
      connection is Step 1.3. Verified: server boots, `GET /health`
      returns `{"status":"ok"}`.
- [x] Step 1.3 — `server/src/config/db.js` — `connectDB()` calls
      `mongoose.connect(process.env.MONGODB_URI)`, logs success, logs +
      `process.exit(1)` on failure. Already wired into `server.js` from
      Step 1.2. Verified: failure path only (unreachable URI → error
      logged, exit code 1, server never reaches `listening`). No local
      MongoDB/Atlas instance available to verify the success path in this
      environment — worth a manual check once `MONGODB_URI` is set.
- [x] Step 1.4 — Added `GET /api/health` (returns `{"status":"ok"}`) to
      `app.js`; created `server/.env.example` with `MONGODB_URI`,
      `GROQ_API_KEY`, `PORT`, `NODE_ENV`, `CLIENT_URL` placeholders (no
      real values). Verified: see Session Log — tested `app.js` directly
      since no live `MONGODB_URI` is configured in this environment yet.
      **Phase 1 complete.**

Not yet scheduled (were assumed part of Phase 1 in this file's earlier
draft, but the real Step 1.4 closed the phase without them — pick up
later if/when a step calls for them):
- [x] `server/src/middleware/errorHandler.js` — done as part of Phase 7's
      "Error states, loading states" item below, not here; see there.
- [ ] `server/src/middleware/rateLimiter.js`
- [ ] `server/src/utils/logger.js`

## Phase 2 — Data models

> This file's earlier draft assumed separate `Device`/`Part`/`PricingRule`
> models filled by a generated `seed.js`. The real design (per
> `docs/03-DATABASE-SCHEMA.md`) uses a single flexible `kb_entries`
> collection imported from real data instead — Steps 2.1–2.3 merged into
> one step below. `server/src/seed/seed.js` remains an unused stub.

- [x] Step 2.1 (import) — `server/src/models/KbEntry.js` (single
      `strict: false` schema covering `price`/`device_catalog`/
      `brand_catalog`/`problem_catalog` variants, collection `kb_entries`,
      indexes: `{type,model,problem}`, `{type,brand}`, text index on
      `text`) + `server/src/seed/importData.js` (reads
      `fonefix_rag_dataset.jsonl`, splits on `\r\n`, renames `id` →
      `entryId`, flattens `metadata` to top level, converts `price` to
      Number, clears + re-inserts `kb_entries`) + `npm run import-data`
      script. Dataset file was in `~/Downloads/`, not yet in the repo —
      copied into `server/src/seed/fonefix_rag_dataset.jsonl` (87 lines).
      **Phase 2 complete.**

## Phase 3 — Groq integration (raw fetch, no SDK) — complete

- [x] Step 3.1 — `server/src/services/groqService.js` — single exported
      `callGroq(messages, tools)`, POSTs to
      `https://api.groq.com/openai/v1/chat/completions` via native
      `fetch()`, `Authorization: Bearer ${GROQ_API_KEY}`, model
      `"openai/gpt-oss-120b"`, `tool_choice: "auto"`, throws a clear error
      (status + statusText + body) on non-2xx. No `groq` npm package added.
      Verified against the real Groq endpoint (no `GROQ_API_KEY` set in
      this environment): got a genuine `401 Unauthorized` back and
      `callGroq` threw `"Groq API error: 401 Unauthorized — {...invalid_api_key...}"`
      as expected — confirms URL, headers, and error handling are wired
      correctly. Full success-path call still needs a real `GROQ_API_KEY`.
- [x] Step 3.2 — `server/src/services/toolDefinitions.js` — OpenAI
      tools-format array for `find_brand`, `check_device_serviced`,
      `get_repair_cost`, `check_problem_serviced`, matching
      `docs/05-AI-TOOLS-AND-PROMPT-DESIGN.md`. Verified: module imports
      cleanly, all 4 entries have valid `{type:"function", function:{name,
      description, parameters}}` shape with correct `required` arrays.
- [x] Step 3.3 — `server/src/services/mongoTools.js` — implements the 4
      tools against `KbEntry`, with a shared `escapeRegex` +
      `buildFlexibleRegex` helper (escapes special chars for injection
      safety, collapses whitespace to `\s*` for partial matching e.g.
      "15 pro max"). Exports a single `{ find_brand, check_device_serviced,
      get_repair_cost, check_problem_serviced }` dispatch object. Verified
      without a live DB by simulating the same matching logic in-memory
      against the real 87-doc dataset: `find_brand("apple")` → finds Apple;
      `check_device_serviced("apple","15 pro max")` → `{serviced:true,
      deviceLine:"Apple iPhone"}`; unserviced brand ("BlackBerry") → 0
      candidates; `get_repair_cost("iPhone 15 Pro Max","screen damage")` →
      5 price tiers ($100–$225); unpriced combo → correctly empty array;
      `check_problem_serviced("screen damage")` → serviced; regex-injection
      input `".*"` confirmed escaped to a literal, not a wildcard. Real
      Mongo-backed run still pending (no live DB in this environment).
      Known limitation: whitespace-collapsing handles spaced partial
      queries but not fully-concatenated ones like "iphone15promax"
      matching a spaced field — flagging in case that matters later.

## Phase 4 — Chat API

- [ ] `server/src/controllers/chat.controller.js` — **code written, NOT
      checked off.** Implements `POST /api/chat` per docs/04: loads/creates
      a `Conversation` by `sessionId`, appends the user message, runs a
      Groq tool-calling loop (up to 5 iterations, handles 0/1/multiple
      `tool_calls` per turn via `mongoTools` dispatch), saves full message
      history back to Mongo, and sets `quote` only from a `get_repair_cost`
      call that returned non-empty rows this turn. Also created
      `server/src/models/Conversation.js` (wasn't built in Phase 2 —
      Phase 2 only covered the `kb_entries` knowledge base, not chat
      history; needed here).
- [ ] `server/src/routes/chat.routes.js` — **code written, NOT checked
      off.** `POST /api/chat` wired into `app.js` via `app.use("/api",
      chatRoutes)`.
- [ ] Manual test: send a message, get a Groq-backed reply — **BLOCKED.**
      No real `server/.env` exists in this environment (only
      `.env.example` with blank placeholders) — no `GROQ_API_KEY`, no
      `MONGODB_URI`. Verified only what doesn't require live services:
      app boots, route is mounted, and `POST /api/chat` with a missing
      `sessionId`/`message` correctly returns
      `400 {error:true, message:"sessionId and message are required",
      code:"bad_request"}`. Have **not** run the two required real checks
      ("iPhone 15 Pro Max" screen crack → real price; "iPhone 12 screen" →
      no-price-on-file fallback, not an invented number) — per the
      instruction for this step, Phase 4 stays unchecked until that
      actually happens. Needs a real `GROQ_API_KEY` + `MONGODB_URI` (with
      `npm run import-data` already run against it) to complete.

## Phase 5 — Admin API — complete

> `docs/04-API-CONTRACTS.md` only lists `GET /api/admin/devices` and
> `POST /api/admin/pricing` (labeled "Phase 6" there). This step asked for
> broader protected CRUD over `kb_entries` instead — built that, not the
> narrower doc'd routes. Flagging the mismatch rather than silently
> picking one.

- [x] `server/src/controllers/admin.controller.js` + `server/src/middleware/adminAuth.js`
      — JWT auth (`POST /admin/login` checks `ADMIN_EMAIL` +
      `bcrypt.compare` against `ADMIN_PASSWORD_HASH`, signs a JWT with
      `JWT_SECRET`, 12h expiry) and `kb_entries` management: `GET
      /admin/kb-entries` (list, optional `?type=`), `GET
      /admin/kb-entries/:entryId`, `POST /admin/kb-entries` (create,
      rejects duplicate `entryId` or invalid `type`), `PUT
      /admin/kb-entries/:entryId` (update). **Delete intentionally not
      implemented** — only create/update were asked for; flagging in case
      it's wanted later. Added `jsonwebtoken` + `bcryptjs` deps and
      `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`/`JWT_SECRET` to `.env.example`.
- [x] `server/src/routes/admin.routes.js` — wired into `app.js` via
      `app.use("/api", adminRoutes)`.

Verified end-to-end over real HTTP (test `ADMIN_EMAIL`/hash/secret, not
real ones — no live MongoDB in this environment so the actual
`kb_entries` reads/writes are unverified):
- No token / garbage token on a protected route → both `401` with the
  documented error shape
- Login with missing fields → `400`; wrong email → `401`; wrong password
  → `401`; correct credentials → `200` with a `token`
- That real token on a protected route → passes the auth gate (not
  `401`) and only fails at the DB layer (Mongoose buffering-timeout
  error, expected with no live Mongo) — confirms the middleware itself is
  correct
- `POST /admin/kb-entries` with missing `entryId`/`type` → `400`; with an
  invalid `type` → `400` (both confirmed to run before any DB call)

## Phase 6 — Client

> Port mismatch to be aware of: `vite.config.js` proxies `/api` to
> `http://localhost:5000` per this step's instructions, but the server's
> own default is port 3000 (`server/src/server.js`:
> `process.env.PORT || 3000`) and `server/.env.example`'s `PORT` is blank.
> Didn't reconcile — just flagging. Run the server with `PORT=5000` (or
> update the proxy target) so dev actually connects.

- [x] `client/package.json` — standard Vite + React scaffold (`vite`,
      `@vitejs/plugin-react`, `react`, `react-dom`). Added `index.html`,
      `vite.config.js` (React plugin + `/api` → `http://localhost:5000`
      proxy), `src/main.jsx`, `src/App.jsx` (placeholder — chat widget UI
      is the next item below). Verified live: `npm install` succeeded
      (flagged a moderate esbuild/vite dev-server CORS advisory — fix
      requires a breaking Vite 5→8 upgrade, not done here, your call);
      `vite` dev server boots and serves the page (`200`); confirmed the
      `/api` proxy actually forwards by pointing a dummy server at
      `:5000` and hitting `/api/test` through the Vite dev server — got
      the dummy server's response back.
- [x] `client/src/components/` — `ChatWindow.jsx` (message list, session
      id via `crypto.randomUUID()`, POSTs to `/api/chat`, typing/loading
      indicator, auto-scroll, error fallback bubble on fetch failure),
      `MessageBubble.jsx` (user/assistant bubble + embedded quote card),
      `ChatInput.jsx` (controlled input, disabled while loading), plain
      CSS in `chat.css` — no UI library. Wired into `App.jsx` (replaced
      the placeholder). **Quote-card shape note:** the step described
      "device, part, repair cost, replacement cost," but the actual
      `POST /api/chat` response (per `chat.controller.js`) returns
      `quote: { model, problem, options: [{part_type, price,
      turnover_time, warranty}] }` — a list of price *tiers*
      (Normal/Aftermarket/OEM/etc.), not a repair-vs-replacement split.
      Built the card against the real shape (falls back to `quote.device`
      if ever present) rather than inventing a replacement-cost field
      that doesn't exist in the API — flagging in case the intent was
      different. Verified: production build (`vite build`) succeeds; also
      actually rendered `MessageBubble` with `react-dom/server` for three
      cases — plain user bubble, assistant bubble with a real-shaped
      quote (confirmed both `$100.00` and `$200.00` price tiers appear in
      the markup), and assistant bubble with no quote (confirmed no
      quote-card markup renders). **Not verified:** an actual browser
      screenshot/interaction (no headless-browser tool available in this
      environment) — worth a manual look once the server is reachable
      end-to-end.
- [x] `client/src/services/` — `api.js`: `getSessionId()` generates a
      `crypto.randomUUID()` once and persists it in `localStorage`
      (`repairbot_session_id`), reusing it on subsequent calls;
      `sendMessage(message)` POSTs `{sessionId, message}` to `/api/chat`,
      returns parsed JSON on success, throws the server's error message
      on non-2xx. Refactored `ChatWindow.jsx` to use this instead of its
      own inline `fetch` + per-mount (non-persisted) session id — left as
      dead/duplicate logic otherwise, and the point of this step was a
      real persisted session. Verified with a mock `localStorage` +
      `fetch` (no browser/DB available in this environment): session id
      persists across repeated `getSessionId()` calls (only one
      `localStorage` write); `sendMessage` posts to the right URL with
      the persisted `sessionId` and the given message; returns parsed
      data on a mocked `200`; throws the server's `message` on a mocked
      non-`200`. `vite build` still succeeds after the `ChatWindow.jsx`
      refactor. **Phase 6 complete.**

## Phase 7 — Polish

- [x] Error states, loading states — **Server:** new
      `server/src/middleware/errorHandler.js` exports `notFoundHandler`
      (404, `{error:true,message:"Not found",code:"not_found"}`) and
      `errorHandler` (4-arg Express error middleware, returns
      `{error:true,message,code}` from `err.message`/`err.code`/`err.status`
      with sane defaults), both wired into `app.js` as the very last
      middleware. Refactored `chat.controller.js` and all 5
      `admin.controller.js` handlers so their `catch` blocks call
      `next(err)` instead of each duplicating the same
      `res.status(500).json(...)` — centralizes it, expected-outcome
      responses (400/401/404/409 validation branches) were left as direct
      `res.status().json()` since those aren't thrown errors. **Client:**
      `ChatWindow.jsx` now tracks a separate `error` state (`{text,
      message}`) instead of injecting a fake assistant bubble on failure;
      renders a dismissable-by-retry error banner with a **Retry** button
      that resends the exact same failed message; empty state (no
      messages yet) and the typing/loading indicator were already there,
      confirmed both still correct alongside the new error state. Added
      `.chat-error-banner`/`.chat-retry-button` CSS.

      Verified over real HTTP (test admin creds, no live DB — same
      limitation as before): unknown route → real `404` via
      `notFoundHandler`; forced an **actual thrown exception** (called
      `bcrypt.compare` with a malformed password type) and confirmed it
      propagated through `next(err)` to the centralized `errorHandler`,
      returning `500 {error:true, message:"Illegal arguments: object,
      string", code:"internal_error"}`; regression-checked that existing
      400 validation responses on `/api/admin/login` and `/api/chat`
      still behave identically after the refactor. Client: `vite build`
      still passes; statically rendered `ChatWindow`'s initial state and
      confirmed the empty-state text and Send button appear, with no
      stray error-banner or typing-indicator markup. **Not verified:** an
      actual interactive retry click in a browser (no headless-browser
      tool available here) — the underlying `sendMessage` throw/catch
      path was already verified in the `client/src/services/` step.
- [x] Rate limiting verified — `server/src/middleware/rateLimiter.js`:
      simple in-memory fixed-window counter per `req.ip`, 20 requests/60s
      (no new dependency — didn't reach for `express-rate-limit` for a
      counter this simple), returns `429
      {error:true,message:"Too many requests. Please try again later.",
      code:"rate_limited"}` with a `Retry-After` header once exceeded.
      Applied only to `POST /api/chat` (`chat.routes.js`), not globally.
      Verified live: fired 25 rapid requests at `/api/chat` — first 20
      passed through to the controller (`400`, missing fields, as
      expected), requests 21–25 all got real `429`s with the documented
      body and `Retry-After: 60`; separately confirmed `/api/admin/login`
      from the same IP still returns `400` (not `429`) after the chat
      limit is exhausted, proving the limiter is scoped to `/api/chat`
      only.
- [x] README setup instructions finalized — root `README.md` rewritten:
      prerequisites, all 7 server env vars in a table (`MONGODB_URI`,
      `GROQ_API_KEY`, `PORT`, `CLIENT_URL`, `JWT_SECRET`, `ADMIN_EMAIL`,
      `ADMIN_PASSWORD_HASH`) with a working `node -e
      "require('bcryptjs').hash(...)"` one-liner to generate the password
      hash, `npm run import-data` usage, how to run server + client
      locally (including the `PORT=5000` instruction so it actually
      matches the client's hardcoded Vite proxy target), and admin API
      `curl` examples. Also an honest "Known limitations" section (Phase
      4's real-credential checks still unverified, `CLIENT_URL` not
      wired into CORS yet, the esbuild/Vite audit advisory, no delete on
      admin `kb_entries`, single-instance-only rate limiting) rather than
      presenting the project as fully polished. Found a stray garbled
      line appended to the old `README.md` (looked like tool/editor
      noise, not real content) — the full rewrite replaced it. Verified:
      actually ran the documented bcrypt hash command from `server/` and
      confirmed it produces a real hash.

**Phase 7 complete. All phases done**, with two known open items
carried forward rather than silently dropped: (1) Phase 4's two
real-message checks still need a real `GROQ_API_KEY` + `MONGODB_URI` to
verify (code is written and partially verified, per Phase 4 above); (2)
the "Known limitations" list in `README.md` — none of these are
blockers, all are explicitly documented rather than hidden.

---

## Session Log

- 2026-07-14 — Step 1.1 done: `server/` initialized as ESM project with
  express/mongoose/dotenv/cors; `server/src/` skeleton confirmed against
  CLAUDE.md's stack section; root `.gitignore` covers `node_modules/` and
  `.env`. `npm install` and an ESM import smoke test both passed.
- 2026-07-14 — Step 1.2 done: `app.js` (cors, json body parser, `/health`)
  and `server.js` entrypoint (env, `connectDB()` stub, `app.listen`).
  Verified: `node src/server.js` boots and `GET /health` returns
  `{"status":"ok"}`.
- 2026-07-14 — Step 1.3 done: `db.js` implements real
  `mongoose.connect()` with success/failure logging and `process.exit(1)`
  on failure. Verified failure path only — no local MongoDB/Atlas
  available in this environment to verify a successful connection.
- 2026-07-14 — Step 1.4 done: added `GET /api/health` and
  `server/.env.example` (5 blank placeholders). Verified by importing
  `app.js` directly and hitting `/api/health` → `200 {"status":"ok"}`
  (bypassed the full `server.js` boot since no live `MONGODB_URI` is
  configured yet — `connectDB()` would otherwise exit the process before
  the route could be tested). **Phase 1 complete.**
- 2026-07-14 — Step 2.1 (import) done: `KbEntry.js` model + `importData.js`
  script, replacing the draft's separate Device/Part/PricingRule models —
  real design is one `kb_entries` collection per `docs/03-DATABASE-SCHEMA.md`.
  Copied `fonefix_rag_dataset.jsonl` from `~/Downloads/` into
  `server/src/seed/` (wasn't in the repo). Verified without a live DB:
  (1) dry-ran the parse/flatten/price→Number logic against all 87 lines —
  87 docs built, 87 unique `entryId`s, 9 price docs all converted cleanly,
  0 NaN; (2) `KbEntry` model compiles, collection name and all 4 indexes
  (unique `entryId` + the 3 from the schema doc) confirmed via
  `schema.indexes()`; (3) `npm run import-data` fails cleanly with exit
  code 1 when `MONGODB_URI` is unset (expected — no live MongoDB in this
  environment). Full end-to-end import still needs a real run once
  `MONGODB_URI` is set. **Phase 2 complete.**
- 2026-07-14 — Step 3.2 done: `toolDefinitions.js` — 4 tool schemas
  (`find_brand`, `check_device_serviced`, `get_repair_cost`,
  `check_problem_serviced`) matching docs/05 exactly. Verified: imports
  cleanly, shape-checked all 4 entries programmatically.
- 2026-07-14 — Step 3.3 done: `mongoTools.js` implements all 4 tools
  against `KbEntry`, with a shared regex-escaping + whitespace-flexible
  matching helper, exported as a name→function dispatch object. Verified
  by simulating the matching logic against the real 87-doc dataset
  in-memory (no live DB available) — see Phase 3 checklist above for full
  results, including a regex-injection safety check.
- 2026-07-14 — Step 3.1 done: `groqService.js` — `callGroq(messages,
  tools)` via native `fetch()`, no SDK. Verified against the real Groq
  endpoint (no `GROQ_API_KEY` set here): got a real `401 Unauthorized`
  and confirmed the code throws a clear, informative error. **Phase 3
  complete.**
- 2026-07-14 — Phase 4 chat endpoint: code written (`Conversation.js`
  model, `chat.controller.js` tool-calling loop, `chat.routes.js`, wired
  into `app.js`) but **left unchecked** — no real `GROQ_API_KEY` or
  `MONGODB_URI` in this environment, so the two required real-message
  checks (real price for a serviced+priced combo; honest "no price on
  file" fallback for a serviced-but-unpriced combo, no invented numbers)
  could not be run. Only verified what needs no live services: app boots,
  route mounted, missing-field request correctly returns `400` with the
  documented error shape.

- 2026-07-14 — Phase 5 done: `admin.controller.js` + `adminAuth.js` (JWT
  login against `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`, protected CRUD —
  create/read/update, no delete — over `kb_entries`) + `admin.routes.js`,
  wired into `app.js`. Added `jsonwebtoken`/`bcryptjs` and 3 new env vars.
  Verified the full auth flow over real HTTP with test credentials: 401
  on missing/bad token, 400/401 on bad login attempts, 200+token on
  correct login, and that a valid token clears the auth gate (fails only
  at the DB layer, as expected with no live Mongo here). Create-route
  validation (missing fields, invalid `type`) confirmed to run before any
  DB call. Actual `kb_entries` reads/writes against a live database are
  unverified. Noted a mismatch: docs/04-API-CONTRACTS.md describes
  narrower, differently-named admin routes under "Phase 6" — didn't
  reconcile, just flagged it. **Phase 5 complete.**

- 2026-07-14 — `client/package.json` done: Vite + React scaffold,
  `vite.config.js` proxies `/api` → `:5000`. Verified live: `npm install`,
  dev server boots and serves the page, and the `/api` proxy confirmed
  against a dummy backend on `:5000`. Flagged: port mismatch with the
  server's actual default (3000), and a moderate esbuild/vite audit
  advisory not fixed (would need a breaking Vite upgrade).

- 2026-07-14 — `client/src/components/` done: `ChatWindow.jsx` +
  `MessageBubble.jsx` (with embedded quote card) + `ChatInput.jsx`, plain
  CSS, wired into `App.jsx`. Verified: production build succeeds, and
  actually rendered `MessageBubble` via `react-dom/server` for the
  user/assistant/quote-card/no-quote cases — all correct. Flagged a
  quote-shape mismatch between this step's description and the real API
  response (see Phase 6 checklist above). No browser/visual check done —
  no headless-browser tool available here.

- 2026-07-14 — `client/src/services/` done: `api.js` with
  `getSessionId()` (persisted `crypto.randomUUID()` in `localStorage`)
  and `sendMessage()`. Refactored `ChatWindow.jsx` to use it instead of
  its own inline fetch/ephemeral session id. Verified with mocked
  `localStorage`/`fetch`: persistence across calls, correct request
  shape, correct success/error handling. `vite build` still passes.
  **Phase 6 complete.**

- 2026-07-14 — "Error states, loading states" done: server-side
  `errorHandler.js` (404 handler + centralized error middleware) wired as
  the last middleware in `app.js`; `chat.controller.js` and
  `admin.controller.js` refactored to `next(err)` on unexpected
  exceptions. Client-side `ChatWindow.jsx` got a proper `error` state
  with a retry banner (resends the failed message) instead of a fake
  chat bubble. Verified live: 404 on an unknown route; a genuinely thrown
  exception (malformed `bcrypt.compare` input) correctly reached the
  centralized handler with the right shape; existing validation responses
  regression-checked as unchanged; client build still passes and
  `ChatWindow`'s initial render is clean. Interactive retry-click
  behavior not verified (no browser tool here).

- 2026-07-14 — "Rate limiting verified" done: `rateLimiter.js` (in-memory,
  20 req/min per IP), applied to `POST /api/chat` only. Verified live
  with a real 25-request burst: 20 through, 5 correctly `429`'d with the
  documented body + `Retry-After` header; confirmed `/api/admin/login`
  is unaffected from the same IP.

- 2026-07-14 — README finalized: setup instructions, all env vars
  (including a working bcrypt-hash-generation command, verified by
  actually running it), `npm run import-data`, running client + server
  locally with the `PORT=5000` fix so the Vite proxy actually connects,
  admin API examples, and an explicit "Known limitations" section.
  **Phase 7 complete — all phases done.**

---

## Phase 8 — Retrieval architecture pivot (post-completion)

> After all 7 phases were marked done, explicitly requested: replace the
> 4-tool Groq tool-calling design with a single "always retrieve from
> MongoDB first, then one Groq call, generate only from retrieved data"
> flow. Confirmed as a full replacement (not additive) before starting.

- [x] `server/src/services/mongoTools.js` rewritten — was a 4-function
      dispatch (`find_brand`/`check_device_serviced`/`get_repair_cost`/
      `check_problem_serviced`), now a single `searchKbEntries(query)`:
      tokenizes the message, searches MongoDB's `text` index first
      (`$text`, sorted by `textScore` — index-backed relevance ranking),
      falls back to per-token word-boundary regex matching across
      `text`/`brand`/`model`/`device`/`problem`/`part_type`/`url_path`
      only if the text search finds nothing. Returns every document tying
      the top score (keeps multiple price tiers together).
- [x] `server/src/services/toolDefinitions.js` **deleted** — nothing
      imports it anymore; left no dead code behind.
- [x] `server/src/services/groqService.js` — `callGroq(messages, tools)`
      now only puts `tools`/`tool_choice` in the request body when `tools`
      is actually passed, so single-shot (no-tools) calls stay valid
      against the real Groq endpoint.
- [x] `server/src/controllers/chat.controller.js` rewritten — new system
      prompt (retrieved docs are the only knowledge source, structured
      `Device:/Brand:/Model:/Service:/Problem:/Price:/Repair Time:
      /Warranty:/Notes:` response format, ask-one-follow-up-question and
      no-match guardrails per the new spec); retrieves via
      `searchKbEntries` before every Groq call (no tool-call loop, no
      `MAX_TOOL_ITERATIONS`); `quote` built from retrieved `type:"price"`
      rows, same shape as before (`{model, problem, options}`) so the
      client's existing quote card needed no changes.
- [x] `docs/05-AI-TOOLS-AND-PROMPT-DESIGN.md` and
      `docs/02-ARCHITECTURE.md` rewritten to describe the new flow
      (previous tool-calling content is gone, not just appended to —
      each has a revision note at the top explaining the change).

**Real bug found and fixed during verification** (not just a
verify-and-report step — this changed the code): simulating retrieval
against the actual 87-doc dataset surfaced two problems before Groq was
ever involved:
1. Unanchored token regexes let short numeric tokens substring-match
   inside unrelated numbers — `"12"` (from "iPhone 12") matched inside
   `"120Hz"` (an iPhone 15 Pro Max part-type string), returning a wrong
   result. Fixed with `\b` word-boundary anchoring in the fallback
   matcher.
2. More serious: even after that fix, "iPhone 12 screen" still retrieved
   iPhone 15 Pro Max price rows (partial token overlap on "iphone" +
   "screen", zero rows actually containing "12"). Retrieval is
   deliberately recall-oriented for the *context sent to the LLM* — broad
   candidates are fine there since the system prompt tells the model to
   only state retrieved values and ask when ambiguous. But `quote` is
   built straight from retrieval in code, bypassing the model's judgment
   entirely — so a wrong-device price could have reached the client
   regardless of what the reply text said, violating the core "never
   invent/misattribute a price" rule at the data layer even if the LLM
   text was careful. Fixed: `buildQuote()` now extracts any numbers in
   the user's message (almost always a model number) and only returns a
   quote from a retrieved group whose `model` field actually contains one
   of them; if the message has numbers but no retrieved price group
   matches any of them, it returns `null` instead of guessing.

Verified without a live DB or `GROQ_API_KEY` (same limitation as the
original build): simulated both the text-index-miss fallback path and
`buildQuote` in-memory against the real dataset —
"iPhone 15 Pro Max screen replacement" → correct 5-tier quote;
"iPhone 12 screen" → 9 documents retrieved (reasonable LLM context) but
`quote: null` (bug fixed, confirmed); "iphone 14 screen repair price"
(a real but unpriced model) → also correctly `null`; regression-checked
that `/api/chat` missing-field validation and `/api/health` still work
after the rewrite; confirmed `callGroq` with no `tools` argument still
produces a well-formed request against the real Groq endpoint (got the
expected `401 invalid_api_key`, not a malformed-request error).

**Known residual limitation, not fully solved:** a query with no number
in it at all (e.g. "how much for an apple screen fix") has nothing to
gate `buildQuote` on, so it can still surface *a* price group without
certainty it's the specific device the user meant — the system prompt's
"ask a follow-up if ambiguous" instruction is the only backstop there,
and that's unverified without a real `GROQ_API_KEY`. This is a genuine,
inherent tradeoff of retrieve-before-understand vs. the old design's
tool-calling loop, where the LLM parsed intent into clean arguments
*before* any query ran — flagging rather than solving further.

### Post-pivot fix: legacy `role:"tool"` messages broke real Groq calls

The user ran this against a real `GROQ_API_KEY` + `MONGODB_URI` shortly
after the pivot and hit a real `400` from Groq: `"for 'role:tool' the
following must be satisfied[('messages.9.tool_call_id' : property
'tool_call_id' is missing)]"`.

Root cause: their `sessionId`'s `Conversation` document had message
history from *before* the pivot, back when the app used the tool-calling
loop — including `role: "tool"` entries and `role: "assistant"` entries
that were tool-call requests (`content: null`, `tool_calls: [...]`). The
new `toGroqMessage` maps every stored message to `{role, content}` only,
which silently drops `tool_call_id` — so old tool-role messages got
replayed to Groq missing a field Groq requires, and it correctly
rejected the whole request.

Fixed in `chat.controller.js`: before mapping, `conversation.messages` is
now filtered to `(role === "user" || role === "assistant") &&
!m.tool_calls`, dropping any leftover tool-role or tool-call-placeholder
messages from old sessions without deleting them from history (they stay
in MongoDB as a record, just aren't replayed to the model anymore).
Verified: simulated a mixed legacy history (user → assistant+tool_calls →
tool → assistant → user) through the exact filter+map logic — confirms
zero `role:"tool"` or tool_calls-bearing messages survive, output is a
clean, Groq-valid sequence. Regression-checked the app still boots and
`/api/chat` validation still returns `400` correctly after the fix. This
is the first real-credential bug report from actual usage — logged here
per the "never mark done without it actually running" rule, since it
proves Phase 8's in-memory-only verification, while directionally
correct, missed a case only a real database with real history could
surface.

### Follow-up fix: synonym-aware retrieval

Explicitly requested: fix retrieval so differently-worded queries about
the same thing return the same documents, and gave 4 example queries
that "must return the same results" — "iPhone 15 Pro Max screen damage
price" / "...screen repair cost" / "How much is...display replacement?"
/ "Apple iPhone 15 Pro Max broken screen".

Traced the actual gap empirically (ran all 4 through the real matching
logic against the real dataset before touching code): the first, second,
and fourth queries already converged on the correct 5 documents
(`price-30`..`price-34`, the Screen Damage tiers), because "iphone" +
"15" + "pro" + "max" alone were strong enough signal. The third
("display replacement") did **not** converge — it pulled in 10 documents
including unrelated iPhone 15 Pro Max price rows for *other* problems and
a device_catalog entry, because "display" and "replacement" never
literally appear in any stored `text` (only "screen" and
"damage"/"repair" do), so those tokens contributed zero score and didn't
distinguish Screen Damage rows from anything else matching just the
device name.

Fixed in `mongoTools.js`: added `SYNONYM_GROUPS` (screen/display,
damage/broken/cracked/shattered, repair/replacement/replace/fix,
price/cost/pricing/quote, plus battery/charging/camera/speaker/water/
button groups for future-proofing beyond the one problem type in the
current dataset) and a `synonymRegexFor(token)` helper that expands a
token to a word-boundary regex covering its whole synonym group before
either the Mongo query or the in-JS scoring runs. Also **removed** the
two-tier "$text index first, regex fallback only if empty" design from
the earlier pivot — plain community `$text` search doesn't know about
synonyms, so it could produce different (differently-scored) results
than the regex path depending on which one fired, defeating the actual
goal. Retrieval is now always the single synonym-aware path.

Verified against the real 87-doc dataset (still no live MongoDB/Groq in
this environment): all 4 example queries now return the identical
document set (`price-30`..`price-34`); re-ran the full prior regression
suite to confirm nothing broke — iPhone 12 screen still correctly yields
`quote: null` (no wrong-device price), a real unpriced model (iPhone 14)
still correctly yields `null`, a nonsense query still returns `[]`
("no information found" path), a brand-only query still finds the brand
catalog, and a concatenated model query ("iphone15promax screen") still
retrieves and quotes correctly. Confirmed the real module still imports
and `/api/chat` validation still returns `400` correctly.

### Follow-up fix: real 413 "request too large" from Groq

Second real-credential bug report: `Groq API error: 413 Payload Too
Large ... tokens per minute (TPM): Limit 8000, Requested 8677`. Root
cause was the synonym fix immediately above, which had a side effect:
generic action/pricing words ("repair", "cost", "price") appear in
nearly every `type:"price"` document's `text`
("Repair pricing: ... costs $X"), so once those synonym-expanded, they
started contributing to *every* price document's relevance score —
inflating ties well beyond the intended handful of part-type tiers for
ordinary queries, and the full raw document (including the verbose
`text` field) was being JSON-dumped into the prompt for every one of
them.

Three-part fix:
1. `mongoTools.js` — split `SYNONYM_GROUPS` into `GENERIC_GROUPS`
   (repair/replacement/fix, price/cost/pricing) and `SPECIFIC_GROUPS`
   (screen/display, damage/broken/etc., battery, charging, camera,
   speaker, water, button). Generic terms still widen the MongoDB `$or`
   for recall, but no longer count toward the relevance score — only
   falls back to scoring on them if the query is *entirely* generic
   words with nothing else to go on.
2. `mongoTools.js` — hard-capped results to `MAX_RESULTS = 15`
   regardless of how many documents tie for the top score, as a second,
   independent safety net.
3. `chat.controller.js` — retrieved documents are now trimmed to
   structured fields only (`type/brand/device/model/problem/part_type/
   price/turnover_time/warranty/url_path`) before being sent to Groq —
   drops `text` (the most token-expensive field, and redundant with the
   structured fields the system prompt already asks the model to use)
   and `entryId` (meaningless to the model). Also capped replayed
   conversation history to the last 10 messages
   (`HISTORY_LIMIT`), since unbounded history is the other common way a
   long-running chat blows a per-minute token limit.

Verified against the real dataset: re-ran all 4 synonym-fix example
queries — still return the identical correct document set. Measured
payload size before/after the `text`-stripping change: 42-72% smaller
depending on the query (e.g. the 5-tier iPhone 15 Pro Max Screen Damage
case: 2235 → 1303 chars). Confirmed a real modules still import and
`/api/chat` validation still works after the change. Not verified: the
exact request that produced the original 8677-token error, since the
triggering message/history isn't available in this environment — but
the fix addresses the actual mechanism (generic-word score inflation +
verbose per-doc payload), not just the symptom.

---

**Current status:** All 7 original phases complete, plus Phase 8's
architecture pivot done and verified as far as this environment allows.
Three things intentionally left open rather than silently closed:
(1) Phase 4's original two real-message checks and (2) Phase 8's
ambiguous-numberless-query case both still need a real `GROQ_API_KEY` +
`MONGODB_URI` to fully verify; (3) `README.md`'s "Known limitations"
section for everything else.
