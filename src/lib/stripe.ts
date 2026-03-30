import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Create a mock Stripe client for development/builds without Stripe configured
const createMockStripe = (): Stripe => {
  return {
    customers: {
      create: async () => ({ id: 'mock-customer-id', email: 'mock@example.com' }),
      retrieve: async () => ({ id: 'mock-customer-id', email: 'mock@example.com' }),
    },
    checkout: {
      sessions: {
        create: async () => ({ id: 'mock-session-id', url: 'https://example.com/checkout' }),
      },
    },
    subscriptions: {
      list: async () => ({ data: [] }),
      retrieve: async () => ({ id: 'mock-subscription-id', status: 'active' }),
      cancel: async () => ({ id: 'mock-subscription-id', status: 'canceled' }),
    },
    billingPortal: {
      sessions: {
        create: async () => ({ url: 'https://example.com/billing' }),
      },
    },
    webhooks: {
      constructEvent: () => ({ type: 'mock.event', data: { object: {} } }),
    },
  } as unknown as Stripe;
};

// Export the Stripe client (real or mock)
export const stripe: Stripe = !stripeSecretKey || stripeSecretKey === ''
  ? createMockStripe()
  : new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Basic task management',
      'Limited AI suggestions (10/day)',
      'Standard scheduling',
      'Email support',
    ],
    limits: {
      aiSuggestionsPerDay: 10,
      tasksPerMonth: 100,
      teamMembers: 1,
    },
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_mock',
    features: [
      'Unlimited AI suggestions',
      'Advanced scheduling algorithms',
      'Productivity insights',
      'Priority support',
      'Custom themes',
    ],
    limits: {
      aiSuggestionsPerDay: -1, // unlimited
      tasksPerMonth: -1,
      teamMembers: 1,
    },
  },
  team: {
    name: 'Team',
    price: 29.99,
    priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_mock',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared workspaces',
      'Team analytics',
      'Admin dashboard',
      'API access',
    ],
    limits: {
      aiSuggestionsPerDay: -1,
      tasksPerMonth: -1,
      teamMembers: 10,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Helper to get tier by price ID
export function getTierByPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if ('priceId' in config && config.priceId === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return null;
}
