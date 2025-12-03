# SendGrid Email Integration

This project uses SendGrid for sending password reset emails.

## Setup Instructions

1. **Create a SendGrid Account**
   - Go to [SendGrid](https://sendgrid.com/)
   - Sign up for a free account (100 emails/day)

2. **Generate API Key**
   - Login to SendGrid dashboard
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Give it a name (e.g., "St Helens School")
   - Select "Full Access" or at minimum "Mail Send" permissions
   - Click "Create & View"
   - **Copy the API key immediately** (you won't be able to see it again)

3. **Verify Sender Identity**
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Fill in your details:
     - From Name: "St. Helen's School"
     - From Email: Your verified email (e.g., noreply@sthelens.edu)
     - Reply To: Same or different email
   - Complete verification via email

4. **Add Environment Variables**
   
   Add to your `.env` file:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@sthelens.edu
   ```

5. **For Production (Vercel)**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add both `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
   - Redeploy your application

## Features

- ✅ Password reset emails with temporary password
- ✅ Professional HTML email template
- ✅ Automatic fallback in development (shows temp password in console/toast)
- ✅ Security: Doesn't reveal if email exists or not
- ✅ Forces password change on next login

## Email Template

The email includes:
- School branding
- Temporary password prominently displayed
- Step-by-step instructions
- Security warning
- Professional styling

## Testing

In development mode without SendGrid configured:
- The temporary password will be shown in the toast notification
- Check console logs for the temp password

With SendGrid configured:
- Email will be sent to the user's email address
- Check SendGrid dashboard → Activity Feed to monitor email delivery

## Troubleshooting

**Email not sending:**
- Verify API key is correct
- Check sender email is verified in SendGrid
- Review SendGrid Activity Feed for errors
- Check console logs for detailed error messages

**API Key invalid:**
- Make sure you copied the full API key
- Regenerate a new API key if needed
- Ensure no extra spaces in `.env` file

**Sender not verified:**
- Complete the single sender verification process
- For custom domains, set up domain authentication
