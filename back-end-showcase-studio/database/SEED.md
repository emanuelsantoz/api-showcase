# Seed dos mocks do front-end

O seed cria os nove projetos exibidos nos mocks atuais, com cursos, semestres encerrados, integrantes e uma conta de coordenadora.

Ele é idempotente: pode ser executado mais de uma vez sem duplicar os registros identificados como mocks.

## Execução

No PowerShell, dentro do back-end:

```powershell
$env:SEED_ADMIN_PASSWORD = 'defina-uma-senha-forte-aqui'
npm run db:seed
```

Conta de acesso criada ou atualizada:

```text
E-mail: helena.ramos@creativelab.local
Role: COORDENADOR
Senha: valor definido em SEED_ADMIN_PASSWORD
```

Os semestres dos mocks (`2024.1` a `2025.2`) ficam `CLOSED`, pois representam histórico. Crie e abra o semestre corrente no painel administrativo antes de receber novas submissões.

## Limitação intencional

O modelo atual suporta uma apresentação Canva ou PDF por projeto. As galerias de imagens continuam fora do MVP; links de repositório, protótipo e app, além das tags, são persistidos quando existem nos mocks.
