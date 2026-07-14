import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble.jsx";
import ChatInput from "./ChatInput.jsx";
import { sendMessage } from "../services/api.js";
import "./chat.css";

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  async function sendAndHandle(text) {
    setLoading(true);
    setError(null);

    try {
      const data = await sendMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, quote: data.quote }]);
    } catch (err) {
      setError({
        text,
        message: err.message || "Something went wrong reaching the server.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSend(text) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    sendAndHandle(text);
  }

  function handleRetry() {
    if (error) {
      sendAndHandle(error.text);
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.length === 0 && !loading && !error && (
          <p className="chat-empty-state">
            Tell me your device and what's wrong, and I'll look up a price.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} quote={m.quote} />
        ))}
        {loading && (
          <div className="message-row message-row-assistant">
            <div className="message-bubble message-bubble-assistant typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        {error && (
          <div className="chat-error-banner">
            <span>{error.message}</span>
            <button className="chat-retry-button" onClick={handleRetry} disabled={loading}>
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}

export default ChatWindow;
