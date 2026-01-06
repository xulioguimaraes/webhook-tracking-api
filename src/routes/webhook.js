import express from 'express';
import { addWebhookJob } from '../queue/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router = express.Router();

/**
 * Middleware de validação básica
 */
const validateWebhook = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Payload vazio ou inválido',
    });
  }

  // Validação opcional de secret
  if (config.webhook.secret) {
    const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
    if (providedSecret !== config.webhook.secret) {
      logger.warn('Tentativa de webhook com secret inválido', {
        ip: req.ip,
        headers: Object.keys(req.headers),
      });
      return res.status(401).json({
        error: 'Não autorizado',
      });
    }
  }

  next();
};

/**
 * POST /webhook
 * Recebe webhook e adiciona na fila
 */
router.post('/', validateWebhook, async (req, res) => {
  try {
    const webhookData = {
      ...req.body,
      // Adiciona metadados úteis
      metadata: {
        received_at: new Date().toISOString(),
        source_ip: req.ip,
        user_agent: req.headers['user-agent'],
        content_type: req.headers['content-type'],
        // Identifica fonte se disponível
        source: req.headers['x-webhook-source'] || req.body.source || 'unknown',
      },
    };

    // Adiciona job na fila
    const job = await addWebhookJob(webhookData, {
      priority: req.body.priority || 0,
      delay: req.body.delay || 0,
    });

    logger.info('Webhook recebido e adicionado à fila', {
      jobId: job.id,
      event_name: webhookData.event_name || webhookData.event,
      source: webhookData.metadata.source,
    });

    // Resposta rápida (202 Accepted)
    res.status(202).json({
      success: true,
      message: 'Webhook recebido e sendo processado',
      job_id: job.id,
    });
  } catch (error) {
    logger.error('Erro ao processar webhook:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /webhook/health
 * Health check específico do webhook
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhook',
    timestamp: new Date().toISOString(),
  });
});

export default router;


