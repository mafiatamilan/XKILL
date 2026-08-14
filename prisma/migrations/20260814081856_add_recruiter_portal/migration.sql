-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shortlist" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'shortlisted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSchedule" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "type" TEXT NOT NULL DEFAULT 'onsite',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedback" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "shortlisted" INTEGER NOT NULL DEFAULT 0,
    "interviewed" INTEGER NOT NULL DEFAULT 0,
    "offered" INTEGER NOT NULL DEFAULT 0,
    "hired" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiringAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- CreateIndex
CREATE INDEX "Shortlist_recruiterId_idx" ON "Shortlist"("recruiterId");

-- CreateIndex
CREATE INDEX "Shortlist_candidateId_idx" ON "Shortlist"("candidateId");

-- CreateIndex
CREATE INDEX "Shortlist_jobId_idx" ON "Shortlist"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Shortlist_recruiterId_candidateId_jobId_key" ON "Shortlist"("recruiterId", "candidateId", "jobId");

-- CreateIndex
CREATE INDEX "InterviewSchedule_recruiterId_idx" ON "InterviewSchedule"("recruiterId");

-- CreateIndex
CREATE INDEX "InterviewSchedule_candidateId_idx" ON "InterviewSchedule"("candidateId");

-- CreateIndex
CREATE INDEX "InterviewSchedule_jobId_idx" ON "InterviewSchedule"("jobId");

-- CreateIndex
CREATE INDEX "InterviewSchedule_scheduledAt_idx" ON "InterviewSchedule"("scheduledAt");

-- CreateIndex
CREATE INDEX "HiringAnalyticsSnapshot_recruiterId_idx" ON "HiringAnalyticsSnapshot"("recruiterId");

-- CreateIndex
CREATE INDEX "HiringAnalyticsSnapshot_period_idx" ON "HiringAnalyticsSnapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "HiringAnalyticsSnapshot_recruiterId_period_key" ON "HiringAnalyticsSnapshot"("recruiterId", "period");

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedule" ADD CONSTRAINT "InterviewSchedule_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringAnalyticsSnapshot" ADD CONSTRAINT "HiringAnalyticsSnapshot_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
