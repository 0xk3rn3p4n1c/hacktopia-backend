"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import { TEAM_DETAILS_FETCHED } from "../../../../utils/err_code";
import express from "express";

export const teamDetailsRouter = express.Router();

teamDetailsRouter.get(
  "/",
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

export default teamDetailsRouter;