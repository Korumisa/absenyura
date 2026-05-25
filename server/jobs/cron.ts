import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

let isRunning = false;
let lastRunTime = 0;

export const runCronJob = async () => {
  // Prevent concurrent runs and enforce 1-minute minimum interval
  const nowTime = Date.now();
  if (isRunning || nowTime - lastRunTime < 60000) return;

  isRunning = true;
  lastRunTime = nowTime;

  try {
    const resolveExpectedUserIds = async (session: any) => {
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
      const activeUsers = await prisma.user.findMany({
        where: { role: 'USER', is_active: true },
        select: { id: true },
      });
      return activeUsers.map((u) => u.id);
    };

    const now = new Date();

    // Transisi memakai `check_in_open_at` & `check_in_close_at` (bukan `session_start` / `session_end`)
    // karena field-field tersebut adalah jendela waktu absensi yang otoritatif.
    // UPCOMING -> ACTIVE (when check_in_open_at is reached and before check_in_close_at + 2 min grace period)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000);
    const twoMinutesFuture = new Date(now.getTime() + 2 * 60000);
    // Cooldown 1 menit: sesi yang baru dibuat / di-update tidak langsung kena cron,
    // memberi admin buffer untuk edit ulang jika salah set jam.
    const oneMinuteAgo = new Date(now.getTime() - 60_000);

    const sessionsToActivate = await prisma.session.findMany({
      where: {
        status: 'UPCOMING',
        created_at: { lte: oneMinuteAgo },
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
        const expectedUserIds: string[] = await resolveExpectedUserIds(session);

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
        created_at: { lte: oneMinuteAgo },
        // Close only when now > check_in_close_at + 2 min (i.e. check_in_close_at <= now - 2 min)
        check_in_close_at: { lte: twoMinutesAgo }
      }
    });

    if (sessionsToActivate.length > 0 || sessionsToClose.length > 0) {
      console.log(
        `[Cron] now=${now.toISOString()} activated=${sessionsToActivate.length} closed=${sessionsToClose.length}`,
      );
    }

    if (sessionsToClose.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: sessionsToClose.map(s => s.id) } },
        data: { status: 'CLOSED' }
      });

      // Auto-Absent Job
      for (const session of sessionsToClose) {
        // Determine which users are supposed to attend
        const expectedUserIds: string[] = await resolveExpectedUserIds(session);

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

        // Check Early Warning System (EWS) for < 75% attendance for absent users (Optimized N+1)
        const linked = await prisma.sessionClass.findMany({
          where: { session_id: session.id },
          select: { class_id: true },
        });
        const classIds = session.class_id ? [session.class_id] : linked.map((x) => x.class_id);
        
        if (classIds.length > 0 && absentUserIds.length > 0) {
          const notificationsToCreate: any[] = [];
          
          const totalSessionsMap: Record<string, number> = {};
          for (const classId of classIds) {
             const count = await prisma.session.count({
                where: {
                  status: 'CLOSED',
                  OR: [{ class_id: classId }, { session_classes: { some: { class_id: classId } } }],
                },
             });
             totalSessionsMap[classId] = count;
          }

          const enrollments = await prisma.classEnrollment.findMany({
            where: { class_id: { in: classIds }, student_id: { in: absentUserIds } }
          });

          const userClassAttendances = await prisma.attendance.findMany({
            where: {
              user_id: { in: absentUserIds },
              status: { in: ['PRESENT', 'LATE', 'SICK', 'EXCUSED'] },
              session: {
                status: 'CLOSED',
                OR: [
                  { class_id: { in: classIds } }, 
                  { session_classes: { some: { class_id: { in: classIds } } } }
                ]
              }
            },
            select: { user_id: true, session: { select: { class_id: true, session_classes: { select: { class_id: true } } } } }
          });

          const attendanceCounts: Record<string, Record<string, number>> = {};
          for (const att of userClassAttendances) {
             const attClassIds = att.session.class_id ? [att.session.class_id] : att.session.session_classes.map((x: any) => x.class_id);
             for (const cId of attClassIds) {
                if (classIds.includes(cId)) {
                   if (!attendanceCounts[att.user_id]) attendanceCounts[att.user_id] = {};
                   attendanceCounts[att.user_id][cId] = (attendanceCounts[att.user_id][cId] || 0) + 1;
                }
             }
          }

          for (const enr of enrollments) {
             const total = totalSessionsMap[enr.class_id] || 0;
             if (total > 0) {
               const attended = (attendanceCounts[enr.student_id] && attendanceCounts[enr.student_id][enr.class_id]) || 0;
               const percentage = (attended / total) * 100;
               if (percentage < 75) {
                 notificationsToCreate.push({
                    user_id: enr.student_id,
                    title: 'Peringatan Dini Kehadiran (EWS)',
                    message: `Tingkat kehadiran Anda di salah satu kelas telah turun menjadi ${Math.round(percentage)}% (Di bawah batas minimal 75%). Harap perhatikan kehadiran Anda.`,
                    type: 'WARNING',
                 });
               }
             }
          }

          // Deduplicate notifications so a user doesn't get spammed if multiple classes drop below 75% simultaneously
          const uniqueNotifications = Array.from(new Map(notificationsToCreate.map(item => [item.user_id, item])).values());
          if (uniqueNotifications.length > 0) {
            await prisma.notification.createMany({ data: uniqueNotifications });
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

export const runPhotoCleanupJob = async () => {
  console.log('[Cron] Running daily photo cleanup job...');
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oldAttendances = await prisma.attendance.findMany({
    where: {
      photo_url: { not: null },
      check_in_time: { lt: oneWeekAgo },
    },
    select: { id: true, photo_url: true },
  });

  let deletedCount = 0;
  for (const att of oldAttendances) {
    if (!att.photo_url) continue;

    if (att.photo_url.includes('cloudinary') || att.photo_url.includes('res.cloudinary.com')) {
      try {
        const urlParts = att.photo_url.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const publicId = `attendance/${filenameWithExt.split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('[Cron] Failed to destroy cloudinary image:', err);
      }
    } else {
      const fileName = path.basename(att.photo_url);
      const filePath = path.join(process.cwd(), 'uploads', 'attendance', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.attendance.update({
      where: { id: att.id },
      data: { photo_url: null },
    });

    deletedCount++;
  }

  if (deletedCount > 0) {
    console.log(`[Cron] Berhasil menghapus ${deletedCount} foto bukti yang berumur lebih dari 1 minggu.`);
  }
};

export const runSemesterUpdateJob = async () => {
  console.log('[Cron] Running daily semester update job...');
  const users = await prisma.user.findMany({
    where: { role: 'USER', is_active: true },
    select: { id: true, enrollment_date: true, semester: true },
  });

  let updatedCount = 0;
  const now = new Date();

  for (const user of users) {
    const enrollmentDate = new Date((user as any).enrollment_date);
    const monthsDiff =
      (now.getFullYear() - enrollmentDate.getFullYear()) * 12 +
      (now.getMonth() - enrollmentDate.getMonth());
    const newSemester = Math.max(1, Math.min(14, Math.floor(monthsDiff / 6) + 1));

    if (newSemester !== (user as any).semester) {
      await prisma.user.update({
        where: { id: user.id },
        data: { semester: newSemester },
      });
      updatedCount++;
    }
  }

  console.log(`[Cron] Semester update complete. Updated ${updatedCount} users.`);
};

/** Fire-and-forget session status sync (throttled inside runCronJob). Safe on Vercel. */
export const triggerSessionCronLazy = () => {
  void runCronJob().catch((err) => console.error('[Cron] Lazy session sync error:', err));
};

export const startCronJobs = () => {
  console.log('[Cron] Starting session status updater (Interval: 1 minute)...');

  setInterval(runCronJob, 60000);

  cron.schedule('0 2 * * *', () => {
    runPhotoCleanupJob().catch((err) => console.error('[Cron] Error cleaning up photos:', err));
  });

  cron.schedule('0 1 * * *', () => {
    runSemesterUpdateJob().catch((err) => console.error('[Cron] Error updating semesters:', err));
  });
};
