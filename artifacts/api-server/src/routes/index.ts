import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import workScheduleRouter from "./workSchedule";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(employeesRouter);
router.use(attendanceRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(workScheduleRouter);
router.use(auditRouter);

export default router;
