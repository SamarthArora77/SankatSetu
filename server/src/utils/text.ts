import sanitizeHtml from 'sanitize-html';

export function cleanText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return 'Hidden';
  return `${phone.slice(0, phone.length - 6).trim()} XX${phone.slice(-3)}`;
}

export function maskIp(ip?: string): string {
  if (!ip) return '';
  if (ip === '::1' || ip === '127.0.0.1') return '127.0.0.1';
  const ipv4 = ip.replace(/^::ffff:/, '');
  const parts = ipv4.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return ipv4.slice(0, 8) + '...';
}
