import { Request, Response, Router } from "express";
import {
  ALL_FIELDS_REQUIRED,
} from "../../../../../utils/err_code";
import { prisma } from "../../../../../config/prisma";

export const checkUserRouter = Router();

checkUserRouter.get(
  "/check-user",
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

export default checkUserRouter;
