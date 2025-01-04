"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import {
	JOIN_REQUEST_ACCEPTED,
	JOIN_REQUEST_NOT_FOUND,
  TEAM_NOT_CREATED,
  UNAUTHORIZED,
} from "../../../../utils/err_code";
import express from "express";

export const acceptTeamRouter = express.Router();

acceptTeamRouter.post(
  "/",
  async (request: Request, response: Response): Promise<any> => {
    const { requestId, teamCaptainUserId } = request.body;

    if (!requestId || !teamCaptainUserId) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    // Check if the user making the request is the team captain
    const teamCaptain = await prisma.teamMembers.findFirst({
      where: {
        userId: teamCaptainUserId,
        userRole: "cpt", // Assuming 'cpt' is the role for team captain
      },
    });

    if (!teamCaptain) {
      return response.status(400).json({
        success: false,
        message: "Only the team captain can accept join requests",
        code: UNAUTHORIZED,
      });
    }

    // Find the join request
    const joinRequest = await prisma.joinRequest.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!joinRequest) {
      return response.status(400).json({
        success: false,
        message: "Join request not found",
        code: JOIN_REQUEST_NOT_FOUND,
      });
    }

    // Add the user to the team
    const teamMember = await prisma.teamMembers.create({
      data: {
        teamId: joinRequest.teamId,
        userId: joinRequest.userId,
        userRole: "mem", // Set the teamRole as MEMBER
        userPoints: 0, // Default value
        userChallengesAnswered: [], // Default value
      },
    });

    if (!teamMember) {
      return response.status(400).json({
        success: false,
        message: "Error. Team member not created!",
        code: TEAM_NOT_CREATED,
      });
    }

    // Delete the join request after adding the user to the team
    await prisma.joinRequest.delete({
      where: {
        id: requestId,
      },
    });

    // Get teamName
    const team = await prisma.team.findUnique({
      where: {
        teamId: joinRequest.teamId,
      },
    });

    return response.status(200).json({
      success: true,
      message: "Join request accepted and user added to the team successfully",
      code: JOIN_REQUEST_ACCEPTED,
      teamMember: teamMember,
      teamName: team?.teamName,
    });
  }
);

export default acceptTeamRouter;