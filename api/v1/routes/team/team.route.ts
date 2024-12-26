import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  TEAM_CREATED,
  TEAM_NAME_AVAILABLE,
  TEAM_NAME_NOT_AVAILABLE,
  TEAM_NOT_CREATED,
} from "../../../utilts/err_code";

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
      });
    }

    const team = await prisma.team.create({
      data: {
        teamCode: teamCode,
        teamName: teamName,
        teamCaptain: teamCaptain,
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
      teamName: teamName,
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

export default teamRouter;
