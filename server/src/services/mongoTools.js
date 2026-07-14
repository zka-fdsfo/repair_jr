import KbEntry from "../models/KbEntry.js";

// Escapes regex special characters so user input can't inject arbitrary
// regex syntax into a MongoDB $regex query.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Case-insensitive, partial-match regex built from raw user input.
// Collapses whitespace runs to `\s*` so e.g. "15 pro max" still matches
// "iPhone 15 Pro Max".
function buildFlexibleRegex(input) {
  const escaped = escapeRegex(String(input).trim());
  const flexible = escaped.replace(/\s+/g, "\\s*");
  return new RegExp(flexible, "i");
}

async function find_brand({ query }) {
  const regex = buildFlexibleRegex(query);
  return KbEntry.find({
    type: "brand_catalog",
    $or: [{ brand: regex }, { text: regex }],
  }).lean();
}

async function check_device_serviced({ brand, model }) {
  const brandRegex = buildFlexibleRegex(brand);
  const deviceDocs = await KbEntry.find({
    type: "device_catalog",
    brand: brandRegex,
  }).lean();

  const modelRegex = buildFlexibleRegex(model);
  const match = deviceDocs.find((doc) => modelRegex.test(doc.text || ""));

  return {
    serviced: Boolean(match),
    deviceLine: match ? match.device : null,
  };
}

async function get_repair_cost({ model, problem, partType }) {
  const query = {
    type: "price",
    model: buildFlexibleRegex(model),
    problem: buildFlexibleRegex(problem),
  };
  if (partType) {
    query.part_type = buildFlexibleRegex(partType);
  }
  return KbEntry.find(query).lean();
}

async function check_problem_serviced({ problem }) {
  const regex = buildFlexibleRegex(problem);
  const match = await KbEntry.findOne({
    type: "problem_catalog",
    problem: regex,
  }).lean();

  return { serviced: Boolean(match) };
}

const mongoTools = {
  find_brand,
  check_device_serviced,
  get_repair_cost,
  check_problem_serviced,
};

export default mongoTools;
