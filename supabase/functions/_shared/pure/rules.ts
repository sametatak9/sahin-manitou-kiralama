// Bağımlılıksız kurallar: normalize, izin kontrolü, durum etiketleri. Edge + panel ortak.

export function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  return digits.length < 10 ? null : digits.slice(-10);
}
export function normalizeEmail(p?: string | null): string | null {
  const v = (p || '').trim().toLowerCase();
  return v || null;
}
export function normalizeDomain(p?: string | null): string | null {
  const v = (p || '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  return v || null;
}

export type TeamRole = 'admin' | 'staff';
const ROLE_RANK: Record<string, number> = { staff: 1, admin: 2 };

export interface ToolPolicy { tool_key: string; min_role: string; approval_required: boolean; active: boolean }
export interface BotPolicy { status: string; permissions?: { denied_tools?: string[] } | null }

export type ToolDecision =
  | { allowed: true; requiresApproval: boolean }
  | { allowed: false; reason: string };

/** Bir aktörün (rolüyle) bir botta bir tool'u çalıştırıp çalıştıramayacağına karar verir. */
export function decideToolUse(role: string | null | undefined, tool: ToolPolicy | undefined, bot?: BotPolicy | null, skillToolKeys?: string[]): ToolDecision {
  if (!tool) return { allowed: false, reason: 'Tool registry’de yok' };
  if (!tool.active) return { allowed: false, reason: 'Tool pasif' };
  if (!role || !ROLE_RANK[role]) return { allowed: false, reason: 'Ekip üyesi değil' };
  if (bot && (bot.status === 'paused' || bot.status === 'archived')) return { allowed: false, reason: `Bot ${bot.status}` };
  if (bot?.permissions?.denied_tools?.includes(tool.tool_key)) return { allowed: false, reason: 'Bot izinlerinde yasaklı' };
  if (skillToolKeys && !skillToolKeys.includes(tool.tool_key)) return { allowed: false, reason: 'Skill bu tool’a bağlı değil' };
  const needsAdmin = (ROLE_RANK[tool.min_role] ?? 1) > ROLE_RANK[role];
  // Admin yetkisi gereken tool'lar yetkisiz aktör için çalışmaz; yalnızca onay isteği açılabilir.
  if (needsAdmin && !tool.approval_required) return { allowed: false, reason: 'Yönetici yetkisi gerekli' };
  return { allowed: true, requiresApproval: tool.approval_required || needsAdmin };
}

export const APPROVAL_STATES = ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'processing', 'published', 'failed', 'cancelled'] as const;
export type ApprovalState = typeof APPROVAL_STATES[number];

export const APPROVAL_LABELS: Record<ApprovalState, string> = {
  draft: 'TASLAK', pending_approval: 'ONAY BEKLİYOR', approved: 'ONAYLANDI', rejected: 'REDDEDİLDİ', scheduled: 'ZAMANLANDI',
  processing: 'İŞLENİYOR', published: 'YAYINLANDI', failed: 'BAŞARISIZ', cancelled: 'İPTAL',
};

export const CONNECTION_LABELS: Record<string, string> = {
  not_connected: 'BAĞLI DEĞİL', oauth_required: 'OAUTH GEREKLİ', config_required: 'YAPILANDIRMA GEREKLİ', api_key_required: 'API ANAHTARI GEREKLİ',
  connected: 'BAĞLI', expired: 'SÜRESİ DOLDU', error: 'HATA', manual_only: 'MANUEL YAYIN', api_unavailable: 'RESMİ API YOK',
};

/** Eski Türkçe social_drafts.status değerini kanonik akışa eşler. */
export function legacyDraftStatusToWorkflow(status: string): ApprovalState {
  switch (status) {
    case 'onay_bekliyor': return 'pending_approval';
    case 'onaylandi': return 'approved';
    case 'planlandi': return 'scheduled';
    case 'yayinda': return 'published';
    case 'hata': return 'failed';
    default: return 'draft';
  }
}
