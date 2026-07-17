import KbEntry from "../models/KbEntry.js";

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "how", "much", "does",
  "do", "did", "for", "of", "to", "in", "on", "at", "my", "me", "i",
  "you", "your", "please", "can", "could", "would", "will", "it", "this",
  "that", "with", "hi", "hello",
]);

// Groups of interchangeable repair-shop vocabulary. A query token in a
// group is treated as equivalent to every other word in that group, so
// e.g. "display replacement" and "broken screen" both count as hitting
// the same "screen" / "damage" concepts a stored doc's literal text uses.
// Without this, synonyms score 0 and get out-voted by unrelated
// documents that happen to share only the device name — see
// docs/TRACKER.md for the query that exposed this.
//
// GENERIC_GROUPS are deliberately excluded from relevance scoring (see
// below) — "repair"/"cost"/"price" appear in nearly every price
// document's text ("Repair pricing: ... costs $X"), so counting them
// toward the score made unrelated documents tie with the actually
// relevant ones, ballooning result sets and blowing Groq's per-request
// token limit on ordinary queries. They're still used for the MongoDB
// $or (harmless — everything else usually narrows it down anyway).
const GENERIC_GROUPS = [
  ["repair", "repairs", "replacement", "replace", "fix", "fixed"],
  ["price", "prices", "pricing", "cost", "costs", "quote"],
];

const SPECIFIC_GROUPS = [
  ["screen", "display"],
  ["damage", "damaged", "broken", "crack", "cracked", "shattered"],
  ["battery", "batteries"],
  ["charging", "charge", "charger", "port"],
  ["camera", "cameras", "lens"],
  ["speaker", "speakers", "audio", "sound", "mic", "microphone"],
  ["water", "liquid", "wet"],
  ["button", "buttons"],
];

const SYNONYM_GROUPS = [...SPECIFIC_GROUPS, ...GENERIC_GROUPS];

function isGenericToken(token) {
  return GENERIC_GROUPS.some((g) => g.includes(token));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(query) {
  return String(query)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Word-boundary anchored (an unanchored "12" would substring-match
// inside "120Hz") and synonym-expanded (a group member matches any word
// in its group, not just the literal token).
function synonymRegexFor(token) {
  const group = SYNONYM_GROUPS.find((g) => g.includes(token)) || [token];
  const pattern = group.map(escapeRegex).join("|");
  return new RegExp(`\\b(?:${pattern})\\b`, "i");
}

const SEARCH_FIELDS = ["text", "brand", "model", "device", "problem", "part_type", "url_path"];

// Hard cap on returned documents, independent of how many tie for the
// top score. Protects against a request-too-large error from Groq (a
// vague or heavily-generic query could otherwise tie across most of the
// price catalog) — 15 is generous headroom over the largest legitimate
// tier group in the current dataset (5-6 part-type options).
const MAX_RESULTS = 15;

// Always retrieves from MongoDB before any LLM call. Extracts search
// terms from the raw query (brand/model/service/problem all fall out of
// the same token set — nothing in kb_entries needs a separate extraction
// pass), case-insensitive and synonym-expanded, and ranks candidates by
// how many distinct *specific* term groups they match (generic
// action/pricing words are used for recall but not scoring — see
// GENERIC_GROUPS above). Returns every document tying the top score, up
// to MAX_RESULTS — this matters for price entries, where several
// part-type tiers (Normal/Aftermarket/OEM/etc.) for the same model +
// problem should all come back together, not just one. Only returns []
// (→ "no information found") when MongoDB genuinely has zero matches.
export async function searchKbEntries(query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const termRegexes = tokens.map(synonymRegexFor);
  const orClauses = termRegexes.flatMap((re) => SEARCH_FIELDS.map((field) => ({ [field]: re })));

  const candidates = await KbEntry.find({ $or: orClauses }).lean();
  if (candidates.length === 0) return [];

  const scoringRegexes = tokens.some((t) => !isGenericToken(t))
    ? tokens.map((t, i) => (isGenericToken(t) ? null : termRegexes[i])).filter(Boolean)
    : termRegexes; // query was ONLY generic words — fall back to scoring on those

  const scored = candidates.map((doc) => {
    const haystack = SEARCH_FIELDS.map((f) => doc[f]).filter(Boolean).join(" ");
    const score = scoringRegexes.reduce((n, re) => n + (re.test(haystack) ? 1 : 0), 0);
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  if (topScore === 0) return [];

  return scored
    .filter((s) => s.score === topScore)
    .slice(0, MAX_RESULTS)
    .map((s) => s.doc);
}
