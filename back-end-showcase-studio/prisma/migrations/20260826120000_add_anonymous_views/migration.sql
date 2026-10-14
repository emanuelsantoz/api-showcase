-- Uma visualização por projeto e navegador. O identificador é armazenado
-- exclusivamente como hash, sem dados pessoais ou de login.
CREATE TABLE "AnonymousView" (
    "projectId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousView_pkey" PRIMARY KEY ("projectId", "visitorHash")
);

CREATE INDEX "AnonymousView_projectId_idx" ON "AnonymousView"("projectId");

ALTER TABLE "AnonymousView"
ADD CONSTRAINT "AnonymousView_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
