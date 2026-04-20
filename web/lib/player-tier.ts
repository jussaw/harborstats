export enum PlayerTier {
  Premium = 'premium',
  Standard = 'standard',
}

export const PLAYER_TIER_OPTIONS = [
  { value: PlayerTier.Premium, label: 'Premium' },
  { value: PlayerTier.Standard, label: 'Standard' },
] as const;

export function parsePlayerTier(value: string | null | undefined): PlayerTier {
  return value === PlayerTier.Premium ? PlayerTier.Premium : PlayerTier.Standard;
}
