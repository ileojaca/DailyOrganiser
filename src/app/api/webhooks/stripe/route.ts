import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;

  if (!userId || !priceId) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const tier = getTierFromPriceId(priceId);

  const db = getAdminDb();
  await db.collection('users').doc(userId).set({
    subscriptionTier: tier,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    subscriptionStatus: 'active',
    updatedAt: new Date(),
  }, { merge: true });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;

  const db = getAdminDb();
  const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (usersSnap.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }
  const uid = usersSnap.docs[0].id;

  const tier = getTierFromPriceId(priceId);

  await db.collection('users').doc(uid).set({
    subscriptionTier: tier,
    subscriptionStatus: status,
    updatedAt: new Date(),
  }, { merge: true });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const db = getAdminDb();
  const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (usersSnap.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }
  const uid = usersSnap.docs[0].id;

  await db.collection('users').doc(uid).set({
    subscriptionTier: 'free',
    subscriptionStatus: 'canceled',
    updatedAt: new Date(),
  }, { merge: true });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const db = getAdminDb();
  const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (usersSnap.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }
  const uid = usersSnap.docs[0].id;

  await db.collection('users').doc(uid).collection('paymentLogs').add({
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    createdAt: new Date(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const db = getAdminDb();
  const usersSnap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (usersSnap.empty) {
    console.error('User not found for customer:', customerId);
    return;
  }
  const uid = usersSnap.docs[0].id;

  await db.collection('users').doc(uid).collection('paymentLogs').add({
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    createdAt: new Date(),
  });

  console.log(`Payment failed for user ${uid}`);
}

function getTierFromPriceId(priceId: string): string {
  // Map Stripe price IDs to subscription tiers
  const priceToTier: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_TEAM_PRICE_ID || '']: 'team',
  };

  return priceToTier[priceId] || 'free';
}
