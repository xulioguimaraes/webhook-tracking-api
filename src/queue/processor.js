import { Worker } from 'bullmq';
import config from '../config/index.js';
import { redisConnection } from './index.js';
import router from '../services/router.js';
import logger from '../utils/logger.js';

/**
 * Worker que processa jobs da fila
 */
const worker = new Worker(
  config.queue.name,
  async (job) => {
    const { id, data } = job;
    const startTime = Date.now();

    logger.info(`Processando job ${id}`, {
      jobId: id,
      event_name: data.event_name || data.event,
    });

    try {
      // Roteia para a API apropriada
      const result = await router.route(data, {
        jobId: id,
      });

      const duration = Date.now() - startTime;

      logger.info(`Job ${id} processado com sucesso`, {
        jobId: id,
        route: result.route,
        duration: `${duration}ms`,
        events_received: result.result?.events_received,
      });

      return {
        success: true,
        route: result.route,
        result: result.result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Erro ao processar job ${id}`, {
        jobId: id,
        error: error.message || error.error,
        duration: `${duration}ms`,
        attempt: job.attemptsMade + 1,
      });

      // Re-lança o erro para que o BullMQ possa fazer retry
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: config.queue.concurrency,
    removeOnComplete: {
      age: 3600, // 1 hora
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600, // 24 horas
    },
  }
);

// Eventos do worker
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completado`, {
    jobId: job.id,
    result: job.returnvalue,
  });
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativa(s)`, {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
  });
});

worker.on('error', (error) => {
  logger.error('Erro no worker:', error);
});

worker.on('stalled', (jobId) => {
  logger.warn(`Job ${jobId} travado, será reprocessado`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Recebido SIGTERM, fechando worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Recebido SIGINT, fechando worker...');
  await worker.close();
  process.exit(0);
});

logger.info('Worker iniciado e aguardando jobs', {
  queue: config.queue.name,
  concurrency: config.queue.concurrency,
});

export default worker;


