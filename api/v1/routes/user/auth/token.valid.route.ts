import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserInterface } from "../interfaces/interface.user";

dotenv.config();

const tokenValidRouter = express.Router();
const prisma = new PrismaClient();

tokenValidRouter.post(
  "/validate",
  async (request: Request, response: Response): Promise<any> => {
    const { token } = request.body;

    if (!token) {
      return response.status(400).json({
        success: false,
        message: "Token is required.",
      });
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as UserInterface;

    if (!decodedToken) {
      return response.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        userId: decodedToken.userId,
        email: decodedToken.email,
      },
    });

    if (!user) {
      return response.status(401).json({
        success: false,
        message: "Invalid Request.",
      });
    }

    return response.status(200).json({
      success: true,
    });
  }
);

export default tokenValidRouter;
