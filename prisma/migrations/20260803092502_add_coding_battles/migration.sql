-- AlterTable
ALTER TABLE "CodingRatingHistory" ADD COLUMN     "battleId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'contest';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "battleId" TEXT;

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "problemId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 900,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "ratingAppliedAt" TIMESTAMP(3),
    "inviteCode" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltySeconds" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "ratingBefore" INTEGER,
    "ratingAfter" INTEGER,
    "ratingDelta" INTEGER,
    "solvedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Battle_inviteCode_key" ON "Battle"("inviteCode");

-- CreateIndex
CREATE INDEX "Battle_status_idx" ON "Battle"("status");

-- CreateIndex
CREATE INDEX "Battle_type_idx" ON "Battle"("type");

-- CreateIndex
CREATE INDEX "Battle_endsAt_idx" ON "Battle"("endsAt");

-- CreateIndex
CREATE INDEX "Battle_inviteCode_idx" ON "Battle"("inviteCode");

-- CreateIndex
CREATE INDEX "Battle_createdById_idx" ON "Battle"("createdById");

-- CreateIndex
CREATE INDEX "BattleParticipant_userId_idx" ON "BattleParticipant"("userId");

-- CreateIndex
CREATE INDEX "BattleParticipant_battleId_score_idx" ON "BattleParticipant"("battleId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_userId_key" ON "BattleParticipant"("battleId", "userId");

-- CreateIndex
CREATE INDEX "CodingRatingHistory_battleId_idx" ON "CodingRatingHistory"("battleId");

-- CreateIndex
CREATE INDEX "Submission_battleId_idx" ON "Submission"("battleId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingRatingHistory" ADD CONSTRAINT "CodingRatingHistory_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
