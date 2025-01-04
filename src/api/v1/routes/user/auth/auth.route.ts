import { Router } from "express";
import dotenv from "dotenv";
import "../../../../../strategies/google";
import { authRateLimiter } from "../../../../../../limiter";
import registerRouter from "./register.route";
import loginRouter from "./login.route";
import forgotPasswordRouter from "./forgot-password.route";
import verifyOtpRouter from "./verify-otp.route";
import changePasswordRouter from "./change-password.route";
import checkUserRouter from "./check-user.route";
import googleCallbackRouter from "./google-callback.route";
import googleRouter from "./google.route";

dotenv.config();

const userAuthRouter = Router();
// Apply rate limiter and user middleware to all team routes
userAuthRouter.use(authRateLimiter);

userAuthRouter.use(registerRouter);
userAuthRouter.use(loginRouter);
userAuthRouter.use(forgotPasswordRouter);
userAuthRouter.use(verifyOtpRouter);
userAuthRouter.use(changePasswordRouter);
userAuthRouter.use(checkUserRouter);
userAuthRouter.use(googleRouter);
userAuthRouter.use(googleCallbackRouter);

export default userAuthRouter;
