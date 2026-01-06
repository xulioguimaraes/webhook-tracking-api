import { Queue } from 'bullmq';
import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Configuração do Redis
const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

// Eventos de conexão Redis
redisConnection.on('connect', () => {
  logger.info('Redis conectado com sucesso');
});

redisConnection.on('error', (error) => {
  logger.error('Erro na conexão Redis:', error);
});

// Criação da fila
const webhookQueue = new Queue(config.queue.name, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: {
      type: 'exponential',
      delay: config.queue.retryDelay,
    },
    removeOnComplete: {
      age: 3600, // Manter jobs completos por 1 hora
      count: 1000, // Manter últimos 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Manter jobs falhados por 24 horas
    },
  },
});

// Eventos da fila
webhookQueue.on('error', (error) => {
  logger.error('Erro na fila:', error);
});

webhookQueue.on('waiting', (job) => {
  logger.debug(`Job ${job.id} aguardando processamento`);
});

webhookQueue.on('active', (job) => {
  logger.debug(`Job ${job.id} iniciado`);
});

webhookQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completado com sucesso`);
});

webhookQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} falhou:`, err.message);
});

/**
 * Adiciona um job na fila
 * @param {Object} webhookData - Dados do webhook
 * @param {Object} options - Opções do job (prioridade, delay, etc.)
 * @returns {Promise<Job>}
 */
export async function addWebhookJob(webhookData, options = {}) {
  try {
    const job = await webhookQueue.add(
      'process-webhook',
      webhookData,
      {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options,
      }
    );
    logger.info(`Job ${job.id} adicionado à fila`);
    return job;
  } catch (error) {
    logger.error('Erro ao adicionar job na fila:', error);
    throw error;
  }
}

/**
 * Obtém estatísticas da fila
 * @returns {Promise<Object>}
 */
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      webhookQueue.getWaitingCount(),
      webhookQueue.getActiveCount(),
      webhookQueue.getCompletedCount(),
      webhookQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas da fila:', error);
    throw error;
  }
}

/**
 * Fecha a conexão da fila
 */
export async function closeQueue() {
  await webhookQueue.close();
  await redisConnection.quit();
  logger.info('Fila e conexão Redis fechadas');
}

export { webhookQueue, redisConnection };


