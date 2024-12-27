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
import http from "http";

// Import middleware and routes
import { userMiddleware } from "./api/v1/middleware/user/middleware";
import userAuthRouter from "./api/v1/routes/user/auth/auth.route";
import userProfileRouter from "./api/v1/routes/user/user/user.credential";
import tokenValidRouter from "./api/v1/routes/user/auth/token.valid.route";
import teamRouter from "./api/v1/routes/team/team.route";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(","), // Allow frontend origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

const PORT: number | string = process.env.PORT || 5000;

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Example: Listen for a custom event
  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);

    // Broadcast the message to all connected clients
    io.emit("newMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
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

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
};

app.use(errorHandler);

// SSL Configuration / DEVELOPMENT ONLY
const options = {
  key: fs.readFileSync("./ssl/private.key"),
  cert: fs.readFileSync("./ssl/certificate.crt"),
};

// Get the first IPv4 address of the "wlan0" network interface: DEVELOPMENT ONLY
const networkInterfaces = os.networkInterfaces();

// DEVELOPMENT ONLY
const wlan0Interfaces = networkInterfaces["wlan0"];

if (wlan0Interfaces) {
  const ipv4Interface = wlan0Interfaces.find((i) => i.family === "IPv4");
  if (ipv4Interface) {
    // Create HTTPS server
    https.createServer(options, app).listen(PORT as number, () => {
      console.log(
        `[SERVER] Secure server is running on https://${ipv4Interface.address}:${PORT}.`
      );
    });
  } else {
    console.error("No IPv4 address found for wlan0 interface.");
  }
} else {
  console.error("wlan0 interface not found.");
}

// Start the HTTP server (for Socket.IO)
server.listen(PORT, () => {
  console.log(`[SERVER] HTTP server is running on http://localhost:${PORT}.`);
});
