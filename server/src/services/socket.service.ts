import type { Server } from 'socket.io';
import type { Role } from '../utils/constants';

let io: Server | null = null;

export function setSocketServer(server: Server): void {
  io = server;
}

export function getSocketServer(): Server | null {
  return io;
}

export function emitToPublic(event: string, payload: unknown): void {
  io?.to('public').emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role: Role, event: string, payload: unknown): void {
  io?.to(`role:${role}`).emit(event, payload);
}
