function QuoteCard({ quote }) {
  if (!quote) return null;

  const device = quote.device || quote.model;

  return (
    <div className="quote-card">
      <div className="quote-card-header">
        {device && <span>{device}</span>}
        {quote.problem && <span>{quote.problem}</span>}
      </div>
      <ul className="quote-options">
        {(quote.options || []).map((opt, i) => (
          <li key={i} className="quote-option">
            <span className="quote-part-type">{opt.part_type}</span>
            <span className="quote-price">
              {typeof opt.price === "number" ? `$${opt.price.toFixed(2)}` : opt.price}
            </span>
            {(opt.turnover_time || opt.warranty) && (
              <span className="quote-meta">
                {[opt.turnover_time, opt.warranty].filter(Boolean).join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ role, content, quote }) {
  const isUser = role === "user";

  return (
    <div className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}>
      <div className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-assistant"}`}>
        <p className="message-content">{content}</p>
        <QuoteCard quote={quote} />
      </div>
    </div>
  );
}

export default MessageBubble;
