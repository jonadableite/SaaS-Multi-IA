# Testing Guide - Multi-IA System

## Visão Geral

Este documento descreve a estratégia de testes implementada para o sistema Multi-IA, incluindo testes unitários, de integração e E2E.

## Estrutura de Testes

```
src/
├── features/
│   ├── chat/
│   │   └── controllers/
│   │       └── chat.controller.spec.ts
│   ├── conversation/
│   │   └── controllers/
│   │       └── conversation.controller.spec.ts
│   ├── agent/
│   │   └── controllers/
│   │       └── agent.controller.spec.ts
│   └── usage/
│       └── controllers/
│           └── usage.controller.spec.ts
├── middleware/
│   ├── rate-limit.spec.ts
│   └── security.spec.ts
└── __tests__/
    ├── integration/
    │   └── api.test.ts
    ├── e2e/
    │   └── chat-flow.test.ts
    └── unit/
        └── services/
            └── chat.service.test.ts
```

## Status Codes Testados

### 200 OK
- Listagem de recursos
- Recuperação de recursos
- Atualizações bem-sucedidas

### 400 Bad Request
- Validação de entrada inválida
- Dados faltando ou incorretos
- Parâmetros fora do range

### 401 Unauthorized
- Requisições sem autenticação
- Tokens inválidos ou expirados

### 403 Forbidden
- Acesso a recursos de outros usuários
- Permissões insuficientes

### 404 Not Found
- Recursos inexistentes
- IDs inválidos

### 429 Too Many Requests
- Rate limit excedido
- Headers de rate limit presentes

### 500 Internal Server Error
- Erros inesperados do servidor
- Falhas de integração

## Executando Testes

### Todos os Testes
```bash
npm test
```

### Testes Específicos
```bash
npm test -- chat.controller.spec.ts
npm test -- rate-limit.spec.ts
```

### Cobertura
```bash
npm test -- --coverage
```

## Cobertura de Testes

### Meta: 90% de Cobertura

- ✅ Controllers: Status codes, validação, erros
- ✅ Services: Lógica de negócio, edge cases
- ✅ Middleware: Rate limiting, segurança
- ✅ Integrações: AI providers (mockados)
- ⏳ E2E: Fluxos completos (requer setup)

## Próximos Passos

1. Implementar testes de integração completos
2. Adicionar testes E2E com Playwright
3. Configurar CI/CD para execução automática
4. Adicionar testes de performance
5. Monitorar cobertura com CI

