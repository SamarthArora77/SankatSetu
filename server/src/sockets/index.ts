import type { Server as HttpServer } from 'node:http';
import { parse as parseCookie } from 'cookie';
import { Server } from 'socket.io';
import { socketCorsOptions } from '../config/cors';
import { User } from '../models/User';
import { setSocketServer } from '../services/socket.service';
import { ACCESS_COOKIE, verifyAccessToken } from '../services/token.service';

const REGION_PATTERN = /^[a-z0-9-]{1,40}$/;

export function initializeSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: socketCorsOptions,
    serveClient: false,
  });

  io.on('connection', async (socket) => {
    // Every connected client receives sanitized public map updates.
    await socket.join('public');

    try {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
      const authToken = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
      const token = cookies[ACCESS_COOKIE] ?? authToken;

      if (token) {
        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.sub).select('+tokenVersion');
        if (user?.isActive && user.tokenVersion === payload.ver) {
          socket.data.userId = user.id;
          await socket.join(`user:${user.id}`);
          await socket.join(`role:${user.role}`);
        }
      }
    } catch {
      // Invalid or expired credentials still allow a public-only socket.
    }

    // Clients may subscribe to a coarse region room. They cannot write data.
    socket.on('region:join', (region: unknown) => {
      if (typeof region === 'string' && REGION_PATTERN.test(region)) {
        socket.join(`region:${region}`);
      }
    });
  });

  setSocketServer(io);
  return io;
}
