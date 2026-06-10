import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

const isMissingSemesterColumn = (err: any) =>
  Boolean(
    err && err.code === 'P2022' && String(err?.meta?.column || '').includes('Class.semester')
  );

function parsePagination(
  query: Request['query'],
  defaults: { page: number; limit: number; max: number }
) {
  const rawPage = Number.parseInt(String(query.page ?? ''), 10);
  const rawLimit = Number.parseInt(String(query.limit ?? ''), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : defaults.page;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, defaults.max) : defaults.limit;
  return { page, limit, skip: (page - 1) * limit };
}

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const { page, limit, skip } = parsePagination(req.query, { page: 1, limit: 50, max: 500 });
    const withSummary = String(req.query.withSummary ?? '1').trim() !== '0';
    const withClassBreakdown = String(req.query.withClassBreakdown ?? '0').trim() === '1';

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sessionId = (req.query.sessionId || req.query.session_id) as string | undefined;
    const classId = (req.query.classId || req.query.class_id) as string | undefined;
    const status = String(req.query.status || '')
      .trim()
      .toUpperCase();
    const search = String(req.query.search || '').trim();
    const userId = (req.query.userId ||
      req.query.user_id ||
      req.query.studentId ||
      req.query.student_id) as string | undefined;

    const andFilters: any[] = [];

    if (user.role === 'USER') {
      andFilters.push({ user_id: user.id });
    } else if (user.role === 'ADMIN') {
      andFilters.push({
        OR: [
          { session: { class: { lecturer_id: user.id } } },
          { session: { session_classes: { some: { class: { lecturer_id: user.id } } } } },
        ],
      });
    }

    if (sessionId) {
      andFilters.push({ session_id: sessionId });
    }

    if (classId) {
      andFilters.push({
        OR: [
          { session: { class_id: classId } },
          { session: { session_classes: { some: { class_id: classId } } } },
        ],
      });
    }

    if (user.role !== 'USER' && userId) {
      andFilters.push({ user_id: userId });
    }
    if (status && status !== 'ALL') {
      andFilters.push(status === 'EXCUSED' ? { status: { in: ['SICK', 'EXCUSED'] } } : { status });
    }
    if (search) {
      andFilters.push({
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { nim_nip: { contains: search, mode: 'insensitive' } } },
          { session: { title: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (startDate || endDate) {
      const range: { gte?: Date; lte?: Date } = {};
      if (startDate) range.gte = new Date(startDate);
      if (endDate) range.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      andFilters.push({
        session: {
          session_start: range,
        },
      });
    }

    const whereClause: any = andFilters.length ? { AND: andFilters } : {};

    let attendances: any[] = [];
    let total = 0;
    let summary: any = undefined;
    if (withSummary) {
      const grouped = await prisma.attendance.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { _all: true },
      });
      total = grouped.reduce((acc, row) => acc + (Number(row._count?._all ?? 0) || 0), 0);
      summary = grouped.reduce(
        (acc, row) => {
          const key = String(row.status ?? '').toUpperCase();
          const value = Number(row._count?._all ?? 0) || 0;
          if (key === 'PRESENT') acc.present += value;
          else if (key === 'LATE') acc.late += value;
          else if (key === 'ABSENT') acc.absent += value;
          else if (key === 'SICK') acc.sick += value;
          else if (key === 'EXCUSED') acc.excused += value;
          else acc.other += value;
          return acc;
        },
        { total, present: 0, late: 0, absent: 0, sick: 0, excused: 0, other: 0 }
      );
    } else {
      total = await prisma.attendance.count({ where: whereClause });
    }
    try {
      attendances = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          session: {
            select: {
              title: true,
              session_start: true,
              class_id: true,
              class: { select: { name: true, semester: true } },
              session_classes: {
                select: { class_id: true, class: { select: { name: true, semester: true } } },
              },
            },
          },
          user: { select: { name: true, nim_nip: true } },
        },
        orderBy: { check_in_time: 'desc' },
        skip,
        take: limit,
      });
    } catch (err: any) {
      if (!isMissingSemesterColumn(err)) throw err;
      attendances = await prisma.attendance.findMany({
        where: whereClause,
        include: {
          session: {
            select: {
              title: true,
              session_start: true,
              class_id: true,
              class: { select: { name: true } },
              session_classes: { select: { class_id: true, class: { select: { name: true } } } },
            },
          },
          user: { select: { name: true, nim_nip: true } },
        },
        orderBy: { check_in_time: 'desc' },
        skip,
        take: limit,
      });
    }

    const formatClassLabel = (cls: any): string => {
      const name = String(cls?.name ?? '').trim();
      const semRaw = cls?.semester;
      const sem = semRaw == null ? null : Number.isFinite(Number(semRaw)) ? Number(semRaw) : null;
      if (name && sem != null) return `Sem ${sem} - ${name}`;
      if (name) return name;
      if (sem != null) return `Sem ${sem}`;
      return '';
    };

    const formattedData = attendances.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      session_id: a.session_id,
      user_name: a.user.name,
      nim_nip: a.user.nim_nip,
      session_title: a.session.title,
      class_name: (a.session as any).session_classes?.length
        ? (a.session as any).session_classes
            .flatMap((x: any) => {
              const result = formatClassLabel(x?.class);
              return result ? [result] : [];
            })
            .join(', ')
        : (a.session.class ? formatClassLabel(a.session.class) : '') || null,
      session_date: a.session.session_start,
      check_in_time: a.check_in_time,
      status: a.status,
      ip: a.check_in_ip,
      device: a.check_in_device,
      photo_url: a.photo_url,
      session_classes:
        (a.session as any).session_classes?.flatMap((x: any) => {
          const result = formatClassLabel(x?.class);
          return result ? [result] : [];
        }) ?? [],
    }));

    const excusePairs = formattedData
      .filter(
        (row) =>
          String(row.status).toUpperCase() === 'SICK' ||
          String(row.status).toUpperCase() === 'EXCUSED'
      )
      .map((row) => ({ user_id: row.user_id, session_id: row.session_id }));
    if (excusePairs.length) {
      const excuses = await prisma.excuseRequest.findMany({
        where: {
          status: 'APPROVED',
          OR: excusePairs.map((p) => ({ user_id: p.user_id, session_id: p.session_id })),
        },
        select: {
          user_id: true,
          session_id: true,
          proof_url: true,
          description: true,
          reason: true,
        },
        orderBy: { created_at: 'desc' },
      });
      const map = new Map<string, (typeof excuses)[number]>();
      for (const ex of excuses) {
        const key = `${ex.user_id}:${ex.session_id}`;
        if (!map.has(key)) map.set(key, ex);
      }
      for (const row of formattedData) {
        const key = `${row.user_id}:${row.session_id}`;
        const ex = map.get(key);
        (row as any).excuse_proof_url = ex?.proof_url ?? null;
        (row as any).excuse_description = ex?.description ?? null;
        (row as any).excuse_reason = ex?.reason ?? null;
      }
    }

    if (withClassBreakdown && sessionId && formattedData.length) {
      const firstSession: any = attendances[0]?.session;
      const classIds = [
        ...(firstSession?.class_id ? [String(firstSession.class_id)] : []),
        ...((firstSession?.session_classes ?? []).flatMap((x: any) =>
          x?.class_id ? [String(x.class_id)] : []
        ) as string[]),
      ].filter(Boolean);
      const userIds = Array.from(
        new Set(formattedData.map((row) => String(row.user_id)).filter(Boolean))
      );

      if (classIds.length && userIds.length) {
        let enrollments: any[] = [];
        try {
          enrollments = await prisma.classEnrollment.findMany({
            where: { class_id: { in: classIds }, student_id: { in: userIds } },
            select: {
              student_id: true,
              class_id: true,
              class: { select: { name: true, semester: true } },
            },
          });
        } catch (err: any) {
          if (!isMissingSemesterColumn(err)) throw err;
          enrollments = await prisma.classEnrollment.findMany({
            where: { class_id: { in: classIds }, student_id: { in: userIds } },
            select: { student_id: true, class_id: true, class: { select: { name: true } } },
          });
        }

        const enrollmentMap = new Map<string, any>();
        for (const e of enrollments) {
          const key = String(e.student_id);
          if (!enrollmentMap.has(key)) enrollmentMap.set(key, e);
        }

        for (const row of formattedData) {
          const e = enrollmentMap.get(String(row.user_id));
          (row as any).student_class_id = e?.class_id ?? null;
          (row as any).student_class_label = e?.class ? formatClassLabel(e.class) : null;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...(withSummary ? { summary } : {}),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
