"use server";

import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";

import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import express, { Request, Response } from "express";
import passport from "passport";
import session from "express-session";
import { Server } from "socket.io";

// Import middleware and routes
import { authRateLimiter, limiter } from "./limiter";
import { sessionConfig } from "./src/config/session";
import { helmetOptions } from "./src/config/helmet";
import { corsOptions } from "./src/config/cors";
import { logger } from "./src/config/logger";
import { errorHandler } from "./src/middleware/errorHandler";
import { setupTeamSocket } from "./src/sockets/team.socket";
import { userMiddleware } from "./src/middleware/userMiddleware";
import userAuthRouter from "./src/api/v1/routes/user/auth/auth.route";
import tokenValidRouter from "./src/api/v1/routes/user/auth/token.valid.route";
import userProfileRouter from "./src/api/v1/routes/user/user/user.credential";

// Import team routes
import createTeamRouter from "./src/api/v1/routes/team/create.route";
import joinTeamRouter from "./src/api/v1/routes/team/join.route";
import listsTeamRouter from "./src/api/v1/routes/team/lists.route";
import myTeamRouter from "./src/api/v1/routes/team/my-team.route";
import rejectTeamRouter from "./src/api/v1/routes/team/reject.route";
import checkTeamRouter from "./src/api/v1/routes/team/check-team.route";
import acceptTeamRouter from "./src/api/v1/routes/team/accept.route";
import teamDetailsRouter from "./src/api/v1/routes/team/teamdetails.route";
import { app, httpsServer } from "./src/config/server";

// Load environment variables
dotenv.config();
// Initialize Express app

const PORT: number | string = process.env.PORT || 5000;

// Initialize Socket.IO with the HTTPS server
export const io = new Server(httpsServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(","), // Allow frontend origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.use(passport.initialize());
app.use(session(sessionConfig));
app.use(helmet(helmetOptions));
app.use(logger);
app.use(hpp());
app.use(mongoSanitize());
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(limiter);
app.use(errorHandler);

/**
 * Server Endpoints
 */

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK" });
});
app.use(
  "/uploads",
  userMiddleware,
  express.static(path.join(__dirname, "./api/v1/uploads"))
);
app.use("/api/v1/auth", authRateLimiter, userAuthRouter);
app.use("/api/v1/token", authRateLimiter, tokenValidRouter);
app.use("/api/v1/user", limiter, userMiddleware, userProfileRouter);

app.use("/api/v1/team/create", limiter, userMiddleware, createTeamRouter);
app.use("/api/v1/team/join", limiter, userMiddleware, joinTeamRouter);
app.use("/api/v1/team/accept", limiter, userMiddleware, acceptTeamRouter);
app.use("/api/v1/team/reject", limiter, userMiddleware, rejectTeamRouter);
app.use("/api/v1/team/list", limiter, userMiddleware, listsTeamRouter);
app.use("/api/v1/team/my-team", limiter, userMiddleware, myTeamRouter);
app.use("/api/v1/team/check-team", limiter, userMiddleware, checkTeamRouter);
app.use("/api/v1/team/details", limiter, userMiddleware, teamDetailsRouter);

setupTeamSocket(io);

// Start the HTTPS server
httpsServer.listen(PORT as number, () => {
  console.log(`󱐋 [SERVER] - Server is running on https://localhost:${PORT}.`);
  console.log(`󱐋 [SERVER] - Environment: ${process.env.NODE_ENV}.`);
});
