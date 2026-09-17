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

mongoose.connect(connectionString
, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => logger.info(`Connected to: ${mongoose.connection.name}`))
.catch(err => logger.error({ err }, 'MongoDB connection failed'));

module.exports = mongoose;
