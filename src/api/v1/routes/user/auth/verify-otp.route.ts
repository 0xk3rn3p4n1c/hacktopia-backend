import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";

import {
  ALL_FIELDS_REQUIRED,
  INVALID_OTP,
  OTP_EXPIRED,
  OTP_VERIFICATION_SUCCESSFULLY,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";

export const verifyOtpRouter = Router();

verifyOtpRouter.post(
  "/verify-otp",
  async (request: Request, response: Response): Promise<any> => {
    const { otp, userId } = request.body;

    if (!otp) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please enter all fields",
      });
    }

    const otpExists = await prisma.oneTimePassword.findUnique({
      where: {
        otp: otp,
        userId: userId,
      },
    });

    if (!otpExists) {
      return response.status(400).json({
        success: false,
        code: INVALID_OTP,
        message: "Invalid OTP",
      });
    }

    if (otpExists.expiry < new Date()) {
      return response.status(400).json({
        success: false,
        code: OTP_EXPIRED,
        message: "OTP has expired",
      });
    }

    await prisma.oneTimePassword.delete({
      where: {
        userId: userId,
      },
    });

    const token = jwt.sign(
      {
        userId: userId,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "5m" }
    );

    return response.status(200).json({
      success: true,
      code: OTP_VERIFICATION_SUCCESSFULLY,
      message: "OTP sent successfully",
      token: token,
    });
  }
);

export default verifyOtpRouter;
