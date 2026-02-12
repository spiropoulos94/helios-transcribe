import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    session,
  };
}

/**
 * Check if email is allowed to register/login
 * Set ALLOWED_EMAILS env var as comma-separated list: "user1@org.gr,user2@org.gr"
 * If not set, access is open to all
 */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

  // If no restrictions set, allow all
  if (allowedEmails.length === 0) {
    return true;
  }

  const normalizedEmail = email.toLowerCase();
  return allowedEmails.includes(normalizedEmail);
}
