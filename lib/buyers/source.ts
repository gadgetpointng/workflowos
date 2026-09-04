export const buyerSources = ['facebook','facebook_marketplace','instagram','whatsapp','tiktok','jiji','jumia','konga','google','website','phone','referral','walk_in','other'] as const;
export type BuyerSource = typeof buyerSources[number];

export function normalizeBuyerSource(value: unknown): BuyerSource {
  const source = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (source.includes('marketplace') && source.includes('facebook')) return 'facebook_marketplace';
  if (source === 'fb' || source.includes('facebook') || source.includes('meta_lead')) return 'facebook';
  if (source === 'ig' || source.includes('instagram')) return 'instagram';
  if (source.includes('whatsapp') || source === 'wa') return 'whatsapp';
  if (source.includes('tiktok') || source.includes('tik_tok')) return 'tiktok';
  if (source.includes('jiji')) return 'jiji';
  if (source.includes('jumia')) return 'jumia';
  if (source.includes('konga')) return 'konga';
  if (source.includes('google') || source.includes('maps') || source.includes('business_profile')) return 'google';
  if (source.includes('website') || source.includes('web') || source.includes('gadgetpoint')) return 'website';
  if (source.includes('phone') || source.includes('call')) return 'phone';
  if (source.includes('referr')) return 'referral';
  if (source.includes('walk') || source.includes('store') || source.includes('shop')) return 'walk_in';
  return 'other';
}
