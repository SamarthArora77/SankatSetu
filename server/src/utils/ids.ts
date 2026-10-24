import crypto from 'node:crypto';

export function generateTicketId(prefix = 'RS', digits = 6): string {
  const max = 10 ** digits;
  const value = crypto.randomInt(0, max).toString().padStart(digits, '0');
  return `${prefix}-${value}`;
}

export function generateTrackingId(prefix = 'RS-DON'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

export function generateTrackingToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
