"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import {
  JOIN_REQUEST_NOT_FOUND,
  JOIN_REQUEST_REJECTED,
  UNAUTHORIZED,
} from "../../../../utils/err_code";
import express from "express";

export const rejectTeamRouter = express.Router();

rejectTeamRouter.post(
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
        userRole: "cpt",
      },
    });

    if (!teamCaptain) {
      return response.status(400).json({
        success: false,
        message: "Only the team captain can reject join requests",
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

    // Update the join request status to 'rejected'
    const updatedRequest = await prisma.joinRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "rejected",
      },
    });

    return response.status(200).json({
      success: true,
      message: "Join request rejected successfully",
      code: JOIN_REQUEST_REJECTED,
      joinRequest: updatedRequest,
    });
  }
);

export default rejectTeamRouter;
