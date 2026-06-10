## 💻 Implementation Blueprint (@hono/zod-openapi)

When implementing endpoints, follow this code structure strictly:

```ts
import { createRoute, z } from '@hono/zod-openapi'

// 1. Define Request/Response Schema with OpenAPI Metadata
const ProjectQuerySchema = z.object({
  curso: z.string().optional().openapi({ example: 'Sistemas para Internet' }),
})

// 2. Define the Route Configuration
export const listProjectsRoute = createRoute({
  method: 'get',
  path: '/projects',
  request: {
    query: ProjectQuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any())
          })
        }
      },
      description: 'Retrieve a paginated list of projects',
    },
  },
})