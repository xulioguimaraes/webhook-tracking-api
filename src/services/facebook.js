import axios from 'axios';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Cliente para Facebook Conversions API
 */
class FacebookConversionsClient {
  constructor() {
    this.accessToken = config.facebook.accessToken;
    this.pixelId = config.facebook.pixelId;
    this.apiUrl = `${config.facebook.apiUrl}/${this.pixelId}/events`;
  }

  /**
   * Mapeia dados do webhook para formato do Facebook
   * @param {Object} webhookData - Dados recebidos do webhook
   * @returns {Object} Evento formatado para Facebook
   */
  mapWebhookToFacebookEvent(webhookData) {
    // Extrai informações comuns do webhook
    const {
      event_name,
      event_time,
      user_data,
      custom_data,
      event_source_url,
      action_source = 'website',
    } = webhookData;

    // Mapeia event_name para tipos do Facebook
    const facebookEventName = this.mapEventName(event_name);

    const event = {
      event_name: facebookEventName,
      event_time: event_time || Math.floor(Date.now() / 1000),
      event_source_url: event_source_url || webhookData.url || webhookData.source_url,
      action_source: action_source,
      user_data: this.formatUserData(user_data || webhookData.user || {}),
      custom_data: this.formatCustomData(custom_data || webhookData.data || {}),
    };

    return event;
  }

  /**
   * Mapeia nomes de eventos para padrão do Facebook
   * @param {String} eventName - Nome do evento original
   * @returns {String} Nome do evento do Facebook
   */
  mapEventName(eventName) {
    const eventMap = {
      purchase: 'Purchase',
      lead: 'Lead',
      view_content: 'ViewContent',
      add_to_cart: 'AddToCart',
      initiate_checkout: 'InitiateCheckout',
      search: 'Search',
      complete_registration: 'CompleteRegistration',
      contact: 'Contact',
      subscribe: 'Subscribe',
    };

    // Tenta encontrar mapeamento ou usa o nome original em PascalCase
    const mapped = eventMap[eventName?.toLowerCase()];
    if (mapped) return mapped;

    // Converte para PascalCase se não encontrar
    return eventName
      ? eventName.charAt(0).toUpperCase() + eventName.slice(1).toLowerCase()
      : 'PageView';
  }

  /**
   * Formata dados do usuário para formato do Facebook
   * @param {Object} userData - Dados do usuário
   * @returns {Object} Dados formatados
   */
  formatUserData(userData) {
    const formatted = {};

    // Facebook aceita dados hash ou plain (mas recomenda hash)
    if (userData.email) formatted.em = this.hashData(userData.email);
    if (userData.phone) formatted.ph = this.hashData(userData.phone);
    if (userData.first_name) formatted.fn = this.hashData(userData.first_name);
    if (userData.last_name) formatted.ln = this.hashData(userData.last_name);
    if (userData.city) formatted.ct = this.hashData(userData.city);
    if (userData.state) formatted.st = this.hashData(userData.state);
    if (userData.zip) formatted.zp = this.hashData(userData.zip);
    if (userData.country) formatted.country = this.hashData(userData.country);
    if (userData.external_id) formatted.external_id = userData.external_id;

    // IP e User Agent (se disponíveis)
    if (userData.client_ip_address) formatted.client_ip_address = userData.client_ip_address;
    if (userData.client_user_agent) formatted.client_user_agent = userData.client_user_agent;

    return formatted;
  }

  /**
   * Formata dados customizados
   * @param {Object} customData - Dados customizados
   * @returns {Object} Dados formatados
   */
  formatCustomData(customData) {
    const formatted = {};

    // Valores monetários
    if (customData.value !== undefined) formatted.value = parseFloat(customData.value);
    if (customData.currency) formatted.currency = customData.currency.toUpperCase();

    // Dados de e-commerce
    if (customData.content_ids) formatted.content_ids = Array.isArray(customData.content_ids)
      ? customData.content_ids
      : [customData.content_ids];
    if (customData.content_name) formatted.content_name = customData.content_name;
    if (customData.content_type) formatted.content_type = customData.content_type;
    if (customData.content_category) formatted.content_category = customData.content_category;
    if (customData.num_items) formatted.num_items = parseInt(customData.num_items, 10);

    // Outros campos customizados
    Object.keys(customData).forEach((key) => {
      if (!['value', 'currency', 'content_ids', 'content_name', 'content_type', 'content_category', 'num_items'].includes(key)) {
        formatted[key] = customData[key];
      }
    });

    return formatted;
  }

  /**
   * Hash de dados usando SHA256 (recomendado pelo Facebook)
   * @param {String} data - Dado a ser hashado
   * @returns {String} Hash SHA256 do dado
   */
  hashData(data) {
    if (!data) return '';
    // Normaliza o dado (lowercase e trim) antes de hash
    const normalized = data.toLowerCase().trim();
    // Gera hash SHA256
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Envia evento único para Facebook Conversions API
   * @param {Object} webhookData - Dados do webhook
   * @returns {Promise<Object>} Resposta da API
   */
  async sendEvent(webhookData) {
    try {
      const event = this.mapWebhookToFacebookEvent(webhookData);
      const events = [event];

      return await this.sendBatch(events);
    } catch (error) {
      logger.error('Erro ao formatar evento para Facebook:', error);
      throw error;
    }
  }

  /**
   * Envia múltiplos eventos em batch
   * @param {Array<Object>} events - Array de eventos
   * @returns {Promise<Object>} Resposta da API
   */
  async sendBatch(events) {
    if (!this.accessToken || !this.pixelId) {
      throw new Error('Facebook access token ou pixel ID não configurados');
    }

    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('Array de eventos vazio ou inválido');
    }

    try {
      const payload = {
        data: events,
        access_token: this.accessToken,
        test_event_code: process.env.FB_TEST_EVENT_CODE, // Opcional para testar
      };

      logger.info(`Enviando ${events.length} evento(s) para Facebook Conversions API`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos
      });

      logger.info('Evento(s) enviado(s) com sucesso para Facebook:', {
        events_received: response.data.events_received,
        messages: response.data.messages,
      });

      return {
        success: true,
        data: response.data,
        events_received: response.data.events_received || events.length,
      };
    } catch (error) {
      logger.error('Erro ao enviar evento para Facebook:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      throw {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      };
    }
  }
}

export default new FacebookConversionsClient();

