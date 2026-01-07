import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import logger from './utils/logger.js';
import webhookRoutes from './routes/webhook.js';
import { getQueueStats } from './queue/index.js';
import { swaggerSpec } from './config/swagger.js';
import './queue/processor.js'; // Inicia o worker

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Webhook Tracking API - Swagger',
}));

// Rotas
app.use('/webhook', webhookRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check da API
 *     description: Verifica o status da API e da fila de processamento
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API está funcionando corretamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Serviço indisponível
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Serviço indisponível"
 */
app.get('/health', async (req, res) => {
  try {
    const queueStats = await getQueueStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: queueStats,
    });
  } catch (error) {
    logger.error('Erro no health check:', error);
    res.status(503).json({
      status: 'error',
      message: 'Serviço indisponível',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    service: 'Webhook Tracking API',
    version: '1.0.0',
    endpoints: {
      webhook: '/webhook',
      health: '/health',
      apiDocs: '/api-docs',
    },
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
  });
});

// Inicia servidor
const server = app.listen(config.server.port, () => {
  logger.info(`Servidor iniciado na porta ${config.server.port}`, {
    port: config.server.port,
    env: config.server.env,
    node_version: process.version,
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Recebido ${signal}, iniciando shutdown graceful...`);

  server.close(async () => {
    logger.info('Servidor HTTP fechado');

    try {
      // Fechar conexões da fila
      const { closeQueue } = await import('./queue/index.js');
      await closeQueue();
      logger.info('Conexões fechadas com sucesso');
      process.exit(0);
    } catch (error) {
      logger.error('Erro durante shutdown:', error);
      process.exit(1);
    }
  });

  // Timeout de 10 segundos para forçar encerramento
  setTimeout(() => {
    logger.error('Shutdown timeout, forçando encerramento');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;


