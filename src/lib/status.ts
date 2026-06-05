import { StatusTier } from '../types';

export const STATUS_TIERS: StatusTier[] = [
  {
    id: '1',
    name: 'Lounge Guest',
    requiredBadges: 0,
    perks: [
      'Officially A TWL Learner',
      'Eligibility to earn badges and progress through the ranks'
    ],
  },
  {
    id: '2',
    name: 'Seeker of Wisdom',
    requiredBadges: 1,
    perks: [
      'Priority registration for limited-capacity events',
      'Can propose new study focuses and initiatives',
      'Recognition as an active learner'
    ],
  },
  {
    id: '3',
    name: 'Avid Explorer',
    requiredBadges: 3,
    perks: [
      '5% discount on paid modules',
      'Priority consideration for lounge projects',
      'Access to selected bonus learning resources'
    ],
  },
  {
    id: '4',
    name: 'Lounge Scholar',
    requiredBadges: 6,
    perks: [
      '10% discount on paid modules',
      'Eligible to submit draft Articles for lounge review',
      'Access to additional research resources'
    ],
  },
  {
    id: '5',
    name: 'Wisdom Adept',
    requiredBadges: 10,
    perks: [
      '15% discount on paid modules',
      'Priority publishing slots in the Lounge Knowledge Base',
      'Recognition as a trusted contributor'
    ],
  },
  {
    id: '6',
    name: 'Lounge Vanguard',
    requiredBadges: 15,
    perks: [
      '20% discount on paid modules',
      'Special recognition in online sessions',
      'Access to exclusive academic article discussions and webinars'
    ],
  },
  {
    id: '7',
    name: 'Pillar of Wisdom',
    requiredBadges: 21,
    perks: [
      '30% discount on paid modules',
      'Priority review of proposals and submissions',
      'Special recognition across the wisdom lounge'
    ],
  },
  {
    id: '8',
    name: 'Bearer of Insight',
    requiredBadges: 25,
    perks: [
      '40% discount on paid modules',
      'Invited to write featured opinion articles on contemporary Islamic issues',
      'Priority access to limited-enrollment initiatives'
    ],
  },
  {
    id: '9',
    name: 'Eminent Sage',
    requiredBadges: 28,
    perks: [
      '50% discount on paid modules',
      'Exclusive access to lounge speakers',
      'Invitation to advisory discussions when needed'
    ],
  },
  {
    id: '10',
    name: 'Lounge Luminary',
    requiredBadges: 32,
    perks: [
      'Free access to all standard paid modules',
      'Permanent Elder recognition',
      'Direct editorial and review access to the Lounge Article repository'
    ],
  },
];

export function getLearnerStatus(badgeCount: number): StatusTier {
  // Sort from highest requirement to lowest
  const sortedTiers = [...STATUS_TIERS].sort((a, b) => b.requiredBadges - a.requiredBadges);
  
  for (const tier of sortedTiers) {
    if (badgeCount >= tier.requiredBadges) {
      return tier;
    }
  }
  
  // Default fallback (should be Lounge Guest)
  return STATUS_TIERS[0];
}

export function getStatusProgress(badgeCount: number): { current: StatusTier, next: StatusTier | null, progressPercent: number, badgesNeeded: number } {
  const sortedTiers = [...STATUS_TIERS].sort((a, b) => a.requiredBadges - b.requiredBadges);
  const current = getLearnerStatus(badgeCount);
  
  const currentIndex = sortedTiers.findIndex(t => t.id === current.id);
  const next = currentIndex < sortedTiers.length - 1 ? sortedTiers[currentIndex + 1] : null;

  if (!next) {
    return { current, next: null, progressPercent: 100, badgesNeeded: 0 };
  }

  const range = next.requiredBadges - current.requiredBadges;
  const currentBadges = badgeCount - current.requiredBadges;
  const progressPercent = Math.min(100, Math.max(0, (currentBadges / range) * 100));
  const badgesNeeded = next.requiredBadges - badgeCount;

  return { current, next, progressPercent, badgesNeeded };
}