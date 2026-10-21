# Upload direto de mídia

As capas, avatares e PDFs de submissões públicas não atravessam mais a Function da Vercel. O navegador recebe uma autorização de curta duração, envia o arquivo diretamente ao Cloudflare R2 e só então envia um JSON pequeno para a API criar o projeto.

## Fluxo

1. O front-end pede autorizações em `POST /api/v1/public/submissions/uploads/authorize`.
2. A API valida quantidade, tipo e tamanho, gera URLs de upload válidas por 15 minutos e registra a autorização.
3. O navegador faz `PUT` direto no R2.
4. O formulário envia as referências assinadas à rota de submissão.
5. A API consulta o R2, confere tamanho, tipo e assinatura do arquivo e persiste o projeto.

Assim, a API não recebe o corpo `multipart/form-data` que estava sendo interrompido antes de chegar à Function.

## CORS obrigatório no bucket R2

O bucket precisa aceitar `PUT` apenas dos domínios públicos do Criative Lab. O script abaixo aplica a configuração quando as credenciais do R2 estão disponíveis localmente:

```powershell
$env:R2_ENV_FILE = '.env'
npm run r2:configure-cors
```

Ele cria esta regra:

```json
{
  "AllowedOrigins": ["https://criativelab.tech", "https://www.criativelab.tech"],
  "AllowedMethods": ["GET", "HEAD", "PUT"],
  "AllowedHeaders": ["content-type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

Não exponha `R2_ACCESS_KEY_ID` nem `R2_SECRET_ACCESS_KEY` no front-end. As credenciais ficam somente na Vercel e servem para assinar permissões temporárias.

## Limites e segurança

- Imagens: PNG, JPG ou WEBP, até 2 MB cada.
- PDF: até 10 MB.
- Total por submissão: até 20 MB e até 22 arquivos.
- URLs e tokens temporários: 15 minutos.
- Autorizações: 12 por endereço a cada hora.
- Submissões: 3 por endereço a cada hora.
- A API valida novamente a assinatura do arquivo depois do upload.

## Diagnóstico

Os registros da Vercel passam a indicar três fases sem registrar conteúdo, e-mails ou tokens:

- autorização dos uploads;
- validação de cada arquivo no R2;
- criação final do projeto.

O Cloudflare R2 deve ter uma regra de ciclo de vida para apagar objetos no prefixo `public-submissions/` que não forem usados após 24 horas. Isso evita arquivos órfãos caso alguém abandone o formulário antes de concluir o envio.
