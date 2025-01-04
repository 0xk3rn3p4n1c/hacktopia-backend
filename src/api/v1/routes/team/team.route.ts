import express from "express";
import { limiter } from "../../../../config/rateLimiter";
import { userMiddleware } from "../../../../middleware/userMiddleware";
import createTeamRouter from "./create.route";
import joinTeamRouter from "./join.route";
import acceptTeamRouter from "./accept.route";
import rejectTeamRouter from "./reject.route";
import listsTeamRouter from "./lists.route";
import teamDetailsRouter from "./teamdetails.route";
import myTeamRouter from "./my-team.route";
import checkTeamRouter from "./check-team.route";

const teamRouter = express.Router();

// Apply rate limiter and user middleware to all team routes
teamRouter.use(limiter);
teamRouter.use(userMiddleware);

// Mount individual team routes
teamRouter.use("/create", createTeamRouter);
teamRouter.use("/join", joinTeamRouter);
teamRouter.use("/accept", acceptTeamRouter);
teamRouter.use("/reject", rejectTeamRouter);
teamRouter.use("/list", listsTeamRouter);
teamRouter.use("/my-team", myTeamRouter);
teamRouter.use("/check-team", checkTeamRouter);
teamRouter.use("/details", teamDetailsRouter);

export default teamRouter;
