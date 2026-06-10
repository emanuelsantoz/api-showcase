---
name: check-api
description: Valida o estado geral da tipagem do Hono e integridade com o Prisma
---
Execute os seguintes passos para validar as últimas alterações da API:
1. Rode `npx prisma validate` para checar o schema.
2. Rode `npm run build` para garantir que a inferência do Zod com o Hono não quebrou nenhum tipo do TypeScript.
3. Se encontrar erros, corrija-os imediatamente nos arquivos correspondentes.