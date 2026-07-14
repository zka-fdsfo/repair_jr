export function notFoundHandler(req, res) {
  res.status(404).json({ error: true, message: "Not found", code: "not_found" });
}

// Express recognizes an error-handling middleware by its 4-argument
// signature — the unused `next` param must stay for that to work.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: true,
    message: err.message || "Internal server error",
    code: err.code || "internal_error",
  });
}
