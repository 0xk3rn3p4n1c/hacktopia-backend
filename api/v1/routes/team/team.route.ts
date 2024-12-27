import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  TEAM_CREATED,
  TEAM_NAME_AVAILABLE,
  TEAM_NAME_NOT_AVAILABLE,
  TEAM_NOT_CREATED,
  TEAM_NOT_LISTED,
} from "../../../utilts/err_code";
import bcrypt from "bcryptjs";

dotenv.config();

const teamRouter = express.Router();
const prisma = new PrismaClient();

teamRouter.post(
  "/create",
  async (request: Request, response: Response): Promise<any> => {
    const { teamName, teamCode, teamCaptain } = request.body;

    if (!teamName || !teamCode) {
      return response.status(400).json({
        success: false,
        message: "Please enter all fields",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedTeamCode = await bcrypt.hash(teamCode, salt);

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
        teamCode: hashedTeamCode,
        teamName: teamName,
        teamCaptain: teamCaptain,
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
      code: TEAM_CREATED,
      teams: teams,
    });
  }
);

export default teamRouter;
