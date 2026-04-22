import bcrypt from "bcryptjs";
import { db, companiesTable, usersTable, employeesTable, attendanceLogsTable, workScheduleTable } from "@workspace/db";
import { pool } from "@workspace/db";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data in order
  await db.delete(attendanceLogsTable);
  await db.delete(workScheduleTable);
  await db.delete(employeesTable);
  await db.delete(usersTable);
  await db.delete(companiesTable);

  // 1. Create demo company
  const [company] = await db
    .insert(companiesTable)
    .values({ name: "Empresa Demo S.A.", email: "contacto@empresa-demo.com" })
    .returning();

  console.log(`✅ Company created: ${company.name}`);

  // 2. Create super_admin (no company)
  const [superAdmin] = await db
    .insert(usersTable)
    .values({
      email: "super@timetrack.com",
      passwordHash: await bcrypt.hash("super123", 10),
      name: "Super Administrador",
      role: "super_admin",
      companyId: null,
    })
    .returning();
  console.log(`✅ Super admin: ${superAdmin.email}`);

  // 3. Create admin for demo company
  const [admin] = await db
    .insert(usersTable)
    .values({
      email: "admin@empresa-demo.com",
      passwordHash: await bcrypt.hash("admin123", 10),
      name: "Administrador Demo",
      role: "admin",
      companyId: company.id,
    })
    .returning();
  console.log(`✅ Admin: ${admin.email}`);

  // 4. Create employees for demo company
  const employeesData = [
    { documentNumber: "12345678", name: "Carlos Pérez", position: "Desarrollador Senior", department: "Tecnología", email: "c.perez@empresa-demo.com" },
    { documentNumber: "23456789", name: "María García", position: "Analista de RRHH", department: "Recursos Humanos", email: "m.garcia@empresa-demo.com" },
    { documentNumber: "34567890", name: "Juan López", position: "Asesor Comercial", department: "Ventas", email: "j.lopez@empresa-demo.com" },
    { documentNumber: "45678901", name: "Ana Martínez", position: "Contadora", department: "Finanzas", email: "a.martinez@empresa-demo.com" },
    { documentNumber: "56789012", name: "Pedro Ramírez", position: "Técnico de IT", department: "Tecnología", email: "p.ramirez@empresa-demo.com" },
    { documentNumber: "67890123", name: "Laura Torres", position: "Coordinadora de Operaciones", department: "Operaciones", email: "l.torres@empresa-demo.com" },
    { documentNumber: "78901234", name: "Diego Sánchez", position: "Gerente de Proyectos", department: "Dirección", email: "d.sanchez@empresa-demo.com" },
  ];

  const employees = [];
  for (const emp of employeesData) {
    const [e] = await db.insert(employeesTable).values({ ...emp, companyId: company.id }).returning();
    employees.push(e);
  }
  console.log(`✅ ${employees.length} employees created`);

  // 5. Create work schedule for company
  await db.insert(workScheduleTable).values({
    companyId: company.id,
    startTime: "08:00",
    endTime: "17:00",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    lateToleranceMinutes: 15,
  });
  console.log(`✅ Work schedule created`);

  // 6. Create attendance logs for the last 7 days
  const now = new Date();
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const dayOfWeek = day.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const presentEmployees = employees.filter((_, i) => (i + dayOffset) % 7 !== 0);

    for (const emp of presentEmployees) {
      const checkInHour = 7 + Math.floor(Math.random() * 2);
      const checkInMin = Math.floor(Math.random() * 59);
      const checkInTime = new Date(day);
      checkInTime.setHours(checkInHour, checkInMin, 0, 0);

      await db.insert(attendanceLogsTable).values({
        companyId: company.id,
        employeeId: emp.id,
        type: "check_in",
        timestamp: checkInTime,
      });

      const isToday = dayOffset === 0;
      const hasCheckOut = !isToday || Math.random() > 0.5;

      if (hasCheckOut) {
        const checkOutHour = 16 + Math.floor(Math.random() * 3);
        const checkOutMin = Math.floor(Math.random() * 59);
        const checkOutTime = new Date(day);
        checkOutTime.setHours(checkOutHour, checkOutMin, 0, 0);

        await db.insert(attendanceLogsTable).values({
          companyId: company.id,
          employeeId: emp.id,
          type: "check_out",
          timestamp: checkOutTime,
        });
      }
    }
  }
  console.log(`✅ Attendance logs created`);

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("SUPER ADMIN: super@timetrack.com / super123");
  console.log("ADMIN: admin@empresa-demo.com / admin123");
  console.log("─────────────────────────────────────");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
