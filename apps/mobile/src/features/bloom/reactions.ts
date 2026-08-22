export const REACTION_OPTIONS = [
  { code: '\u2764\uFE0F', icon: '\u2764\uFE0F' },
  { code: '\u{1F60A}', icon: '\u{1F60A}' },
  { code: '\u{1F602}', icon: '\u{1F602}' },
  { code: '\u{1F622}', icon: '\u{1F622}' },
  { code: '\u{1F525}', icon: '\u{1F525}' },
  { code: '\u{1F44F}', icon: '\u{1F44F}' },
] as const;

export type ReactionCode = (typeof REACTION_OPTIONS)[number]['code'];
