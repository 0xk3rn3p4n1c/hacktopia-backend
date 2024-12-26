import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserInterface } from "../interfaces/interface.user";
import {
  ALL_FIELDS_REQUIRED,
  EMAIL_ALREADY_EXISTS,
  INCORRECT_PASSWORD,
  INTERNAL_SERVER_ERROR,
  INVALID_OTP,
  LOGGED_IN_SUCCESSFULLY,
  OTP_EXPIRED,
  OTP_NOT_SENT,
  OTP_SENT_SUCCESSFULLY,
  OTP_VERIFICATION_SUCCESSFULLY,
  PASSWORD_CHANGE_FAILED,
  PASSWORD_CHANGED_SUCCESSFULLY,
  PASSWORDS_DO_NOT_MATCH,
  USER_CREATED,
  USER_NOT_CREATED,
  USER_NOT_FOUND,
  USERNAME_ALREADY_EXISTS,
} from "../../../../utilts/err_code";
import passport from "passport";
import "../../strategies/google";
import { sendEmail } from "../../../../utilts/mailer";

dotenv.config();

const userAuthRouter = express.Router();
const prisma = new PrismaClient();

interface GoogleAuthInterface extends Request {
  user: any;
}

// Google OAuth login route
userAuthRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

userAuthRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (request: GoogleAuthInterface, response: any) => {
    if (request.user) {
      console.log(request.user);

      const token = jwt.sign(
        {
          userId: request.user.user.userId,
          email: request.user.user.email,
          userName: request.user.user.userName,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "30d" }
      );
      // Token generated
      if (token) {
        response.redirect(
          `${process.env.FRONTEND_URL}/auth/callback?token=${token}`
        );
      } else {
        return response.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }
);

// Register
userAuthRouter.post(
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

// Login
userAuthRouter.post(
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

userAuthRouter.post(
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

userAuthRouter.post(
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

userAuthRouter.post(
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

userAuthRouter.get(
  "/chk-usr",
  async (request: Request, response: Response): Promise<any> => {
    const { userName } = request.query;

    if (!userName) {
      return response.status(400).json({
        success: false,
        code: ALL_FIELDS_REQUIRED,
        message: "Please enter all fields",
      });
    }

    const profile = await prisma.profiles.findUnique({
      where: {
        userName: userName as string,
      },
    });

    if (profile) {
      return response.status(200).json({
        success: true,
        message: "Username already exists",
      });
    } else {
      return response.status(200).json({
        success: true,
        message: "Username available",
      });
    }
  }
);

export default userAuthRouter;
