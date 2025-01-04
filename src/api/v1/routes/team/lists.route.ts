"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import { TEAM_LISTED, TEAM_NOT_LISTED } from "../../../../utils/err_code";
import express from "express";

export const listsTeamRouter = express.Router();

listsTeamRouter.get(
  "/",
  async (request: Request, response: Response): Promise<any> => {
    const teams = await prisma.team.findMany({
      include: {
        teamMembers: {
          include: {
            profile: {
              select: {
                userId: true,
                userName: true,
                userProfilePicture: true,
              },
            },
          },
        },
      },
    });

    if (!teams) {
      return response.status(400).json({
        success: false,
        message: "Error. Teams not found!",
        code: TEAM_NOT_LISTED,
      });
    }

    return response.status(200).json({
      success: true,
      message: "Teams fetched successfully",
      code: TEAM_LISTED,
      teams: teams,
    });
  }
);

export default listsTeamRouter;