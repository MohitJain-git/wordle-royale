const { createClient } = require('redis');
require('dotenv').config();

// Create the Redis Client
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, // Upstash requires TLS (SSL)
    rejectUnauthorized: false
  }
});

redisClient.on('error', (err) => console.log('❌ Redis Client Error', err));

// Connect immediately when this file is loaded
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully!');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

module.exports = redisClient;