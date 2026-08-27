# Contact form delivery

The contact page submits in the browser to `/api/contact`; it does not open the visitor's email client. The endpoint is a Cloudflare Pages Function under `site/functions/api/contact.ts`.

## Free production setup

The current implementation uses:

- Cloudflare Pages Functions for the server-side endpoint;
- Resend's Free transactional-email plan for delivery to `onovich1110@gmail.com`;
- Cloudflare Turnstile Free for bot protection.

The recommended sender is `website@send.onovich.com`. The visitor's address is shown in the sender display name, while the actual `From` address remains the verified sender; it is also used as `Reply-To` so replies go back to the person who submitted the form. The visitor-provided subject is prefixed with `【网站联系表单】` to make the website source clear in the inbox.

## Required external configuration

1. Create a free Resend account and verify `send.onovich.com`.
2. Add the SPF/DKIM records Resend provides to the `onovich.com` Cloudflare DNS zone.
3. Create a Resend API key.
4. Create a Turnstile widget for `onovich.com` and copy its site key and secret key.
5. In the Cloudflare Pages project, add these production variables under **Settings → Variables and Secrets**:

   - `RESEND_API_KEY` — encrypted secret;
   - `TURNSTILE_SECRET_KEY` — encrypted secret;
   - `PUBLIC_TURNSTILE_SITEKEY` — plain build variable;
   - `CONTACT_FROM_EMAIL` — optional plain variable; defaults to `website@send.onovich.com`.

6. Redeploy the Pages project after saving the variables.

Do not put either API key in Git, the frontend bundle, or chat. The public site key may be present in the generated HTML; the Turnstile secret and Resend key must remain Cloudflare secrets.

## Production closeout

Verified on 2026-08-27 after the production deployment:

- [x] The English and Chinese contact pages load through `onovich.com`.
- [x] A real production submission passed Turnstile and reached `onovich1110@gmail.com`.
- [x] The received subject uses the `【网站联系表单】` prefix and includes the visitor's subject.
- [x] The visitor's address is visible in the sender display and is usable as `Reply-To`.
- [x] Name, email, subject, and message fields arrive in the email body.

This is an outbound-only contact form. An MX record or Resend's **Enable Receiving** option is not required unless the owner later wants to receive mail at `send.onovich.com`.

### Optional email hardening

DMARC is not required for the form to send mail because the Resend domain is already verified with SPF and DKIM. The optional monitoring policy was added on 2026-08-27 in the `onovich.com` Cloudflare DNS zone:

- Type: `TXT`
- Name: `_dmarc.send`
- Content: `v=DMARC1; p=none;`
- TTL: `Auto`

Keep `p=none` while observing authentication reports. Do not move directly to `quarantine` or `reject` without confirming that all legitimate senders for `send.onovich.com` pass SPF/DKIM alignment. No MX record or Resend receiving setup was added because this form is outbound-only.

## Safety behavior

- The function validates the origin, field lengths, email shape, request size, and a hidden honeypot field.
- Turnstile is validated server-side before Resend is called.
- The Turnstile widget is rendered only after the visitor submits the form, then reset and hidden after the attempt finishes.
- The function does not store submissions in this repository or a database; Resend handles delivery and its account retention policy applies.
- The visible email link remains as a manual fallback if the service is unavailable.
- The production delivery test is complete; future tests should use real but non-sensitive messages and confirm receipt at `onovich1110@gmail.com`.
