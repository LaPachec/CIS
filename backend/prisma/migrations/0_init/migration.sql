-- CreateTable
CREATE TABLE `Competition` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Module` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competitionId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `totalPoints` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Module_competitionId_idx`(`competitionId`),
    UNIQUE INDEX `Module_competitionId_code_key`(`competitionId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Criterion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `totalPoints` DECIMAL(65, 30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Criterion_moduleId_idx`(`moduleId`),
    UNIQUE INDEX `Criterion_moduleId_code_key`(`moduleId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubCriterion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `criterionId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `markingDay` VARCHAR(191) NULL,
    `markingTeam` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SubCriterion_criterionId_idx`(`criterionId`),
    UNIQUE INDEX `SubCriterion_criterionId_code_key`(`criterionId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Aspect` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subCriterionId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `extraDescription` VARCHAR(191) NULL,
    `requirement` VARCHAR(191) NULL,
    `type` ENUM('MEASUREMENT', 'JUDGEMENT') NOT NULL,
    `wsos` VARCHAR(191) NULL,
    `maxPoints` DECIMAL(65, 30) NOT NULL,
    `calculationRule` VARCHAR(191) NULL,
    `descriptor0` VARCHAR(191) NULL,
    `descriptor1` VARCHAR(191) NULL,
    `descriptor2` VARCHAR(191) NULL,
    `descriptor3` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Aspect_subCriterionId_idx`(`subCriterionId`),
    UNIQUE INDEX `Aspect_subCriterionId_code_key`(`subCriterionId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Competitor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competitionId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `workstation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Competitor_competitionId_idx`(`competitionId`),
    UNIQUE INDEX `Competitor_competitionId_workstation_key`(`competitionId`, `workstation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competitionId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `role` ENUM('EXPERT', 'SUPERVISOR', 'ADMIN') NOT NULL DEFAULT 'EXPERT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expert_competitionId_idx`(`competitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mark` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aspectId` INTEGER NOT NULL,
    `competitorId` INTEGER NOT NULL,
    `expertId` INTEGER NOT NULL,
    `value` DECIMAL(65, 30) NOT NULL,
    `observation` VARCHAR(191) NULL,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Mark_aspectId_idx`(`aspectId`),
    INDEX `Mark_competitorId_idx`(`competitorId`),
    INDEX `Mark_expertId_idx`(`expertId`),
    UNIQUE INDEX `Mark_aspectId_competitorId_expertId_key`(`aspectId`, `competitorId`, `expertId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competitionId` INTEGER NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK') NOT NULL,
    `oldValue` VARCHAR(191) NULL,
    `newValue` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_competitionId_idx`(`competitionId`),
    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Module` ADD CONSTRAINT `Module_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Criterion` ADD CONSTRAINT `Criterion_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SubCriterion` ADD CONSTRAINT `SubCriterion_criterionId_fkey` FOREIGN KEY (`criterionId`) REFERENCES `Criterion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Aspect` ADD CONSTRAINT `Aspect_subCriterionId_fkey` FOREIGN KEY (`subCriterionId`) REFERENCES `SubCriterion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Competitor` ADD CONSTRAINT `Competitor_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Expert` ADD CONSTRAINT `Expert_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Mark` ADD CONSTRAINT `Mark_aspectId_fkey` FOREIGN KEY (`aspectId`) REFERENCES `Aspect`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Mark` ADD CONSTRAINT `Mark_competitorId_fkey` FOREIGN KEY (`competitorId`) REFERENCES `Competitor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Mark` ADD CONSTRAINT `Mark_expertId_fkey` FOREIGN KEY (`expertId`) REFERENCES `Expert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `Competition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
