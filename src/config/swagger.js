import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Webhook Tracking API",
      version: "1.0.0",
      description:
        "API Node.js para receber webhooks, enfileirar dados e redirecionar para Facebook Conversions API com sistema de fila para garantir que nenhum dado seja perdido.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor de desenvolvimento",
      },
      {
        url: "https://webhook-tracking-api.onrender.com",
        description: "Servidor de produção",
      },
    ],
    components: {
      securitySchemes: {
        WebhookSecret: {
          type: "apiKey",
          in: "header",
          name: "X-Webhook-Secret",
          description:
            "Secret para autenticação do webhook (configurado no .env)",
        },
      },
      schemas: {
        WebhookRequest: {
          type: "object",
          required: ["event_name"],
          properties: {
            event_name: {
              type: "string",
              description:
                "Nome do evento (ex: purchase, lead, view_content, etc.)",
              example: "TestEvent",
            },
            event_time: {
              type: "integer",
              description:
                "Timestamp Unix do evento em segundos. Se não fornecido, será usado o timestamp atual.",
              example: 1767668352,
            },
            action_source: {
              type: "string",
              description: "Fonte da ação (website, app, phone_call, etc.)",
              enum: ["website", "app", "phone_call", "email", "chat", "other"],
              default: "website",
              example: "website",
            },
            user_data: {
              type: "object",
              description: "Dados do usuário",
              properties: {
                email: {
                  type: "string",
                  description:
                    "Email do usuário (será hashado automaticamente)",
                  example: "user@example.com",
                },
                phone: {
                  type: "string",
                  description:
                    "Telefone do usuário (será hashado automaticamente)",
                  example: "+5511999999999",
                },
                first_name: {
                  type: "string",
                  description: "Primeiro nome (será hashado automaticamente)",
                  example: "João",
                },
                last_name: {
                  type: "string",
                  description: "Sobrenome (será hashado automaticamente)",
                  example: "Silva",
                },
                client_ip_address: {
                  type: "string",
                  description: "Endereço IP do cliente",
                  example: "254.254.254.254",
                },
                client_user_agent: {
                  type: "string",
                  description: "User Agent do cliente",
                  example:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:63.0) Gecko/20100101 Firefox/63.0",
                },
                em: {
                  type: "string",
                  description: "Email já hashado (SHA256)",
                  example:
                    "f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a",
                },
                ph: {
                  type: "string",
                  description: "Telefone já hashado (SHA256)",
                },
                fn: {
                  type: "string",
                  description: "Primeiro nome já hashado (SHA256)",
                },
                ln: {
                  type: "string",
                  description: "Sobrenome já hashado (SHA256)",
                },
                external_id: {
                  type: "string",
                  description: "ID externo do usuário",
                },
              },
            },
            custom_data: {
              type: "object",
              description: "Dados customizados do evento",
              properties: {
                value: {
                  type: "number",
                  description: "Valor monetário do evento",
                  example: 99.9,
                },
                currency: {
                  type: "string",
                  description: "Moeda (código ISO 4217)",
                  example: "BRL",
                },
                content_ids: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "IDs dos conteúdos",
                  example: ["product-123"],
                },
                content_name: {
                  type: "string",
                  description: "Nome do conteúdo",
                  example: "Produto Exemplo",
                },
                content_type: {
                  type: "string",
                  description: "Tipo do conteúdo",
                },
                content_category: {
                  type: "string",
                  description: "Categoria do conteúdo",
                },
                num_items: {
                  type: "integer",
                  description: "Número de itens",
                },
              },
            },
            event_source_url: {
              type: "string",
              description: "URL de origem do evento",
              example: "https://example.com/checkout",
            },
            test_event_code: {
              type: "string",
              description:
                "Código de evento de teste do Facebook (para ver eventos em tempo real)",
              example: "TEST91814",
            },
            destination: {
              type: "string",
              description:
                "Destino da API de conversão (facebook, google, tiktok, etc.)",
              default: "facebook",
              example: "facebook",
            },
          },
        },
        WebhookResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Webhook recebido e sendo processado",
            },
            job_id: {
              type: "string",
              description: "ID do job na fila",
              example: "123",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "string",
              example: "Mensagem de erro",
            },
            message: {
              type: "string",
              description: "Mensagem adicional (apenas em desenvolvimento)",
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok",
            },
            timestamp: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T12:00:00.000Z",
            },
            queue: {
              type: "object",
              properties: {
                waiting: {
                  type: "integer",
                  example: 0,
                },
                active: {
                  type: "integer",
                  example: 2,
                },
                completed: {
                  type: "integer",
                  example: 150,
                },
                failed: {
                  type: "integer",
                  example: 1,
                },
                total: {
                  type: "integer",
                  example: 153,
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Webhook",
        description: "Endpoints para receber e processar webhooks",
      },
      {
        name: "Health",
        description: "Endpoints de verificação de saúde da API",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/server.js", "./src/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
