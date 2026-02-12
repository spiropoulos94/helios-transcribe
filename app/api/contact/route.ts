import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface ContactRequestBody {
  name: string;
  email: string;
  telephone?: string;
  organization?: string;
  message?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contact
 * Handles contact form submissions - sends email notification
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContactRequestBody = await request.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Log the request (visible in Railway logs)
    console.log('[Contact] New access request:');
    console.log(`  Name: ${body.name}`);
    console.log(`  Email: ${body.email}`);
    console.log(`  Telephone: ${body.telephone || '(not provided)'}`);
    console.log(`  Organization: ${body.organization || '(not provided)'}`);
    console.log(`  Message: ${body.message || '(not provided)'}`);

    // Send email notification via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'grechopersonal@gmail.com',
        subject: `New Access Request: ${body.name}`,
        html: `
          <h2>New Grecho Access Request</h2>
          <p><strong>Name:</strong> ${body.name}</p>
          <p><strong>Email:</strong> ${body.email}</p>
          <p><strong>Telephone:</strong> ${body.telephone || 'Not provided'}</p>
          <p><strong>Organization:</strong> ${body.organization || 'Not provided'}</p>
          <p><strong>Message:</strong> ${body.message || 'Not provided'}</p>
        `,
      });
      console.log('[Contact] Email notification sent');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Contact] Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
