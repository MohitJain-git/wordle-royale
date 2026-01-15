// const { createClient } = require('redis');
// require('dotenv').config();

const { createClient } = require('redis');

// 1. Get the URL (fallback to localhost for development)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 2. Create the Client with Dynamic TLS
const client = createClient({
    url: redisUrl,
    socket: {
        // 👇 CRITICAL FIX: Only enable TLS if the URL starts with 'rediss://'
        tls: redisUrl.startsWith('rediss://'),
        // This is often needed for cloud providers to accept self-signed certs
        rejectUnauthorized: false 
    }
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    try {
        await client.connect();
        console.log('✅ Connected to Redis successfully');
    } catch (err) {
        console.error('❌ Redis connection error:', err);
    }
})();

module.exports = client;

// // Create the Redis Client
// const redisClient = createClient({
//   url: process.env.REDIS_URL,
//   socket: {
//     tls: true, // Upstash requires TLS (SSL)
//     rejectUnauthorized: false
//   }
// });

// redisClient.on('error', (err) => console.log('❌ Redis Client Error', err));

// // Connect immediately when this file is loaded
// (async () => {
//   try {
//     await redisClient.connect();
//     console.log('✅ Redis connected successfully!');
//   } catch (err) {
//     console.error('❌ Failed to connect to Redis:', err);
//   }
// })();

// module.exports = redisClient;