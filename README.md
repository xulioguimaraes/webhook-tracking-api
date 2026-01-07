# Webhook Tracking API

API Node.js para receber webhooks, enfileirar dados e redirecionar para Facebook Conversions API com sistema de fila para garantir que nenhum dado seja perdido.

## Características

- ✅ Recebe webhooks de múltiplas fontes
- ✅ Sistema de fila com BullMQ/Redis para processamento assíncrono
- ✅ Retry automático em caso de falhas
- ✅ Switch de roteamento extensível (Facebook por padrão)
- ✅ Integração com Facebook Conversions API
- ✅ Logging estruturado
- ✅ Tratamento robusto de erros
- ✅ Documentação Swagger/OpenAPI interativa

## Pré-requisitos

- Node.js 18+ 
- Redis (local ou serviço gerenciado como Redis Cloud, Upstash)

## Instalação

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Server
PORT=3000
NODE_ENV=development

# Redis (exemplo para Redis Cloud)
REDIS_HOST=redis-13339.crce181.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=13339
REDIS_PASSWORD=your-redis-password

# Facebook Conversions API
FB_ACCESS_TOKEN=your-facebook-access-token
FB_PIXEL_ID=your-pixel-id
FB_API_VERSION=v18.0

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
```

## Como obter credenciais do Redis

Após criar um database no Redis, você precisa de 3 informações para configurar:
- **REDIS_HOST**: O endereço/hostname do servidor Redis
- **REDIS_PORT**: A porta de conexão (geralmente 6379)
- **REDIS_PASSWORD**: A senha de autenticação (pode estar oculta, clique em "Show")

Essas credenciais geralmente aparecem na página de detalhes/configuração do database que você criou.

### Redis Local

Se você está rodando Redis localmente:

1. **Sem senha (desenvolvimento)**: Se o Redis não tem senha configurada, deixe `REDIS_PASSWORD` vazio ou não defina a variável:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```

2. **Com senha**: Se você configurou uma senha no Redis (arquivo `redis.conf` com `requirepass`), use:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=sua-senha-aqui
   ```

### Redis Cloud (Redis Labs)

1. Acesse [Redis Cloud](https://redis.com/try-free/) e crie uma conta gratuita
2. Crie um novo banco de dados (database)
3. **Após criar o database, encontre suas credenciais:**
   - No painel do Redis Cloud, clique no database que você criou
   - Vá para a aba **"Configuration"** ou **"Config"**
   - Você verá uma seção chamada **"Endpoint"** ou **"Public endpoint"** com:
     - **Host/Endpoint**: algo como `redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com`
     - **Port**: geralmente um número como `12345` ou `6379`
   - Role a página até encontrar a seção **"Security"** ou **"Access Control"**
   - Procure por **"Default user password"** ou **"Password"**
   - Clique no ícone de olho 👁️ ou botão **"Show"** para revelar a senha
   - **Importante**: Copie a senha imediatamente, pois ela pode não ser exibida novamente
4. Configure no `.env`:
   ```env
   REDIS_HOST=redis-13339.crce181.sa-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT=13339
   REDIS_PASSWORD=sua-senha-redis-cloud
   ```
   
   **Exemplo com string de conexão completa:**
   Se você recebeu uma string como `redis-13339.crce181.sa-east-1-2.ec2.cloud.redislabs.com:13339`:
   - O **host** é a parte antes dos dois pontos: `redis-13339.crce181.sa-east-1-2.ec2.cloud.redislabs.com`
   - A **porta** é a parte depois dos dois pontos: `13339`
   - A **senha** você precisa buscar nas configurações de segurança do database

**Dica**: Se você não encontrar a senha, você pode:
- Resetar a senha do usuário padrão nas configurações de segurança
- Ou criar um novo usuário com senha nas configurações de acesso

### Upstash

1. Acesse [Upstash](https://upstash.com/) e crie uma conta
2. Crie um novo banco Redis
3. **Após criar o database, encontre suas credenciais:**
   - Na página do database criado, você verá uma seção **"REST API"** ou **"Details"**
   - Procure por **"Endpoint"** ou **"UPSTASH_REDIS_REST_URL"** - o host está dentro da URL
   - Exemplo: se a URL for `https://usw1-xxx.upstash.io`, o host é `usw1-xxx.upstash.io`
   - A **Port** geralmente é `6379` (pode estar na URL ou nas configurações)
   - Procure por **"Token"** ou **"Password"** - pode estar em uma seção separada
   - Clique no ícone de olho 👁️ ou botão **"Show"** para revelar a senha/token
4. Configure no `.env`:
   ```env
   REDIS_HOST=usw1-xxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=sua-senha-ou-token-upstash
   ```

**Nota**: No Upstash, às vezes a senha pode aparecer como "Token" ou "REST Token"

### Outros Serviços Gerenciados

Para outros serviços (AWS ElastiCache, Azure Cache, Google Cloud Memorystore, etc.):
- Consulte a documentação do seu provedor
- Geralmente as credenciais estão disponíveis no painel de controle do serviço
- Use o endpoint/host, porta e senha fornecidos pelo serviço

## Como obter credenciais do Facebook

Você precisa de duas credenciais principais:
- **FB_PIXEL_ID**: O ID do seu Pixel do Facebook
- **FB_ACCESS_TOKEN**: Token de acesso para enviar eventos via Conversions API

### Passo 1: Obter o Pixel ID

1. Acesse o [Facebook Business Manager](https://business.facebook.com/)
2. No menu lateral, vá em **Publicidade** > **Gerenciador de Eventos**
   - Alternativamente, você pode acessar através de **Gerenciador de Anúncios** > **Eventos**
3. Na página do Gerenciador de Eventos, você verá seus Conjuntos de Dados (Pixels)
4. Clique no conjunto de dados que deseja usar
5. Vá na aba **"Configurações"** > **"Integrações"**
6. Na seção **"Identificação"**, você verá o **Pixel ID** (exemplo: `650049378149663`)
   - É um número longo de 15-16 dígitos
   - Anote esse número, você precisará dele para configurar o `.env`

**Se você não tem um Pixel:**
1. No Gerenciador de Eventos, clique em **"Conectar dados"** ou **"Criar Pixel"**
2. Escolha **"Web"** como fonte de dados
3. Dê um nome ao Pixel (ex: "Meu Site Pixel")
4. Após criar, siga os passos acima para encontrar o Pixel ID

### Passo 2: Obter o Access Token

**Método 1 - Via Página de Integrações (Recomendado - Onde você está agora):**
1. Na página de **Integrações** do seu conjunto de dados (onde você está)
2. Procure pela seção **"Enviar eventos de um servidor"**
3. Clique em **"Configurar"** ou **"Set up"** nessa opção
4. Siga o assistente de configuração da Conversions API
5. Quando solicitado, escolha **"Gerar token de acesso"** ou **"Generate access token"**
6. **IMPORTANTE**: Copie o token imediatamente, pois ele só será exibido uma vez
   - O token terá o formato: `EAABsbCS1iHgBO...` (uma string longa)
   - Guarde esse token em local seguro

**Alternativa - Via Configurações do Conjunto de Dados:**
1. No Gerenciador de Eventos, clique no seu conjunto de dados
2. Vá na aba **"Configurações"**
3. Procure pela seção **"Conversions API"** ou **"API de Conversões"**
4. Clique em **"Configurar"** ou **"Set up"**
5. Siga os passos para gerar o token

**Método 2 - Via Facebook Developer (Recomendado):**
1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Vá em **Meus Apps** > Selecione ou crie um app
3. No menu lateral, vá em **Ferramentas** > **Conversions API**
4. Selecione o Pixel que você quer usar
5. Clique em **"Gerar token de acesso"** ou **"Generate access token"**
6. Configure as permissões:
   - Selecione as permissões necessárias (geralmente `ads_management` e `business_management`)
7. Clique em **"Gerar"** ou **"Generate"**
8. **IMPORTANTE**: Copie o token imediatamente

**Método 3 - Via Gerenciamento > Apps de negócios:**
1. No Facebook Business Manager, vá em **Gerenciamento** > **Apps de negócios**
2. Selecione o app relacionado ao seu Pixel
3. Vá em **Configurações** > **Conversions API**
4. Siga os passos para gerar o token

### Passo 3: Configurar no `.env`

Após obter as credenciais, configure no arquivo `.env`:

```env
FB_PIXEL_ID=650049378149663
FB_ACCESS_TOKEN=EAABsbCS1iHgBO...sua-string-longa-aqui
FB_API_VERSION=v18.0
```

**Exemplo com seus dados:**
- Seu **Pixel ID** é o número que aparece na seção "Identificação" da página de Integrações (ex: `650049378149663`)
- O **Access Token** você obtém ao configurar "Enviar eventos de um servidor"

**Dicas importantes:**
- O Access Token pode expirar. Se receber erros de autenticação, gere um novo token
- Mantenha o token seguro e nunca o compartilhe publicamente
- O `FB_API_VERSION` geralmente é `v18.0` ou mais recente (verifique a [documentação do Facebook](https://developers.facebook.com/docs/graph-api/changelog))

## Uso

### Iniciar o servidor

```bash
npm start
```

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

### Endpoints

#### POST `/webhook`

Recebe webhooks e adiciona na fila para processamento.

**Exemplo de requisição:**

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "purchase",
    "event_time": 1699123456,
    "user_data": {
      "email": "user@example.com",
      "phone": "+5511999999999",
      "first_name": "João",
      "last_name": "Silva",
      "client_ip_address": "192.168.1.1",
      "client_user_agent": "Mozilla/5.0..."
    },
    "custom_data": {
      "value": 99.90,
      "currency": "BRL",
      "content_ids": ["product-123"],
      "content_name": "Produto Exemplo"
    },
    "event_source_url": "https://example.com/checkout"
  }'
```

**Resposta:**

```json
{
  "success": true,
  "message": "Webhook recebido e sendo processado",
  "job_id": "123"
}
```

#### GET `/health`

Verifica o status da API e da fila.

**Resposta:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 2,
    "completed": 150,
    "failed": 1,
    "total": 153
  }
}
```

#### GET `/`

Informações sobre a API.

#### GET `/api-docs`

Documentação interativa da API usando Swagger UI.

Acesse `http://localhost:3000/api-docs` para ver a documentação completa com exemplos e poder testar os endpoints diretamente.

## Estrutura do Projeto

```
webhook-tracking-api/
├── src/
│   ├── server.js              # Servidor Express
│   ├── routes/
│   │   └── webhook.js         # Rota de webhook
│   ├── queue/
│   │   ├── index.js           # Configuração BullMQ
│   │   └── processor.js       # Worker que processa jobs
│   ├── services/
│   │   ├── facebook.js        # Cliente Facebook API
│   │   └── router.js          # Switch de roteamento
│   ├── config/
│   │   └── index.js           # Configurações
│   └── utils/
│       └── logger.js          # Sistema de logs
├── .env.example
├── render.yaml                # Configuração para deploy no Render
├── package.json
└── README.md
```

## Fluxo de Dados

1. **Webhook recebido**: API recebe POST com dados JSON
2. **Validação**: Dados são validados
3. **Enfileiramento**: Job é adicionado na fila Redis (resposta imediata 202)
4. **Processamento**: Worker processa job da fila
5. **Roteamento**: Router decide destino (Facebook por padrão)
6. **Envio**: Dados são enviados para Facebook Conversions API
7. **Retry**: Em caso de erro, job é reenfileirado automaticamente

## Eventos Suportados

O sistema mapeia automaticamente os seguintes eventos para o formato do Facebook:

- `purchase` → `Purchase`
- `lead` → `Lead`
- `view_content` → `ViewContent`
- `add_to_cart` → `AddToCart`
- `initiate_checkout` → `InitiateCheckout`
- `search` → `Search`
- `complete_registration` → `CompleteRegistration`
- `contact` → `Contact`
- `subscribe` → `Subscribe`

## Segurança

- Validação de payload obrigatória
- Hash SHA256 de dados sensíveis (email, telefone, etc.)
- Suporte a autenticação via header `X-Webhook-Secret` (opcional)
- Sanitização de dados sensíveis nos logs

## Monitoramento

Os logs são estruturados e incluem:

- Jobs adicionados à fila
- Jobs processados com sucesso
- Jobs que falharam
- Estatísticas da fila
- Erros e exceções

## Adicionar Novas APIs

Para adicionar suporte a outras APIs de conversão (Google, TikTok, etc.):

1. Crie um novo serviço em `src/services/` seguindo o padrão do `facebook.js`
2. Registre a rota no `router.js`:

```javascript
import newService from './services/new-api.js';
router.registerRoute('new-api', newService);
```

3. Use o campo `destination` no webhook para rotear:

```json
{
  "destination": "new-api",
  "event_name": "purchase",
  ...
}
```

## Deploy no Render

### Pré-requisitos

- Conta no [Render](https://render.com/)
- Redis configurado (Render Redis ou serviço externo como Upstash/Redis Cloud)
- Credenciais do Facebook Conversions API configuradas

### Opção 1: Deploy usando render.yaml (Recomendado)

1. **Conecte seu repositório ao Render:**
   - Acesse [Render Dashboard](https://dashboard.render.com/)
   - Clique em **"New +"** > **"Blueprint"**
   - Conecte seu repositório GitHub/GitLab
   - O Render detectará automaticamente o arquivo `render.yaml`

2. **Configure o Redis:**
   
   **Opção A - Render Redis (Recomendado para produção):**
   - No Render Dashboard, crie um novo **Redis** service
   - Anote as credenciais (host, port, password)
   
   **Opção B - Serviço externo (Upstash/Redis Cloud):**
   - Use as credenciais do seu serviço externo
   - Veja seção "Como obter credenciais do Redis" acima

3. **Configure as variáveis de ambiente:**
   
   No Render Dashboard, vá em **Environment** e adicione:
   
   ```env
   # Server (PORT é definido automaticamente pelo Render)
   NODE_ENV=production
   
   # Redis
   REDIS_HOST=seu-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=sua-senha-redis
   
   # Facebook Conversions API
   FB_ACCESS_TOKEN=seu-facebook-access-token
   FB_PIXEL_ID=seu-pixel-id
   FB_API_VERSION=v18.0
   
   # Queue (opcional)
   QUEUE_CONCURRENCY=5
   QUEUE_MAX_RETRIES=3
   
   # Webhook Secret (opcional, mas recomendado para produção)
   WEBHOOK_SECRET=seu-secret-seguro
   
   # Test Event Code (opcional, apenas para testes)
   FB_TEST_EVENT_CODE=TEST12345
   ```

4. **Deploy:**
   - O Render fará o deploy automaticamente
   - Aguarde o build e start completarem
   - Verifique os logs para confirmar que o serviço iniciou corretamente

### Opção 2: Deploy Manual

1. **Crie um novo Web Service:**
   - No Render Dashboard, clique em **"New +"** > **"Web Service"**
   - Conecte seu repositório

2. **Configure o serviço:**
   - **Name**: `webhook-tracking-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Escolha o plano adequado (Starter para começar)

3. **Configure variáveis de ambiente** (mesmas da Opção 1)

4. **Health Check:**
   - O Render usa automaticamente `/health` como health check
   - Certifique-se de que a rota está funcionando

### Verificar Deploy

Após o deploy, verifique:

1. **Health Check:**
   ```bash
   curl https://seu-app.onrender.com/health
   ```
   
   Deve retornar:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T12:00:00.000Z",
     "queue": {
       "waiting": 0,
       "active": 0,
       "completed": 0,
       "failed": 0,
       "total": 0
     }
   }
   ```

2. **Testar Webhook:**
   ```bash
   curl -X POST https://seu-app.onrender.com/webhook \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: seu-secret" \
     -d '{
       "event_name": "purchase",
       "user_data": {
         "email": "test@example.com"
       },
       "custom_data": {
         "value": 99.90,
         "currency": "BRL"
       }
     }'
   ```

3. **Verificar Logs:**
   - No Render Dashboard, vá em **Logs**
   - Verifique se há erros de conexão com Redis ou Facebook
   - Confirme que os eventos estão sendo processados

### Configuração de Redis no Render

**Render Redis (Recomendado):**
- Vá em **New +** > **Redis**
- Escolha o plano (Free tier disponível para testes)
- Após criar, copie as credenciais:
  - **Internal Redis URL**: Use para `REDIS_HOST` e `REDIS_PORT`
  - **Password**: Use para `REDIS_PASSWORD`

**Serviços Externos:**
- **Upstash**: Veja seção "Como obter credenciais do Redis" > Upstash
- **Redis Cloud**: Veja seção "Como obter credenciais do Redis" > Redis Cloud

### Monitoramento

- **Logs**: Acesse **Logs** no Render Dashboard para ver logs em tempo real
- **Metrics**: Render fornece métricas básicas de CPU, memória e requisições
- **Health Check**: O Render monitora automaticamente o endpoint `/health`

### Troubleshooting no Render

**App não inicia:**
- Verifique os logs no Render Dashboard
- Confirme que todas as variáveis de ambiente estão configuradas
- Verifique se o Redis está acessível

**Erro de conexão com Redis:**
- Se usar Render Redis, use o **Internal Redis URL** (não o externo)
- Se usar serviço externo, verifique firewall e credenciais
- Confirme que `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD` estão corretos

**Eventos não são processados:**
- Verifique logs para erros do Facebook API
- Confirme que `FB_ACCESS_TOKEN` e `FB_PIXEL_ID` estão corretos
- Verifique se o worker está rodando (deve iniciar automaticamente)

## Troubleshooting

### Erro de conexão com Redis

Verifique se:
- Redis está rodando e acessível
- Credenciais no `.env` estão corretas
- Firewall permite conexão na porta do Redis

### Eventos não estão sendo enviados para Facebook

Verifique:
- `FB_ACCESS_TOKEN` e `FB_PIXEL_ID` estão configurados
- Token tem permissões adequadas
- Logs para ver erros específicos da API

### Jobs ficam travados

- Verifique se o worker está rodando
- Verifique logs para erros
- Considere aumentar `QUEUE_CONCURRENCY` se houver muitos jobs

## Licença

ISC


