const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

const hits = new Map(); // ip -> { count, resetAt }

export function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({
      error: true,
      message: "Too many requests. Please try again later.",
      code: "rate_limited",
    });
  }

  entry.count += 1;
  next();
}
