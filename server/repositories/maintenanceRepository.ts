import prisma from '../utils/prisma.js';

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export async function flushTransactionData(): Promise<void> {
  await prisma.$transaction([
    prisma.publicGalleryItem.deleteMany(),
    prisma.publicGalleryAlbum.deleteMany(),
    prisma.publicRecruitmentCommittee.deleteMany(),
    prisma.publicRecruitment.deleteMany(),
    prisma.publicPost.deleteMany(),
    prisma.publicCategory.deleteMany(),
    prisma.publicStructureMember.deleteMany(),
    prisma.publicStructureGroup.deleteMany(),
    prisma.publicProgram.deleteMany(),
    prisma.publicSiteProfile.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.excuseRequest.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.classEnrollment.deleteMany(),
    prisma.session.deleteMany(),
    prisma.class.deleteMany(),
    prisma.location.deleteMany(),
  ]);
}
