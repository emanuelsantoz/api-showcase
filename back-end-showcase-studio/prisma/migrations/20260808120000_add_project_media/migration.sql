CREATE TYPE "PresentationType" AS ENUM ('CANVA', 'PDF');
CREATE TYPE "StorageProvider" AS ENUM ('CANVA', 'VERCEL_BLOB', 'CLOUDFLARE_R2');

ALTER TABLE "Project" ADD COLUMN "thumbnailStorageProvider" "StorageProvider";
ALTER TABLE "Project" ADD COLUMN "thumbnailStorageKey" TEXT;
ALTER TABLE "Project" ADD COLUMN "createdById" TEXT;

CREATE TABLE "ProjectPresentation" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" "PresentationType" NOT NULL,
  "url" TEXT NOT NULL,
  "storageProvider" "StorageProvider" NOT NULL,
  "storageKey" TEXT,
  "contentType" TEXT,
  "sizeBytes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectPresentation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectPresentation_projectId_key" ON "ProjectPresentation"("projectId");
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectPresentation" ADD CONSTRAINT "ProjectPresentation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
