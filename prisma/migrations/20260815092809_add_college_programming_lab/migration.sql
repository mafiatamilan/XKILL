-- CreateTable
CREATE TABLE "LabSubject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'c',
    "passingCriteria" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabExperiment" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "theory" TEXT,
    "problemStatement" TEXT NOT NULL,
    "sampleInput" TEXT,
    "sampleOutput" TEXT,
    "constraints" TEXT,
    "starterCode" TEXT,
    "deadline" TIMESTAMP(3),
    "rubric" JSONB,
    "vivaQuestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSubmission" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "compilationScore" INTEGER,
    "correctnessScore" INTEGER,
    "efficiencyScore" INTEGER,
    "codingStandardsScore" INTEGER,
    "documentationScore" INTEGER,
    "totalScore" INTEGER,
    "feedback" TEXT,
    "submissionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammingAssignment" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "datasetUrl" TEXT,
    "attachments" TEXT[],
    "deadline" TIMESTAMP(3),
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammingAssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL DEFAULT 'file',
    "fileUrl" TEXT,
    "githubLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "score" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammingAssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalExam" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "language" TEXT NOT NULL DEFAULT 'c',
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "securityConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalExamSession" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "score" INTEGER,
    "activityLog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VivaRecord" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examinerId" TEXT,
    "questionBank" JSONB NOT NULL DEFAULT '[]',
    "marksObtained" INTEGER,
    "remarks" TEXT,
    "attendance" BOOLEAN NOT NULL DEFAULT true,
    "passed" BOOLEAN,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VivaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniProject" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "problemStatement" TEXT,
    "stack" TEXT[],
    "repoLink" TEXT,
    "demoVideoUrl" TEXT,
    "docsUrl" TEXT,
    "evaluationScore" INTEGER,
    "evaluationFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlagiarismReport" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "comparedWithId" TEXT,
    "comparisonType" TEXT NOT NULL,
    "similarityPct" DOUBLE PRECISION NOT NULL,
    "matchedSegments" JSONB NOT NULL DEFAULT '[]',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlagiarismReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOutcome" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramOutcome" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoPoMapping" (
    "id" TEXT NOT NULL,
    "coId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "attainmentLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoPoMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabAttendance" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "LabAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabSubject_code_key" ON "LabSubject"("code");

-- CreateIndex
CREATE INDEX "LabSubject_code_idx" ON "LabSubject"("code");

-- CreateIndex
CREATE INDEX "LabSubject_department_idx" ON "LabSubject"("department");

-- CreateIndex
CREATE INDEX "LabSubject_semester_idx" ON "LabSubject"("semester");

-- CreateIndex
CREATE INDEX "LabExperiment_subjectId_idx" ON "LabExperiment"("subjectId");

-- CreateIndex
CREATE INDEX "LabExperiment_weekNumber_idx" ON "LabExperiment"("weekNumber");

-- CreateIndex
CREATE INDEX "LabExperiment_deadline_idx" ON "LabExperiment"("deadline");

-- CreateIndex
CREATE INDEX "LabSubmission_experimentId_idx" ON "LabSubmission"("experimentId");

-- CreateIndex
CREATE INDEX "LabSubmission_studentId_idx" ON "LabSubmission"("studentId");

-- CreateIndex
CREATE INDEX "LabSubmission_status_idx" ON "LabSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LabSubmission_experimentId_studentId_submissionNumber_key" ON "LabSubmission"("experimentId", "studentId", "submissionNumber");

-- CreateIndex
CREATE INDEX "ProgrammingAssignment_subjectId_idx" ON "ProgrammingAssignment"("subjectId");

-- CreateIndex
CREATE INDEX "ProgrammingAssignment_deadline_idx" ON "ProgrammingAssignment"("deadline");

-- CreateIndex
CREATE INDEX "ProgrammingAssignmentSubmission_assignmentId_idx" ON "ProgrammingAssignmentSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "ProgrammingAssignmentSubmission_studentId_idx" ON "ProgrammingAssignmentSubmission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammingAssignmentSubmission_assignmentId_studentId_key" ON "ProgrammingAssignmentSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "PracticalExam_subjectId_idx" ON "PracticalExam"("subjectId");

-- CreateIndex
CREATE INDEX "PracticalExam_startTime_idx" ON "PracticalExam"("startTime");

-- CreateIndex
CREATE INDEX "PracticalExamSession_examId_idx" ON "PracticalExamSession"("examId");

-- CreateIndex
CREATE INDEX "PracticalExamSession_studentId_idx" ON "PracticalExamSession"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalExamSession_examId_studentId_key" ON "PracticalExamSession"("examId", "studentId");

-- CreateIndex
CREATE INDEX "VivaRecord_subjectId_idx" ON "VivaRecord"("subjectId");

-- CreateIndex
CREATE INDEX "VivaRecord_studentId_idx" ON "VivaRecord"("studentId");

-- CreateIndex
CREATE INDEX "MiniProject_subjectId_idx" ON "MiniProject"("subjectId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_submissionId_idx" ON "PlagiarismReport"("submissionId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_studentId_idx" ON "PlagiarismReport"("studentId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_comparisonType_idx" ON "PlagiarismReport"("comparisonType");

-- CreateIndex
CREATE INDEX "CourseOutcome_subjectId_idx" ON "CourseOutcome"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOutcome_subjectId_code_key" ON "CourseOutcome"("subjectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramOutcome_code_key" ON "ProgramOutcome"("code");

-- CreateIndex
CREATE INDEX "ProgramOutcome_code_idx" ON "ProgramOutcome"("code");

-- CreateIndex
CREATE INDEX "CoPoMapping_coId_idx" ON "CoPoMapping"("coId");

-- CreateIndex
CREATE INDEX "CoPoMapping_poId_idx" ON "CoPoMapping"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "CoPoMapping_coId_poId_key" ON "CoPoMapping"("coId", "poId");

-- CreateIndex
CREATE INDEX "LabAttendance_subjectId_idx" ON "LabAttendance"("subjectId");

-- CreateIndex
CREATE INDEX "LabAttendance_studentId_idx" ON "LabAttendance"("studentId");

-- CreateIndex
CREATE INDEX "LabAttendance_markedAt_idx" ON "LabAttendance"("markedAt");

-- AddForeignKey
ALTER TABLE "LabExperiment" ADD CONSTRAINT "LabExperiment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSubmission" ADD CONSTRAINT "LabSubmission_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "LabExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSubmission" ADD CONSTRAINT "LabSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammingAssignment" ADD CONSTRAINT "ProgrammingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammingAssignmentSubmission" ADD CONSTRAINT "ProgrammingAssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProgrammingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammingAssignmentSubmission" ADD CONSTRAINT "ProgrammingAssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExam" ADD CONSTRAINT "PracticalExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExamSession" ADD CONSTRAINT "PracticalExamSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "PracticalExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExamSession" ADD CONSTRAINT "PracticalExamSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VivaRecord" ADD CONSTRAINT "VivaRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VivaRecord" ADD CONSTRAINT "VivaRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniProject" ADD CONSTRAINT "MiniProject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOutcome" ADD CONSTRAINT "CourseOutcome_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoPoMapping" ADD CONSTRAINT "CoPoMapping_coId_fkey" FOREIGN KEY ("coId") REFERENCES "CourseOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoPoMapping" ADD CONSTRAINT "CoPoMapping_poId_fkey" FOREIGN KEY ("poId") REFERENCES "ProgramOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAttendance" ADD CONSTRAINT "LabAttendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "LabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAttendance" ADD CONSTRAINT "LabAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
