export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  // TODO: replace with real SMTP provider (e.g. nodemailer + SendGrid/SES)
  console.log(`[email] Password reset link for ${to}: ${resetUrl}`);
}
