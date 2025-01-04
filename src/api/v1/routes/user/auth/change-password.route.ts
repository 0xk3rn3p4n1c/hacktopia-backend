import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import {
  ALL_FIELDS_REQUIRED,
  PASSWORD_CHANGE_FAILED,
  PASSWORD_CHANGED_SUCCESSFULLY,
  PASSWORDS_DO_NOT_MATCH,
  USER_NOT_FOUND,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";

export const changePasswordRouter = Router();

changePasswordRouter.post(
  "/change-password",
  async (request: Request, response: Response): Promise<any> => {
    const { userId, newPassword, confirmPassword } = request.body;

    if (!userId || !newPassword || !confirmPassword) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please enter all fields",
      });
    }

    if (newPassword !== confirmPassword) {
      return response.status(400).json({
        success: false,
        code: PASSWORDS_DO_NOT_MATCH,
        message: "Passwords do not match",
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!user) {
      return response.status(400).json({
        success: false,
        code: USER_NOT_FOUND,
        message: "User not found",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(confirmPassword, salt);

    const updatedUser = await prisma.users.update({
      where: {
        userId: userId,
      },
      data: {
        password: hash,
      },
    });

    if (updatedUser) {
      return response.status(200).json({
        success: true,
        code: PASSWORD_CHANGED_SUCCESSFULLY,
        message: "Password changed successfully",
      });
    }

    return response.status(400).json({
      success: false,
      code: PASSWORD_CHANGE_FAILED,
      message: "Password change failed",
    });
  }
);
export default changePasswordRouter;
