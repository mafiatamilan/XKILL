-- CreateTable
CREATE TABLE "CareerRoadmapItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "careerGoalId" TEXT,
    "phase" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "focus" TEXT[],
    "milestones" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerRoadmapItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "provider" TEXT,
    "url" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "targetCompany" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "baseLakhs" DOUBLE PRECISION NOT NULL,
    "totalCtcLakhs" DOUBLE PRECISION NOT NULL,
    "rangeLowLakhs" DOUBLE PRECISION NOT NULL,
    "rangeHighLakhs" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "isEstimate" BOOLEAN NOT NULL DEFAULT true,
    "factors" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillGap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "missing" TEXT[],
    "present" TEXT[],
    "coverage" DOUBLE PRECISION NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerRoadmapItem_userId_idx" ON "CareerRoadmapItem"("userId");

-- CreateIndex
CREATE INDEX "CareerRoadmapItem_careerGoalId_idx" ON "CareerRoadmapItem"("careerGoalId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerRoadmapItem_userId_phase_key" ON "CareerRoadmapItem"("userId", "phase");

-- CreateIndex
CREATE INDEX "LearningRecommendation_userId_idx" ON "LearningRecommendation"("userId");

-- CreateIndex
CREATE INDEX "LearningRecommendation_skill_idx" ON "LearningRecommendation"("skill");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPrediction_userId_key" ON "SalaryPrediction"("userId");

-- CreateIndex
CREATE INDEX "SalaryPrediction_userId_idx" ON "SalaryPrediction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillGap_userId_key" ON "SkillGap"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_userId_idx" ON "SkillGap"("userId");

-- CreateIndex
CREATE INDEX "SkillGap_targetRole_idx" ON "SkillGap"("targetRole");

-- CreateIndex
CREATE INDEX "CareerChatMessage_userId_createdAt_idx" ON "CareerChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CareerRoadmapItem" ADD CONSTRAINT "CareerRoadmapItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerRoadmapItem" ADD CONSTRAINT "CareerRoadmapItem_careerGoalId_fkey" FOREIGN KEY ("careerGoalId") REFERENCES "CareerGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRecommendation" ADD CONSTRAINT "LearningRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPrediction" ADD CONSTRAINT "SalaryPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillGap" ADD CONSTRAINT "SkillGap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerChatMessage" ADD CONSTRAINT "CareerChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
