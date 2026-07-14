const SESSION_STORAGE_KEY = "repairbot_session_id";

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export async function sendMessage(message) {
  const sessionId = getSessionId();

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}
