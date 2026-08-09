CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE TABLE "SemesterCourseTag" (
  "semesterId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "SemesterCourseTag_pkey" PRIMARY KEY ("semesterId", "courseId", "className", "tagId"),
  CONSTRAINT "SemesterCourseTag_semesterId_courseId_className_fkey" FOREIGN KEY ("semesterId", "courseId", "className") REFERENCES "SemesterCourse"("semesterId", "courseId", "className") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SemesterCourseTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SemesterCourseTag_tagId_idx" ON "SemesterCourseTag"("tagId");

INSERT INTO "Tag" ("id", "name", "updatedAt")
SELECT md5(tag), tag, CURRENT_TIMESTAMP
FROM "SemesterCourse", LATERAL unnest("tags") AS tag
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "SemesterCourseTag" ("semesterId", "courseId", "className", "tagId")
SELECT sc."semesterId", sc."courseId", sc."className", t."id"
FROM "SemesterCourse" sc, LATERAL unnest(sc."tags") AS tag
JOIN "Tag" t ON t."name" = tag
ON CONFLICT DO NOTHING;

ALTER TABLE "SemesterCourse" DROP COLUMN "tags";
