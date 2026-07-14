# CLAUDE.md

## Project
RepairBot — AI chatbot for a device repair company. Customers describe
their device and problem; the bot asks clarifying questions, looks up
real pricing from MongoDB via tool calls, and quotes repair/replacement cost.

## Stack
- Backend: Node.js + Express (server/)
- DB: MongoDB Atlas via Mongoose
- AI: Groq REST API (no SDK) — model "openai/gpt-oss-120b" — called with
  raw fetch() from server/src/services/groqService.js
- Frontend: React + Vite (client/)

## Non-negotiable rules
- The AI must NEVER invent a price. Every price quoted must come from a
  tool call result. No matching record → bot says so, offers a human.
- All Mongo access from the AI goes through server/src/services/mongoTools.js.
- Secrets live only in server/.env (never commit). GROQ_API_KEY, MONGODB_URI.
- No groq-sdk or any Groq npm package — raw fetch() to the REST endpoint only.

## Workflow
- ALWAYS read docs/TRACKER.md first to see current progress.
- Do ONE step at a time (e.g. "Step 3.2"), not a whole phase at once.
- After finishing a step: update docs/TRACKER.md — check the box, add a
  one-line note, add a line to the Session Log with today's date.
- Never mark a step done if it doesn't actually run.
