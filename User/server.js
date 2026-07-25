const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const app = express();

require('dotenv').config();
require('./config/db_conn');
const port = process.env.PORT || 9001;

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'TooManyRequests', message: 'Too many login attempts, please try again later' }
});
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users', authLimiter);

// Routes
app.use("/api/v1/users", require("./routes/userRouter"));

// Health check
const startTime = Date.now();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'user-service',
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
  logger.info(`User service running on port ${port}`);
});
