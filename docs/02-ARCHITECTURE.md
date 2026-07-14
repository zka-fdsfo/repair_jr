# Architecture

Client (React chat widget)
   │  POST /api/chat  { conversationId, message }
   ▼
Express controller (chat.controller.js)
   │  loads conversation history from MongoDB
   │  calls groqService.callGroq(history, tools)
   ▼
Groq REST API (openai/gpt-oss-120b) — called via fetch(), no SDK
   │  model either replies directly, OR requests a tool call
   ▼
If tool_call requested:
   server executes it via mongoTools.js (real MongoDB query)
   result is sent back to Groq as a tool result message
   Groq is called again and produces the final natural-language reply
   ▼
Response saved to Conversation doc in MongoDB, returned to client

## Why tool calling instead of manual intent detection
The model decides when it has enough info to look up a price and when it
needs to ask another question. We don't hardcode conversation flow — we
give it tools and a system prompt with rules, and let it drive.