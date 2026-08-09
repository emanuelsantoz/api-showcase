# Jornada do professor

Este documento descreve o fluxo de primeiro acesso e operação do professor/coordenador na plataforma Academic Showcase.

## Atores

- **Administrador**: gerencia os usuários por SQL e define o papel (`ADMIN` ou `COORDENADOR`). Não existe cadastro público de administradores.
- **Professor**: recebe as credenciais temporárias, acessa a área administrativa, configura sua disciplina/turma e avalia os projetos.
- **Estudante**: envia projetos sem criar uma conta. Quando necessário, recebe um acesso temporário para corrigir e reenviar o trabalho.

## Fluxo principal

```mermaid
flowchart TD
    A[Administrador cria ou atualiza o usuário via SQL] --> B[Professor recebe e-mail com usuário e senha temporária]
    B --> C[Professor acessa a opção Admin]
    C --> D{Credenciais válidas?}
    D -- Não --> E[Exibir erro de autenticação]
    E --> C
    D -- Sim --> F[API emite JWT]
    F --> G[Professor acessa o painel administrativo]
    G --> H[Seleciona ou cria o semestre]
    H --> I[Seleciona sua disciplina]
    I --> J[Adiciona a turma]
    J --> K[Define o tema da turma]
    K --> L{Todas as turmas têm disciplina e tema?}
    L -- Não --> I
    L -- Sim --> M[Abre o recebimento de projetos do semestre]
    M --> N[API disponibiliza somente as turmas configuradas]
    N --> O[Estudante envia projeto para uma turma]
    O --> P[Projeto fica PENDING_REVIEW]
    P --> Q[Professor acessa a curadoria]
    Q --> R{Projeto está adequado?}
    R -- Sim --> S[Professor aprova]
    S --> T[Projeto fica APPROVED e aparece na galeria]
    R -- Não, precisa de ajustes --> U[Professor solicita alterações com justificativa]
    U --> V[Projeto fica CHANGES_REQUESTED]
    V --> W[Estudante recebe e-mail com acesso temporário]
    W --> X[Estudante corrige e reenvia]
    X --> P
    R -- Não, rejeição definitiva --> Y[Professor rejeita com justificativa]
    Y --> Z[Projeto fica REJECTED e não é publicado]
```

## Primeiro acesso

1. O administrador cria ou atualiza o usuário diretamente no banco de dados.
2. O usuário precisa ter o papel `ADMIN` ou `COORDENADOR`.
3. O administrador envia o e-mail e a senha temporária por um canal seguro.
4. O professor abre a área administrativa e informa e-mail e senha.
5. A API valida as credenciais e retorna um JWT.
6. O frontend armazena o token e libera as rotas administrativas.

Não existe endpoint público de cadastro de professores.

## Configuração do semestre

O semestre representa apenas o período acadêmico. A disciplina, turma e tema são configurados em `SemesterCourse`.

```mermaid
classDiagram
    class Semester {
        +String id
        +Int year
        +Int number
        +String label
        +SemesterStatus status
    }

    class Course {
        +String id
        +String name
    }

    class SemesterCourse {
        +String semesterId
        +String courseId
        +String className
        +String theme
    }

    class Project {
        +String semesterId
        +String courseId
        +String className
        +ProjectStatus status
    }

    Semester "1" --> "N" SemesterCourse : oferece
    Course "1" --> "N" SemesterCourse : possui turmas
    SemesterCourse "1" --> "N" Project : recebe
```

O mesmo curso pode ter várias turmas no mesmo semestre, desde que cada turma tenha um nome diferente. Cada turma pode possuir um tema próprio.

## Ciclo de moderação

| Ação do professor | Status do projeto | Resultado |
| --- | --- | --- |
| Aprovar | `APPROVED` | Projeto publicado na galeria |
| Solicitar alterações | `CHANGES_REQUESTED` | Estudante recebe acesso temporário para corrigir |
| Rejeitar definitivamente | `REJECTED` | Projeto não é publicado |

Ao solicitar alterações, o professor deve informar uma justificativa. O estudante utiliza o token temporário recebido por e-mail para acessar, corrigir e reenviar o projeto.

## Regras importantes

- O semestre só pode ser aberto se possuir pelo menos uma turma configurada.
- Cada turma habilitada precisa ter um tema definido antes da abertura.
- O estudante só visualiza e seleciona turmas do semestre com recebimento aberto.
- Um projeto pertence a uma única turma.
- Um professor autenticado pode aprovar, solicitar alterações ou rejeitar projetos.
- A aprovação é o único estado que publica o projeto na galeria.
- O token temporário de correção não substitui o login administrativo.
