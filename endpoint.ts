import os from "os";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import https from "https";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import express, { Request, Response } from "express";
import { ErrorRequestHandler } from "express";
import passport from "passport";
import session from "express-session";
import { Server } from "socket.io";

// Import middleware and routes
import { userMiddleware } from "./api/v1/middleware/user/middleware";
import userAuthRouter from "./api/v1/routes/user/auth/auth.route";
import userProfileRouter from "./api/v1/routes/user/user/user.credential";
import tokenValidRouter from "./api/v1/routes/user/auth/token.valid.route";
import teamRouter from "./api/v1/routes/team/team.route";
import { authRateLimiter, limiter } from "./limiter";

// Load environment variables
dotenv.config();
// Initialize Express app
const app = express();
const PORT: number | string = process.env.PORT || 5000;

// Create HTTPS server
const httpsServer = https.createServer(
  {
    key: fs.readFileSync("./ssl/private.key"),
    cert: fs.readFileSync("./ssl/certificate.crt"),
  },
  app
);

// Initialize Socket.IO with the HTTPS server
const io = new Server(httpsServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(","), // Allow frontend origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.use(passport.initialize());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: "deny" },
    noSniff: true,
    ieNoOpen: true,
    xssFilter: true,
  })
);

// Create a writable stream for logging
const logStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"),
  {
    flags: "a",
    encoding: "utf8",
    mode: 0o666,
  }
);

// Logger
app.use(morgan("combined", { stream: logStream }));
// Prevent parameter pollution
app.use(hpp());
// Sanitize data
app.use(mongoSanitize());
// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(","),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(limiter);
// Health check endpoint
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
app.use("/api/v1/team", limiter, userMiddleware, teamRouter);

// Socket Listeners

io.on("connection", (socket) => {
  socket.on("allTeams", () => {
    io.emit("allTeams");
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
};

app.use(errorHandler);
// Start the HTTPS server
httpsServer.listen(PORT as number, () => {
  console.log(
    `[SERVER] Secure server is running on https://localhost:${PORT}.`
  );
});
