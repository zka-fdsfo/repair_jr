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

const KNOWN_BRANDS = [
  "apple", "samsung", "nokia", "microsoft", "google", "huawei",
  "oneplus", "oppo", "xiaomi", "motorola", "vivo",
];
const MODEL_QUALIFIERS = ["pro", "max", "plus", "mini", "ultra", "se"];

// Lightweight entity extraction for debugging/logging — not a separate
// query path, just a readable view of what the token set implies. Brand
// comes from a known-brand list; "model" is the numeric + qualifier
// tokens (e.g. "15", "pro", "max"); "problem" is which specific synonym
// groups matched, reported by their canonical (first) member.
function extractEntities(tokens) {
  const brand = tokens.find((t) => KNOWN_BRANDS.includes(t)) || null;
  const modelTokens = tokens.filter((t) => /^\d+$/.test(t) || MODEL_QUALIFIERS.includes(t));
  const problemGroups = [];
  for (const t of tokens) {
    if (isGenericToken(t)) continue;
    const group = SPECIFIC_GROUPS.find((g) => g.includes(t));
    if (group && !problemGroups.includes(group[0])) problemGroups.push(group[0]);
  }
  return {
    brand,
    model: modelTokens.length > 0 ? modelTokens.join(" ") : null,
    problem: problemGroups.length > 0 ? problemGroups.join(", ") : null,
    keywords: tokens,
  };
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

// Fields as they exist on a FLATTENED doc (what npm run import-data
// produces — id renamed to entryId, metadata.* moved to top level; see
// docs/03-DATABASE-SCHEMA.md). The raw dataset file itself is
// `{id, text, metadata: {...}}` — if any documents were ever loaded a
// different way (mongoimport, Atlas UI "Import Data", a manual insert)
// they could still be sitting in kb_entries in that RAW, un-flattened
// shape, with brand/model/problem/type etc. under a `metadata` object
// instead of top-level. That shape mismatch would make every query
// below find nothing even though the document is genuinely there and
// genuinely matches — so every field is searched and read at BOTH the
// top level and under `metadata.*`, and normalizeDoc() below resolves
// whichever one is actually present into one consistent shape.
const SEARCH_FIELDS = ["text", "brand", "model", "device", "problem", "part_type", "url_path"];
const METADATA_SEARCH_FIELDS = SEARCH_FIELDS.filter((f) => f !== "text").map((f) => `metadata.${f}`);
const ALL_QUERY_FIELDS = [...SEARCH_FIELDS, ...METADATA_SEARCH_FIELDS];

// Resolves a document to one consistent flattened shape regardless of
// whether it was stored flattened (top-level fields) or raw/nested
// (fields under `metadata`) — top-level wins if somehow both are present.
function normalizeDoc(doc) {
  const meta = doc.metadata || {};
  const price = doc.price ?? meta.price;
  return {
    entryId: doc.entryId ?? doc.id,
    text: doc.text,
    type: doc.type ?? meta.type,
    brand: doc.brand ?? meta.brand,
    device: doc.device ?? meta.device,
    model: doc.model ?? meta.model,
    problem: doc.problem ?? meta.problem,
    part_type: doc.part_type ?? meta.part_type,
    price: price !== undefined && price !== null ? Number(price) : undefined,
    turnover_time: doc.turnover_time ?? meta.turnover_time,
    warranty: doc.warranty ?? meta.warranty,
    device_count: doc.device_count ?? meta.device_count,
    model_count: doc.model_count ?? meta.model_count,
    url_path: doc.url_path ?? meta.url_path,
  };
}

// Hard cap on returned documents, independent of how many tie for the
// top score. Protects against a request-too-large error from Groq (a
// vague or heavily-generic query could otherwise tie across most of the
// price catalog) — 15 is generous headroom over the largest legitimate
// tier group in the current dataset (5-6 part-type options).
const MAX_RESULTS = 15;

// Always retrieves from MongoDB before any LLM call. Extracts search
// terms from the raw query (brand/model/service/problem all fall out of
// the same token set — nothing in kb_entries needs a separate extraction
// pass), case-insensitive and synonym-expanded (so "Screen Damage" still
// matches a value like "Screen Damage Repair" — word-boundary substring
// matching, never exact-string equality), and ranks candidates by how
// many distinct *specific* term groups they match (generic action/
// pricing words are used for recall but not scoring — see
// GENERIC_GROUPS above). Searches and reads both the flattened shape and
// a possible raw metadata.* shape — see the comment above SEARCH_FIELDS.
// Returns every normalized document tying the top score, up to
// MAX_RESULTS — this matters for price entries, where several part-type
// tiers (Normal/Aftermarket/OEM/etc.) for the same model + problem
// should all come back together, not just one. Only returns [] (→ "no
// information found") when MongoDB genuinely has zero matches.
export async function searchKbEntries(query) {
  console.log(`[searchKbEntries] query: ${JSON.stringify(query)}`);

  const tokens = tokenize(query);
  const entities = extractEntities(tokens);
  console.log(`[searchKbEntries] tokens:`, tokens);
  console.log(`[searchKbEntries] extracted brand:`, entities.brand);
  console.log(`[searchKbEntries] extracted model:`, entities.model);
  console.log(`[searchKbEntries] extracted service/problem:`, entities.problem);

  if (tokens.length === 0) {
    console.log(`[searchKbEntries] no usable tokens after stopword filtering — returning []`);
    return [];
  }

  const termRegexes = tokens.map(synonymRegexFor);
  const orClauses = termRegexes.flatMap((re) => ALL_QUERY_FIELDS.map((field) => ({ [field]: re })));
  console.log(
    `[searchKbEntries] MongoDB filter: KbEntry.find({ $or: [${orClauses.length} clauses across ${ALL_QUERY_FIELDS.join(
      "/"
    )}] })`
  );
  console.log(
    `[searchKbEntries] regex patterns ($regex, case-insensitive):`,
    termRegexes.map((r) => r.source)
  );

  const rawCandidates = await KbEntry.find({ $or: orClauses }).lean();
  console.log(`[searchKbEntries] matched documents: ${rawCandidates.length}`);

  if (rawCandidates.length === 0) {
    console.log(`[searchKbEntries] zero candidates from MongoDB — this is what produces "no information found"`);
    return [];
  }

  const candidates = rawCandidates.map(normalizeDoc);

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

  if (topScore === 0) {
    console.log(`[searchKbEntries] ${candidates.length} candidates matched $or, but none scored > 0 — returning []`);
    return [];
  }

  const results = scored
    .filter((s) => s.score === topScore)
    .slice(0, MAX_RESULTS)
    .map((s) => s.doc);

  console.log(
    `[searchKbEntries] top score: ${topScore}, documents returned: ${results.length} ->`,
    results.map((d) => d.entryId)
  );

  return results;
}
