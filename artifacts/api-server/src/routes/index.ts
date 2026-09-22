import { Router, type IRouter } from "express";
import healthRouter from "./health";
import memeAgentRouter from "./meme-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(memeAgentRouter);

export default router;
