ALTER TYPE "ProjectStatus" ADD VALUE 'CHANGES_REQUESTED';
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

ALTER TABLE "Project" ADD COLUMN "submitterName" TEXT;
ALTER TABLE "Project" ADD COLUMN "submitterEmail" TEXT;
ALTER TABLE "Project" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ProjectReview" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" "ReviewDecision" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectAccessToken" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectAccessToken_tokenHash_key" ON "ProjectAccessToken"("tokenHash");
CREATE INDEX "ProjectReview_projectId_createdAt_idx" ON "ProjectReview"("projectId", "createdAt");
CREATE INDEX "ProjectReview_reviewerId_idx" ON "ProjectReview"("reviewerId");
CREATE INDEX "ProjectAccessToken_projectId_expiresAt_idx" ON "ProjectAccessToken"("projectId", "expiresAt");

ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAccessToken" ADD CONSTRAINT "ProjectAccessToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
