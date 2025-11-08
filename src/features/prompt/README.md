# Prompt Library System

Sistema completo de biblioteca de prompts para o WhatsApp Multi-IA, permitindo criar, organizar, compartilhar e reutilizar prompts de IA.

## 📋 Visão Geral

A Prompt Library é um sistema que permite aos usuários:

- ✅ **Criar e gerenciar prompts personalizados**
- ✅ **Categorizar por áreas** (Marketing, Código, Vendas, RH, etc.)
- ✅ **Buscar e filtrar** prompts facilmente
- ✅ **Favoritar** prompts mais usados
- ✅ **Avaliar** prompts com rating de 1-5 estrelas
- ✅ **Compartilhar** prompts na organização
- ✅ **Usar diretamente no chat** com um clique

## 🏗️ Arquitetura

### Backend (Igniter.js)

```
src/features/prompt/
├── prompt.interface.ts          # Types, interfaces, Zod schemas
├── controllers/
│   └── prompt.controller.ts     # REST API endpoints
└── procedures/
    └── prompt.procedure.ts      # Business logic e data access
```

**Endpoints disponíveis:**
- `GET /api/v1/prompts` - Listar prompts com filtros
- `GET /api/v1/prompts/:id` - Buscar prompt por ID
- `POST /api/v1/prompts` - Criar novo prompt
- `PUT /api/v1/prompts/:id` - Atualizar prompt
- `DELETE /api/v1/prompts/:id` - Deletar prompt
- `POST /api/v1/prompts/:id/favorite` - Toggle favorito
- `POST /api/v1/prompts/:id/rate` - Avaliar prompt

### Frontend (Next.js + React)

```
src/features/prompt/presentation/
├── components/
│   ├── prompt-card.tsx          # Card de exibição de prompt
│   ├── prompt-filters.tsx       # Filtros e busca
│   └── prompt-list.tsx          # Grid de prompts
├── hooks/
│   ├── use-prompts.ts           # Query de prompts
│   └── use-prompt-mutations.ts  # Mutations (create, update, delete)
└── utils/
    └── prompt-helpers.ts        # Funções auxiliares e configurações
```

**Página principal:**
- `/app/prompts` - Biblioteca completa de prompts

### Database (Prisma)

**Models:**
- `Prompt` - Model principal com título, conteúdo, categoria, tags, visibilidade
- `PromptFavorite` - Relação many-to-many User ↔ Prompt (favoritos)
- `PromptRating` - Avaliações de prompts (1-5 estrelas)

**Enum:**
- `PromptScope` - USER | ORGANIZATION | GLOBAL

## 🚀 Como Usar

### Para Usuários

#### 1. Acessar a Biblioteca
Clique em "Prompts" no menu lateral do dashboard.

#### 2. Buscar Prompts
- Use a barra de busca para encontrar prompts por título, descrição ou conteúdo
- Filtre por categoria (Marketing, Código, Vendas, etc.)
- Toggle "Meus Prompts" para ver apenas seus prompts

#### 3. Usar um Prompt
1. Encontre o prompt desejado
2. Clique no botão "Usar"
3. Você será redirecionado ao chat com o prompt já inserido

#### 4. Favoritar
Clique no ícone de coração para adicionar aos favoritos.

#### 5. Avaliar
Clique nas estrelas para avaliar um prompt (1-5 estrelas).

### Para Desenvolvedores

#### Criar Prompt via API

```typescript
import { api } from '@/igniter.client'
import { PromptCategory, PromptScope } from '@/features/prompt/prompt.interface'

const newPrompt = await api.prompt.create.mutate({
  title: 'Template de Email Marketing',
  description: 'Prompt para criar emails promocionais',
  content: 'Crie um email marketing profissional sobre...',
  category: PromptCategory.MARKETING,
  tags: ['email', 'marketing', 'vendas'],
  isPublic: true,
  scope: PromptScope.ORGANIZATION
})
```

#### Listar Prompts com Filtros

```typescript
const { data: prompts } = api.prompt.list.useQuery({
  category: 'Marketing',
  search: 'email',
  onlyMine: false,
  limit: 20
})
```

#### Toggle Favorito

```typescript
const { toggleFavorite } = usePromptMutations()

toggleFavorite.mutate({ params: { id: promptId } })
```

## 🎨 UI/UX

### Design System

**Componentes seguem o padrão:**
- **Glassmorphism** - Cards com efeito glass
- **Animações** - Fade in, hover lift, transitions suaves
- **Gradientes** - Títulos e CTAs com gradient-text
- **Responsivo** - Mobile-first, grid adaptativo

### Cores por Categoria

Cada categoria tem cor e ícone únicos:
- 🎯 **Marketing** - Laranja
- 💻 **Código** - Azul
- 💰 **Vendas** - Verde
- 💬 **Comunicação** - Roxo
- 🎓 **Acadêmico** - Índigo
- E mais...

## 🔒 Segurança e Permissões

### Visibilidade

**3 níveis:**
1. **USER** (padrão) - Apenas criador visualiza
2. **ORGANIZATION** - Toda organização visualiza
3. **GLOBAL** - Todos visualizam (marketplace público)

### Permissões

| Ação | Quem Pode |
|------|-----------|
| Listar | Qualquer autenticado |
| Visualizar | Criador ou se público |
| Criar | Member+ |
| Editar | Apenas criador |
| Deletar | Apenas criador |
| Favoritar | Qualquer autenticado |
| Avaliar | Qualquer autenticado (exceto próprio prompt) |

### Multi-tenancy

Todos os prompts são isolados por `organizationId`, garantindo separação de dados entre organizações.

## 📊 Categorias Disponíveis

- Marketing
- Código
- Vendas
- Comunicação
- Acadêmico
- Criação de Conteúdo
- Jurídico
- Entretenimento
- Trabalho
- Resolução de Problemas
- Escrita
- Estilo de Vida
- Recursos Humanos
- Finanças
- Apresentações

## 🔮 Próximos Passos (Fase 2)

- [ ] **Variáveis em Prompts** - `{{nome}}`, `{{empresa}}` com substituição dinâmica
- [ ] **Histórico de Uso** - Tracking de quantas vezes prompt foi usado
- [ ] **Sugestões IA** - IA sugere prompts baseado no contexto
- [ ] **Import/Export** - Importar prompts de JSON/CSV
- [ ] **Versionamento** - Histórico de alterações
- [ ] **Marketplace Externo** - Compartilhamento inter-organizações
- [ ] **Modal de Criação/Edição** - Interface completa de CRUD
- [ ] **Modal de Detalhes** - Visualização completa do prompt

## 📝 Notas Técnicas

### Type-Safety

Todo o sistema é 100% type-safe:
- TypeScript strict mode
- Zod validation em runtime
- Prisma types gerados automaticamente
- Igniter.js client type-safe

### Performance

- **Paginação** - Limite padrão de 50 prompts
- **Indexes** - Database indexes em category, organizationId, userId
- **Debounce** - Busca com debounce de 300ms
- **Lazy Loading** - Cards fora do viewport com lazy load

### Acessibilidade

- Labels semânticos
- ARIA attributes
- Navegação por teclado
- Contraste adequado

---

**Desenvolvido para**: WhatsApp Multi-IA  
**Framework**: Igniter.js + Next.js 15  
**Database**: PostgreSQL + Prisma  
**UI**: Shadcn UI + Tailwind CSS

