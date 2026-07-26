const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const app = express();

require('dotenv').config();
require('./config/db_conn');
const port = process.env.PORT || 9003;

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use("/api/v1/cart", require("./routes/cartRouter"));

// Health check
const startTime = Date.now();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cart-service',
    version: require('./package.json').version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalError',
    message: err.message || 'Something went wrong',
    details: err.details || {}
  });
});

app.listen(port, () => {
  logger.info(`Cart service running on port ${port}`);
});

module.exports = app;
