-- AlterTable
ALTER TABLE "PublicStructureGroup" ADD COLUMN     "is_core" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PublicStructureMember" ADD COLUMN     "is_spotlight" BOOLEAN NOT NULL DEFAULT false;
