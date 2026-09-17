const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const logger = require('./config/logger');
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});
const app = express();

// Behind the Traefik ingress; trust exactly one proxy so rate limiting and
// logs key on the real client IP rather than the ingress pod IP.
app.set('trust proxy', 1);

require('dotenv').config();
const mongoose = require('mongoose');
// Fail fast instead of buffering DB calls for 10s when Mongo is unreachable.
mongoose.set('bufferCommands', false);
require('./config/db_conn');
const port = process.env.PORT || 9001;

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Prometheus request metrics (count + duration by route/status).
app.use((req, res, next) => {
  const endTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = (req.baseUrl || '') + (req.route ? req.route.path : (req.path || 'unknown'));
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });
  next();
});

// Health check — before rate limiter so probes are never throttled
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

// Readiness reflects MongoDB connectivity so a pod without a working DB
// connection is removed from Service endpoints instead of serving 500s.
app.get('/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// General rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'TooManyRequests', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Auth-specific rate limiter is applied per-route in userRouter.js

// Routes
app.use("/api/v1/users", require("./routes/userRouter"));

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
  logger.info(`[User] service running on port ${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason, promise }, 'Unhandled Rejection');
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 10000);
});

module.exports = app;
