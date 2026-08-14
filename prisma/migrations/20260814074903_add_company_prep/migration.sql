-- CreateTable
CREATE TABLE "CompanyPrepPath" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "headquarters" TEXT,
    "GlassdoorRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPrepPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringPattern" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "isEliminating" BOOLEAN NOT NULL DEFAULT true,
    "tips" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "frequency" TEXT,
    "tips" TEXT,
    "sampleAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineAssessment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" TEXT,
    "durationMinutes" INTEGER,
    "totalQuestions" INTEGER,
    "sections" JSONB,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "topics" TEXT[],
    "tips" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryInsight" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "experienceLevel" TEXT NOT NULL,
    "ctcMin" DOUBLE PRECISION NOT NULL,
    "ctcMax" DOUBLE PRECISION NOT NULL,
    "ctcMedian" DOUBLE PRECISION,
    "baseMin" DOUBLE PRECISION,
    "baseMax" DOUBLE PRECISION,
    "stockComponent" DOUBLE PRECISION,
    "bonusComponent" DOUBLE PRECISION,
    "source" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepTimeline" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tasks" TEXT[],
    "focusAreas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPrepPath_companyName_key" ON "CompanyPrepPath"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPrepPath_slug_key" ON "CompanyPrepPath"("slug");

-- CreateIndex
CREATE INDEX "CompanyPrepPath_slug_idx" ON "CompanyPrepPath"("slug");

-- CreateIndex
CREATE INDEX "CompanyPrepPath_industry_idx" ON "CompanyPrepPath"("industry");

-- CreateIndex
CREATE INDEX "HiringPattern_companyId_idx" ON "HiringPattern"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "HiringPattern_companyId_roundOrder_key" ON "HiringPattern"("companyId", "roundOrder");

-- CreateIndex
CREATE INDEX "InterviewQuestion_companyId_idx" ON "InterviewQuestion"("companyId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_category_idx" ON "InterviewQuestion"("category");

-- CreateIndex
CREATE INDEX "InterviewQuestion_difficulty_idx" ON "InterviewQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "OnlineAssessment_companyId_idx" ON "OnlineAssessment"("companyId");

-- CreateIndex
CREATE INDEX "SalaryInsight_companyId_idx" ON "SalaryInsight"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryInsight_companyId_role_experienceLevel_key" ON "SalaryInsight"("companyId", "role", "experienceLevel");

-- CreateIndex
CREATE INDEX "PrepTimeline_companyId_idx" ON "PrepTimeline"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PrepTimeline_companyId_weekNumber_key" ON "PrepTimeline"("companyId", "weekNumber");

-- AddForeignKey
ALTER TABLE "HiringPattern" ADD CONSTRAINT "HiringPattern_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyPrepPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyPrepPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineAssessment" ADD CONSTRAINT "OnlineAssessment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyPrepPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryInsight" ADD CONSTRAINT "SalaryInsight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyPrepPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepTimeline" ADD CONSTRAINT "PrepTimeline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyPrepPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
