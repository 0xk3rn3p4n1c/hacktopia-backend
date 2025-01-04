import fs from "fs";
import { ServerOptions } from "https";

export const sslOptions: ServerOptions = {
  key: fs.readFileSync("./ssl/private.key"),
  cert: fs.readFileSync("./ssl/certificate.crt"),
};
