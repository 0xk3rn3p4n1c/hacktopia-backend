"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import {
  TEAM_DETAILS_FETCHED,
  TEAM_NOT_FOUND,
} from "../../../../utils/err_code";
import express from "express";

export const myTeamRouter = express.Router();

myTeamRouter.get(
  "/",
  async (request: Request, response: Response): Promise<any> => {
    const { userId } = request.query;

    if (!userId) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    const team = await prisma.team.findFirst({
      where: {
        teamMembers: {
          some: {
            userId: userId as string,
          },
        },
      },
    });

    if (!team) {
      return response.status(400).json({
        success: false,
        message: "Error. Team not found!",
        code: TEAM_NOT_FOUND,
      });
    }

    const teamDetails = await prisma.team.findUnique({
      where: {
        teamId: team?.teamId,
      },
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

    const teamRequests = await prisma.joinRequest.findMany({
      where: {
        teamId: teamDetails?.teamId,
      },
      include: {
        team: true,
        user: {
          select: {
            profiles: {
              select: {
                userName: true,
                userId: true,
                userProfilePicture: true,
              },
            },
          },
        },
      },
    });

    return response.status(200).json({
      success: true,
      message: "Team fetched successfully",
      code: TEAM_DETAILS_FETCHED,
      team: teamDetails,
      teamRequests: teamRequests,
    });
  }
);

export default myTeamRouter;
