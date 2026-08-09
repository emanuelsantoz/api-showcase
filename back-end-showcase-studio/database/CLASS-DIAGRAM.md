# Diagrama de classes do banco de dados

```mermaid
classDiagram
  direction LR

  class ProjectStatus {
    <<enumeration>>
    DRAFT
    PENDING_REVIEW
    CHANGES_REQUESTED
    APPROVED
    REJECTED
  }

  class PresentationType {
    <<enumeration>>
    CANVA
    PDF
  }

  class StorageProvider {
    <<enumeration>>
    CANVA
    VERCEL_BLOB
    CLOUDFLARE_R2
  }

  class ReviewDecision {
    <<enumeration>>
    APPROVED
    CHANGES_REQUESTED
    REJECTED
  }

  class SemesterStatus {
    <<enumeration>>
    DRAFT
    OPEN
    CLOSED
    ARCHIVED
  }

  class User {
    +String id PK
    +String name
    +String email UK
    +Role role
  }

  class Project {
    +String id PK
    +String title
    +String? submitterName
    +String? submitterEmail
    +Int revision
    +String semesterId FK
    +String[] tags
    +String? liveUrl
    +String? prototypeUrl
    +String? repositoryUrl
    +ProjectStatus status
    +String? thumbnailUrl
    +StorageProvider? thumbnailStorageProvider
    +String? thumbnailStorageKey
  }

  class Semester {
    +String id PK
    +Int year
    +Int number
    +String code UK
    +String label
    +String? theme
    +DateTime startsAt
    +DateTime endsAt
    +SemesterStatus status
  }

  class ProjectPresentation {
    +String id PK
    +String projectId UK, FK
    +PresentationType type
    +String url
    +StorageProvider storageProvider
    +String? storageKey
  }

  class ProjectContributor {
    +String id PK
    +String projectId FK
    +String name
    +String? email
    +String? roleInfo
  }

  class ProjectReview {
    +String id PK
    +String projectId FK
    +String reviewerId FK
    +ReviewDecision decision
    +String? reason
    +DateTime createdAt
  }

  class ProjectAccessToken {
    +String id PK
    +String projectId FK
    +String tokenHash UK
    +DateTime expiresAt
    +DateTime? usedAt
  }

  User "1" <-- "0..*" ProjectReview : reviewer
  Project "1" *-- "0..1" ProjectPresentation : presentation
  Project "1" *-- "0..*" ProjectContributor : public contributors
  Project "1" *-- "0..*" ProjectReview : reviews
  Project "1" *-- "0..*" ProjectAccessToken : edit tokens
  Semester "1" --> "0..*" Project : contains
  ProjectStatus <.. Project : status
  PresentationType <.. ProjectPresentation : type
  StorageProvider <.. Project : thumbnail provider
  StorageProvider <.. ProjectPresentation : file provider
  ReviewDecision <.. ProjectReview : decision
  SemesterStatus <.. Semester : status
```

## Regras do fluxo

- O estudante não precisa de conta para criar uma submissão.
- O professor precisa estar autenticado para avaliar.
- `CHANGES_REQUESTED` significa que o estudante pode corrigir e reenviar.
- O token de correção é salvo somente como hash e expira em 72 horas.
- Ao reenviar, o token anterior é invalidado.
- A aprovação ou rejeição definitiva invalida tokens pendentes.
- O arquivo físico fica no provider indicado em `storageProvider`; o Neon guarda apenas URL e metadados.
