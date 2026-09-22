-- CMS / public-site performance indexes (FK joins + publish filters)

CREATE INDEX IF NOT EXISTS "PublicStructureGroup_cabinet_id_idx"
  ON "PublicStructureGroup"("cabinet_id");

CREATE INDEX IF NOT EXISTS "PublicStructureMember_group_id_idx"
  ON "PublicStructureMember"("group_id");

CREATE INDEX IF NOT EXISTS "PublicPost_is_published_type_published_at_idx"
  ON "PublicPost"("is_published", "type", "published_at");

CREATE INDEX IF NOT EXISTS "PublicPost_category_id_idx"
  ON "PublicPost"("category_id");

CREATE INDEX IF NOT EXISTS "PublicProgram_is_published_idx"
  ON "PublicProgram"("is_published");

CREATE INDEX IF NOT EXISTS "PublicGalleryAlbum_is_published_idx"
  ON "PublicGalleryAlbum"("is_published");

CREATE INDEX IF NOT EXISTS "PublicGalleryItem_album_id_sort_order_idx"
  ON "PublicGalleryItem"("album_id", "sort_order");

CREATE INDEX IF NOT EXISTS "PublicRecruitment_is_published_idx"
  ON "PublicRecruitment"("is_published");

CREATE INDEX IF NOT EXISTS "PublicRecruitmentCommittee_recruitment_id_idx"
  ON "PublicRecruitmentCommittee"("recruitment_id");

CREATE INDEX IF NOT EXISTS "PublicRecruitmentContact_recruitment_id_idx"
  ON "PublicRecruitmentContact"("recruitment_id");
