/**
 * Global error handler middleware
 * Must be the LAST app.use() in server.js
 */
const errorHandler = (err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID format' });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
