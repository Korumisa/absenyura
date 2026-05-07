/*
  Warnings:

  - A unique constraint covering the columns `[nim_nip]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PublicPostType" AS ENUM ('BERITA', 'KEGIATAN', 'LOMBA', 'PENGUMUMAN');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "check_in_accuracy" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "semester" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ChallengeNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicSiteProfile" (
    "id" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "campus_name" TEXT NOT NULL,
    "kabinet_name" TEXT,
    "kabinet_period" TEXT,
    "hero_subtitle" TEXT,
    "youtube_embed_url" TEXT,
    "about_title" TEXT,
    "about_content" TEXT,
    "footer_tagline" TEXT,
    "instagram_url" TEXT,
    "tiktok_url" TEXT,
    "youtube_url" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo_light_url" TEXT,
    "logo_dark_url" TEXT,
    "primary_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicSiteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicStructureGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicStructureGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicStructureMember" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicStructureMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPost" (
    "id" TEXT NOT NULL,
    "type" "PublicPostType" NOT NULL DEFAULT 'BERITA',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date_label" TEXT,
    "status" TEXT,
    "excerpt" TEXT,
    "content" TEXT,
    "cover_image_url" TEXT,
    "category_id" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProgram" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date_range" TEXT,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicGalleryAlbum" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicGalleryAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicGalleryItem" (
    "id" TEXT NOT NULL,
    "album_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicGalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicRecruitment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date_range" TEXT,
    "description" TEXT,
    "form_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRecruitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicRecruitmentCommittee" (
    "id" TEXT NOT NULL,
    "recruitment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PublicRecruitmentCommittee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeNonce_nonce_key" ON "ChallengeNonce"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "PublicCategory_slug_key" ON "PublicCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PublicPost_slug_key" ON "PublicPost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_nim_nip_key" ON "User"("nim_nip");

-- AddForeignKey
ALTER TABLE "PublicStructureMember" ADD CONSTRAINT "PublicStructureMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "PublicStructureGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicPost" ADD CONSTRAINT "PublicPost_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "PublicCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicGalleryItem" ADD CONSTRAINT "PublicGalleryItem_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "PublicGalleryAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicRecruitmentCommittee" ADD CONSTRAINT "PublicRecruitmentCommittee_recruitment_id_fkey" FOREIGN KEY ("recruitment_id") REFERENCES "PublicRecruitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
