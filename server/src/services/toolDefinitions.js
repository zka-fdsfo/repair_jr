// Tool schemas exposed to Groq (OpenAI-compatible "tools" format).
// See docs/05-AI-TOOLS-AND-PROMPT-DESIGN.md for the semantics of each tool.

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "find_brand",
      description:
        "Find which brands/device lines FoneFix services. Matches the query " +
        "against brand_catalog entries (brand name or descriptive text).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Brand name or free-text search, e.g. \"Apple\" or \"samsung\".",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_device_serviced",
      description:
        "Check whether a specific device model is serviced. Finds the " +
        "device_catalog entry for the given brand/device line and checks " +
        "whether the model appears in it.",
      parameters: {
        type: "object",
        properties: {
          brand: {
            type: "string",
            description: "Device brand, e.g. \"Apple\".",
          },
          model: {
            type: "string",
            description: "Device model, e.g. \"iPhone 15 Pro Max\".",
          },
        },
        required: ["brand", "model"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_repair_cost",
      description:
        "Get repair pricing for a device model and problem, optionally " +
        "filtered by part type. Returns ALL matching price rows — there are " +
        "usually several price tiers (Normal/Aftermarket/OEM/etc.) per " +
        "problem, so present a range rather than a single number. An empty " +
        "result is expected and valid: it means the device/problem is " +
        "serviced but no price is on file yet, NOT that we don't fix it.",
      parameters: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "Device model, e.g. \"iPhone 15 Pro Max\".",
          },
          problem: {
            type: "string",
            description: "Problem/part needing repair, e.g. \"Screen Damage\".",
          },
          partType: {
            type: "string",
            description:
              "Optional part tier to filter by, e.g. \"Normal\", \"Aftermarket\", \"OEM\".",
          },
        },
        required: ["model", "problem"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_problem_serviced",
      description:
        "Check whether FoneFix offers repair service for a given problem, " +
        "by matching against the problem_catalog.",
      parameters: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Problem/issue type, e.g. \"Screen Damage\".",
          },
        },
        required: ["problem"],
      },
    },
  },
];

export default toolDefinitions;
