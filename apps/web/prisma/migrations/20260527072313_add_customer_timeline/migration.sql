-- CreateEnum
CREATE TYPE "CustomerTimelineType" AS ENUM ('NOTE', 'CALL', 'MESSAGE', 'ORDER', 'SUPPORT');

-- CreateTable
CREATE TABLE "CustomerTimeline" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CustomerTimelineType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTimeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerTimeline" ADD CONSTRAINT "CustomerTimeline_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTimeline" ADD CONSTRAINT "CustomerTimeline_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
