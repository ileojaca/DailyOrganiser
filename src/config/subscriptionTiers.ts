export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  priceId: string; // Stripe price ID
  features: string[];
  limits: {
    aiSuggestionsPerDay: number;
    tasksPerMonth: number;
    teamMembers: number;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: '', // No Stripe price ID for free tier
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
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    features: [
      'Unlimited AI suggestions',
      'Advanced scheduling algorithms',
      'Productivity insights',
      'Priority support',
      'Custom themes',
    ],
    limits: {
      aiSuggestionsPerDay: -1, // -1 means unlimited
      tasksPerMonth: -1,
      teamMembers: 1,
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 29.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || 'price_team_monthly',
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
};

export function getTierById(tierId: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS[tierId];
}

export function getTierByPriceId(priceId: string): SubscriptionTier | undefined {
  return Object.values(SUBSCRIPTION_TIERS).find(tier => tier.priceId === priceId);
}
