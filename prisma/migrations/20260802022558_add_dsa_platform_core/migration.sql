-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topics" TEXT[],
    "companies" TEXT[],
    "tags" TEXT[],
    "timeLimitMs" INTEGER NOT NULL DEFAULT 1000,
    "memoryLimitMb" INTEGER NOT NULL DEFAULT 256,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Editorial" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "complexity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Editorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hint" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "languageId" INTEGER NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "verdict" TEXT,
    "passedTestCases" INTEGER NOT NULL DEFAULT 0,
    "totalTestCases" INTEGER NOT NULL DEFAULT 0,
    "failedCaseIndex" INTEGER,
    "failedCaseVerdict" TEXT,
    "errorMessage" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "timeMs" DOUBLE PRECISION,
    "memoryKb" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolvedProblem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "firstSolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolvedProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HintUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "unlockedHints" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HintUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE INDEX "Problem_difficulty_idx" ON "Problem"("difficulty");

-- CreateIndex
CREATE INDEX "Problem_isActive_idx" ON "Problem"("isActive");

-- CreateIndex
CREATE INDEX "Problem_topics_idx" ON "Problem" USING GIN ("topics" array_ops);

-- CreateIndex
CREATE INDEX "Problem_companies_idx" ON "Problem" USING GIN ("companies" array_ops);

-- CreateIndex
CREATE INDEX "Problem_tags_idx" ON "Problem" USING GIN ("tags" array_ops);

-- CreateIndex
CREATE INDEX "TestCase_problemId_idx" ON "TestCase"("problemId");

-- CreateIndex
CREATE INDEX "TestCase_problemId_isSample_idx" ON "TestCase"("problemId", "isSample");

-- CreateIndex
CREATE UNIQUE INDEX "Editorial_problemId_key" ON "Editorial"("problemId");

-- CreateIndex
CREATE INDEX "Hint_problemId_idx" ON "Hint"("problemId");

-- CreateIndex
CREATE INDEX "Hint_problemId_order_idx" ON "Hint"("problemId", "order");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_problemId_idx" ON "Submission"("problemId");

-- CreateIndex
CREATE INDEX "Submission_userId_problemId_idx" ON "Submission"("userId", "problemId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_verdict_idx" ON "Submission"("verdict");

-- CreateIndex
CREATE INDEX "Submission_submittedAt_idx" ON "Submission"("submittedAt");

-- CreateIndex
CREATE INDEX "SolvedProblem_userId_idx" ON "SolvedProblem"("userId");

-- CreateIndex
CREATE INDEX "SolvedProblem_problemId_idx" ON "SolvedProblem"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "SolvedProblem_userId_problemId_key" ON "SolvedProblem"("userId", "problemId");

-- CreateIndex
CREATE INDEX "HintUnlock_userId_idx" ON "HintUnlock"("userId");

-- CreateIndex
CREATE INDEX "HintUnlock_problemId_idx" ON "HintUnlock"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "HintUnlock_userId_problemId_key" ON "HintUnlock"("userId", "problemId");

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Editorial" ADD CONSTRAINT "Editorial_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolvedProblem" ADD CONSTRAINT "SolvedProblem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolvedProblem" ADD CONSTRAINT "SolvedProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUnlock" ADD CONSTRAINT "HintUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUnlock" ADD CONSTRAINT "HintUnlock_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
