CREATE TABLE "SiteVisit" (
    "visitorHash" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("visitorHash", "day")
);

CREATE INDEX "SiteVisit_day_idx" ON "SiteVisit"("day");
