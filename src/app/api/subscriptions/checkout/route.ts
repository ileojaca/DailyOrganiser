import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyAuthToken, getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyAuthToken(request);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get or create Stripe customer
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    let customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      const userRecord = await getAdminAuth().getUser(uid);
      const customer = await stripe.customers.create({
        email: userRecord.email,
        metadata: { userId: uid },
      });
      customerId = customer.id;
      await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: uid,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
