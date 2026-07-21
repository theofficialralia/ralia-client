export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const PLATFORM_LABELS: Record<string, string> = {
  WHATSAPP_STATUS: 'WhatsApp',
  WHATSAPP_GROUP: 'WhatsApp Group',
  INSTAGRAM: 'Instagram',
  X: 'X',
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook',
  TELEGRAM: 'Telegram',
  LINKEDIN: 'LinkedIn',
  OFFLINE: 'Offline',
};

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
