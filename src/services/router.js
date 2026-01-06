import facebookService from './facebook.js';
import logger from '../utils/logger.js';

/**
 * Switch de roteamento para diferentes APIs de conversão
 */
class ConversionRouter {
  constructor() {
    this.routes = {
      facebook: facebookService,
      // Adicionar outras APIs aqui no futuro
      // google: googleService,
      // tiktok: tiktokService,
    };
  }

  /**
   * Determina qual API usar baseado nos dados do webhook
   * @param {Object} webhookData - Dados do webhook
   * @returns {String} Nome da API de destino
   */
  determineRoute(webhookData) {
    // Por padrão, usa Facebook
    // Pode ser customizado baseado em:
    // - Header do webhook (ex: X-Conversion-API)
    // - Campo no payload (ex: { destination: 'google' })
    // - Configuração por fonte

    const destination = webhookData.destination
      || webhookData.api_destination
      || webhookData.target_api
      || 'facebook';

    // Valida se a rota existe
    if (!this.routes[destination.toLowerCase()]) {
      logger.warn(`Rota ${destination} não encontrada, usando Facebook como padrão`);
      return 'facebook';
    }

    return destination.toLowerCase();
  }

  /**
   * Valida dados do webhook antes de rotear
   * @param {Object} webhookData - Dados do webhook
   * @returns {Object} { valid: boolean, errors: Array }
   */
  validateWebhookData(webhookData) {
    const errors = [];

    if (!webhookData || typeof webhookData !== 'object') {
      errors.push('Dados do webhook inválidos ou vazios');
      return { valid: false, errors };
    }

    // Validações básicas
    if (!webhookData.event_name && !webhookData.event) {
      errors.push('event_name ou event é obrigatório');
    }

    // Validações específicas por tipo de evento
    if (webhookData.event_name === 'purchase' || webhookData.event === 'purchase') {
      if (!webhookData.custom_data?.value && !webhookData.data?.value) {
        errors.push('Valor (value) é obrigatório para eventos de compra');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Roteia webhook para a API apropriada
   * @param {Object} webhookData - Dados do webhook
   * @param {Object} options - Opções de roteamento
   * @returns {Promise<Object>} Resultado do envio
   */
  async route(webhookData, options = {}) {
    try {
      // Valida dados
      const validation = this.validateWebhookData(webhookData);
      if (!validation.valid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
      }

      // Determina rota
      const route = options.destination || this.determineRoute(webhookData);
      const service = this.routes[route];

      if (!service) {
        throw new Error(`Serviço ${route} não encontrado`);
      }

      logger.info(`Roteando webhook para ${route}`, {
        event_name: webhookData.event_name || webhookData.event,
        route,
      });

      // Envia para o serviço apropriado
      const result = await service.sendEvent(webhookData);

      return {
        success: true,
        route,
        result,
      };
    } catch (error) {
      logger.error('Erro no roteamento:', {
        error: error.message,
        stack: error.stack,
        webhookData: this.sanitizeForLog(webhookData),
      });

      throw {
        success: false,
        error: error.message,
        route: options.destination || this.determineRoute(webhookData),
      };
    }
  }

  /**
   * Remove dados sensíveis dos logs
   * @param {Object} data - Dados a serem sanitizados
   * @returns {Object} Dados sanitizados
   */
  sanitizeForLog(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['email', 'phone', 'password', 'token', 'access_token', 'secret'];

    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const result = Array.isArray(obj) ? [...obj] : { ...obj };

      Object.keys(result).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          result[key] = '***REDACTED***';
        } else if (typeof result[key] === 'object') {
          result[key] = sanitizeObject(result[key]);
        }
      });

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Registra uma nova rota
   * @param {String} name - Nome da rota
   * @param {Object} service - Serviço que implementa sendEvent
   */
  registerRoute(name, service) {
    if (typeof service.sendEvent !== 'function') {
      throw new Error('Serviço deve implementar método sendEvent');
    }
    this.routes[name.toLowerCase()] = service;
    logger.info(`Rota ${name} registrada`);
  }
}

export default new ConversionRouter();


