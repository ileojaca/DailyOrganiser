import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
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

  // Determine subscription tier from price ID
  const tier = getTierFromPriceId(priceId);

  // Update user profile with subscription info
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: tier,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Error finding user for customer:', customerId);
    return;
  }

  const tier = getTierFromPriceId(priceId);

  // Update subscription status
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Error finding user for customer:', customerId);
    return;
  }

  // Downgrade to free tier
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', profile.user_id);

  if (error) {
    console.error('Error canceling subscription:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Error finding user for customer:', customerId);
    return;
  }

  // Log successful payment
  const { error } = await supabase
    .from('payment_logs')
    .insert({
      user_id: profile.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging payment:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (fetchError || !profile) {
    console.error('Error finding user for customer:', customerId);
    return;
  }

  // Log failed payment
  const { error } = await supabase
    .from('payment_logs')
    .insert({
      user_id: profile.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging payment:', error);
  }

  // Optionally notify user of failed payment
  console.log(`Payment failed for user ${profile.user_id}`);
}

function getTierFromPriceId(priceId: string): string {
  // Map Stripe price IDs to subscription tiers
  const priceToTier: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_TEAM_PRICE_ID || '']: 'team',
  };

  return priceToTier[priceId] || 'free';
}
