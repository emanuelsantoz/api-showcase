# Diagrama de classes do banco de dados

Fonte de verdade: `prisma/schema.prisma` e migrations em `prisma/migrations`.

```mermaid
classDiagram
  direction LR

  class Role {
    <<enumeration>>
    STUDENT
    ADMIN
    COORDENADOR
  }

  class ProjectStatus {
    <<enumeration>>
    DRAFT
    PENDING_REVIEW
    APPROVED
    REJECTED
  }

  class User {
    +String id PK
    +String name
    +String email UK
    +String password
    +Role role
    +String? courseId FK
    +DateTime createdAt
    +DateTime updatedAt
  }

  class Course {
    +String id PK
    +String name UK
    +String? description
  }

  class Project {
    +String id PK
    +String title
    +String shortDescription
    +Text description
    +String? thumbnailUrl
    +ProjectStatus status
    +Boolean isFeatured
    +Int viewsCount
    +Int likesCount
    +String courseId FK
    +DateTime createdAt
    +DateTime updatedAt
  }

  class ProjectMember {
    +String projectId PK, FK
    +String userId PK, FK
    +String? roleInfo
  }
  
  class Semester {
    +String SemesterId PK, FK
    +String projectId PK, FK
    +String courseId PK, FK
    +DateTime startSemestre
    +DateTime endSemestre
  }

  class ProjectPresentation {
    +String projectPresentation PK, FK
    +String projectId PK, FK
    +String? roleInfo
    +Enum type(CANVA | PDF | IMAGES)
    +String url
    +Enum storageProvider(CANVA | VERCEL_BLOB | CLOUDFLARE_R2)
    +String storageKey - identificador do arquivo, se aplicável
    +String contentType - application/pdf, image/webp etc.
    +Int sizeBytes
    +DateTime createdAt
  }

  class Like {
    +String userId PK, FK
    +String projectId PK, FK
  }

  Role <.. User : role
  ProjectStatus <.. Project : status
  Course "0..1" <-- "0..*" User : course
  Course "1" <-- "0..*" Project : course
  User "1" <-- "0..*" ProjectMember : user
  Project "1" <-- "0..*" ProjectMember : project
  User "1" <-- "0..*" Like : user
  Project "1" <-- "0..*" Like : project
  ProjectPresentation "1" <-- "1..*" Project: ProjectPresentation>
  Semester "1" <-- "1..1" Project: Semester>
  Semester "2" <-- "*..*" Course: Semester>
```

## Regras de integridade

- `User.email` e `Course.name` são únicos.
- `ProjectMember` e `Like` usam chaves primárias compostas (`projectId` + `userId`).
- A remoção de um `User` ou `Project` remove seus respectivos `ProjectMember` e `Like` associados em cascata.
- A remoção de um `Course` não remove projetos: um projeto sempre exige um curso.
- A remoção de um curso desvincula os usuários associados (`courseId` passa a ser nulo).
