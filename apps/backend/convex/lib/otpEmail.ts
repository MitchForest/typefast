import { Resend } from "resend";

export const OTP_EXPIRY_SECONDS = 300;
const OTP_EXPIRY_MINUTES = Math.floor(OTP_EXPIRY_SECONDS / 60);

type VerificationEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

type OtpEmailInput = {
  email: string;
  otp: string;
  type: VerificationEmailType;
};

function renderOtpEmail({ email, otp }: OtpEmailInput) {
  const subject = `${otp} is your TypeFast code`;

  const html = `
    <div style="margin:0;background:#f7f5f0;padding:40px 16px;font-family:Nunito,'Nunito Sans',system-ui,sans-serif;color:#3c3c3c;">
      <div style="margin:0 auto;max-width:420px;border:1px solid #e5e0d8;border-radius:20px;background:#ffffff;box-shadow:0 2px 0 0 #e5e0d8;overflow:hidden;">
        <div style="padding:28px 28px 0;">
          <div style="font-size:18px;font-weight:900;color:#3c3c3c;letter-spacing:-0.01em;">TypeFast</div>
        </div>
        <div style="padding:32px 28px;text-align:center;">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#afafaf;margin-bottom:12px;">Your code</div>
          <div style="display:inline-block;padding:16px 32px;border-radius:14px;border:2px solid #e5e0d8;background:#fbfaf6;font-size:36px;font-weight:900;letter-spacing:0.3em;text-indent:0.3em;color:#3c3c3c;">${otp}</div>
          <div style="margin-top:16px;font-size:14px;color:#777777;line-height:1.5;">
            Expires in ${OTP_EXPIRY_MINUTES} minutes.
          </div>
        </div>
        <div style="padding:0 28px 24px;font-size:13px;color:#afafaf;line-height:1.5;">
          If you didn't request this, ignore this email.
        </div>
      </div>
    </div>
  `;

  const text = [
    `${otp} is your TypeFast code`,
    "",
    `Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    `This code is tied to ${email}.`,
    "",
    "If you didn't request this, ignore this email.",
    "",
    "TypeFast",
  ].join("\n");

  return { subject, html, text };
}

export async function sendOtpEmail(input: OtpEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL ?? "TypeFast <onboarding@resend.dev>";
  const email = renderOtpEmail(input);

  await resend.emails.send({
    from,
    to: input.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
