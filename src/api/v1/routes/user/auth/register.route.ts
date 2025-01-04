import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  ALL_FIELDS_REQUIRED,
  EMAIL_ALREADY_EXISTS,
  INTERNAL_SERVER_ERROR,
  USER_CREATED,
  USER_NOT_CREATED,
  USERNAME_ALREADY_EXISTS,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";
import { UserInterface } from "../interfaces/interface.user";

export const registerRouter = Router();

// Register
registerRouter.post(
  "/register",
  async (request: Request, response: Response): Promise<any> => {
    const { userName, email, password } = request.body;

    // Validate request body
    if (!userName || !email || !password) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please enter all fields",
      });
    }

    try {
      // Verify if email exists on db.
      const credentialExists = await prisma.users.findUnique({
        where: {
          email: email,
        },
      });

      if (credentialExists) {
        return response.status(400).json({
          success: false,
          code: EMAIL_ALREADY_EXISTS,
          message: "Email already exists",
        });
      }

      const userNameAlreadyExists = await prisma.profiles.findUnique({
        where: {
          userName: userName,
        },
      });

      if (userNameAlreadyExists) {
        return response.status(400).json({
          success: false,
          code: USERNAME_ALREADY_EXISTS,
          message: "Username already exists",
        });
      }

      // Hash password.
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user: UserInterface = await prisma.users.create({
        data: {
          email: email,
          password: hashedPassword,
        },
      });

      const profile = await prisma.profiles.create({
        data: {
          userId: user.userId,
          userName: userName,
        },
      });

      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          userName: profile.userName,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30d" }
      );

      // Token generated
      if (token) {
        return response.status(200).json({
          success: true,
          code: USER_CREATED,
          message: "User created successfully",
          token: token,
        });
      } else {
        return response.status(400).json({
          success: false,
          code: USER_NOT_CREATED,
          message: "Error. User not created!",
        });
      }
    } catch (error) {
      console.error(error);
      return response.status(500).json({
        success: false,
        code: INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      });
    }
  }
);

export default registerRouter;
