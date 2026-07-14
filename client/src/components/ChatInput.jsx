import { useState } from "react";

function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form className="chat-input-row" onSubmit={handleSubmit}>
      <input
        className="chat-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your device and the problem…"
        disabled={disabled}
      />
      <button className="chat-send-button" type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}

export default ChatInput;
