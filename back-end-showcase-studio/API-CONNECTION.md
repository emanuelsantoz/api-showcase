# Como conectar ao Academic Showcase API

## URL base

Em produção, use a URL publicada na Vercel seguida do prefixo da API:

```text
https://SEU_BACKEND.vercel.app/api/v1
```

No desenvolvimento local:

```text
http://localhost:3000/api/v1
```

Teste se a API está disponível:

```http
GET /api/v1/healthz
```

Resposta esperada:

```json
{ "status": "ok" }
```

> A rota `/` não é uma página da aplicação e pode responder `404 Not Found`. Use sempre o prefixo `/api/v1`.

## Configuração do frontend

No projeto frontend, crie ou atualize o arquivo `.env`:

```env
VITE_API_URL=https://SEU_BACKEND.vercel.app/api/v1
```

Para ambiente local:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

Depois de alterar variáveis `VITE_*`, gere um novo build/deploy do frontend.

## CORS

No projeto da API, configure a variável `CORS_ORIGIN` na Vercel com a URL exata do frontend:

```env
CORS_ORIGIN=https://SEU_FRONTEND.vercel.app
```

Não inclua barra (`/`) no final. Em desenvolvimento local, o CORS permite qualquer origem.

## Autenticação

Algumas rotas exigem um token JWT. Primeiro faça login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "sua-senha"
}
```

Resposta de sucesso:

```json
{
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "uuid",
      "name": "Nome do usuário",
      "email": "usuario@exemplo.com",
      "role": "STUDENT",
      "courseId": "uuid-ou-null"
    }
  }
}
```

Envie o token nas rotas protegidas:

```http
Authorization: Bearer SEU_TOKEN
```

Guarde o token apenas no cliente e nunca o envie para o repositório.

## Endpoints

| Método | Caminho | Autenticação | Descrição |
| --- | --- | --- | --- |
| `GET` | `/healthz` | Não | Verifica a disponibilidade da API. |
| `POST` | `/auth/login` | Não | Realiza login e retorna um JWT. |
| `GET` | `/users/professors` | JWT + moderador | Lista professores cadastrados. |
| `POST` | `/users/professors` | JWT + moderador | Cria um professor com senha temporária. |
| `GET` | `/courses` | Não | Lista os cursos. |
| `GET` | `/projects` | Não | Lista projetos aprovados com paginação. |
| `GET` | `/projects/:id` | Não | Busca um projeto aprovado. |
| `POST` | `/projects` | JWT | Cria um projeto para moderação. |
| `POST` | `/projects/:id/thumbnail` | JWT + autor/moderador | Envia a miniatura como `multipart/form-data` (`file`). |
| `POST` | `/projects/:id/presentation/canva` | JWT + autor/moderador | Salva ou substitui o link público do Canva. |
| `POST` | `/projects/:id/presentation/pdf` | JWT + autor/moderador | Envia o PDF como `multipart/form-data` (`file`). |
| `DELETE` | `/projects/:id/presentation` | JWT + autor/moderador | Remove a apresentação e o arquivo remoto. |
| `PATCH` | `/projects/:id/view` | Não | Incrementa o total de visualizações. |
| `POST` | `/projects/:id/like` | JWT | Alterna o like do usuário autenticado. |
| `PATCH` | `/projects/:id/status` | JWT + moderador | Atualiza status/destaque do projeto. |

## Exemplos

### Listar projetos

```http
GET /api/v1/projects?page=1&limit=12&isFeatured=true
```

Parâmetros disponíveis:

- `page`: página atual; padrão `1`.
- `limit`: quantidade por página; padrão `12`.
- `courseId`: UUID do curso para filtrar.
- `isFeatured`: `true` ou `false`.

### Criar um projeto

```http
POST /api/v1/projects
Authorization: Bearer SEU_TOKEN
Content-Type: application/json

{
  "title": "Aplicação para gestão acadêmica",
  "shortDescription": "Projeto de conclusão de curso para gestão acadêmica.",
  "description": "Descrição completa com os objetivos, tecnologias e resultados do projeto.",
  "thumbnailUrl": "https://exemplo.com/imagem.png",
  "courseId": "UUID_DO_CURSO",
  "membersIds": ["UUID_DO_USUARIO"]
}
```

O projeto é criado com status `PENDING_REVIEW`. Para criar já com Canva, inclua no JSON:

```json
{
  "presentation": {
    "type": "CANVA",
    "url": "https://www.canva.com/design/ID/view"
  }
}
```

### Enviar miniatura

A miniatura deve ser PNG, JPEG ou WEBP com no máximo 2 MB. O backend salva o arquivo no provider configurado e grava somente a URL/metadados no Neon.

```bash
curl -X POST "$API_URL/projects/UUID_DO_PROJETO/thumbnail" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@capa.png"
```

### Enviar apresentação PDF

O PDF deve ser `application/pdf` com no máximo 10 MB.

```bash
curl -X POST "$API_URL/projects/UUID_DO_PROJETO/presentation/pdf" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@apresentacao.pdf"
```

O provider dos arquivos é definido pelas variáveis de ambiente do backend. O código não cria buckets nem configura contas externas.

### Dar/remover like

```http
POST /api/v1/projects/UUID_DO_PROJETO/like
Authorization: Bearer SEU_TOKEN
```

### Moderar projeto

Exige usuário com papel `ADMIN` ou `COORDENADOR`:

```http
PATCH /api/v1/projects/UUID_DO_PROJETO/status
Authorization: Bearer SEU_TOKEN
Content-Type: application/json

{
  "status": "APPROVED",
  "isFeatured": true
}
```

## Exemplo em JavaScript

```ts
const apiUrl = import.meta.env.VITE_API_URL

const response = await fetch(`${apiUrl}/projects?page=1&limit=12`)

if (!response.ok) {
  throw new Error('Não foi possível carregar os projetos.')
}

const { data, meta } = await response.json()
```

Para rotas autenticadas:

```ts
const response = await fetch(`${apiUrl}/projects`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(project),
})
```

## Submissão pública sem login

```http
POST /api/v1/public/submissions
Content-Type: multipart/form-data
```

A requisição recebe `title`, `shortDescription`, `description`, `courseId`, `submitterName`, `submitterEmail`, `membersIds`, `contributors`, `tags`, `liveUrl`, `prototypeUrl`, `repositoryUrl`, `thumbnail`, `presentationType` e `presentation` (PDF) ou `canvaUrl`.

Para corrigir uma submissão após solicitação do professor:

```http
POST /api/v1/public/submissions/UUID_DO_PROJETO/resubmit
Authorization: Bearer TOKEN_TEMPORARIO
Content-Type: multipart/form-data
```

## Moderação do professor

Todas as rotas exigem JWT de `ADMIN` ou `COORDENADOR`:

```text
GET   /api/v1/moderation/projects
GET   /api/v1/moderation/projects/:id
PATCH /api/v1/moderation/projects/:id/approve
PATCH /api/v1/moderation/projects/:id/request-changes
PATCH /api/v1/moderation/projects/:id/reject
```

`request-changes` recebe `{ "reason": "..." }` e gera um link temporário de correção.

## Respostas de erro

| Código | Significado |
| --- | --- |
| `400` | Dados ou parâmetros inválidos. |
| `401` | Token ausente, inválido ou expirado. |
| `403` | Usuário sem permissão de moderador. |
| `404` | Recurso não encontrado. |
| `409` | Registro duplicado. |
| `422` | Relação com recurso inexistente, por exemplo um curso inválido. |
| `500` | Erro inesperado no servidor. |

## Semestres e tema atual

O estudante nÃ£o envia o semestre. A API associa automaticamente a submissÃ£o ao Ãºnico semestre com status `OPEN`.

```text
GET   /api/v1/semesters
GET   /api/v1/semesters/current
POST  /api/v1/semesters                 # ADMIN ou COORDENADOR
PATCH /api/v1/semesters/:id/open        # ADMIN ou COORDENADOR
PATCH /api/v1/semesters/:id/close       # ADMIN ou COORDENADOR
PATCH /api/v1/semesters/:id/courses     # ADMIN ou COORDENADOR; body: { "courses": [{ "courseId": "UUID", "className": "Turma A", "theme": "Tema da turma" }] }
GET   /api/v1/courses                   # somente disciplinas do semestre OPEN
GET   /api/v1/courses/admin             # ADMIN ou COORDENADOR; todas as disciplinas
GET   /api/v1/projects?semesterId=UUID
```

Uma submissÃ£o sem semestre aberto retorna `409`. O tema fica salvo na relaÃ§Ã£o entre semestre, disciplina e turma (`SemesterCourse`). O mesmo curso pode ter vÃ¡rias turmas no perÃ­odo, e a API retorna `className` e `theme` em cada opÃ§Ã£o disponÃ­vel.

## Links, tags e integrantes pÃºblicos

As submissÃµes podem enviar `liveUrl`, `prototypeUrl`, `repositoryUrl` e `tags` como JSON. Integrantes sem conta sÃ£o enviados em `contributors`:

```json
{
  "contributors": [
    { "name": "Ana Silva", "email": "ana@example.com", "roleInfo": "Front-end" }
  ],
  "tags": ["React", "IoT"],
  "liveUrl": "https://exemplo.vercel.app",
  "prototypeUrl": "https://www.figma.com/design/...",
  "repositoryUrl": "https://github.com/org/projeto"
}
```

Esses campos sÃ£o opcionais e aparecem no portfÃ³lio apenas quando preenchidos.
