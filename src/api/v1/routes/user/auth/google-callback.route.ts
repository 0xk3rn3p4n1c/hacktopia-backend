import { Router } from "express";
import jwt from "jsonwebtoken";

import { GoogleAuthInterface } from "../interfaces/interface.user";
import passport from "passport";

export const googleCallbackRouter = Router();

googleCallbackRouter.get(
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

export default googleCallbackRouter;
