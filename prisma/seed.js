import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser({ email, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      password: passwordHash,
      is_active: true,
    },
    create: {
      email,
      name,
      role,
      password: passwordHash,
      is_active: true,
    },
  });
}

async function main() {
  const password = "demo12345";

  const superAdmin = await upsertUser({
    email: "superadmin@demo.com",
    name: "Super Admin",
    role: "SUPER_ADMIN",
    password,
  });

  const admin = await upsertUser({
    email: "admin@demo.com",
    name: "Admin",
    role: "ADMIN",
    password,
  });

  const lecturer = await upsertUser({
    email: "lecturer@demo.com",
    name: "Lecturer",
    role: "USER",
    password,
  });

  const student = await upsertUser({
    email: "student@demo.com",
    name: "Student",
    role: "USER",
    password,
  });

  let location = await prisma.location.findFirst({ where: { name: "Demo Location" } });
  if (!location) {
    location = await prisma.location.create({
      data: {
        name: "Demo Location",
        address: "Demo Address",
        latitude: -8.112,
        longitude: 115.089,
        radius: 200,
        created_by: superAdmin.id,
      },
    });
  }

  let demoClass = await prisma.class.findFirst({
    where: { name: "Demo Class", lecturer_id: lecturer.id },
  });
  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        name: "Demo Class",
        course_code: "DEMO-101",
        description: "Demo class for testing",
        lecturer_id: lecturer.id,
      },
    });
  }

  await prisma.classEnrollment.upsert({
    where: {
      class_id_student_id: {
        class_id: demoClass.id,
        student_id: student.id,
      },
    },
    update: {},
    create: {
      class_id: demoClass.id,
      student_id: student.id,
    },
  });

  const now = new Date();
  const in5 = new Date(now.getTime() + 5 * 60 * 1000);
  const in65 = new Date(now.getTime() + 65 * 60 * 1000);

  const existingSession = await prisma.session.findFirst({
    where: { title: "Demo Session", class_id: demoClass.id },
  });

  if (!existingSession) {
    await prisma.session.create({
      data: {
        title: "Demo Session",
        description: "Demo session for testing",
        class_id: demoClass.id,
        location_id: location.id,
        created_by_id: lecturer.id,
        qr_mode: "NONE",
        session_start: in5,
        session_end: in65,
        check_in_open_at: in5,
        check_in_close_at: in65,
      },
    });
  }

  console.log("Seed completed. Demo password:", password);
  console.log("Accounts:", [
    "superadmin@demo.com (SUPER_ADMIN)",
    "admin@demo.com (ADMIN)",
    "lecturer@demo.com (USER)",
    "student@demo.com (USER)",
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });