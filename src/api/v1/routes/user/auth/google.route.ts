import { Router } from "express";
import passport from "passport";

export const googleRouter = Router();

// Google OAuth login route
googleRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

export default googleRouter;
