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

import { app, httpsServer } from "./src/config/server";
import { PORT } from "./src/utils/utils";
import teamRouter from "./src/api/v1/routes/team/team.route";

// Load environment variables
dotenv.config();
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
  "/uploads/users/profiles",
  userMiddleware,
  express.static(path.join(__dirname, "./api/v1/uploads/users/profiles"))
);
app.use("/api/v1/auth", userAuthRouter);
app.use("/api/v1/team", teamRouter);
app.use("/api/v1/token", authRateLimiter, tokenValidRouter);
app.use("/api/v1/user", limiter, userMiddleware, userProfileRouter);

setupTeamSocket(io);

// Start the HTTPS server
httpsServer.listen(PORT as number, () => {
  console.log(`󱐋 [SERVER] - Server is running on https://localhost:${PORT}.`);
  console.log(`󱐋 [SERVER] - Environment: ${process.env.NODE_ENV}.`);
});
