# Architecture

> **Revision note:** the flow below reflects a single retrieve-then-generate
> design (one MongoDB search + one Groq call per turn), replacing an
> earlier multi-turn tool-calling loop. See `docs/TRACKER.md` for why.

Client (React chat widget)
   │  POST /api/chat  { sessionId, message }
   ▼
Express controller (chat.controller.js)
   │  loads conversation history from MongoDB
   │  ALWAYS retrieves first: mongoTools.searchKbEntries(message)
   │  (text-index relevance search, regex fallback — see docs/05)
   ▼
Retrieved kb_entries documents (or a "nothing found" notice) are injected
as a system message alongside conversation history
   ▼
Groq REST API (openai/gpt-oss-120b) — called via fetch(), no SDK, no tools
   │  generates a reply from the retrieved context only — single call,
   │  no tool_calls round-trip
   ▼
Response saved to Conversation doc in MongoDB, returned to client
(quote populated only when retrieved documents included type:"price" rows)

## Why retrieve-then-generate instead of tool calling

MongoDB is queried directly, every turn, before the model ever runs — the
model only ever sees data that was actually retrieved, and only generates
from that. This trades the model's ability to decide *when* to look
something up (previous design) for a stricter guarantee that a lookup
always happens and the reply is always grounded in real retrieved
documents.
