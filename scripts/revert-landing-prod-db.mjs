import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const prisma = new PrismaClient();

async function main() {
  console.log('↩️  Revert: last enrichPublicSiteProfile seed step');
  const profile = await prisma.publicSiteProfile.findFirst({ orderBy: { created_at: 'asc' } });
  if (!profile) {
    console.log('  no PublicSiteProfile row found — nothing to revert');
  } else {
    await prisma.publicSiteProfile.update({
      where: { id: profile.id },
      data: {
        hero_subtitle: null,
        home_image_url: null,
        youtube_embed_url: null,
        about_title: null,
        about_content: null,
        home_card_left_title: null,
        home_card_left_body: null,
        home_card_right_title: null,
        home_card_right_body: null,
        vision: null,
        mission: null,
        visi_photo_url: null,
        visi_name: null,
        visi_role: null,
        misi_photo_url: null,
        misi_name: null,
        misi_role: null,
        footer_tagline: null,
        instagram_url: null,
        tiktok_url: null,
        youtube_url: null,
        address: null,
        email: null,
        phone: null,
        logo_light_url: null,
        logo_dark_url: null,
        primary_color: null,
      },
    });
    console.log(`  ✅ Reverted ${profile.id}: 27 enriched fields set back to NULL`);
    console.log(`  (identity org_name=${profile.org_name}, campus_name=${profile.campus_name} preserved)`);
  }

  console.log('↩️  Cleanup: structure cabinet (if somehow partially written)');
  try {
    const delMembers = await prisma.publicStructureMember.deleteMany({});
    const delGroups = await prisma.publicStructureGroup.deleteMany({});
    const delCabinet = await prisma.publicStructureCabinet.deleteMany({});
    console.log(
      `  ✅ if existed: ${delCabinet.count} cabinet / ${delGroups.count} group / ${delMembers.count} member rows purged`
    );
  } catch (e) {
    console.log(`  ℹ️  skip tables cleanup: ${e.code || e.message}`);
  }

  console.log('↩️  Cleanup: all public content tables from this machine accidentally run');
  const deleteIfExists = async (label, fn) => {
    try {
      const r = await fn();
      console.log(`  ✅ ${label}: ${r.count} rows removed`);
    } catch (e) {
      console.log(`  ℹ️  skip ${label}: ${e.code || e.message}`);
    }
  };
  await deleteIfExists('PublicPost', () =>
    prisma.publicPost.deleteMany({ where: { slug: { startsWith: 'demo-' } } })
  );
  await deleteIfExists('PublicProgram', () => prisma.publicProgram.deleteMany({}));
  await deleteIfExists('PublicGalleryItem', () => prisma.publicGalleryItem.deleteMany({}));
  await deleteIfExists('PublicGalleryAlbum', () => prisma.publicGalleryAlbum.deleteMany({}));
  await deleteIfExists('PublicRecruitmentCommittee', () =>
    prisma.publicRecruitmentCommittee.deleteMany({})
  );
  await deleteIfExists('PublicRecruitmentContact', () => prisma.publicRecruitmentContact.deleteMany({}));
  await deleteIfExists('PublicRecruitment', () => prisma.publicRecruitment.deleteMany({}));

  console.log('-----------------------------------------------------');
  console.log('✅ Revert selesai. Selanjutnya pakai preview local mock (env VITE_USE_MOCK_LANDING=true)');
  console.log('   agar frontend sama sekali tidak menembak production DB.');
}

main()
  .catch((e) => {
    console.error('❌ Revert error (DB unreachable?):', e.code || e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
