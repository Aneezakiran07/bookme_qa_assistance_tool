// single choke point for sending email from the server. every caller
// goes through this file instead of talking to a provider directly, so
// swapping providers later only means editing this one file
//
// email is sent with AWS SES through the v3 sdk. this file only runs on
// the server, so the AWS keys never reach the browser
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

interface SendOptions {
  to: string
  subject: string
  html: string
  // plain text body, made from the html when it is not given
  text?: string
}

interface SesSettings {
  region: string
  accessKeyId: string
  secretAccessKey: string
  fromEmail: string
  fromName: string
}

// the client is kept between calls and only rebuilt when the settings change
let cachedClient: SESv2Client | null = null
let cachedClientKey = ''

function readSettings(): SesSettings {
  const ses = useRuntimeConfig().ses
  return {
    region: String(ses?.region ?? '').trim(),
    accessKeyId: String(ses?.accessKeyId ?? '').trim(),
    secretAccessKey: String(ses?.secretAccessKey ?? '').trim(),
    fromEmail: String(ses?.fromEmail ?? '').trim(),
    fromName: String(ses?.fromName ?? '').trim()
  }
}

// lists every missing setting at once so setup problems are easy to spot
function missingSettings(settings: SesSettings): string[] {
  const missing: string[] = []
  if (!settings.region) missing.push('SES_AWS_REGION')
  if (!settings.accessKeyId) missing.push('SES_AWS_ACCESS_KEY_ID')
  if (!settings.secretAccessKey) missing.push('SES_AWS_SECRET_ACCESS_KEY')
  if (!settings.fromEmail) missing.push('SES_FROM_EMAIL')
  return missing
}

function getClient(settings: SesSettings): SESv2Client {
  const key = [settings.region, settings.accessKeyId, settings.secretAccessKey].join('|')
  if (!cachedClient || key !== cachedClientKey) {
    cachedClient = new SESv2Client({
      region: settings.region,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey
      }
    })
    cachedClientKey = key
  }
  return cachedClient
}

// builds the from header, with the display name when one is set
function formatFrom(settings: SesSettings): string {
  if (!settings.fromName) return settings.fromEmail
  const safeName = settings.fromName.replace(/["\\\r\n]/g, '')
  return `"${safeName}" <${settings.fromEmail}>`
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

// turns the html body into a readable plain text body. links keep their
// address in brackets so nothing is lost when the html is not shown
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => {
      const cleanLabel = String(label).replace(/<[^>]+>/g, '').trim()
      return cleanLabel && cleanLabel !== href ? `${cleanLabel} (${href})` : String(href)
    })
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// SES accounts start in sandbox mode, where mail only reaches verified
// recipients until AWS grants production access. these errors are logged
// in plain words so nobody has to guess why a send failed
function explainSesError(error: any): string {
  const name = String(error?.name ?? '')
  const message = String(error?.message ?? '')
  if (name === 'MessageRejected' && /not verified/i.test(message)) {
    return 'SES refused the message because an address is not verified. If the account is still in sandbox mode, both the sender and the recipient must be verified until AWS grants production access. Detail: ' + message
  }
  if (name === 'MessageRejected') return 'SES rejected the message. Detail: ' + message
  if (name === 'AccountSuspendedException') return 'The SES account is suspended. Detail: ' + message
  if (name === 'SendingPausedException') return 'Sending is paused on the SES account. Detail: ' + message
  if (name === 'MailFromDomainNotVerifiedException') return 'The sending domain is not verified in SES. Detail: ' + message
  if (name === 'NotFoundException') return 'SES could not find the sender identity. Detail: ' + message
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') return 'SES rate or quota limit reached. Detail: ' + message
  if (name === 'UnrecognizedClientException' || name === 'InvalidSignatureException' || name === 'AccessDeniedException') {
    return 'AWS rejected the credentials or the permissions. Detail: ' + message
  }
  return `${name || 'Error'}: ${message || 'unknown error'}`
}

// sends one email and throws when it fails. the bug assignment emails and
// the helpers below all call this and decide for themselves what to do
// with a failure
export async function sendEmail({ to, subject, html, text }: SendOptions): Promise<void> {
  const settings = readSettings()
  const plainText = text ?? htmlToText(html)

  // local development with no AWS key prints the email to the console
  // instead of sending it. this never happens in production
  if (!settings.accessKeyId && process.env.NODE_ENV !== 'production') {
    console.log(`[email] SES is not configured, printing instead of sending\nTo: ${to}\nSubject: ${subject}\n\n${plainText}\n`)
    return
  }

  const missing = missingSettings(settings)
  if (missing.length) {
    throw new Error(`SES is not configured. Missing environment variables: ${missing.join(', ')}`)
  }

  try {
    await getClient(settings).send(
      new SendEmailCommand({
        FromEmailAddress: formatFrom(settings),
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: plainText, Charset: 'UTF-8' }
            }
          }
        }
      })
    )
  } catch (error) {
    throw new Error(explainSesError(error))
  }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function linkEmailHtml(heading: string, lines: string[], buttonLabel: string, url: string): string {
  const safeUrl = escapeAttr(url)
  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; max-width: 480px;">
      <h2 style="font-size: 18px; margin: 0 0 12px;">${heading}</h2>
      ${lines.map((line) => `<p style="margin: 0 0 12px;">${line}</p>`).join('')}
      <p style="margin: 20px 0;">
        <a href="${safeUrl}" style="background: #245CB1; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">${buttonLabel}</a>
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">If the button does not work, copy this link into your browser: ${safeUrl}</p>
    </div>
  `
}

// shared by the helpers below. a failure is logged without the link and
// turns into false instead of throwing, so a request never crashes on email
async function sendHelperEmail(kind: string, options: SendOptions): Promise<boolean> {
  try {
    await sendEmail(options)
    return true
  } catch (error: any) {
    console.error(`[email] ${kind} email to ${options.to} failed:`, error?.message ?? error)
    return false
  }
}

export async function sendInviteEmail(to: string, inviteUrl: string): Promise<boolean> {
  const html = linkEmailHtml(
    'You have been invited to the Bookme QA Tool',
    ['Use the button below to set your password and join the team.', 'This link is valid for 7 days.'],
    'Accept invite',
    inviteUrl
  )
  return sendHelperEmail('invite', { to, subject: 'You have been invited to the Bookme QA Tool', html })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = linkEmailHtml(
    'Reset your password',
    [
      'Use the button below to choose a new password.',
      'This link is valid for 1 hour. If you did not ask for this, you can ignore this email.'
    ],
    'Reset password',
    resetUrl
  )
  return sendHelperEmail('password reset', { to, subject: 'Reset your Bookme QA Tool password', html })
}

// the daily digest route builds the subject and the html for each person,
// so digestData carries those two fields and this helper only delivers them
export async function sendDailyDigestEmail(to: string, digestData: unknown): Promise<boolean> {
  const data = digestData as { subject?: unknown; html?: unknown; text?: unknown } | null
  if (!data || typeof data.subject !== 'string' || typeof data.html !== 'string') {
    console.error(`[email] daily digest for ${to} was skipped because the digest data was not valid`)
    return false
  }
  return sendHelperEmail('daily digest', {
    to,
    subject: data.subject,
    html: data.html,
    text: typeof data.text === 'string' ? data.text : undefined
  })
}
