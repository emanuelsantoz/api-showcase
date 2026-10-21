# Plano de evolução para múltiplas instituições

## Objetivo

Permitir que projetos pertençam a instituições com estruturas acadêmicas diferentes, sem obrigar todas elas a cadastrar curso, disciplina, turma ou semestre.

O modelo-alvo está documentado em `CLASS-DIAGRAM.md`.

## Decisão de domínio

Todo projeto pertence a um `SubmissionContext`.

O contexto sempre pertence a uma instituição, mas pode assumir três escopos:

| Escopo | Curso | Disciplina | Exemplo |
| --- | --- | --- | --- |
| `INSTITUTION` | vazio | vazio | Mostra geral da instituição |
| `COURSE` | obrigatório | vazio | Seminário do curso de Gestão de TI |
| `DISCIPLINE` | opcional | obrigatório | Projetos de Banco de Dados, dentro ou fora de um curso específico |

O período acadêmico também é opcional. Isso permite contextos contínuos, anuais, semestrais ou personalizados.

`CourseDiscipline` descreve a grade curricular. A instituição só utiliza essa entidade quando precisa relacionar seus cursos às disciplinas.

## Ponto que precisa ser confirmado antes da migração

Hoje, `Course` é usado pelo código como se fosse uma disciplina. O seed cadastra `Gestão de TI`, mas serviços e mensagens chamam esse registro de disciplina.

Antes do backfill, os registros existentes de `Course` precisam ser classificados:

- curso de formação, como `Gestão de TI`;
- disciplina, como `Banco de Dados`;
- agrupamento legado que deve virar apenas um `SubmissionContext`.

Essa classificação define como cada `SemesterCourse` atual será convertido. Não é seguro inferir isso somente pelo nome.

## Estratégia de migração para produção

### Release 1 — expansão compatível

- Criar `InstitutionType`, `Institution`, `InstitutionMembership`, `AcademicPeriod`, `Discipline`, `CourseDiscipline`, `SubmissionContext` e `SubmissionContextTag`.
- Adicionar `submissionContextId` como campo opcional em `Project`.
- Manter `Semester`, `SemesterCourse`, `semesterId`, `courseId` e `className` funcionando.
- Criar uma instituição padrão para os dados existentes.
- Vincular os usuários administrativos existentes à instituição padrão.
- Fazer a API gravar o modelo antigo e o novo durante a transição.

### Backfill

- Converter os semestres atuais em `AcademicPeriod`.
- Converter cada `SemesterCourse` em um `SubmissionContext`.
- Copiar as tags para `SubmissionContextTag`.
- Preencher `Project.submissionContextId` usando a combinação legada de semestre, curso e turma.
- Validar que nenhum projeto ficou sem contexto e que as contagens permanecem iguais.

### Release 2 — leitura pelo modelo novo

- Trocar submissões públicas para receber `submissionContextId`.
- Trocar filtros de galeria e dashboard para instituição, período, curso e disciplina por meio do contexto.
- Substituir `SemesterService` por serviços de período acadêmico e contexto de submissão.
- Aplicar autorização pelo vínculo `InstitutionMembership`.
- Manter respostas antigas temporariamente se o frontend ainda depender delas.

### Release 3 — contração

- Tornar `Project.submissionContextId` obrigatório.
- Remover a escrita duplicada.
- Remover `SemesterCourse` e `SemesterCourseTag`.
- Remover de `Project` os campos legados `semesterId`, `courseId` e `className`.
- Remover `User.courseId` depois que os vínculos institucionais estiverem ativos.

## Impactos no backend

- `prisma/schema.prisma` e migrations.
- Seed principal e seed de tags.
- Schemas Zod de projeto e submissão.
- Orquestrador de submissão e reenvio.
- Serviços de projeto, revisão e token de acesso.
- Rotas e controllers de cursos e semestres.
- Filtros da galeria, métricas e dashboard.
- Resolução da instituição ativa do usuário autenticado.
- Testes de isolamento entre instituições.

## Regras mínimas para liberar em produção

- Um projeto nunca pode apontar para um contexto de outra instituição.
- Curso, disciplina e período informados no contexto devem pertencer à mesma instituição.
- Apenas contextos `OPEN`, dentro da janela configurada, recebem projetos.
- Um professor só pode administrar contextos de instituições em que possui vínculo ativo.
- A galeria e a curadoria não podem misturar dados de instituições sem uma ação explícita.
- Contextos com projetos não podem ser excluídos; devem ser arquivados.
- A migração deve preservar projetos, revisões, apresentações, tags, tokens e URLs.

## Validações antes do deploy

- Executar `prisma validate`, `prisma generate` e o build TypeScript.
- Testar o backfill sobre uma cópia do banco de produção.
- Comparar contagens de projetos por semestre, curso e turma antes e depois.
- Testar submissão institucional sem curso ou disciplina.
- Testar submissão por curso.
- Testar submissão por disciplina compartilhada entre cursos.
- Testar duas instituições com nomes de curso, disciplina e período iguais.
- Preparar rollback da aplicação sem remover as estruturas legadas na primeira release.
