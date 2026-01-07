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
 * @swagger
 * /webhook:
 *   post:
 *     summary: Recebe webhook e adiciona na fila para processamento
 *     description: |
 *       Recebe eventos de webhook, valida os dados e adiciona na fila Redis para processamento assíncrono.
 *       O evento será processado e enviado para a API de conversão configurada (Facebook por padrão).
 *       
 *       **Autenticação:**
 *       - `X-Webhook-Secret`: Secret configurado no .env
 *     
 *       
 *       **Eventos suportados:**
 *       - purchase, lead, view_content, add_to_cart, initiate_checkout, search, complete_registration, contact, subscribe
 *     tags: [Webhook]
 *     security:
 *       - BearerAuth: []
 *       - WebhookSecret: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookRequest'
 *           example:
 *             event_name: "TestEvent"
 *             event_time: 1767668352
 *             action_source: "website"
 *             user_data:
 *               client_ip_address: "254.254.254.254"
 *               client_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:63.0) Gecko/20100101 Firefox/63.0"
 *               em: "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a"
 *             test_event_code: "TEST91814"
 *     responses:
 *       202:
 *         description: Webhook recebido e adicionado à fila com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookResponse'
 *             example:
 *               success: true
 *               message: "Webhook recebido e sendo processado"
 *               job_id: "123"
 *       400:
 *         description: Payload inválido ou vazio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Payload vazio ou inválido"
 *       401:
 *         description: Não autorizado (secret inválido)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Não autorizado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /webhook/health:
 *   get:
 *     summary: Health check específico do webhook
 *     description: Verifica o status do serviço de webhook
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Serviço está funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 service:
 *                   type: string
 *                   example: "webhook"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhook',
    timestamp: new Date().toISOString(),
  });
});

export default router;


