import { io, type Socket } from 'socket.io-client';

export type RealtimeEvent =
  | 'emergency:created'
  | 'emergency:updated'
  | 'emergency:analyzed'
  | 'camp:created'
  | 'camp:updated'
  | 'alert:new'
  | 'volunteer-task:updated'
  | 'mission:created'
  | 'mission:updated'
  | 'donation:created'
  | 'donation:updated'
  | 'responder:location'
  | 'resource:updated'
  | 'resource:dispatched'
  | 'notification:new';

type RealtimeHandler = (event: RealtimeEvent, payload: unknown) => void;
type StatusHandler = (connected: boolean) => void;

const EVENTS: RealtimeEvent[] = [
  'emergency:created',
  'emergency:updated',
  'emergency:analyzed',
  'camp:created',
  'camp:updated',
  'alert:new',
  'volunteer-task:updated',
  'mission:created',
  'mission:updated',
  'donation:created',
  'donation:updated',
  'responder:location',
  'resource:updated',
  'resource:dispatched',
  'notification:new',
];

/**
 * Connects to the authenticated Socket.IO gateway. The HttpOnly session cookie
 * is sent during the handshake; anonymous clients are placed in the public room
 * and staff roles are joined server-side based on the verified token.
 */
export function connectRealtime(
  onEvent: RealtimeHandler,
  onStatus: StatusHandler,
): () => void {
  const socket: Socket = io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => onStatus(true));
  socket.on('disconnect', () => onStatus(false));
  socket.on('connect_error', () => onStatus(false));

  for (const event of EVENTS) {
    socket.on(event, (payload: unknown) => onEvent(event, payload));
  }

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
