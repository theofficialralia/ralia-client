export const OBJECTIVES = [
  { value: 'AWARENESS', label: 'Awareness' },
  { value: 'WEBSITE_VISIT', label: 'Website visit' },
  { value: 'APP_INSTALL', label: 'App install' },
  { value: 'LEAD_GEN', label: 'Lead generation' },
  { value: 'PURCHASE', label: 'Purchase' },
] as const;

/**
 * The client-facing objective labels - the exact words shown in the create
 * wizard. Use this ANYWHERE a campaign's objective is displayed so it always
 * matches what the client actually chose (e.g. they picked "Sales", never the
 * raw enum "Purchase"; "Visibility", never "Awareness").
 */
const OBJECTIVE_LABELS: Record<string, string> = {
  AWARENESS: 'Visibility',
  PURCHASE: 'Sales',
  WEBSITE_VISIT: 'Engagement',
  LEAD_GEN: 'Lead Generation',
  APP_INSTALL: 'App Installs',
};

export function objectiveLabel(value: string | null | undefined): string {
  if (!value) return '';
  return OBJECTIVE_LABELS[value] ?? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PLATFORMS = [
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp Status' },
  { value: 'WHATSAPP_GROUP', label: 'WhatsApp Group' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'OFFLINE', label: 'Offline' },
] as const;

export const ROLES = [
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'CREATOR', label: 'Creator' },
  { value: 'PARTICIPATOR', label: 'Participator' },
  { value: 'INFLUENCER', label: 'Influencer' },
] as const;

/**
 * The single Category-of-Interest taxonomy (dev-support spec R736-GEN-OD-00001).
 * Used for campaign categories, promoter preferred_categories, and business
 * sector - they must match so matching's categoryFit actually lines up.
 */
export const CATEGORIES = [
  'Technology & Digital Products',
  'Financial Services & Fintech',
  'Consumer Goods & Retail (FMCG)',
  'Lifestyle & Personal Care',
  'Health & Pharmaceuticals',
  'Entertainment, Media & Gaming',
  'Real Estate & Construction',
  'Travel',
  'Hospitality & Leisure',
  'Education & Career Services',
  'Mobility',
  'Logistics & Utilities',
  'Other / General',
];

export const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo', 'Efik', 'Tiv', 'Fulfulde'];

export const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT',
];
