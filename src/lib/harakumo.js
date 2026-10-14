/**
 * Harakumo Mail: every email Waklum sends (invites, password resets,
 * task and project notifications).
 *
 *   HARAKUMO_API_KEY   an API key (Harakumo → Settings → API keys). Server-side only.
 *   HARAKUMO_BASE_URL  optional, defaults to https://harakumo.com
 *
 * Add your own domain in Harakumo → Mail to send from it; until then mail goes
 * out from Harakumo's shared no-reply address under your app's display name.
 * Never import this from a client component.
 */

const SEND_TIMEOUT_MS = 15_000;

function apiBase() {
  return (process.env.HARAKUMO_BASE_URL || 'https://harakumo.com').replace(/\/+$/, '');
}

export function isHarakumoConfigured() {
  return !!process.env.HARAKUMO_API_KEY;
}

/**
 * POST one email to Harakumo Mail. Throws on any failure; resolves to
 * `{ id, status, messageId }`.
 */
export async function sendViaHarakumo({ to, subject, text, html, fromName, from, replyTo }) {
  const apiKey = process.env.HARAKUMO_API_KEY;
  if (!apiKey) {
    throw new Error('HARAKUMO_API_KEY is not configured: cannot send email.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBase()}/api/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        ...(html ? { html } : {}),
        ...(fromName ? { fromName } : {}),
        ...(from ? { from } : {}),
        ...(replyTo ? { replyTo } : {}),
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Mail send failed (HTTP ${res.status})`);
    }

    const message = data?.message ?? {};
    if (message.status && message.status !== 'sent' && message.status !== 'queued') {
      throw new Error(message.error || `Mail was not sent (status: ${message.status})`);
    }

    return {
      id: message.id,
      status: message.status ?? 'sent',
      messageId: message.message_id ?? '',
    };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('The email service timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
