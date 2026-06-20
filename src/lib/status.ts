import { StatusTier } from '../types';

// --- DYNAMIC VISUAL ACCENT COLOR CONFIGURATION ---
// You can manually tweak the warmth, brightness, saturation, and scales below to control color progression!
export const BRIGHTNESS_CONFIG = {
  // Orange/Amber Warmth Hue (default is 20. Try 15 for deep red-orange, 35 for classic orange, 45 for golden yellow, etc.)
  hue: 45,

  // --- LEARNER DASHBOARD BANNER COLOR CONFIGURATION ---
  // Controls how orange/saturated the banner becomes based on wisdom score
  banner: {
    minSaturation: 1,       // Starting saturation percentage for low scores
    maxSaturation: 45,       // Maximum allowed saturation percentage (lower = softer pastel color)
    saturationScale: 1.2,    // How much saturation increases per wisdom point (slower rise)
    
    maxLightness: 98.5,      // Starting lightness percentage (closer to 100% is brighter)
    minLightness: 90.0,      // Minimum allowed lightness percentage (higher = stays very bright/elegant)
    lightnessScale: 0.15,    // How much lightness decreases per wisdom point
  },

  // --- LEADERBOARD STATUS TIERS TABLE CONFIGURATION ---
  // Controls how orange/saturated the table rows are from top to bottom.
  leaderboard: {
    // Highly Recommended: Set this to true to scale colors linearly by row index (0 to 9).
    // This gives a perfectly uniform, smooth, and beautiful color gradient across all 10 tiers.
    // If set to false, it scales by the required badges count (which has large gaps like 0, 1, 3, 6, 10, ...).
    useIndexBasedProgression: true,

    // TIER INDEX BASED MODEL (Best for smooth, non-white top-to-bottom flow!)
    indexScale: {
      minSaturation: 22,       // Saturation for the very top row (Lounge Guest). Increase to make it more colorful!
      maxSaturation: 80,       // Saturation for the bottom row (Lounge Luminary)
      maxLightness: 96.0,      // Lightness for the top row. (Lower this to 93-95% for richer, more visible orange!)
      minLightness: 82.0,      // Lightness for the bottom row.
    },

    // BADGE COUNT BASED MODEL (Scales color strictly by badge requirements)
    badgeScale: {
      minSaturation: 30,       // Starting saturation percentage for 0 badges
      maxSaturation: 95,       // Maximum allowed saturation percentage
      saturationScale: 1,      // How much saturation increases per required badge
      maxLightness: 95.0,      // Starting lightness percentage for 0 badges. (Must be below 97% to see color!)
      minLightness: 75.0,      // Floor lightness percentage for the bottom-most tier
      lightnessScale: 0.4,     // How fast lightness decreases per required badge
    }
  }
};

/**
 * Generates the style object for the Learner Dashboard Banner
 */
export function getBannerBgStyle(wisdomPoints: number) {
  const { hue, banner } = BRIGHTNESS_CONFIG;
  const saturation = Math.min(banner.maxSaturation, banner.minSaturation + (wisdomPoints * banner.saturationScale));
  const lightness = Math.max(banner.minLightness, banner.maxLightness - (wisdomPoints * banner.lightnessScale));
  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
  };
}

/**
 * Generates the style object/variables for a Leaderboard row based on badges count and row index
 */
export function getLeaderboardRowStyle(badges: number, index: number = 0, totalTiersCount: number = 10) {
  const { hue, leaderboard } = BRIGHTNESS_CONFIG;
  let saturation = 0;
  let lightness = 100;

  if (leaderboard.useIndexBasedProgression) {
    const { minSaturation, maxSaturation, maxLightness, minLightness } = leaderboard.indexScale;
    const ratio = index / Math.max(1, totalTiersCount - 1); // 0 (top) to 1 (bottom)
    saturation = minSaturation + (ratio * (maxSaturation - minSaturation));
    lightness = maxLightness - (ratio * (maxLightness - minLightness));
  } else {
    const { minSaturation, maxSaturation, saturationScale, maxLightness, minLightness, lightnessScale } = leaderboard.badgeScale;
    saturation = Math.min(maxSaturation, minSaturation + (badges * saturationScale));
    lightness = Math.max(minLightness, maxLightness - (badges * lightnessScale));
  }
  
  const rowBg = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const badgeBg = `hsla(${hue}, ${Math.min(100, saturation + 20)}%, ${Math.max(20, lightness - 40)}%, 0.1)`;
  const badgeText = `hsl(${hue}, ${Math.min(100, saturation + 30)}%, ${Math.max(15, lightness - 50)}%)`;
  const bulletColor = `hsl(${hue}, ${Math.min(100, saturation + 25)}%, ${Math.max(25, lightness - 40)}%)`;

  return {
    rowBg,
    badgeBg,
    badgeText,
    bulletColor
  };
}

export const STATUS_TIERS: StatusTier[] = [
  {
    id: '1',
    name: 'Lounge Guest',
    requiredBadges: 0,
    perks: [
      'Officially A TWL Learner',
      'Access to the Central Library repository',
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