import express, { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { userMiddleware } from "../../../middleware/user/middleware";
import { UserInterface } from "../interfaces/interface.user";
import { upload } from "../../../../utilts/utils";
import path from "path";
import fs from "fs";

dotenv.config();

const userProfileRouter = express.Router();
const prisma = new PrismaClient();

// Change password
userProfileRouter.post(
  "/change-password",
  async (request: Request, response: Response): Promise<any> => {
    const { currentPassword, newPassword } = request.body;

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return response
        .status(401)
        .json({ message: "Missing Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return response
        .status(401)
        .json({ message: "Missing Authorization header" });
    }

    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as UserInterface;

      if (!decodedToken) {
        return response
          .status(403)
          .json({ message: "CSRF token verification failed" });
      }

      const user = await prisma.users.findUnique({
        where: {
          userId: decodedToken.userId,
        },
      });

      if (!user) {
        return response.status(400).json({
          success: false,
          message: "User not found",
        });
      }

      const isPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordMatch) {
        return response.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updateduser = await prisma.users.update({
        where: {
          userId: user.userId,
        },
        data: {
          password: hashedPassword,
        },
      });

      if (!updateduser) {
        return response.status(400).json({
          success: false,
          message: "User not updated",
        });
      }

      return response.status(200).json({
        success: true,
        message: "User password changed successfully",
      });
    } catch (error) {
      console.error(error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

userProfileRouter.post(
  "/profile",
  upload.single("user_profile"),
  async (request: Request, response: Response): Promise<any> => {
    try {
      const { userName } = request.body;
      const authHeader = request.headers.authorization;

      // Check for Authorization header
      if (!authHeader) {
        return response.status(401).json({
          success: false,
          message: "Missing Authorization header",
        });
      }

      const token = authHeader.split(" ")[1];

      // Check for token
      if (!token) {
        return response.status(401).json({
          success: false,
          message: "Missing Authorization header",
        });
      }

      // Verify the token
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as UserInterface;

      if (!decodedToken || !decodedToken.userId) {
        return response.status(403).json({
          success: false,
          message: "Invalid or missing userId in token",
        });
      }

      // Check if the user already has a profile
      const profile = await prisma.profiles.findUnique({
        where: {
          userId: decodedToken.userId,
        },
      });

      if (profile) {
        // Prepare the update data
        const updateData: any = {};

        // Update user_name if provided
        if (userName) {
          updateData.userName = userName;
        }

        // Update user_profile if a file is uploaded
        if (request.file) {
          // Delete the old profile picture if it exists
          if (profile.userProfilePicture) {
            const oldProfilePath = path.join(
              __dirname,
              "../../../../v1/uploads",
              profile.userProfilePicture
            );
            fs.unlinkSync(oldProfilePath);
          }

          updateData.user_profile = request.file.filename;
        }

        // Update the profile
        const updatedProfile = await prisma.profiles.update({
          where: {
            userId: decodedToken.userId,
          },
          data: updateData,
        });

        if (!updatedProfile) {
          return response.status(400).json({
            success: false,
            message: "Profile not updated",
          });
        }

        return response.status(200).json({
          success: true,
          message: "Profile updated successfully",
        });
      } else {
        // If the user does not have a profile, create a new one
        let userpRofileTmp = null;

        if (request.file) {
          userpRofileTmp = request.file.filename;
        }

        const newProfile = await prisma.profiles.create({
          data: {
            userName: userName || null, // Set to null if not provided
            userId: decodedToken.userId,
            userProfilePicture: userpRofileTmp,
          },
        });

        if (!newProfile) {
          return response.status(400).json({
            success: false,
            message: "Profile creation failed",
          });
        }

        return response.status(200).json({
          success: true,
          message: "Profile created successfully",
        });
      }
    } catch (error) {
      console.error(error);

      // If an error occurs, delete the uploaded file (if any)
      if (request.file) {
        const filePath = path.join(
          __dirname,
          "../../../../v1/uploads",
          request.file.filename
        );
        fs.unlinkSync(filePath); // Delete the file
      }

      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default userProfileRouter;
