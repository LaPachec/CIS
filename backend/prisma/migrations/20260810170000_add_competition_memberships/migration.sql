-- CreateTable
CREATE TABLE "CompetitionCompetitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionCompetitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionCompetitor_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionExpert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "competitionId" INTEGER NOT NULL,
    "expertId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionExpert_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompetitionExpert_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Preserve existing one-competition links as memberships.
INSERT OR IGNORE INTO "CompetitionCompetitor" ("competitionId", "competitorId", "createdAt")
SELECT "competitionId", "id", CURRENT_TIMESTAMP
FROM "Competitor";

INSERT OR IGNORE INTO "CompetitionExpert" ("competitionId", "expertId", "createdAt")
SELECT "competitionId", "id", CURRENT_TIMESTAMP
FROM "Expert";

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionCompetitor_competitionId_competitorId_key" ON "CompetitionCompetitor"("competitionId", "competitorId");

-- CreateIndex
CREATE INDEX "CompetitionCompetitor_competitionId_idx" ON "CompetitionCompetitor"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionCompetitor_competitorId_idx" ON "CompetitionCompetitor"("competitorId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionExpert_competitionId_expertId_key" ON "CompetitionExpert"("competitionId", "expertId");

-- CreateIndex
CREATE INDEX "CompetitionExpert_competitionId_idx" ON "CompetitionExpert"("competitionId");

-- CreateIndex
CREATE INDEX "CompetitionExpert_expertId_idx" ON "CompetitionExpert"("expertId");
