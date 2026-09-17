// single choke point for sending email from the server. every caller
// (bug reassignment notice, end of day digest, anything added later)
// goes through this one function instead of talking to a provider
// directly, so swapping providers later only means editing this file.
//
// OneSignal is used for its transactional email channel, not as a
// generic SMTP relay, hence include_email_tokens rather than a normal
// "to" field. confirm the exact header format and payload shape
// against current OneSignal docs before relying on this in production.

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const config = useRuntimeConfig()

  await $fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Key ${config.oneSignal.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      app_id: config.oneSignal.appId,
      include_email_tokens: [to],
      email_subject: subject,
      email_body: html
    }
  })
}
