"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import {
  TEAM_CREATED,
  TEAM_NAME_NOT_AVAILABLE,
  TEAM_NOT_CREATED,
} from "../../../../utils/err_code";
import { io } from "../../../../../endpoint";
import express from "express";

export const createTeamRouter = express.Router();

createTeamRouter.post(
  "/",
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

    io.emit("newTeamAdded");

    return response.status(200).json({
      success: true,
      message: "Team created successfully",
      code: TEAM_CREATED,
      team: team,
    });
  }
);

export default createTeamRouter;
