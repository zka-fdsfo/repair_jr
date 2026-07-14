# API Contracts

## POST /api/chat
Request:  { sessionId: string, message: string }
Response: { reply: string, sessionId: string, quote: object|null }

## GET /api/admin/devices        (Phase 6, protected)
## POST /api/admin/pricing       (Phase 6, protected)

Error shape (all endpoints):
{ error: true, message: string, code: string }