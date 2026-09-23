// İletişim kanalları: Telegram Bot API, Resend e-posta, WhatsApp Cloud API. Env yoksa çağrılmaz.
import { ConnectorError } from './types.ts';
import { graphVersion } from './meta.ts';

export async function telegramSend(text: string, chatId = Deno.env.get('TELEGRAM_CHAT_ID') || '') {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token || !chatId) throw new ConnectorError('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID tanımlı değil', 'CONFIGURATION_REQUIRED');
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new ConnectorError(data.description || `Telegram ${res.status}`, 'TELEGRAM_ERROR', data);
  return { messageId: String(data.result?.message_id), raw: data };
}

export async function resendEmail(to: string, subject: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!key || !from) throw new ConnectorError('RESEND_API_KEY / EMAIL_FROM tanımlı değil', 'CONFIGURATION_REQUIRED');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ConnectorError(data.message || `Resend ${res.status}`, 'EMAIL_ERROR', data);
  return { messageId: String(data.id), raw: data };
}

/** WhatsApp Cloud API serbest metin yalnızca 24 saatlik müşteri penceresinde teslim edilir. */
export async function whatsappCloudSend(toPhone: string, body: string) {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneId) throw new ConnectorError('WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID tanımlı değil', 'CONFIGURATION_REQUIRED');
  const digits = toPhone.replace(/\D/g, '');
  const to = digits.startsWith('90') ? digits : `90${digits.slice(-10)}`;
  const res = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneId}/messages`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ConnectorError(data.error?.message || `WhatsApp ${res.status}`, 'WHATSAPP_ERROR', data);
  return { messageId: String(data.messages?.[0]?.id ?? ''), raw: data };
}

export function waMeLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('90') ? digits : `90${digits.slice(-10)}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
