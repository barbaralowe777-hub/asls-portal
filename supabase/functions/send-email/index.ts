import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = 'noreply@aslsolutions.com.au';
const ADMIN_EMAIL = 'admin@aslsolutions.com.au';

interface EmailRequest {
  type: 'application_received' | 'application_approved' | 'application_rejected' | 'application_under_review';
  to: string;
  applicationData: any;
}

const emailTemplates = {
  application_received: (data: any) => ({
    subject: `Application Received - Reference #${data.referenceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1dad21, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Received</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${data.entityName},</p>
          <p>Thank you for submitting your vendor accreditation application with Australian Solar Lending Solutions.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1dad21;">Application Details:</h3>
            <p><strong>Reference Number:</strong> ${data.referenceNumber}</p>
            <p><strong>Business Name:</strong> ${data.entityName}</p>
            <p><strong>ABN:</strong> ${data.abnNumber}</p>
            <p><strong>Total Amount:</strong> $${data.totalAmount}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <h3>What happens next?</h3>
          <ul>
            <li>Our team will review your application within 24-48 hours</li>
            <li>We may contact you if additional information is required</li>
            <li>You'll receive an email once your application is approved</li>
          </ul>
          <p>If you have any questions, please contact us at support@aslsolutions.com.au</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">Australian Solar Lending Solutions<br>© 2025 All rights reserved</p>
          </div>
        </div>
      </div>
    `
  }),
  
  application_approved: (data: any) => ({
    subject: `Application Approved - Welcome to ASLS!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1dad21, #16a34a); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Application Approved!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${data.entityName},</p>
          <p>Great news! Your vendor accreditation application has been approved.</p>
          <div style="background: #d4f4dd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1dad21;">
            <h3 style="color: #1dad21; margin-top: 0;">You're now accredited!</h3>
            <p>You can now start submitting customer finance applications through our portal.</p>
          </div>
          <h3>Next Steps:</h3>
          <ol>
            <li>Log in to your vendor dashboard</li>
            <li>Complete your profile setup</li>
            <li>Start submitting customer applications</li>
            <li>Access training materials and resources</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://portal.aslsolutions.com.au" style="background: #1dad21; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Dashboard</a>
          </div>
          <p>Welcome to the ASLS family!</p>
        </div>
      </div>
    `
  }),
  
  application_rejected: (data: any) => ({
    subject: `Application Update - Additional Information Required`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Update</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${data.entityName},</p>
          <p>Thank you for your interest in becoming an accredited vendor with Australian Solar Lending Solutions.</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p>After reviewing your application, we require additional information or clarification before we can proceed.</p>
          </div>
          <p><strong>Reason:</strong> ${data.rejectionReason || 'Please contact our support team for more details.'}</p>
          <h3>What to do next:</h3>
          <ul>
            <li>Review the requirements listed above</li>
            <li>Gather the necessary documentation</li>
            <li>Contact our support team for assistance</li>
            <li>Resubmit your application when ready</li>
          </ul>
          <p>Our team is here to help. Please don't hesitate to reach out at support@aslsolutions.com.au</p>
        </div>
      </div>
    `
  }),
  
  application_under_review: (data: any) => ({
    subject: `Application Under Review - Reference #${data.referenceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Under Review</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${data.entityName},</p>
          <p>Your application is currently under review by our accreditation team.</p>
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p><strong>Status:</strong> Under Review</p>
            <p><strong>Expected completion:</strong> Within 24-48 hours</p>
          </div>
          <p>We'll notify you as soon as a decision has been made.</p>
          <p>If you have any questions in the meantime, please contact us at support@aslsolutions.com.au</p>
        </div>
      </div>
    `
  }),
  
  admin_notification: (data: any) => ({
    subject: `New Vendor Application - ${data.entityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6b7280; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Vendor Application</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Application Details:</h2>
          <table style="width: 100%; background: white; padding: 20px; border-radius: 8px;">
            <tr><td><strong>Reference:</strong></td><td>${data.referenceNumber}</td></tr>
            <tr><td><strong>Business Name:</strong></td><td>${data.entityName}</td></tr>
            <tr><td><strong>ABN:</strong></td><td>${data.abnNumber}</td></tr>
            <tr><td><strong>Contact Email:</strong></td><td>${data.email}</td></tr>
            <tr><td><strong>Phone:</strong></td><td>${data.phone}</td></tr>
            <tr><td><strong>Total Amount:</strong></td><td>$${data.totalAmount}</td></tr>
            <tr><td><strong>Submitted:</strong></td><td>${new Date().toLocaleString()}</td></tr>
          </table>
          <h3>Supplier Information:</h3>
          <table style="width: 100%; background: white; padding: 20px; border-radius: 8px; margin-top: 10px;">
            <tr><td><strong>Supplier Name:</strong></td><td>${data.supplierBusinessName}</td></tr>
            <tr><td><strong>Supplier ABN:</strong></td><td>${data.supplierAbn}</td></tr>
            <tr><td><strong>Agent:</strong></td><td>${data.agentFirstName} ${data.agentLastName}</td></tr>
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://admin.aslsolutions.com.au/applications/${data.referenceNumber}" style="background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Application</a>
          </div>
        </div>
      </div>
    `
  })
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { type, to, applicationData } = await req.json() as EmailRequest;
    
    // Get the appropriate template
    const template = emailTemplates[type](applicationData);
    
    // Send email to applicant
    const applicantResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'Australian Solar Lending Solutions' },
        subject: template.subject,
        content: [{ type: 'text/html', value: template.html }],
      }),
    });

    // Send notification to admin for new applications
    if (type === 'application_received') {
      const adminTemplate = emailTemplates.admin_notification(applicationData);
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
          from: { email: FROM_EMAIL, name: 'ASLS System' },
          subject: adminTemplate.subject,
          content: [{ type: 'text/html', value: adminTemplate.html }],
        }),
      });
    }

    if (!applicantResponse.ok) {
      throw new Error(`SendGrid error: ${applicantResponse.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});