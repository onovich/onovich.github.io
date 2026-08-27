interface Env {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
  turnstileToken?: unknown;
}

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
}

const CONTACT_RECIPIENT = 'onovich1110@gmail.com';
const DEFAULT_SENDER = 'website@send.onovich.com';
const MAX_REQUEST_BYTES = 32_000;
const MAX_NAME_LENGTH = 120;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const ALLOWED_ORIGINS = new Set([
  'https://onovich.com',
  'https://www.onovich.com',
  'https://game.onovich.com',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);
const ALLOWED_TURNSTILE_HOSTNAMES = new Set([
  'onovich.com',
  'www.onovich.com',
  'game.onovich.com',
]);

type PagesFunctionContext = {
  request: Request;
  env: Env;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function textValue(value: unknown, maxLength: number, singleLine = false): string {
  if (typeof value !== 'string') return '';

  const normalized = value.replaceAll('\0', '').trim();
  return (singleLine ? normalized.replace(/[\r\n]+/gu, ' ') : normalized).slice(0, maxLength);
}

function originIsAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || ALLOWED_ORIGINS.has(origin);
}

async function turnstileIsValid(token: string, secret: string, request: Request): Promise<boolean> {
  const verificationBody = new URLSearchParams({
    secret,
    response: token,
  });
  const remoteIp = request.headers.get('CF-Connecting-IP');

  if (remoteIp) verificationBody.set('remoteip', remoteIp);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verificationBody,
    });

    if (!response.ok) return false;

    const result = await response.json() as TurnstileResponse;
    return result.success === true
      && ALLOWED_TURNSTILE_HOSTNAMES.has(result.hostname ?? '')
      && (!result.action || result.action === 'contact');
  } catch {
    return false;
  }
}

export const onRequestPost = async ({ request, env }: PagesFunctionContext): Promise<Response> => {
  if (!originIsAllowed(request)) {
    return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ ok: false, error: 'request_too_large' }, 413);
  }

  let payload: ContactPayload;
  try {
    payload = await request.json() as ContactPayload;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_request' }, 400);
  }

  const name = textValue(payload.name, MAX_NAME_LENGTH, true);
  const email = textValue(payload.email, MAX_EMAIL_LENGTH, true);
  const subject = textValue(payload.subject, MAX_SUBJECT_LENGTH, true);
  const message = textValue(payload.message, MAX_MESSAGE_LENGTH);
  const website = textValue(payload.website, 200, true);
  const turnstileToken = textValue(payload.turnstileToken, 2_048, true);

  // Silently accept the honeypot so simple bots do not learn the rejection rule.
  if (website) return jsonResponse({ ok: true });

  if (!name || !email || !subject || !message || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ ok: false, error: 'invalid_fields' }, 422);
  }

  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error('Contact form is missing RESEND_API_KEY or TURNSTILE_SECRET_KEY.');
    return jsonResponse({ ok: false, error: 'service_unavailable' }, 503);
  }

  if (!turnstileToken || !(await turnstileIsValid(turnstileToken, env.TURNSTILE_SECRET_KEY, request))) {
    return jsonResponse({ ok: false, error: 'verification_failed' }, 403);
  }

  const sender = env.CONTACT_FROM_EMAIL || DEFAULT_SENDER;
  let emailResponse: Response;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `网站联系表单（${email.replace(/["<>\\]/gu, '')}） <${sender}>`,
        to: [CONTACT_RECIPIENT],
        reply_to: email,
        subject: `【网站联系表单】${subject}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Subject: ${subject}`,
          '',
          'Message:',
          message,
        ].join('\n'),
      }),
    });
  } catch {
    console.error('Contact form could not reach the email provider.');
    return jsonResponse({ ok: false, error: 'delivery_unavailable' }, 502);
  }

  if (!emailResponse.ok) {
    console.error('Resend rejected a contact form submission.', emailResponse.status);
    return jsonResponse({ ok: false, error: 'delivery_failed' }, 502);
  }

  return jsonResponse({ ok: true });
};

export const onRequestGet = async (): Promise<Response> => (
  jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)
);
