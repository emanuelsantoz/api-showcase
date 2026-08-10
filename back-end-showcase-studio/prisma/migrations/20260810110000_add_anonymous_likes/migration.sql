-- Likes de visitantes sem cadastro. O identificador do navegador é armazenado somente como hash.
CREATE TABLE "AnonymousLike" (
    "projectId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousLike_pkey" PRIMARY KEY ("projectId", "visitorHash")
);

CREATE INDEX "AnonymousLike_projectId_idx" ON "AnonymousLike"("projectId");

ALTER TABLE "AnonymousLike"
ADD CONSTRAINT "AnonymousLike_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
