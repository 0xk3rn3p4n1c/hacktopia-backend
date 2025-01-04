"use server";

import { Request, Response } from "express";
import { prisma } from "../../../../config/prisma";
import { JOIN_REQUEST_CREATED, JOIN_REQUEST_EXISTS, JOIN_REQUEST_NOT_CREATED, TEAM_NOT_FOUND } from "../../../../utils/err_code";
import express from "express";

export const joinTeamRouter = express.Router();

joinTeamRouter.post(
  "/",
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

export default joinTeamRouter;