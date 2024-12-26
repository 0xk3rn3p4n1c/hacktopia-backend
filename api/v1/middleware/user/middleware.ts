import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AdminRequest extends Request {
  user?: any;
}

interface UserJwtPayload {
  id: string;
  role: string;
  email: string;
  matchcryptic: string;
}

const userMiddlewareCsrf = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): any => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Missing Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token not provided" });
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as UserJwtPayload;

    if (!decodedToken) {
      return res
        .status(403)
        .json({ message: "CSRF token verification failed" });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export const userMiddleware = [userMiddlewareCsrf];
