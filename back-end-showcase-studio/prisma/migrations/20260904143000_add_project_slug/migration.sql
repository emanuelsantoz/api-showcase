-- O UUID continua sendo a chave interna. O slug passa a ser o endereço público.
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- Projetos já existentes recebem o slug mais curto disponível.
-- Em títulos repetidos, a sequência -2, -3... mantém a URL legível e única.
DO $$
DECLARE
  project_record RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  sequence INTEGER;
BEGIN
  FOR project_record IN SELECT "id", "title" FROM "Project" ORDER BY "createdAt", "id" LOOP
    base_slug := COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM REGEXP_REPLACE(
          TRANSLATE(
            LOWER(TRIM(project_record."title")),
            'áàâãäåæçéèêëíìîïñóòôõöøœúùûüýÿ',
            'aaaaaaaceeeeiiiinooooooouuuuyy'
          ),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      ),
      'projeto'
    );
    candidate_slug := base_slug;
    sequence := 2;

    WHILE EXISTS (SELECT 1 FROM "Project" WHERE "slug" = candidate_slug) LOOP
      candidate_slug := CONCAT(base_slug, '-', sequence);
      sequence := sequence + 1;
    END LOOP;

    UPDATE "Project" SET "slug" = candidate_slug WHERE "id" = project_record."id";
  END LOOP;
END $$;

ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
