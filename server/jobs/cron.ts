import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';

export const startCronJobs = () => {
  // Check and update session statuses every minute
  cron.schedule('* * * * *', async () => {
    console.log('Running cron job: Update Session Statuses');
    try {
      const now = new Date();

      // UPCOMING -> ACTIVE (when check_in_open_at is reached and before check_in_close_at)
      const sessionsToActivate = await prisma.session.findMany({
        where: {
          status: 'UPCOMING',
          check_in_open_at: { lte: now },
          check_in_close_at: { gt: now }
        }
      });

      if (sessionsToActivate.length > 0) {
        await prisma.session.updateMany({
          where: { id: { in: sessionsToActivate.map(s => s.id) } },
          data: { status: 'ACTIVE' }
        });

        // Notify creator that session is active
        for (const session of sessionsToActivate) {
          await prisma.notification.create({
            data: {
              user_id: session.created_by_id,
              title: 'Sesi Dimulai',
              message: `Sesi "${session.title}" sekarang aktif dan siap menerima absensi.`,
              type: 'SUCCESS'
            }
          });
        }
      }

      // ACTIVE/UPCOMING -> CLOSED (when check_in_close_at or session_end is reached)
      const sessionsToClose = await prisma.session.findMany({
        where: {
          status: { in: ['ACTIVE', 'UPCOMING'] },
          check_in_close_at: { lte: now }
        }
      });

      if (sessionsToClose.length > 0) {
        await prisma.session.updateMany({
          where: { id: { in: sessionsToClose.map(s => s.id) } },
          data: { status: 'CLOSED' }
        });

        // Auto-Absent Job
        const allUsers = await prisma.user.findMany({ where: { role: 'USER', is_active: true } });

        for (const session of sessionsToClose) {
          // Determine which users are supposed to attend
          let expectedUserIds = [];
          if (session.class_id) {
            const enrollments = await prisma.classEnrollment.findMany({
              where: { class_id: session.class_id },
              select: { student_id: true }
            });
            expectedUserIds = enrollments.map(e => e.student_id);
          } else {
            // If no class assigned, assume all active users (fallback)
            expectedUserIds = allUsers.map(u => u.id);
          }

          // Get all present users for this session
          const presentAttendances = await prisma.attendance.findMany({
            where: { session_id: session.id },
            select: { user_id: true }
          });
          const presentUserIds = presentAttendances.map(a => a.user_id);

          // Find users who didn't check in
          const absentUserIds = expectedUserIds.filter(id => !presentUserIds.includes(id));

          // Create ABSENT records
          if (absentUserIds.length > 0) {
            await prisma.attendance.createMany({
              data: absentUserIds.map(id => ({
                session_id: session.id,
                user_id: id,
                status: 'ABSENT',
                check_in_time: new Date(),
                check_in_ip: 'SYSTEM',
                check_in_device: 'AUTO_JOB'
              }))
            });
          }

          // Notify creator that session is closed
          await prisma.notification.create({
            data: {
              user_id: session.created_by_id,
              title: 'Sesi Selesai',
              message: `Sesi "${session.title}" telah ditutup otomatis. ${absentUserIds.length} mahasiswa ditandai Alfa.`,
              type: 'INFO'
            }
          });
        }
      }

    } catch (error) {
      console.error('[Cron] Error updating session statuses:', error);
    }
  });

  // 2. Photo Cleanup Job - Runs daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Cron] Running daily photo cleanup job...');
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Cari absensi yang umurnya > 7 hari dan memiliki foto
      const oldAttendances = await prisma.attendance.findMany({
        where: {
          photo_url: { not: null },
          check_in_time: { lt: oneWeekAgo }
        },
        select: { id: true, photo_url: true }
      });

      let deletedCount = 0;
      for (const att of oldAttendances) {
        if (att.photo_url) {
          // att.photo_url is like '/uploads/attendance/file-name.jpg'
          const fileName = path.basename(att.photo_url);
          const filePath = path.join(process.cwd(), 'uploads', 'attendance', fileName);

          // Hapus file fisik jika ada
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          // Kosongkan URL di database agar tidak ada error link patah (broken image)
          await prisma.attendance.update({
            where: { id: att.id },
            data: { photo_url: null }
          });
          
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[Cron] Berhasil menghapus ${deletedCount} foto bukti yang berumur lebih dari 1 minggu.`);
      }
    } catch (error) {
      console.error('[Cron] Error cleaning up photos:', error);
    }
  });
};