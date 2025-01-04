import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  ALL_FIELDS_REQUIRED,
  INCORRECT_PASSWORD,
  INTERNAL_SERVER_ERROR,
  LOGGED_IN_SUCCESSFULLY,
  USER_NOT_FOUND,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";

export const loginRouter = Router();

loginRouter.post(
  "/login",
  async (request: Request, response: Response): Promise<any> => {
    const { email_or_username, password } = request.body;

    // Validate request body
    if (!email_or_username || !password) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please provide both email/username and password.",
      });
    }

    try {
      let user = null;

      // Check if the input is an email
      if (email_or_username.includes("@")) {
        // Find the user by email in the users table
        console.log(email_or_username);
        user = await prisma.users.findUnique({
          where: { email: email_or_username },
        });
      } else {
        // Find the profile by username in the profiles table
        console.log(email_or_username);

        const profile = await prisma.profiles.findUnique({
          where: { userName: email_or_username },
        });

        if (profile) {
          // Find the user by user_id in the users table
          user = await prisma.users.findUnique({
            where: { userId: profile.userId },
          });
        }
      }

      // If user doesn't exist, return error
      if (!user) {
        return response.status(400).json({
          success: false,
          code: USER_NOT_FOUND,
          message: `User with email/username ${email_or_username} not found.`,
        });
      }

      // Compare the provided password with the hashed password in the users table
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return response.status(400).json({
          success: false,
          code: INCORRECT_PASSWORD,
          message: "Incorrect password.",
        });
      }

      const profile = await prisma.profiles.findUnique({
        where: { userId: user.userId },
      });

      // Generate a JWT token
      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          userName: profile?.userName,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30d" }
      );

      // Return success response with the token
      return response.status(200).json({
        success: true,
        code: LOGGED_IN_SUCCESSFULLY,
        message: "User logged in successfully.",
        token: token,
      });
    } catch (error) {
      console.error("Login error:", error);
      return response.status(500).json({
        success: false,
        code: INTERNAL_SERVER_ERROR,
        message: "Internal server error.",
      });
    }
  }
);

export default loginRouter;
