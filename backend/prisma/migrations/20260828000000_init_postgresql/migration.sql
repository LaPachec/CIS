-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AspectType" AS ENUM ('MEASUREMENT', 'JUDGEMENT');

-- CreateEnum
CREATE TYPE "ExpertRole" AS ENUM ('EXPERT', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK');

-- CreateTable
CREATE TABLE "Competition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCriterion" (
    "id" SERIAL NOT NULL,
    "criterionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "markingDay" TEXT,
    "markingTeam" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aspect" (
    "id" SERIAL NOT NULL,
    "subCriterionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "extraDescription" TEXT,
    "requirement" TEXT,
    "type" "AspectType" NOT NULL,
    "wsos" TEXT,
    "maxPoints" DECIMAL(65,30) NOT NULL,
    "calculationRule" TEXT,
    "descriptor0" TEXT,
    "descriptor1" TEXT,
    "descriptor2" TEXT,
    "descriptor3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "workstation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expert" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "state" TEXT,
    "role" "ExpertRole" NOT NULL DEFAULT 'EXPERT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionCompetitor" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionExpert" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "expertId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionExpert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" SERIAL NOT NULL,
    "aspectId" INTEGER NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "expertId" INTEGER NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "observation" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Module_competitionId_idx" ON "Module"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_competitionId_code_key" ON "Module"("competitionId", "code");

-- CreateIndex
CREATE INDEX "Criterion_moduleId_idx" ON "Criterion"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_moduleId_code_key" ON "Criterion"("moduleId", "code");

-- CreateIndex
CREATE INDEX "SubCriterion_criterionId_idx" ON "SubCriterion"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCriterion_criterionId_code_key" ON "SubCriterion"("criterionId", "code");

-- CreateIndex
CREATE INDEX "Aspect_subCriterionId_idx" ON "Aspect"("subCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "Aspect_subCriterionId_code_key" ON "Aspect"("subCriterionId", "code");

-- CreateIndex
CREATE INDEX "Competitor_competitionId_idx" ON "Competitor"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_competitionId_workstation_key" ON "Competitor"("competitionId", "workstation");

-- CreateIndex
CREATE UNIQUE INDEX "Expert_email_key" ON "Expert"("email");

-- CreateIndex
CREATE INDEX "Expert_competitionId_idx" ON "Expert"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionCompetitor_competitionId_idx" ON "CompetitionCompetitor"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionCompetitor_competitorId_idx" ON "CompetitionCompetitor"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionCompetitor_competitionId_competitorId_key" ON "CompetitionCompetitor"("competitionId", "competitorId");

-- CreateIndex
CREATE INDEX "CompetitionExpert_competitionId_idx" ON "CompetitionExpert"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionExpert_expertId_idx" ON "CompetitionExpert"("expertId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionExpert_competitionId_expertId_key" ON "CompetitionExpert"("competitionId", "expertId");

-- CreateIndex
CREATE INDEX "Mark_aspectId_idx" ON "Mark"("aspectId");

-- CreateIndex
CREATE INDEX "Mark_competitorId_idx" ON "Mark"("competitorId");

-- CreateIndex
CREATE INDEX "Mark_expertId_idx" ON "Mark"("expertId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_aspectId_competitorId_expertId_key" ON "Mark"("aspectId", "competitorId", "expertId");

-- CreateIndex
CREATE INDEX "AuditLog_competitionId_idx" ON "AuditLog"("competitionId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterion" ADD CONSTRAINT "Criterion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCriterion" ADD CONSTRAINT "SubCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aspect" ADD CONSTRAINT "Aspect_subCriterionId_fkey" FOREIGN KEY ("subCriterionId") REFERENCES "SubCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expert" ADD CONSTRAINT "Expert_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCompetitor" ADD CONSTRAINT "CompetitionCompetitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCompetitor" ADD CONSTRAINT "CompetitionCompetitor_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionExpert" ADD CONSTRAINT "CompetitionExpert_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionExpert" ADD CONSTRAINT "CompetitionExpert_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_aspectId_fkey" FOREIGN KEY ("aspectId") REFERENCES "Aspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
