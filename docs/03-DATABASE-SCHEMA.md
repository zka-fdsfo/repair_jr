# Database Schema (MongoDB / Mongoose)

Single collection: kb_entries — one document per line of
fonefix_rag_dataset.jsonl, imported as-is with metadata flattened to
top-level fields for querying.

## kb_entries
{
  _id: ObjectId,
  entryId: "price-30",              // original "id" field from the JSONL
  text: "Repair pricing: ...",       // human-readable, used for bot replies
  type: "price" | "device_catalog" | "brand_catalog" | "problem_catalog",

  // present on type: "price"
  brand: "Apple", device: "Apple iPhone", model: "iPhone 15 Pro Max",
  problem: "Screen Damage", part_type: "OEM",
  price: 200.00,                     // stored as Number, not string
  turnover_time: "1 Hour", warranty: "6 Months",

  // present on type: "device_catalog"
  device_count / model_count fields as in source,

  url_path: "apple/apple-iphone/iphone-15-pro-max/screen-damage"
}

## Important nuance
- type: "device_catalog" is ONE document per brand+device line listing ALL
  models in its "text" field as a comma-separated string — NOT one document
  per model. To check "do you service iPhone 15 Pro Max", you regex-search
  the text field of the matching device_catalog doc, you don't query a
  models array.
- type: "problem_catalog" IS one document per problem — clean to query directly.
- type: "price" only exists for combinations that have been priced. Most
  model+problem combos will have zero matching price docs even though the
  device and problem are both serviced. This is expected, not a bug.

## Indexes
- { type: 1, model: 1, problem: 1 }   — speeds up price lookups
- { type: 1, brand: 1 }               — speeds up catalog lookups
- text index on `text` field          — fallback fuzzy search if needed