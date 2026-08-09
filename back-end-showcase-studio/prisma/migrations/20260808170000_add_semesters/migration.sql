CREATE TYPE "SemesterStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

CREATE TABLE "Semester" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "number" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "theme" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "SemesterStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Semester_code_key" ON "Semester"("code");
CREATE UNIQUE INDEX "Semester_year_number_key" ON "Semester"("year", "number");
CREATE INDEX "Semester_status_startsAt_idx" ON "Semester"("status", "startsAt");

ALTER TABLE "Project" ADD COLUMN "semesterId" TEXT;

-- Reconstitui os períodos dos projetos existentes, sem perder o histórico.
INSERT INTO "Semester" ("id", "year", "number", "code", "label", "startsAt", "endsAt", "status", "updatedAt")
SELECT
  md5(period.year::text || '.' || period.number::text),
  period.year,
  period.number,
  period.year::text || '.' || period.number::text,
  period.number::text || ' semestre de ' || period.year::text,
  make_date(period.year, CASE WHEN period.number = 1 THEN 1 ELSE 8 END, 1),
  make_date(period.year, CASE WHEN period.number = 1 THEN 7 ELSE 12 END, 1) + interval '1 month - 1 day',
  CASE
    WHEN period.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
      AND period.number = CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN 1 ELSE 2 END
      THEN 'DRAFT'::"SemesterStatus"
    ELSE 'CLOSED'::"SemesterStatus"
  END,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    EXTRACT(YEAR FROM "createdAt")::int AS year,
    CASE WHEN EXTRACT(MONTH FROM "createdAt")::int < 7 THEN 1 ELSE 2 END AS number
  FROM "Project"
) period;

-- Garante que exista um período atual para os primeiros envios após a migration.
INSERT INTO "Semester" ("id", "year", "number", "code", "label", "startsAt", "endsAt", "status", "updatedAt")
SELECT
  md5(EXTRACT(YEAR FROM CURRENT_DATE)::text || '.' || (CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN '1' ELSE '2' END)),
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN 1 ELSE 2 END,
  EXTRACT(YEAR FROM CURRENT_DATE)::text || '.' || (CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN '1' ELSE '2' END),
  (CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN '1' ELSE '2' END) || ' semestre de ' || EXTRACT(YEAR FROM CURRENT_DATE)::text,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN 1 ELSE 8 END, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN 7 ELSE 12 END, 1) + interval '1 month - 1 day',
  'DRAFT'::"SemesterStatus",
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Semester"
  WHERE "year" = EXTRACT(YEAR FROM CURRENT_DATE)::int
    AND "number" = CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int < 7 THEN 1 ELSE 2 END
);

UPDATE "Project" p
SET "semesterId" = md5(
  EXTRACT(YEAR FROM p."createdAt")::int::text || '.' ||
  (CASE WHEN EXTRACT(MONTH FROM p."createdAt")::int < 7 THEN '1' ELSE '2' END)
);

ALTER TABLE "Project" ALTER COLUMN "semesterId" SET NOT NULL;
CREATE INDEX "Project_semesterId_status_idx" ON "Project"("semesterId", "status");
ALTER TABLE "Project" ADD CONSTRAINT "Project_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
