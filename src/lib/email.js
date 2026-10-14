// Transactional email, sent through Harakumo Mail (./harakumo.js, one
// HARAKUMO_API_KEY). Without the key, sending fails with a clear error and the
// callers below log it; nothing else in the app depends on mail.
//
// Optional environment:
//   MAIL_FROM_NAME  display name on every email (default "Waklum")
//   MAIL_FROM       sender address on a domain you verified in Harakumo → Mail;
//                   leave empty to send from the shared no-reply address

import { sendViaHarakumo, isHarakumoConfigured } from "./harakumo";
// Escape every user-supplied value before it goes into an HTML email.
import { escapeHtml as esc } from "./utils";

const FROM_NAME = process.env.MAIL_FROM_NAME || "Waklum";
const FROM_ADDRESS = process.env.MAIL_FROM || "";

/**
 * Derive a plain-text alternative from an HTML body. Multipart mail scores better
 * with spam filters than HTML alone. The templates below use inline styles only
 * (no <style> blocks), so tag stripping produces clean text.
 */
function htmlToText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Send one transactional email.
 *
 * Returns `{ data, error }` rather than throwing, so every caller below keeps
 * its existing error handling.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isHarakumoConfigured()) {
    return { data: null, error: new Error("Email is not configured: set HARAKUMO_API_KEY") };
  }
  try {
    const data = await sendViaHarakumo({
      to,
      subject,
      html,
      text: text || htmlToText(html),
      fromName: FROM_NAME,
      from: FROM_ADDRESS || undefined,
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Send a workspace invite email
 */
export async function sendInviteEmail({ to, inviterName, orgName, role, token }) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  
  const { data, error } = await sendEmail({
    to,
    subject: `${inviterName} invited you to ${orgName} on Waklum`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">W</div>
            <h1 style="color:white;font-size:24px;margin:12px 0 0;">Waklum</h1>
          </div>
          
          <div style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;text-align:center;">
            <h2 style="color:white;font-size:20px;margin:0 0 8px;">You've been invited!</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:white;">${esc(inviterName)}</strong> has invited you to join 
              <strong style="color:white;">${esc(orgName)}</strong> as a <strong style="color:#60a5fa;">${esc(role)}</strong>.
            </p>
            
            <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Accept Invitation
            </a>
            
            <p style="color:#6b7280;font-size:12px;margin:24px 0 0;line-height:1.5;">
              This invite expires in 7 days.<br>
              If you didn't expect this, you can safely ignore it.
            </p>
          </div>
          
          <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;">
            Waklum — AI-Powered Project Management
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Failed to send invite email:', error);
    throw new Error('Failed to send invite email');
  }

  return data;
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
  
  const { data, error } = await sendEmail({
    to,
    subject: 'Reset your Waklum password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">W</div>
            <h1 style="color:white;font-size:24px;margin:12px 0 0;">Waklum</h1>
          </div>
          
          <div style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;text-align:center;">
            <h2 style="color:white;font-size:20px;margin:0 0 8px;">Reset Your Password</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi <strong style="color:white;">${esc(name)}</strong>, we received a request to reset your password. Click the button below to choose a new one.
            </p>
            
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Reset Password
            </a>
            
            <p style="color:#6b7280;font-size:12px;margin:24px 0 0;line-height:1.5;">
              This link expires in 1 hour.<br>
              If you didn't request this, you can safely ignore it.
            </p>
          </div>
          
          <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;">
            Waklum — AI-Powered Project Management
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }

  return data;
}

/**
 * Send a task assignment notification email
 */
export async function sendTaskAssignmentEmail({ to, assignerName, taskTitle, projectName, taskUrl }) {
  const { data, error } = await sendEmail({
    to,
    subject: `${assignerName} assigned you a task in ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">W</div>
          </div>
          
          <div style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;">
            <p style="color:#9ca3af;font-size:14px;margin:0 0 4px;">New task assignment</p>
            <h2 style="color:white;font-size:18px;margin:0 0 16px;">${esc(taskTitle)}</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:white;">${esc(assignerName)}</strong> assigned you this task in <strong style="color:#60a5fa;">${esc(projectName)}</strong>.
            </p>
            
            <a href="${taskUrl || process.env.NEXT_PUBLIC_APP_URL + '/dashboard'}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
              View Task
            </a>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Failed to send task assignment email:', error);
  }

  return data;
}

/**
 * Send email when an existing user is added to a project
 */
export async function sendProjectAddedEmail({ to, adderName, projectName, role, projectUrl }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await sendEmail({
    to,
    subject: `You've been added to "${projectName}" on Waklum`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">W</div>
            <h1 style="color:white;font-size:24px;margin:12px 0 0;">Waklum</h1>
          </div>
          
          <div style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);margin:0 auto 16px;line-height:56px;font-size:24px;">✓</div>
            <h2 style="color:white;font-size:20px;margin:0 0 8px;">You've been added to a project!</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
              <strong style="color:white;">${esc(adderName)}</strong> added you to 
              <strong style="color:white;">${esc(projectName)}</strong> as a <strong style="color:#60a5fa;">${esc(role || 'member')}</strong>.
            </p>
            
            <a href="${projectUrl || appUrl + '/dashboard'}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Open Project
            </a>
          </div>
          
          <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;">
            Waklum — AI-Powered Project Management
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Failed to send project added email:', error);
  }

  return data;
}

/**
 * Send invitation email for non-registered users to join a specific project
 */
export async function sendProjectInviteEmail({ to, inviterName, projectName, orgName, token }) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

  const { data, error } = await sendEmail({
    to,
    subject: `${inviterName} invited you to "${projectName}" on Waklum`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">W</div>
            <h1 style="color:white;font-size:24px;margin:12px 0 0;">Waklum</h1>
          </div>
          
          <div style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;text-align:center;">
            <h2 style="color:white;font-size:20px;margin:0 0 8px;">You're invited to a project!</h2>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 8px;">
              <strong style="color:white;">${esc(inviterName)}</strong> invited you to collaborate on
            </p>
            <p style="margin:0 0 24px;">
              <strong style="color:#60a5fa;font-size:16px;">${esc(projectName)}</strong>
              <br/>
              <span style="color:#6b7280;font-size:12px;">in ${esc(orgName)}</span>
            </p>
            
            <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Accept Invitation
            </a>
            
            <p style="color:#6b7280;font-size:12px;margin:24px 0 0;line-height:1.5;">
              You'll need to create a free account to get started.<br/>
              This invite expires in 7 days.
            </p>
          </div>
          
          <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;">
            Waklum — AI-Powered Project Management
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Failed to send project invite email:', error);
  }

  return data;
}

