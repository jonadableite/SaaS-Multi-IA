# Multi-IA System - Documentação

## Visão Geral

Sistema Multi-IA completo implementado seguindo arquitetura SOLID, type-safety end-to-end e segurança por padrão.

## Estrutura de Features

### 1. Chat (`/features/chat`)
- **Controller**: ChatController - Endpoint principal para chat com IA
- **Service**: ChatService - Lógica de negócio para processamento de chat
- **Integração**: AIRouter para múltiplos provedores

### 2. Conversation (`/features/conversation`)
- **Controller**: ConversationController - CRUD de conversas
- **Procedure**: ConversationProcedure - Data access layer
- **Interface**: Validação Zod completa

### 3. Message (`/features/message`)
- **Interface**: MessageRole enum, schemas Zod
- **Procedure**: MessageProcedure - Gerenciamento de mensagens

### 4. Agent (`/features/agent`)
- **Controller**: AgentController - CRUD de agentes IA
- **Features**: Publicação, categorização, tags, rating

### 5. Memory (`/features/memory`)
- **Controller**: MemoryController - Memórias persistentes do usuário
- **Uso**: Contexto para IA baseado em memórias do usuário

### 6. Usage (`/features/usage`)
- **Controller**: UsageController - Estatísticas e histórico de uso
- **Service**: UsageService - Tracking de uso
- **Service**: CreditService - Gerenciamento de créditos
- **Jobs**: Billing pipeline com BullMQ

## Segurança

### Rate Limiting
- **Middleware**: `createRateLimitProcedure`
- **Configuração**: Por ambiente (dev/staging/prod)
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **Storage**: Redis para cache distribuído

### SSRF Protection
- **Validação**: Whitelist de domínios
- **Bloqueio**: IPs privados/reservados
- **Schemes**: Suporte para HTTPS obrigatório

### Sanitização
- **XSS Prevention**: Remoção de tags HTML/JS
- **Escape**: Caracteres especiais
- **Normalização**: Strings e whitespace

## Testes

### Estrutura
- **Unit Tests**: `*.spec.ts` para cada componente
- **Integration Tests**: `__tests__/integration/`
- **E2E Tests**: `__tests__/e2e/`

### Cobertura
- Status codes: 200, 400, 401, 403, 404, 429, 500
- Validação de tipos e estruturas
- Tratamento de erros
- Cenários de segurança

## Configuração

### Variáveis de Ambiente

```env
# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
CHAT_RATE_LIMIT_MAX_REQUESTS=30
CHAT_RATE_LIMIT_WINDOW_SECONDS=60

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=...

# Security
ALLOWED_DOMAINS=api.openai.com,api.anthropic.com
SSRF_BLOCK_PRIVATE_IPS=true
SSRF_REQUIRE_HTTPS=true
```

## API Endpoints

### Chat
- `POST /api/v1/chat` - Enviar mensagem de chat

### Conversations
- `GET /api/v1/conversations` - Listar conversas
- `GET /api/v1/conversations/:id` - Obter conversa
- `POST /api/v1/conversations` - Criar conversa
- `PATCH /api/v1/conversations/:id` - Atualizar conversa
- `DELETE /api/v1/conversations/:id` - Deletar conversa

### Agents
- `GET /api/v1/agents` - Listar agentes
- `GET /api/v1/agents/:id` - Obter agente
- `POST /api/v1/agents` - Criar agente
- `PATCH /api/v1/agents/:id` - Atualizar agente
- `DELETE /api/v1/agents/:id` - Deletar agente

### Usage
- `GET /api/v1/usage` - Histórico de uso
- `GET /api/v1/usage/stats` - Estatísticas de uso

### Memory
- `GET /api/v1/memories` - Listar memórias
- `GET /api/v1/memories/:key` - Obter memória
- `POST /api/v1/memories` - Criar memória
- `PATCH /api/v1/memories/:key` - Atualizar memória
- `DELETE /api/v1/memories/:key` - Deletar memória

## Billing Pipeline

1. **Usage Event**: Criado após cada chamada à IA
2. **Job Queue**: BullMQ processa billing assincronamente
3. **Credit Deduction**: Transação Prisma para garantir atomicidade
4. **Cost Calculation**: Baseado em provider e model

## Próximos Passos

1. Executar migration: `npx prisma migrate dev`
2. Configurar variáveis de ambiente
3. Executar testes: `npm test`
4. Configurar CI/CD pipeline
5. Adicionar monitoramento (Sentry, Prometheus)

