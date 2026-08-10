ALTER TABLE `Module` MODIFY `description` TEXT NULL;
ALTER TABLE `Criterion` MODIFY `description` TEXT NULL;
ALTER TABLE `SubCriterion`
  MODIFY `description` TEXT NULL,
  MODIFY `markingDay` TEXT NULL,
  MODIFY `markingTeam` TEXT NULL;
ALTER TABLE `Aspect`
  MODIFY `description` TEXT NOT NULL,
  MODIFY `extraDescription` TEXT NULL,
  MODIFY `requirement` TEXT NULL,
  MODIFY `wsos` TEXT NULL,
  MODIFY `calculationRule` TEXT NULL,
  MODIFY `descriptor0` TEXT NULL,
  MODIFY `descriptor1` TEXT NULL,
  MODIFY `descriptor2` TEXT NULL,
  MODIFY `descriptor3` TEXT NULL;
ALTER TABLE `Mark` MODIFY `observation` TEXT NULL;
ALTER TABLE `AuditLog`
  MODIFY `oldValue` TEXT NULL,
  MODIFY `newValue` TEXT NULL;
