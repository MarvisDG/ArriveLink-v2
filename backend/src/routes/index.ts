import { Router, type IRouter } from "express";
import healthRouter from "./health";
import citiesRouter from "./cities";
import companiesRouter from "./companies";
import routesRouter from "./routes";
import reviewsRouter from "./reviews";
import usersRouter from "./users";
import messagesRouter from "./messages";
import operatorRouter from "./operator";
import adminRouter from "./admin";
import bookingsRouter from "./bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(citiesRouter);
router.use(companiesRouter);
router.use(routesRouter);
router.use(reviewsRouter);
router.use(usersRouter);
router.use(messagesRouter);
router.use(operatorRouter);
router.use(adminRouter);
router.use(bookingsRouter);

export default router;
