-- AlterTable
ALTER TABLE "PublicRecruitment" ADD COLUMN     "poster_image_url" TEXT;

-- CreateTable
CREATE TABLE "PublicRecruitmentContact" (
    "id" TEXT NOT NULL,
    "recruitment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicRecruitmentContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicRecruitmentContact_recruitment_id_idx" ON "PublicRecruitmentContact"("recruitment_id");

-- AddForeignKey
ALTER TABLE "PublicRecruitmentContact" ADD CONSTRAINT "PublicRecruitmentContact_recruitment_id_fkey" FOREIGN KEY ("recruitment_id") REFERENCES "PublicRecruitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

