import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  },
  facebook: {
    accessToken: process.env.FB_ACCESS_TOKEN || '',
    pixelId: process.env.FB_PIXEL_ID || '',
    apiVersion: process.env.FB_API_VERSION || 'v18.0',
    apiUrl: `https://graph.facebook.com/${process.env.FB_API_VERSION || 'v18.0'}`,
  },
  queue: {
    name: 'webhook-tracking',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
    retryDelay: 5000, // 5 segundos
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET || undefined,
  },
};

// Validação de configurações críticas
if (!config.facebook.accessToken && config.server.env === 'production') {
  console.warn('⚠️  FB_ACCESS_TOKEN não configurado');
}

if (!config.facebook.pixelId && config.server.env === 'production') {
  console.warn('⚠️  FB_PIXEL_ID não configurado');
}

export default config;


