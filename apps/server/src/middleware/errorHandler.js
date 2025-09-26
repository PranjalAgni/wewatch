// Global error handling middleware
export function errorHandler(err, req, res, next) {
  console.error('Error occurred:', err);

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Request logging middleware
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`${req.method} ${req.url} - ${req.ip}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
}

// 404 handler
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
}
