const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using the URI from environment variables.
 * Emits lifecycle events for observability in production.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Graceful disconnect on app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed (SIGINT).');
  process.exit(0);
});

module.exports = connectDB;
