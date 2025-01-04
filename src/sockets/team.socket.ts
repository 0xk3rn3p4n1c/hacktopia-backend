import { Server } from "socket.io";

export const setupTeamSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("newTeamAdded", () => {
      io.emit("newTeamAdded");
    });
  });
};
