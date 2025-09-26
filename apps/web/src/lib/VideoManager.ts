import { Socket } from "socket.io-client";
import { SocketControlEvent, VideoControls } from "@/types/video";

export class VideoManager implements VideoControls {
  private socket: Socket | null;
  private roomCode: string;

  constructor(socket: Socket | null, roomCode: string) {
    this.socket = socket;
    this.roomCode = roomCode;
  }

  /**
   * Update socket reference when it changes
   */
  public updateSocket(socket: Socket | null): void {
    this.socket = socket;
  }

  /**
   * Update room code when it changes
   */
  public updateRoomCode(roomCode: string): void {
    this.roomCode = roomCode;
  }

  /**
   * Set video for all room participants
   */
  public setVideo(videoId: string): void {
    this.emitControl("SET_VIDEO", { videoId });
  }

  /**
   * Play video for all room participants
   */
  public play(position: number): void {
    this.emitControl("PLAY", { position });
  }

  /**
   * Pause video for all room participants
   */
  public pause(position: number): void {
    this.emitControl("PAUSE", { position });
  }

  /**
   * Seek to specific position for all room participants
   */
  public seek(position: number): void {
    this.emitControl("SEEK", { position });
  }

  /**
   * Generic method to emit control events to server
   */
  private emitControl(
    type: SocketControlEvent["type"], 
    payload: SocketControlEvent["payload"]
  ): void {
    if (!this.socket || !this.roomCode) {
      console.warn("VideoManager: Cannot emit control - missing socket or room code");
      return;
    }

    const controlEvent: SocketControlEvent = {
      code: this.roomCode,
      type,
      payload,
    };

    this.socket.emit("control", controlEvent);
  }

  /**
   * Check if manager is ready to emit events
   */
  public isReady(): boolean {
    return !!(this.socket && this.roomCode);
  }
}
