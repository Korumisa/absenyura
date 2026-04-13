import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    let classes;

    if (user.role === 'USER') {
      classes = await prisma.class.findMany({
        where: { enrollments: { some: { student_id: user.id } } },
        include: { lecturer: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } },
        orderBy: { created_at: 'desc' },
      });
    } else if (user.role === 'ADMIN') {
      classes = await prisma.class.findMany({
        where: { lecturer_id: user.id },
        include: { lecturer: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } },
        orderBy: { created_at: 'desc' },
      });
    } else {
      classes = await prisma.class.findMany({
        include: { lecturer: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } },
        orderBy: { created_at: 'desc' },
      });
    }

    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, course_code, description, lecturer_id } = req.body;
    
    const newClass = await prisma.class.create({
      data: {
        name,
        course_code,
        description,
        lecturer_id,
      },
      include: { lecturer: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } }
    });

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, course_code, description, lecturer_id } = req.body;

    const updatedClass = await prisma.class.update({
      where: { id },
      data: { name, course_code, description, lecturer_id },
      include: { lecturer: { select: { name: true } }, _count: { select: { enrollments: true, sessions: true } } }
    });

    res.status(200).json({ success: true, data: updatedClass });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.class.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Class deleted' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const enrollments = await prisma.classEnrollment.findMany({
      where: { class_id: id },
      include: { student: { select: { id: true, name: true, email: true, nim_nip: true } } }
    });
    const students = enrollments.map(e => e.student);
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const enrollStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { student_ids } = req.body; // Array of student IDs

    if (!Array.isArray(student_ids)) {
      res.status(400).json({ success: false, error: 'student_ids must be an array' });
      return;
    }

    // Insert only if not already enrolled
    const data = student_ids.map(sid => ({
      class_id: id,
      student_id: sid
    }));

    await prisma.classEnrollment.createMany({
      data,
      // SQLite doesn't support skipDuplicates directly without some caveats, wait, Prisma might emulate it
    });

    res.status(200).json({ success: true, message: 'Students enrolled' });
  } catch (error) {
    // If skipDuplicates fails, we can loop and try-catch
    try {
      const { id } = req.params;
      const { student_ids } = req.body;
      for (const sid of student_ids) {
        const exists = await prisma.classEnrollment.findUnique({
          where: { class_id_student_id: { class_id: id, student_id: sid } }
        });
        if (!exists) {
          await prisma.classEnrollment.create({
            data: { class_id: id, student_id: sid }
          });
        }
      }
      res.status(200).json({ success: true, message: 'Students enrolled' });
    } catch (innerError) {
      console.error('Error enrolling students:', innerError);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};

export const removeStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, student_id } = req.params;
    await prisma.classEnrollment.delete({
      where: { class_id_student_id: { class_id: id, student_id } }
    });
    res.status(200).json({ success: true, message: 'Student removed' });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};