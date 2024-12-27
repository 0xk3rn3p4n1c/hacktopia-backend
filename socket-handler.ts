import { Server, Socket } from "socket.io";

export class SocketHandler {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    this.setupEventListeners();
  }
  /**
   * Setup event listeners for Socket.IO
   */
  private setupEventListeners(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log("A user connected:", socket.id);
      // Example: Listen for a custom event
      socket.on("sendMessage", (data: any) => {
        this.handleMessage(socket, data);
      });
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  }
  /**
   * Handle incoming messages
   */
  private handleMessage(socket: Socket, data: any): void {
    console.log("Message received:", data);

    // Broadcast the message to all connected clients
    this.io.emit("newMessage", data);
  }
  /**
   * Emit an event to all connected clients
   */
  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }
  /**
   * Emit an event to a specific client
   */
  public emitToClient(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }
}
