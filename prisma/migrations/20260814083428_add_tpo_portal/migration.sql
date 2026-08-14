-- CreateTable
CREATE TABLE "CompanyDrive" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "roles" TEXT[],
    "location" TEXT,
    "packageLakhs" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3) NOT NULL,
    "driveDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCriteria" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "department" TEXT,
    "minCgpa" DOUBLE PRECISION,
    "minPercentage" DOUBLE PRECISION,
    "backlogsAllowed" INTEGER NOT NULL DEFAULT 0,
    "passingYear" TEXT,
    "skills" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementReport" (
    "id" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "department" TEXT,
    "totalStudents" INTEGER NOT NULL,
    "eligibleStudents" INTEGER NOT NULL,
    "placedStudents" INTEGER NOT NULL,
    "offersMade" INTEGER NOT NULL,
    "highestPackage" DOUBLE PRECISION,
    "averagePackage" DOUBLE PRECISION,
    "medianPackage" DOUBLE PRECISION,
    "topRecruiters" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRecord" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ctcLakhs" DOUBLE PRECISION NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "joiningDate" TIMESTAMP(3),
    "offerDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TpoInterviewSchedule" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "type" TEXT NOT NULL DEFAULT 'onsite',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedback" TEXT,
    "rating" INTEGER,
    "panelMembers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TpoInterviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyDrive_companyId_idx" ON "CompanyDrive"("companyId");

-- CreateIndex
CREATE INDEX "CompanyDrive_status_idx" ON "CompanyDrive"("status");

-- CreateIndex
CREATE INDEX "CompanyDrive_deadline_idx" ON "CompanyDrive"("deadline");

-- CreateIndex
CREATE INDEX "EligibilityCriteria_driveId_idx" ON "EligibilityCriteria"("driveId");

-- CreateIndex
CREATE INDEX "PlacementReport_academicYear_idx" ON "PlacementReport"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementReport_academicYear_department_key" ON "PlacementReport"("academicYear", "department");

-- CreateIndex
CREATE INDEX "OfferRecord_driveId_idx" ON "OfferRecord"("driveId");

-- CreateIndex
CREATE INDEX "OfferRecord_studentId_idx" ON "OfferRecord"("studentId");

-- CreateIndex
CREATE INDEX "OfferRecord_status_idx" ON "OfferRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OfferRecord_driveId_studentId_key" ON "OfferRecord"("driveId", "studentId");

-- CreateIndex
CREATE INDEX "TpoInterviewSchedule_driveId_idx" ON "TpoInterviewSchedule"("driveId");

-- CreateIndex
CREATE INDEX "TpoInterviewSchedule_candidateId_idx" ON "TpoInterviewSchedule"("candidateId");

-- CreateIndex
CREATE INDEX "TpoInterviewSchedule_scheduledAt_idx" ON "TpoInterviewSchedule"("scheduledAt");

-- AddForeignKey
ALTER TABLE "CompanyDrive" ADD CONSTRAINT "CompanyDrive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityCriteria" ADD CONSTRAINT "EligibilityCriteria_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "CompanyDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRecord" ADD CONSTRAINT "OfferRecord_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "CompanyDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRecord" ADD CONSTRAINT "OfferRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TpoInterviewSchedule" ADD CONSTRAINT "TpoInterviewSchedule_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "CompanyDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TpoInterviewSchedule" ADD CONSTRAINT "TpoInterviewSchedule_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
