import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: true,
      message: "Missing or invalid Authorization header",
      code: "unauthorized",
    });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({
      error: true,
      message: "Invalid or expired token",
      code: "unauthorized",
    });
  }
}
