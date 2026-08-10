ALTER TABLE "Expert" ADD COLUMN "email" TEXT;
ALTER TABLE "Expert" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Expert" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Expert" ADD COLUMN "lastLoginAt" DATETIME;

CREATE UNIQUE INDEX "Expert_email_key" ON "Expert"("email");
