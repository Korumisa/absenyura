import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';

let isRunning = false;
let lastRunTime = 0;

export const runCronJob = async () => {
  // Prevent concurrent runs and enforce 1-minute minimum interval
  const nowTime = Date.now();
  if (isRunning || nowTime - lastRunTime < 60000) return;
  
  isRunning = true;
  lastRunTime = nowTime;

  try {
    const resolveExpectedUserIds = async (session: any, allUsers: any[]) => {
      if (session.class_id) {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { class_id: session.class_id },
          select: { student_id: true },
        });
        return enrollments.map((e) => e.student_id);
      }
      const linked = await prisma.sessionClass.findMany({
        where: { session_id: session.id },
        select: { class_id: true },
      });
      const classIds = linked.map((x) => x.class_id);
      if (classIds.length > 0) {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { class_id: { in: classIds } },
          select: { student_id: true },
        });
        return Array.from(new Set(enrollments.map((e) => e.student_id)));
      }
      return allUsers.map((u) => u.id);
    };

    const now = new Date();

    // UPCOMING -> ACTIVE (when check_in_open_at is reached and before check_in_close_at + 2 min grace period)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000);
    const twoMinutesFuture = new Date(now.getTime() + 2 * 60000);

    const sessionsToActivate = await prisma.session.findMany({
      where: {
        status: 'UPCOMING',
        // Active when now >= check_in_open_at - 2 min
        check_in_open_at: { lte: twoMinutesFuture },
        // Must not have reached check_in_close_at + 2 min yet
        check_in_close_at: { gt: twoMinutesAgo }
      }
    });

    if (sessionsToActivate.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: sessionsToActivate.map(s => s.id) } },
        data: { status: 'ACTIVE' }
      });

      // Notify creator that session is active
      for (const session of sessionsToActivate) {
        // Create notification for creator
        await prisma.notification.create({
          data: {
            user_id: session.created_by_id,
            title: 'Sesi Dimulai',
            message: `Sesi "${session.title}" sekarang aktif dan siap menerima absensi.`,
            type: 'SUCCESS'
          }
        });

        // Notify students
        const allUsers = await prisma.user.findMany({ where: { role: 'USER', is_active: true } });
        const expectedUserIds: string[] = await resolveExpectedUserIds(session, allUsers);

        if (expectedUserIds.length > 0) {
          await prisma.notification.createMany({
            data: expectedUserIds.map(id => ({
              user_id: id,
              title: 'Sesi Absensi Dimulai',
              message: `Sesi "${session.title}" telah dibuka. Segera lakukan absensi.`,
              type: 'INFO'
            }))
          });
        }
      }
      console.log(`[Cron] Marked ${sessionsToActivate.length} sessions as ACTIVE`);
    }

      // ACTIVE/UPCOMING -> CLOSED (when check_in_close_at + 2 min grace period is reached)
    const sessionsToClose = await prisma.session.findMany({
      where: {
        status: { in: ['ACTIVE', 'UPCOMING'] },
        // Close only when now > check_in_close_at + 2 min (i.e. check_in_close_at <= now - 2 min)
        check_in_close_at: { lte: twoMinutesAgo }
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
        const expectedUserIds: string[] = await resolveExpectedUserIds(session, allUsers);

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

        // Notify absent students
        if (absentUserIds.length > 0) {
          await prisma.notification.createMany({
            data: absentUserIds.map(id => ({
              user_id: id,
              title: 'Tidak Hadir (Alfa)',
              message: `Anda ditandai Alfa (Tidak Hadir) pada sesi "${session.title}" karena batas waktu absensi telah berakhir.`,
              type: 'WARNING'
            }))
          });
        }

        // Check Early Warning System (EWS) for < 75% attendance for absent users
        for (const userId of absentUserIds) {
          const linked = await prisma.sessionClass.findMany({
            where: { session_id: session.id },
            select: { class_id: true },
          });
          const classIds = session.class_id ? [session.class_id] : linked.map((x) => x.class_id);
          if (classIds.length === 0) continue;

          for (const classId of classIds) {
            const isEnrolled = await prisma.classEnrollment.findFirst({
              where: { class_id: classId, student_id: userId },
              select: { id: true },
            });
            if (!isEnrolled) continue;

            const totalSessions = await prisma.session.count({
              where: {
                status: 'CLOSED',
                OR: [{ class_id: classId }, { session_classes: { some: { class_id: classId } } }],
              },
            });

            if (totalSessions <= 0) continue;

            const attendedCount = await prisma.attendance.count({
              where: {
                user_id: userId,
                session: {
                  status: 'CLOSED',
                  OR: [{ class_id: classId }, { session_classes: { some: { class_id: classId } } }],
                },
                status: { in: ['PRESENT', 'LATE', 'SICK', 'EXCUSED'] },
              },
            });

            const attendancePercentage = (attendedCount / totalSessions) * 100;

            if (attendancePercentage < 75) {
              await prisma.notification.create({
                data: {
                  user_id: userId,
                  title: 'Peringatan Dini Kehadiran (EWS)',
                  message: `Tingkat kehadiran Anda di salah satu kelas telah turun menjadi ${Math.round(attendancePercentage)}% (Di bawah batas minimal 75%). Harap perhatikan kehadiran Anda.`,
                  type: 'WARNING',
                },
              });
              break;
            }
          }
        }
      }
      console.log(`[Cron] Marked ${sessionsToClose.length} sessions as CLOSED and processed absences.`);
    }

  } catch (error) {
    console.error('[Cron] Error updating session statuses:', error);
  } finally {
    isRunning = false;
  }
};

export const startCronJobs = () => {
  console.log('[Cron] Starting session status updater (Interval: 1 minute)...');

  // Check and update session statuses every minute
  setInterval(runCronJob, 60000); // 60,000 ms = 1 minute

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

  // 3. Update Semester Job - Runs daily at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('[Cron] Running daily semester update job...');
      const users = await prisma.user.findMany({
        where: { role: 'USER', is_active: true }
      });

      let updatedCount = 0;
      const now = new Date();

      for (const user of users) {
        const enrollmentDate = new Date((user as any).enrollment_date);
        const monthsDiff = (now.getFullYear() - enrollmentDate.getFullYear()) * 12 + (now.getMonth() - enrollmentDate.getMonth());
        const newSemester = Math.max(1, Math.min(14, Math.floor(monthsDiff / 6) + 1));

        if (newSemester !== (user as any).semester) {
          await prisma.user.update({
            where: { id: user.id },
            data: { semester: newSemester }
          });
          updatedCount++;
        }
      }

      console.log(`[Cron] Semester update complete. Updated ${updatedCount} users.`);
    } catch (error) {
      console.error('[Cron] Error updating semesters:', error);
    }
  });
};
