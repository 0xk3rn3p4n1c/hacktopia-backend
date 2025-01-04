import https from "https";
import express from "express";
import fs from "fs";

// Create HTTPS server
export const app = express();
export const httpsServer = https.createServer(
  {
    key: fs.readFileSync("./ssl/private.key"),
    cert: fs.readFileSync("./ssl/certificate.crt"),
  },
  app
);
