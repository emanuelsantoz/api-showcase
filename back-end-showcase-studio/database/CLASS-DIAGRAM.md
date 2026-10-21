# Diagrama de classes do banco de dados

```mermaid
classDiagram
  direction LR

  class InstitutionType {
    +String id PK
    +String name UK
    +String slug UK
  }

  class Institution {
    +String id PK
    +String name
    +String slug UK
    +String institutionTypeId FK
    +String? logoUrl
    +String? websiteUrl
    +Boolean active
  }

  class InstitutionMembership {
    +String institutionId PK, FK
    +String userId PK, FK
    +InstitutionRole role
    +Boolean active
  }
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

  class SubmissionContextStatus {
    <<enumeration>>
    DRAFT
    OPEN
    CLOSED
    ARCHIVED
  }

  class PlatformRole {
    <<enumeration>>
    USER
    PLATFORM_ADMIN
  }

  class InstitutionRole {
    <<enumeration>>
    INSTITUTION_ADMIN
    COORDINATOR
    PROFESSOR
  }

  class SubmissionScope {
    <<enumeration>>
    INSTITUTION
    COURSE
    DISCIPLINE
  }

  class User {
    +String id PK
    +String name
    +String email UK
    +PlatformRole platformRole
  }

  class Project {
    +String id PK
    +String title
    +String? submitterName
    +String? submitterEmail
    +Int revision
    +String submissionContextId FK
    +String[] tags
    +String? liveUrl
    +String? prototypeUrl
    +String? repositoryUrl
    +ProjectStatus status
    +String? thumbnailUrl
    +StorageProvider? thumbnailStorageProvider
    +String? thumbnailStorageKey
  }

  class AcademicPeriod {
    +String id PK
    +String institutionId FK
    +String code
    +String label
    +DateTime? startsAt
    +DateTime? endsAt
  }

  class Course {
    +String id PK
    +String institutionId FK
    +String name
    +String? description
  }

  class Discipline {
    +String id PK
    +String institutionId FK
    +String name
    +String? code
    +String? description
  }

  class CourseDiscipline {
    +String courseId PK, FK
    +String disciplineId PK, FK
    +Int? recommendedPeriod
    +Boolean required
  }

  class SubmissionContext {
    +String id PK
    +String institutionId FK
    +String? academicPeriodId FK
    +String? courseId FK
    +String? disciplineId FK
    +SubmissionScope scope
    +SubmissionContextStatus status
    +String name
    +String? className
    +String? theme
    +DateTime? submissionsOpenAt
    +DateTime? submissionsCloseAt
  }

  class Tag {
    +String id PK
    +String name UK
  }

  class SubmissionContextTag {
    +String submissionContextId PK, FK
    +String tagId PK, FK
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
    +String? avatarUrl
    +String? avatarColor
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
  InstitutionType "1" --> "0..*" Institution : classifies
  Institution "1" *-- "0..*" InstitutionMembership : has members
  User "1" *-- "0..*" InstitutionMembership : participates in
  Institution "1" --> "0..*" Course : offers
  Institution "1" --> "0..*" Discipline : registers
  Institution "1" --> "0..*" AcademicPeriod : organizes
  Institution "1" --> "0..*" SubmissionContext : configures
  Project "1" *-- "0..1" ProjectPresentation : presentation
  Project "1" *-- "0..*" ProjectContributor : public contributors
  Project "1" *-- "0..*" ProjectReview : reviews
  Project "1" *-- "0..*" ProjectAccessToken : edit tokens
  SubmissionContext "1" --> "0..*" Project : receives
  Course "1" *-- "0..*" CourseDiscipline : curriculum
  Discipline "1" *-- "0..*" CourseDiscipline : used by courses
  AcademicPeriod "0..1" <-- "0..*" SubmissionContext : scheduled in
  Course "0..1" <-- "0..*" SubmissionContext : scoped to
  Discipline "0..1" <-- "0..*" SubmissionContext : scoped to
  SubmissionContext "1" *-- "0..*" SubmissionContextTag : classified by
  Tag "1" *-- "0..*" SubmissionContextTag : reusable tag
  ProjectStatus <.. Project : status
  PresentationType <.. ProjectPresentation : type
  StorageProvider <.. Project : thumbnail provider
  StorageProvider <.. ProjectPresentation : file provider
  ReviewDecision <.. ProjectReview : decision
  PlatformRole <.. User : platform role
  InstitutionRole <.. InstitutionMembership : institution role
  SubmissionContextStatus <.. SubmissionContext : status
  SubmissionScope <.. SubmissionContext : scope
```

## Regras do fluxo

- O estudante não precisa de conta para criar uma submissão.
- O professor precisa estar autenticado para avaliar.
- `CHANGES_REQUESTED` significa que o estudante pode corrigir e reenviar.
- O token de correção é salvo somente como hash e expira em 72 horas.
- Ao reenviar, o token anterior é invalidado.
- A aprovação ou rejeição definitiva invalida tokens pendentes.
- O arquivo físico fica no provider indicado em `storageProvider`; o Neon guarda apenas URL e metadados.
- Cada projeto pertence obrigatoriamente a um `SubmissionContext`; a instituição é determinada por esse contexto.
- Um usuário pode participar de várias instituições por meio de `InstitutionMembership`, com papel e ativação próprios em cada uma.
- Cursos, disciplinas e períodos acadêmicos são cadastros próprios da instituição; seus nomes e códigos são únicos apenas dentro dela.
- `CourseDiscipline` descreve a grade curricular, mas não é obrigatório para instituições que não organizam trabalhos por curso e disciplina.
- `SubmissionContext` pode ter escopo institucional, de curso ou de disciplina e concentra turma, tema e janela de recebimento.
- O status de `SubmissionContext` controla se aquele contexto está recebendo projetos; o período acadêmico é apenas uma referência temporal opcional.
- No escopo `INSTITUTION`, `courseId` e `disciplineId` ficam vazios.
- No escopo `COURSE`, `courseId` é obrigatório e `disciplineId` fica vazio.
- No escopo `DISCIPLINE`, `disciplineId` é obrigatório; `courseId` é opcional quando a disciplina é compartilhada por vários cursos.
- O período acadêmico é opcional para permitir mostras contínuas, anuais ou sem divisão por semestre.
- Quando curso, disciplina ou período forem informados, todos devem pertencer à mesma instituição do `SubmissionContext`.
