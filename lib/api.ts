import { session } from './session';
import type { Money } from './money';

/**
 * Thin typed client over the Ralia API. Same-origin in dev (Next rewrites proxy
 * /v1 to the API), so no base URL is needed. On a 401 it transparently rotates
 * the refresh token once and retries.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fields?: string[],
  ) {
    super(message);
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
  /** multipart form data; when set, body is ignored. */
  form?: FormData;
};

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const token = session.refresh;
  if (!token) return false;
  // Collapse concurrent refreshes into one in-flight request.
  refreshing ??= (async () => {
    try {
      const res = await fetch('/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (!res.ok) {
        session.clear();
        return false;
      }
      session.set(await res.json());
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function raw<T>(path: string, opts: Options, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (!opts.form) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && session.access) headers.Authorization = `Bearer ${session.access}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });

  if (res.status === 401 && retry && opts.auth !== false) {
    if (await tryRefresh()) return raw<T>(path, opts, false);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message ?? res.statusText;
    throw new ApiError(res.status, message, data?.code, Array.isArray(data?.message) ? data.message : undefined);
  }
  return data as T;
}

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};
export type NotificationList = { items: Notification[]; unread: number };

export const api = {
  get: <T>(path: string) => raw<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, extra?: Omit<Options, 'method' | 'body'>) =>
    raw<T>(path, { method: 'POST', body, ...extra }),
  patch: <T>(path: string, body?: unknown) => raw<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => raw<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => raw<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => raw<T>(path, { method: 'POST', form }),
};

export function uuid(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────
// Response shapes (from the frozen contract). Hand-typed for ergonomics;
// lib/api-types.ts holds the full generated types if you need to cross-check.
// ─────────────────────────────────────────────────────────────

export type Tokens = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export type Me = { id: string; email: string; phone_e164: string; roles: string[]; status: string };

export type ClientProfile = {
  org_id: string;
  name: string;
  email: string;
  industry: string | null;
  phone_whatsapp: string | null;
  website: string | null;
  address: string | null;
  cac_number: string | null;
  support_contact_name: string | null;
  support_contact_phone: string | null;
  description: string | null;
  status: string;
};

export type CampaignStatus =
  | 'DRAFT' | 'QUOTED' | 'PENDING_APPROVAL' | 'REJECTED' | 'CONFIRMING_PAYMENT'
  | 'LIVE' | 'PAUSED' | 'ENDED' | 'FULFILLED' | 'SETTLED' | 'CANCELLED';

export type Campaign = {
  id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  description: string | null;
  promoter_instructions: string | null;
  destination_url: string | null;
  slots_total: number;
  slots_filled: number;
  price: Money | null;
  budget: Money;
  quoted_at: string | null;
  total_clicks?: number;
};

export type Quote = {
  price: Money;
  unit_price: Money;
  promoter_fee: Money;
  slots_total: number;
  estimated_reach: number;
  eligible_promoters: number;
  active_filters: number;
};

export type CampaignPlan = {
  unit_price: Money;
  slots: number;
  total_price: Money;
  promoter_fee: Money;
  reach_per_slot: number;
  estimated_total_reach: number;
  category: 'DISTRIBUTION' | 'CREATION';
  floor_minor: Money;
  min_slots: number;
  meets_floor: boolean;
  default_reach_per_slot: number;
  default_promoters: number;
};

export type DashboardRow = {
  id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  slots_total: number;
  spent: Money;
  budget: Money;
  views: number;
  completed: number;
};

export type DashboardSummary = {
  spent_this_month: Money;
  spent_change_pct: number | null;
  views_delivered: number;
  campaigns_total: number;
  live_campaigns: number;
  promoters_worked_with: number;
  new_evidence_today: number;
  campaigns: DashboardRow[];
};

export type EvidenceItem = {
  submission_id: string;
  promoter_name: string | null;
  promoter_handle: string | null;
  platform: string;
  submitted_at: string;
  views: number;
  verdict: string;
  auto_flag: boolean;
  public_url: string | null;
  image_url: string | null;
};

export type CampaignAnalytics = {
  campaign_id: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  launched_at: string | null;
  spent: Money;
  budget: Money;
  views_delivered: number;
  clicks_delivered: number;
  cost_per_view: Money;
  offers_sent: number;
  offers_accepted: number;
  acceptance_rate: number;
  completed: number;
  slots_total: number;
  evidence: EvidenceItem[];
};
