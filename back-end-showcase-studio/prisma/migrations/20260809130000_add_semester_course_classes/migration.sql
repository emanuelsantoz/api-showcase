ALTER TABLE "SemesterCourse" ADD COLUMN "className" TEXT NOT NULL DEFAULT 'Turma única';
ALTER TABLE "Project" ADD COLUMN "className" TEXT NOT NULL DEFAULT 'Turma única';
ALTER TABLE "SemesterCourse" DROP CONSTRAINT "SemesterCourse_pkey";
ALTER TABLE "SemesterCourse" ADD CONSTRAINT "SemesterCourse_pkey" PRIMARY KEY ("semesterId", "courseId", "className");
CREATE INDEX "Project_semesterId_className_status_idx" ON "Project"("semesterId", "className", "status");
