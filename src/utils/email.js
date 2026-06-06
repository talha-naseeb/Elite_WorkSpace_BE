const { transporter, verifyTransport } = require("../services/email/email.transport");

const DEFAULT_FRONTEND_URL = "https://elite-work-space-fe.vercel.app";
const BRAND_NAME = "Workspace Elite";

const theme = {
  background: "#070b14",
  card: "#0b1020",
  cardSoft: "#111827",
  foreground: "#f1f5f9",
  muted: "#a4afc2",
  subtle: "#64748b",
  border: "#273044",
  button: "#f1f5f9",
  buttonText: "#070b14",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

verifyTransport();

const getFrontendUrl = () => (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");

const buildAppUrl = (pathname, params = {}) => {
  const url = new URL(pathname, `${getFrontendUrl()}/`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderButton = ({ href, label }) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
    <tr>
      <td style="border-radius: 999px; background: ${theme.button}; box-shadow: 0 18px 35px rgba(241, 245, 249, 0.16);">
        <a href="${href}" style="display: inline-block; padding: 14px 28px; color: ${theme.buttonText}; font-size: 14px; font-weight: 800; letter-spacing: 0.01em; text-decoration: none; border-radius: 999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>
`;

const renderPanel = (content) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border: 1px solid ${theme.border}; border-radius: 18px; background: ${theme.cardSoft};">
    <tr>
      <td style="padding: 18px 20px; color: ${theme.foreground}; font-size: 14px; line-height: 1.7;">
        ${content}
      </td>
    </tr>
  </table>
`;

const renderEmail = ({ preheader, eyebrow, title, body, button, panel, note, tone = theme.success }) => `
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
    ${escapeHtml(preheader)}
  </div>
  <div style="margin: 0; padding: 0; background: ${theme.background};">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: ${theme.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td align="center" style="padding: 42px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; border: 1px solid ${theme.border}; border-radius: 28px; background: ${theme.card}; box-shadow: 0 28px 80px rgba(0, 0, 0, 0.38); overflow: hidden;">
            <tr>
              <td style="padding: 28px 32px; border-bottom: 1px solid ${theme.border}; background: linear-gradient(135deg, ${theme.card} 0%, #111827 100%);">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="color: ${theme.foreground}; font-size: 20px; font-weight: 850; letter-spacing: -0.03em;">
                      ${BRAND_NAME}
                    </td>
                    <td align="right">
                      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 999px; background: ${tone}; box-shadow: 0 0 22px ${tone};"></span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 38px 32px 32px;">
                <p style="margin: 0 0 14px; color: ${theme.muted}; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">
                  ${escapeHtml(eyebrow)}
                </p>
                <h1 style="margin: 0 0 18px; color: ${theme.foreground}; font-size: 30px; line-height: 1.18; letter-spacing: -0.04em;">
                  ${escapeHtml(title)}
                </h1>
                <div style="color: ${theme.muted}; font-size: 15px; line-height: 1.8;">
                  ${body}
                </div>
                ${panel || ""}
                ${button ? renderButton(button) : ""}
                <p style="margin: 24px 0 0; color: ${theme.subtle}; font-size: 13px; line-height: 1.7;">
                  ${note}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px 32px; border-top: 1px solid ${theme.border}; background: ${theme.cardSoft}; color: ${theme.subtle}; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const sendEmail = (mailOptions) => transporter.sendMail({ from: process.env.EMAIL_FROM, ...mailOptions });

// Send Reset Password Email
exports.sendResetPasswordEmail = async (email, token) => {
  const resetUrl = buildAppUrl("/reset-password", { token });

  const mailOptions = {
    to: email,
    subject: "Password Reset Request | Workspace Elite",
    html: renderEmail({
      preheader: "Reset your Workspace Elite password securely.",
      eyebrow: "Security Request",
      title: "Reset your password",
      body: `
        <p style="margin: 0 0 16px;">Hi there,</p>
        <p style="margin: 0;">We received a request to reset your password. Use the secure button below to choose a new password for your Workspace Elite account.</p>
      `,
      button: { href: resetUrl, label: "Reset Password" },
      note: "If you did not request this, you can ignore this email. This link expires in <strong style=\"color: #f1f5f9;\">24 hours</strong> for your security.",
      tone: theme.warning,
    }),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error) {
    throw new Error("Error sending reset password email");
  }
};

// Send Verification Email
exports.sendVerificationEmail = async (email, token) => {
  const verifyUrl = buildAppUrl("/verify-email", { token });

  const mailOptions = {
    to: email,
    subject: "Email Verification | Workspace Elite",
    html: renderEmail({
      preheader: "Verify your email to activate Workspace Elite.",
      eyebrow: "Account Verification",
      title: "Confirm your email",
      body: `
        <p style="margin: 0 0 16px;">Hi ${escapeHtml(email)},</p>
        <p style="margin: 0;">You are one step away from activating your Workspace Elite account. Confirm this email address to unlock your workspace.</p>
      `,
      button: { href: verifyUrl, label: "Verify Email" },
      note: "If you did not create an account, you can safely ignore this email. This link expires in <strong style=\"color: #f1f5f9;\">1 hour</strong>.",
    }),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error) {
    throw error;
  }
};

// Send Employee Credentials Email
exports.sendEmployeeCredentialsEmail = async (toEmail, plainPassword, verificationToken) => {
  const verifyUrl = buildAppUrl("/verify-email", { token: verificationToken });

  const mailOptions = {
    to: toEmail,
    subject: "Your Account Credentials | Workspace Elite",
    html: renderEmail({
      preheader: "Your Workspace Elite account is ready.",
      eyebrow: "Welcome",
      title: "Your workspace account is ready",
      body: `
        <p style="margin: 0 0 16px;">Hi ${escapeHtml(toEmail)},</p>
        <p style="margin: 0;">Your account has been created successfully. Use the temporary credentials below, then verify your email and update your password after your first login.</p>
      `,
      panel: renderPanel(`
        <p style="margin: 0 0 10px;"><strong style="color: ${theme.foreground};">Email:</strong> ${escapeHtml(toEmail)}</p>
        <p style="margin: 0;"><strong style="color: ${theme.foreground};">Temporary password:</strong> ${escapeHtml(plainPassword)}</p>
      `),
      button: { href: verifyUrl, label: "Verify and Continue" },
      note: "For your security, change this temporary password immediately after signing in.",
    }),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error) {
    throw error;
  }
};

// Send Password Changed Confirmation Email
exports.sendPasswordChangedEmail = async (email) => {
  const loginUrl = buildAppUrl("/auth/login");

  const mailOptions = {
    to: email,
    subject: "Security Alert: Password Changed | Workspace Elite",
    html: renderEmail({
      preheader: "Your Workspace Elite password was changed.",
      eyebrow: "Security Confirmation",
      title: "Password changed",
      body: `
        <p style="margin: 0 0 16px;">Hi ${escapeHtml(email)},</p>
        <p style="margin: 0;">This confirms that the password for your Workspace Elite account was changed successfully.</p>
      `,
      button: { href: loginUrl, label: "Login to Your Account" },
      note: "If you did not perform this action, contact support immediately so we can help secure your account.",
      tone: theme.danger,
    }),
  };

  try {
    await sendEmail(mailOptions);
  } catch (error) {
    // Non-blocking error
  }
};
