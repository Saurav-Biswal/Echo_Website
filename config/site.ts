export const site = {
  brand: 'Echo',
  description: 'A personal memory assistant for the useful things you find online.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'echo_with_ss@gmail.com',
  team: [] as { name: string; role: string }[],
  social: {} as Record<string, string>,
  legalEntity: '',
  copyright: 'Echo',
};

export const plans = {
  free: { name: 'Echo Free', price: 'Free', status: 'Product access and exact limits need founder confirmation.' },
  premium: { name: 'Echo Premium', trial: '7 days', monthly: '₹99 / month', halfYear: '₹549 / 6 months', annual: '₹999 / year', status: 'Proposed pricing — not available for purchase.' },
};

export const capabilityStatus = 'Echo is still being built; app availability and supported features will be confirmed before launch.';
