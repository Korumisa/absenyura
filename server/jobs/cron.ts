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
    const resolveExpectedUserIdsBATCH = async (
      sessions: any[]
    ): Promise<Map<string, { expectedUserIds: string[]; linkedClassIds: string[] }>> => {
      const result = new Map<string, { expectedUserIds: string[]; linkedClassIds: string[] }>();
      if (sessions.length === 0) return result;

      const sessionIds = sessions.map((s) => s.id);

      // 1 BATCH pivot query (all sessions) — replaces N per-session sessionClass queries
      const pivotRows = await prisma.sessionClass.findMany({
        where: { session_id: { in: sessionIds } },
        select: { session_id: true, class_id: true },
      });

      const pivotBySession = new Map<string, string[]>();
      for (const row of pivotRows) {
        if (!row.class_id) continue;
        const cid = String(row.class_id);
        const arr = pivotBySession.get(row.session_id);
        if (arr) arr.push(cid);
        else pivotBySession.set(row.session_id, [cid]);
      }

      // Per-session linkedClassIds (legacy + pivot) + collect all classes for BATCH enrollment
      const sessionsWithNoClasses: any[] = [];
      const allClassIdsSet = new Set<string>();

      for (const session of sessions) {
        const fromLegacy: string[] = session.class_id ? [String(session.class_id)] : [];
        const fromPivot: string[] = pivotBySession.get(session.id) ?? [];
        const mergedClassIds = Array.from(new Set([...fromLegacy, ...fromPivot]));

        result.set(session.id, { expectedUserIds: [], linkedClassIds: mergedClassIds });

        if (mergedClassIds.length === 0) {
          sessionsWithNoClasses.push(session);
        } else {
          mergedClassIds.forEach((cid) => allClassIdsSet.add(cid));
        }
      }

      // 1 BATCH enrollment query (all classes across all sessions) — replaces N per-session queries
      if (allClassIdsSet.size > 0) {
        const allClassIds = Array.from(allClassIdsSet);
        const enrollmentRows = await prisma.classEnrollment.findMany({
          where: { class_id: { in: allClassIds } },
          select: { class_id: true, student_id: true },
        });

        const enrollmentByClass = new Map<string, Set<string>>();
        for (const row of enrollmentRows) {
          if (!row.class_id || !row.student_id) continue;
          const cid = String(row.class_id);
          const sid = String(row.student_id);
          let set = enrollmentByClass.get(cid);
          if (!set) {
            set = new Set();
            enrollmentByClass.set(cid, set);
          }
          set.add(sid);
        }

        for (const session of sessions) {
          const entry = result.get(session.id)!;
          if (entry.linkedClassIds.length === 0) continue;
          const combined = new Set<string>();
          for (const cid of entry.linkedClassIds) {
            const set = enrollmentByClass.get(cid);
            if (set) set.forEach((sid) => combined.add(sid));
          }
          entry.expectedUserIds = Array.from(combined);
        }
      }

      // Shared fallback for sessions with no linked classes (1 query shared across all such sessions)
      if (sessionsWithNoClasses.length > 0) {
        console.warn(
          `[Cron] resolveExpectedUserIdsBATCH: ${sessionsWithNoClasses.length} sessions have no linked classes. Falling back to ALL active USER role users. Session ids: ${sessionsWithNoClasses
            .map((s) => s.id)
            .join(', ')}`
        );
        const activeUsers = await prisma.user.findMany({
          where: { role: 'USER', is_active: true },
          select: { id: true },
        });
        const fallbackIds = activeUsers.map((u) => u.id);
        for (const session of sessionsWithNoClasses) {
          const entry = result.get(session.id)!;
          entry.expectedUserIds = fallbackIds;
        }
      }

      return result;
    };

    const now = new Date();

    // Pembukaan sesi mengikuti jendela check-in, sedangkan penutupan final
    // mengikuti `session_end` agar check-out tetap dapat dilakukan sampai kelas selesai.
    // UPCOMING -> ACTIVE (when check_in_open_at is reached and before check_in_close_at + 2 min grace period)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000);
    const twoMinutesFuture = new Date(now.getTime() + 2 * 60000);
    // Cooldown 1 menit: sesi yang baru dibuat / di-update tidak langsung kena cron,
    // memberi admin buffer untuk edit ulang jika salah set jam.
    const oneMinuteAgo = new Date(now.getTime() - 60_000);

    const sessionsToActivate = await prisma.session.findMany({
      where: {
        status: 'UPCOMING',
        updated_at: { lte: oneMinuteAgo },
        // Active when now >= check_in_open_at - 2 min
        check_in_open_at: { lte: twoMinutesFuture },
        // Must not have reached check_in_close_at + 2 min yet
        check_in_close_at: { gt: twoMinutesAgo },
      },
    });

    if (sessionsToActivate.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: sessionsToActivate.map((s) => s.id) } },
        data: { status: 'ACTIVE' },
      });

      const activateMap = await resolveExpectedUserIdsBATCH(sessionsToActivate);

      // Notify creator that session is active
      for (const session of sessionsToActivate) {
        // Create notification for creator
        await prisma.notification.create({
          data: {
            user_id: session.created_by_id,
            title: 'Sesi absensi dibuka',
            message: `Sesi "${session.title}" sudah aktif. Mahasiswa dapat melakukan check-in sekarang.`,
            type: 'SUCCESS',
          },
        });

        // Notify students
        const expectedUserIds: string[] = activateMap.get(session.id)!.expectedUserIds;

        if (expectedUserIds.length > 0) {
          await prisma.notification.createMany({
            data: expectedUserIds.map((id) => ({
              user_id: id,
              title: 'Waktunya absen',
              message: `Sesi "${session.title}" sudah dibuka. Buka aplikasi dan lakukan check-in sebelum batas waktu.`,
              type: 'INFO',
            })),
          });
        }
      }
      console.log(`[Cron] Marked ${sessionsToActivate.length} sessions as ACTIVE`);
    }

    // ACTIVE/UPCOMING -> CLOSED (when the session has actually ended, plus a short grace period)
    const activatedSessionIds = sessionsToActivate.map((s) => s.id);
    const sessionsToClose = await prisma.session.findMany({
      where: {
        id: { notIn: activatedSessionIds },
        status: { in: ['ACTIVE', 'UPCOMING'] },
        updated_at: { lte: oneMinuteAgo },
        // Keep sessions ACTIVE until shortly after `session_end` so required
        // check-out remains possible for students who already checked in.
        session_end: { lte: twoMinutesAgo },
      },
    });

    if (sessionsToActivate.length > 0 || sessionsToClose.length > 0) {
      console.log(
        `[Cron] now=${now.toISOString()} activated=${sessionsToActivate.length} closed=${sessionsToClose.length}`
      );
    }

    if (sessionsToClose.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: sessionsToClose.map((s) => s.id) } },
        data: { status: 'CLOSED' },
      });

      const closeMap = await resolveExpectedUserIdsBATCH(sessionsToClose);

      const pendingExcuseBySession = new Map<string, Set<string>>();
      {
        const sessionIds = sessionsToClose.map((s) => s.id);
        const excusedRows = await prisma.excuseRequest.findMany({
          where: {
            session_id: { in: sessionIds },
            status: { in: ['PENDING', 'APPROVED', 'SICK', 'EXCUSED'] },
          },
          select: { session_id: true, user_id: true },
        });
        for (const row of excusedRows) {
          let set = pendingExcuseBySession.get(row.session_id);
          if (!set) {
            set = new Set();
            pendingExcuseBySession.set(row.session_id, set);
          }
          set.add(row.user_id);
        }
      }

      // Auto-Absent Job
      for (const session of sessionsToClose) {
        // Determine which users are supposed to attend (from BATCH resolve map)
        const sessionBatchEntry = closeMap.get(session.id)!;
        const expectedUserIds: string[] = sessionBatchEntry.expectedUserIds;

        // Get all present users for this session
        const presentAttendances = await prisma.attendance.findMany({
          where: { session_id: session.id },
          select: { user_id: true },
        });
        const presentUserIds = presentAttendances.map((a) => a.user_id);

        const excludedExcuseUserIds = pendingExcuseBySession.get(session.id) ?? new Set<string>();

        // Find users who didn't check in — exclude those with pending/approved excuses
        const absentUserIds = expectedUserIds.filter(
          (id) => !presentUserIds.includes(id) && !excludedExcuseUserIds.has(id)
        );

        // Create ABSENT records
        if (absentUserIds.length > 0) {
          await prisma.attendance.createMany({
            data: absentUserIds.map((id) => ({
              session_id: session.id,
              user_id: id,
              status: 'ABSENT',
              check_in_time: new Date(),
              check_in_ip: 'SYSTEM',
              check_in_device: 'AUTO_JOB',
            })),
          });
        }

        // Notify creator that session is closed
        await prisma.notification.create({
          data: {
            user_id: session.created_by_id,
            title: 'Sesi absensi ditutup',
            message: `Sesi "${session.title}" telah ditutup. ${absentUserIds.length} mahasiswa ditandai tidak hadir (Alfa).`,
            type: 'INFO',
          },
        });

        // Notify absent students
        if (absentUserIds.length > 0) {
          await prisma.notification.createMany({
            data: absentUserIds.map((id) => ({
              user_id: id,
              title: 'Tidak hadir (Alfa)',
              message: `Anda ditandai tidak hadir pada sesi "${session.title}" karena sesi telah berakhir tanpa check-in.`,
              type: 'WARNING',
            })),
          });
        }

        // Check Early Warning System (EWS) for < 75% attendance for absent users
        // Reuse BATCH-resolved linkedClassIds — saves N additional sessionClass queries per close loop
        const classIds = sessionBatchEntry.linkedClassIds;

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
            where: { class_id: { in: classIds }, student_id: { in: absentUserIds } },
          });

          const userClassAttendances = await prisma.attendance.findMany({
            where: {
              user_id: { in: absentUserIds },
              status: { in: ['PRESENT', 'LATE', 'SICK', 'EXCUSED'] },
              session: {
                status: 'CLOSED',
                OR: [
                  { class_id: { in: classIds } },
                  { session_classes: { some: { class_id: { in: classIds } } } },
                ],
              },
            },
            select: {
              user_id: true,
              session: {
                select: { class_id: true, session_classes: { select: { class_id: true } } },
              },
            },
          });

          const attendanceCounts: Record<string, Record<string, number>> = {};
          for (const att of userClassAttendances) {
            // Normalize to strings — matches BATCH-resolved string classIds in closeMap
            const attClassIds: string[] = Array.from(
              new Set<string>([
                ...(att.session.class_id ? [String(att.session.class_id)] : []),
                ...(att.session.session_classes ?? []).flatMap<string>((x: any) =>
                  x?.class_id ? [String(x.class_id)] : []
                ),
              ])
            );
            for (const cId of attClassIds) {
              if (classIds.includes(cId)) {
                if (!attendanceCounts[att.user_id]) attendanceCounts[att.user_id] = {};
                attendanceCounts[att.user_id][cId] = (attendanceCounts[att.user_id][cId] || 0) + 1;
              }
            }
          }

          for (const enr of enrollments) {
            const enrClassId = String(enr.class_id);
            const total = totalSessionsMap[enrClassId] || 0;
            if (total > 0) {
              const attended =
                (attendanceCounts[enr.student_id] &&
                  attendanceCounts[enr.student_id][enrClassId]) ||
                0;
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
          const uniqueNotifications = Array.from(
            new Map(notificationsToCreate.map((item) => [item.user_id, item])).values()
          );
          if (uniqueNotifications.length > 0) {
            await prisma.notification.createMany({ data: uniqueNotifications });
          }
        }
      }
      console.log(
        `[Cron] Marked ${sessionsToClose.length} sessions as CLOSED and processed absences.`
      );
    }
  } catch (error) {
    console.error('[Cron] Error updating session statuses:', error);
  } finally {
    isRunning = false;
  }
};

export const runNonceCleanupJob = async () => {
  const now = new Date();
  const nonceRetentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cleaned = await prisma.challengeNonce.deleteMany({
    where: { expires_at: { lt: nonceRetentionCutoff } },
  });
  if (cleaned.count > 0) {
    console.log(`[Cron] Cleaned ${cleaned.count} expired nonces`);
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
  const idsCleared: string[] = [];
  for (const att of oldAttendances) {
    if (!att.photo_url) continue;
    let deleteSuccess = false;
    const photoUrl = att.photo_url;

    if (photoUrl.includes('cloudinary') || photoUrl.includes('res.cloudinary.com')) {
      try {
        const urlParts = photoUrl.split('/');
        let startIndex = 0;
        for (let i = 0; i < urlParts.length; i++) {
          if (/^v\d+$/.test(urlParts[i])) {
            startIndex = i + 1;
            break;
          }
        }
        const publicIdWithExt = urlParts.slice(startIndex).join('/');
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

        await cloudinary.uploader.destroy(publicId);
        deleteSuccess = true;
      } catch (err) {
        console.error(
          `[Cron] PHOTO_CLEANUP_FAILED attendanceId=${att.id} publicId=${att.photo_url}`,
          err
        );
        deleteSuccess = false;
      }
    } else {
      const fileName = path.basename(photoUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'attendance', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleteSuccess = true;
      } else {
        deleteSuccess = true;
      }
    }

    if (deleteSuccess) {
      idsCleared.push(att.id);
      deletedCount++;
    }
  }

  if (idsCleared.length > 0) {
    await prisma.attendance.updateMany({
      where: { id: { in: idsCleared } },
      data: { photo_url: null },
    });
  }

  if (deletedCount > 0) {
    console.log(
      `[Cron] Berhasil menghapus ${deletedCount} foto bukti yang berumur lebih dari 1 minggu.`
    );
  }
};

export const runSemesterUpdateJob = async () => {
  console.log('[Cron] Running daily semester update job...');
  const users = await prisma.user.findMany({
    where: { role: 'USER', is_active: true },
    select: { id: true, enrollment_date: true, semester: true },
  });

  const semesterOnlyIds: string[] = [];
  const deactivateIds: string[] = [];
  const semesterUpdates: Record<string, number> = {};
  let updatedCount = 0;
  const now = new Date();

  for (const user of users) {
    const enrollmentDate = new Date((user as any).enrollment_date);
    const monthsDiff =
      (now.getFullYear() - enrollmentDate.getFullYear()) * 12 +
      (now.getMonth() - enrollmentDate.getMonth());
    const newSemester = Math.max(1, Math.min(14, Math.floor(monthsDiff / 6) + 1));
    const currentSem = Number((user as any).semester ?? 0);

    if (newSemester !== currentSem || newSemester >= 10) {
      if (newSemester >= 10) {
        deactivateIds.push(user.id);
      } else {
        semesterOnlyIds.push(user.id);
      }
      semesterUpdates[user.id] = newSemester;
      updatedCount++;
    }
  }

  if (semesterOnlyIds.length > 0) {
    const semestersToApply = new Map<number, string[]>();
    for (const id of semesterOnlyIds) {
      const s = semesterUpdates[id];
      const arr = semestersToApply.get(s);
      if (arr) arr.push(id);
      else semestersToApply.set(s, [id]);
    }
    for (const [sem, ids] of semestersToApply.entries()) {
      await prisma.user.updateMany({ where: { id: { in: ids } }, data: { semester: sem } });
    }
  }

  if (deactivateIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      const semestersByUser = new Map<number, string[]>();
      for (const id of deactivateIds) {
        const s = semesterUpdates[id];
        const arr = semestersByUser.get(s);
        if (arr) arr.push(id);
        else semestersByUser.set(s, [id]);
      }
      for (const [sem, ids] of semestersByUser.entries()) {
        await tx.user.updateMany({
          where: { id: { in: ids } },
          data: { semester: sem, is_active: false, refresh_token_hash: null },
        });
      }
    });
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

  cron.schedule('0 0 * * *', () => {
    runNonceCleanupJob().catch((err) => console.error('[Cron] Error cleaning nonces:', err));
  });

  cron.schedule('0 2 * * *', () => {
    runPhotoCleanupJob().catch((err) => console.error('[Cron] Error cleaning up photos:', err));
  });

  cron.schedule('0 1 * * *', () => {
    runSemesterUpdateJob().catch((err) => console.error('[Cron] Error updating semesters:', err));
  });
};
