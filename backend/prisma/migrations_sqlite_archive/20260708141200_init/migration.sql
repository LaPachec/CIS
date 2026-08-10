-- CreateTable
CREATE TABLE "Competition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Module_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduleId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPoints" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Criterion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubCriterion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "criterionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "markingDay" TEXT,
    "markingTeam" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aspect" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subCriterionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "wsos" TEXT,
    "maxPoints" DECIMAL NOT NULL,
    "calculationRule" TEXT,
    "descriptor0" TEXT,
    "descriptor1" TEXT,
    "descriptor2" TEXT,
    "descriptor3" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aspect_subCriterionId_fkey" FOREIGN KEY ("subCriterionId") REFERENCES "SubCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "workstation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Competitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "role" TEXT NOT NULL DEFAULT 'EXPERT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expert_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mark" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aspectId" INTEGER NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "expertId" INTEGER NOT NULL,
    "value" DECIMAL NOT NULL,
    "observation" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mark_aspectId_fkey" FOREIGN KEY ("aspectId") REFERENCES "Aspect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mark_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mark_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "userName" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "Expert_competitionId_idx" ON "Expert"("competitionId");

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
