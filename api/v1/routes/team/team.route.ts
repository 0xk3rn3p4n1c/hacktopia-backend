import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import {
  JOIN_REQUEST_ACCEPTED,
  JOIN_REQUEST_CREATED,
  JOIN_REQUEST_EXISTS,
  JOIN_REQUEST_FETCHED,
  JOIN_REQUEST_NOT_CREATED,
  JOIN_REQUEST_NOT_FOUND,
  JOIN_REQUEST_REJECTED,
  TEAM_CREATED,
  TEAM_DETAILS_FETCHED,
  TEAM_LISTED,
  TEAM_NAME_AVAILABLE,
  TEAM_NAME_NOT_AVAILABLE,
  TEAM_NOT_CREATED,
  TEAM_NOT_FOUND,
  TEAM_NOT_LISTED,
  UNAUTHORIZED,
} from "../../../utilts/err_code";

dotenv.config();

const teamRouter = express.Router();
const prisma = new PrismaClient();

teamRouter.post(
  "/create",
  async (request: Request, response: Response): Promise<any> => {
    const { teamName, teamCaptain, teamMotto, teamCountry } = request.body;

    if (!teamName || !teamCaptain || !teamMotto || !teamCountry) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    // Check if the teamCaptain has already created a team
    const teamCaptainExists = await prisma.team.findFirst({
      where: {
        teamCaptain: teamCaptain,
      },
    });

    if (teamCaptainExists) {
      return response.status(400).json({
        success: false,
        code: TEAM_NOT_CREATED,
        message: "Team Captain has already created a team",
      });
    }

    // Check if team already exists
    const teamExists = await prisma.team.findUnique({
      where: {
        teamName: teamName,
      },
    });

    if (teamExists) {
      return response.status(400).json({
        success: false,
        message: "Team already exists",
        code: TEAM_NAME_NOT_AVAILABLE,
      });
    }

    const teamCaptainUserId = await prisma.profiles.findUnique({
      where: {
        userName: teamCaptain,
      },
    });

    if (!teamCaptainUserId) {
      return response.status(400).json({
        success: false,
        message: "Team Captain not found",
        code: TEAM_NOT_CREATED,
      });
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        teamName: teamName,
        teamCaptain: teamCaptain,
        teamMotto: teamMotto,
        teamCountry: teamCountry,
        teamMembers: {
          create: {
            userId: teamCaptainUserId?.userId,
            userRole: "cpt", // Set the teamRole as CAPTAIN
            userPoints: 0, // Default value
            userChallengesAnswered: [], // Default value
          },
        },
      },
    });

    if (!team) {
      return response.status(400).json({
        success: false,
        message: "Error. Team not created!",
        code: TEAM_NOT_CREATED,
      });
    }

    return response.status(200).json({
      success: true,
      message: "Team created successfully",
      code: TEAM_CREATED,
      team: team,
    });
  }
);

teamRouter.post(
  "/join",
  async (request: Request, response: Response): Promise<any> => {
    const { teamId, userId } = request.body;

    if (!teamId || !userId) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        teamId: teamId,
      },
    });

    if (!team) {
      return response.status(400).json({
        success: false,
        message: "Team not found",
        code: TEAM_NOT_FOUND,
      });
    }

    const user = await prisma.profiles.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!user) {
      return response.status(400).json({
        success: false,
        message: "User not found",
        code: TEAM_NOT_FOUND,
      });
    }

    // Check if the user has already requested to join the team
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
      },
    });

    if (existingRequest) {
      return response.status(400).json({
        success: false,
        message: "Join request already exists",
        code: JOIN_REQUEST_EXISTS,
      });
    }

    // Create a join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        teamId: teamId,
        userId: userId,
        status: "pending",
      },
    });

    if (!joinRequest) {
      return response.status(400).json({
        success: false,
        message: "Error. Join request not created!",
        code: JOIN_REQUEST_NOT_CREATED,
      });
    }

    return response.status(200).json({
      success: true,
      message: "Join request created successfully",
      code: JOIN_REQUEST_CREATED,
      joinRequest: joinRequest,
    });
  }
);

teamRouter.post(
  "/join/accept",
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

    // Update the join request status to 'accepted'
    const updatedRequest = await prisma.joinRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "accepted",
      },
    });

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

    return response.status(200).json({
      success: true,
      message: "Join request accepted successfully",
      code: JOIN_REQUEST_ACCEPTED,
      teamMember: teamMember,
    });
  }
);

teamRouter.post(
  "/join/reject",
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

teamRouter.get(
  "/chk-team",
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

teamRouter.get(
  "/list",
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

teamRouter.get(
  "/myTeam",
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

teamRouter.get(
  "/teamDetails",
  async (request: Request, response: Response): Promise<any> => {
    const { teamId } = request.query;

    if (!teamId) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        teamId: teamId as string,
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

    if (!team) {
      return response.status(400).json({
        success: false,
        message: "Error. Team not found!",
        code: TEAM_DETAILS_FETCHED,
      });
    }

    return response.status(200).json({
      success: true,
      message: "Team fetchedED successfully",
      code: TEAM_DETAILS_FETCHED,
      team: team,
    });
  }
);

export default teamRouter;
