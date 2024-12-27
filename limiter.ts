import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50000,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
