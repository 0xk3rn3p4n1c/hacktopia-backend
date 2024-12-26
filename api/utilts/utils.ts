import multer from "multer";
import path from "path"; // Import the 'path' module

// Ensure the 'uploads' directory exists
const uploadDir = path.join(__dirname, "../v1/uploads");

// Create the 'uploads' directory if it doesn't exist
import fs from "fs";
import { Request } from "express";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: any) => {
    cb(null, uploadDir); // Use the absolute path to the 'uploads' directory
  },
  filename: (req: Request, file: Express.Multer.File, cb: any) => {
    cb(null, Date.now() + "-" + file.originalname); // Rename files to avoid conflicts
  },
});

export const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  if (file && file.mimetype.includes("image")) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject the file
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10, // Limit file size to 10MB
  },
});
