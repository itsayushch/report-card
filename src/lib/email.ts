import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface SendEmailParams {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.warn('SendGrid FROM email not configured. Email not sent.')
    return { success: false, error: 'Email sender not configured' }
  }

  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
      html,
    })

    console.log(`Email sent successfully to ${to}`)
    return { success: true }
  } catch (error: any) {
    console.error('SendGrid error:', error?.response?.body || error)
    return { success: false, error: error?.message || 'Failed to send email' }
  }
}

export async function sendPasswordResetEmail(email: string, tempPassword: string, name: string) {
  const subject = "Password Reset - St. Helen's School"
  
  const text = `
Hello ${name},

You have requested a password reset for your St. Helen's School account.

Your temporary password is: ${tempPassword}

Please follow these steps:
1. Login with your email and this temporary password
2. Go to your profile page
3. Change your password immediately

For security reasons, you will be required to change this temporary password on your next login.

If you did not request this password reset, please contact the school administrator immediately.

Best regards,
St. Helen's School Administration
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">St. Helen's School</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Report Card Management System</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    <h2 style="color: #667eea; margin-top: 0;">Password Reset Request</h2>
    
    <p>Hello <strong>${name}</strong>,</p>
    
    <p>You have requested a password reset for your St. Helen's School account.</p>
    
    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your temporary password:</p>
      <p style="font-size: 24px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 2px; font-family: 'Courier New', monospace;">
        ${tempPassword}
      </p>
    </div>
    
    <h3 style="color: #333; font-size: 16px;">Next Steps:</h3>
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Login with your email and the temporary password above</li>
      <li style="margin-bottom: 10px;">Navigate to your Profile page</li>
      <li style="margin-bottom: 10px;">Change your password immediately</li>
    </ol>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>⚠️ Security Notice:</strong> You will be required to change this temporary password on your next login.
      </p>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you did not request this password reset, please contact the school administrator immediately.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Best regards,<br>
      St. Helen's School Administration<br>
      <a href="mailto:admin@sthelens.edu" style="color: #667eea; text-decoration: none;">admin@sthelens.edu</a>
    </p>
  </div>
</body>
</html>
  `.trim()

  return sendEmail({ to: email, subject, text, html })
}
