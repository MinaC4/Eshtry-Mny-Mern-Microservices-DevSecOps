const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('./config/logger');
const app = express();

require('dotenv').config();
require('./config/db_conn');
const port = process.env.PORT || 9000;

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'TooManyRequests', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Routes
app.use("/api/v1/products", require("./routes/productRouter"));
app.use("/api/v1/filter", require("./routes/filterRouter"));

// Health check
const startTime = Date.now();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'product-service',
    version: require('./package.json').version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error({ err, path: req.path, method: req.method, status }, 'Unhandled error');
  res.status(status).json(
    status >= 500
      ? { error: 'InternalServerError', message: 'Something went wrong. Please try again later.' }
      : { error: err.name || 'Error', message: err.message || 'Something went wrong',
          ...(err.details && { details: err.details }) }
  );
});

const server = app.listen(port, () => {
  logger.info(`[Product] service running on port ${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason, promise }, 'Unhandled Rejection');
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 10000);
});

module.exports = app;
