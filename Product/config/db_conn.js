const mongoose = require('mongoose');
const logger = require('../config/logger');
require('dotenv').config();

const mongo_username = process.env.MONGO_USERNAME;
const mongo_password = process.env.MONGO_PASSWORD;
const mongo_cluster = process.env.MONGO_CLUSTER;
const mongo_database = process.env.MONGO_DBNAME;


// Prefer an explicit connection string when provided (in-cluster MongoDB uses a
// plain mongodb:// URI). Falling back to the SRV form keeps Atlas compatibility.
const connectionString = process.env.MONGO_URI
  || `mongodb+srv://${mongo_username}:${mongo_password}@${mongo_cluster}/${mongo_database}?retryWrites=true&w=majority`;

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
};

// Retry the initial connection with exponential backoff. The driver reconnects
// after a successful first connection, but not after a failed one.
const connectWithRetry = async (attempt = 1) => {
  try {
    await mongoose.connect(connectionString, connectOptions);
    logger.info(`Connected to: ${mongoose.connection.name}`);
  } catch (err) {
    const delayMs = Math.min(30000, 1000 * 2 ** (attempt - 1));
    logger.error({ err, attempt, delayMs }, 'MongoDB connection failed; retrying');
    setTimeout(() => connectWithRetry(attempt + 1), delayMs);
  }
};
connectWithRetry();

module.exports = mongoose;
