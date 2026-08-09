CREATE TABLE "SemesterCourse" (
  "semesterId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "SemesterCourse_pkey" PRIMARY KEY ("semesterId", "courseId")
);

CREATE INDEX "SemesterCourse_courseId_idx" ON "SemesterCourse"("courseId");

ALTER TABLE "SemesterCourse"
  ADD CONSTRAINT "SemesterCourse_semesterId_fkey"
  FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SemesterCourse"
  ADD CONSTRAINT "SemesterCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
