"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import {
	TEAM_NAME_AVAILABLE,
  TEAM_NAME_NOT_AVAILABLE,
} from "../../../../utils/err_code";
import express from "express";

export const checkTeamRouter = express.Router();

checkTeamRouter.get(
  "/",
  async (request: Request, response: Response): Promise<any> => {
    const { teamName } = request.query;

    if (!teamName) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        teamName: teamName as string,
      },
    });

    if (team) {
      return response.status(200).json({
        success: true,
        message: "Team already exists",
        code: TEAM_NAME_NOT_AVAILABLE,
      });
    } else {
      return response.status(200).json({
        success: true,
        message: "Team available",
        code: TEAM_NAME_AVAILABLE,
      });
    }
  }
);

export default checkTeamRouter;