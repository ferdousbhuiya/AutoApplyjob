function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('Error:', err.message);

  if (err.name === 'RateLimitError' || err.statusCode === 429) {
    return res.status(429).json({ error: err.message || 'Too many requests. Please wait a moment.' });
  }

  if (err.statusCode === 503 || err.name === 'APIConnectionError' || err.name === 'APIError') {
    return res.status(503).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({ error: err.message || 'Resource not found.' });
  }

  if (err.statusCode === 401) {
    return res.status(401).json({ error: err.message || 'Please connect your Gmail account first.' });
  }

  if (err.statusCode === 400) {
    return res.status(400).json({ error: err.message || 'Invalid request.' });
  }

  return res.status(err.statusCode || 500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
