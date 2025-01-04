import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";

import {
  ALL_FIELDS_REQUIRED,
  OTP_NOT_SENT,
  OTP_SENT_SUCCESSFULLY,
  USER_NOT_FOUND,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";
import { sendEmail } from "../../../../../utils/mailer";

export const forgotPasswordRouter = Router();

forgotPasswordRouter.post(
  "/forgot-password",
  async (request: Request, response: Response): Promise<any> => {
    const { email } = request.body;

    if (!email) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please enter all fields",
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return response.status(400).json({
        success: false,
        code: USER_NOT_FOUND,
        message: "User not found",
      });
    }

    // Get the username from profiles
    const profile = await prisma.profiles.findUnique({
      where: {
        userId: user.userId,
      },
    });

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const otp = Array(6)
      .fill("")
      .map((_) =>
        characters.charAt(Math.floor(Math.random() * characters.length))
      )
      .join("");

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Check if userId already exists in the oneTimePassword table

    const otpExists = await prisma.oneTimePassword.findUnique({
      where: {
        userId: user.userId,
      },
    });

    let otpCreated;

    if (!otpExists) {
      otpCreated = await prisma.oneTimePassword.create({
        data: {
          userId: user.userId,
          otp: otp,
          expiry: otpExpiry,
        },
      });
    } else {
      otpCreated = await prisma.oneTimePassword.update({
        where: {
          userId: user.userId,
        },
        data: {
          otp: otp,
          expiry: otpExpiry,
        },
      });
    }

    if (otpCreated) {
      const result = await sendEmail(
        email,
        "Hacktopia OTP code.",
        `<p>
		  Hello ${profile?.userName},
		</p>  
		<p>
		  It seems like you have requested a password reset. Please use the following code to reset your password: ${otp}
		</p>
		<p>
		  If you did not request a password reset, please ignore this email.
		</p>
		
		<p>
		  Best regards,
		  The Hacktopia Team
		</p>
		`
      )
        .then((res) => {
          const token = jwt.sign(
            {
              userId: user.userId,
              email: user.email,
              userName: profile?.userName,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "5m" }
          );
          return response.status(200).json({
            success: true,
            code: OTP_SENT_SUCCESSFULLY,
            message: "OTP sent successfully",
            token: token,
          });
        })
        .catch((err) => {
          return response.status(400).json({
            success: false,
            code: OTP_NOT_SENT,
            message: "OTP not sent",
          });
        });
    }
  }
);

export default forgotPasswordRouter;
