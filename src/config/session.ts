import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

export const sessionConfig = {
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
};
