-- CreateTable
CREATE TABLE "InternshipListing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "stipend" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipApplication" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "coverLetter" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipCertificate" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternshipCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternshipListing_companyId_idx" ON "InternshipListing"("companyId");

-- CreateIndex
CREATE INDEX "InternshipListing_recruiterId_idx" ON "InternshipListing"("recruiterId");

-- CreateIndex
CREATE INDEX "InternshipListing_isActive_idx" ON "InternshipListing"("isActive");

-- CreateIndex
CREATE INDEX "InternshipListing_type_idx" ON "InternshipListing"("type");

-- CreateIndex
CREATE INDEX "InternshipApplication_userId_idx" ON "InternshipApplication"("userId");

-- CreateIndex
CREATE INDEX "InternshipApplication_status_idx" ON "InternshipApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipApplication_internshipId_userId_key" ON "InternshipApplication"("internshipId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipCertificate_certificateNumber_key" ON "InternshipCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "InternshipCertificate_userId_idx" ON "InternshipCertificate"("userId");

-- CreateIndex
CREATE INDEX "InternshipCertificate_certificateNumber_idx" ON "InternshipCertificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipCertificate_internshipId_userId_key" ON "InternshipCertificate"("internshipId", "userId");

-- AddForeignKey
ALTER TABLE "InternshipListing" ADD CONSTRAINT "InternshipListing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipListing" ADD CONSTRAINT "InternshipListing_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "InternshipListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipCertificate" ADD CONSTRAINT "InternshipCertificate_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "InternshipListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipCertificate" ADD CONSTRAINT "InternshipCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
