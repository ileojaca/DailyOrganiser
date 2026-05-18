import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyAuthToken, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return NextResponse.json({ error: 'Return URL is required' }, { status: 400 });
    }

    // Get user's Stripe customer ID
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
