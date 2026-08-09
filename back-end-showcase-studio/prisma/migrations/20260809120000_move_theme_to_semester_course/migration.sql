-- O tema representa a oferta de uma disciplina em um semestre, e não o período inteiro.
ALTER TABLE "SemesterCourse" ADD COLUMN "theme" TEXT;

-- Preserva os temas já cadastrados durante a migração da modelagem anterior.
UPDATE "SemesterCourse" AS sc
SET "theme" = s."theme"
FROM "Semester" AS s
WHERE s."id" = sc."semesterId";

ALTER TABLE "Semester" DROP COLUMN "theme";
