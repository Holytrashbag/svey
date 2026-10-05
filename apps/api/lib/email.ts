import nodemailer from 'nodemailer'
import { env } from './env.ts'

export type EmailMessage = { to: string; subject: string; text: string; html?: string }

// SMTP is optional. When unconfigured (local dev), emails are logged to the
// console — including the action link — instead of being sent.
const configured = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.EMAIL_FROM)

const transporter = configured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

/** Sends an email, or logs it in dev. Never throws (safe for fire-and-forget). */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!transporter) {
    console.warn(`[email] SMTP not configured — not sending.\n  to: ${msg.to}\n  subject: ${msg.subject}\n  ${msg.text}`)
    return
  }
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html })
  } catch (err) {
    console.error(`[email] failed to send to ${msg.to}:`, err)
  }
}

/**
 * Builds a minimal branded transactional email (plain text + HTML) with a single
 * call-to-action button. The URL is always included as plain text too, so the
 * email is usable even if the button can't be clicked.
 */
export function actionEmail(opts: {
  heading: string
  intro: string
  buttonLabel: string
  url: string
  outro?: string
}): { text: string; html: string } {
  const { heading, intro, buttonLabel, url, outro } = opts

  const text = [intro, '', url, '', outro ?? "If you didn't request this, you can safely ignore this email."]
    .filter((l) => l !== undefined)
    .join('\n')

  const html = `<!doctype html><html><body style="margin:0;background:#0A0B16;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#11131F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
      <tr><td style="color:#F5F4FB;font-size:20px;font-weight:700;padding-bottom:12px;">${heading}</td></tr>
      <tr><td style="color:#C4C1D8;font-size:14px;line-height:1.6;padding-bottom:24px;">${intro}</td></tr>
      <tr><td style="padding-bottom:24px;">
        <a href="${url}" style="display:inline-block;background:#8B5CF6;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px;">${buttonLabel}</a>
      </td></tr>
      <tr><td style="color:#7A7790;font-size:12px;line-height:1.6;word-break:break-all;">
        ${outro ?? "If you didn't request this, you can safely ignore this email."}<br><br>${url}
      </td></tr>
    </table>
    <div style="color:#5A586E;font-size:11px;padding-top:16px;">Svey</div>
  </td></tr></table>
</body></html>`

  return { text, html }
}
