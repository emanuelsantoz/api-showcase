ALTER TABLE "Project"
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "liveUrl" TEXT,
  ADD COLUMN "prototypeUrl" TEXT,
  ADD COLUMN "repositoryUrl" TEXT;

CREATE TABLE "ProjectContributor" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "roleInfo" TEXT,
  CONSTRAINT "ProjectContributor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectContributor_projectId_idx" ON "ProjectContributor"("projectId");
ALTER TABLE "ProjectContributor"
  ADD CONSTRAINT "ProjectContributor_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
