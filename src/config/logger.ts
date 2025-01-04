import fs from "fs";
import path from "path";
import morgan from "morgan";

export const logStream = fs.createWriteStream(
  path.join(__dirname, "../../logs", "access.log"),
  {
    flags: "a",
    encoding: "utf8",
    mode: 0o666,
  }
);

export const logger = morgan("combined", { stream: logStream });