import type { GameConfig } from '../../types';

export type OnlineMode = 'standard' | 'powerscoring' | 'splitscore' | 'checkout';

export const ONLINE_MODES: readonly { value: OnlineMode; label: string; title: string }[] = [
  { value: 'standard', label: 'X01', title: 'Standard X01' },
  { value: 'powerscoring', label: 'Power', title: 'Power Scoring' },
  { value: 'splitscore', label: 'Split', title: 'Split Score' },
  { value: 'checkout', label: 'Checkout', title: 'Checkout-Training' }
];

export const ONLINE_START_SCORES = [301, 501, 701] as const;

export const OUT_MODES: readonly (readonly ['DO' | 'SO' | 'MO', string])[] = [
  ['DO', 'Double Out'],
  ['SO', 'Single Out'],
  ['MO', 'Master Out']
];

export const modeTitle = (mode?: string) =>
  (ONLINE_MODES.find(m => m.value === mode) ?? ONLINE_MODES[0]).title;

/** Die Regeln eines Raums als einzelne Bausteine, z. B. „501", „Bis 3 Legs", „Double Out". */
export const roomRuleParts = (settings: GameConfig): string[] => {
  switch (settings.mode) {
    case 'powerscoring':
      return ['Power Scoring', `${settings.rounds || 10} Runden`];
    case 'splitscore':
      return ['Split Score'];
    case 'checkout':
      return ['Checkout-Training', `${settings.checkoutTargets || 10} Ziele`, `${settings.checkoutRounds || 1} × pro Ziel`];
    default: {
      const out = OUT_MODES.find(([value]) => value === settings.outMode)?.[1] ?? settings.outMode;
      return [
        String(settings.startScore),
        ...(settings.setsToWin > 1 ? [`Bis ${settings.setsToWin} Sätze`] : []),
        `Bis ${settings.legsToWin} Legs`,
        out
      ];
    }
  }
};

/** Eine Zeile für Listen: „501 · DO · Bis 3 Legs". */
export const roomRulesLine = (settings?: GameConfig | null) => {
  if (!settings) return '';
  if (settings.mode && settings.mode !== 'standard') return roomRuleParts(settings).join(' · ');
  return [
    settings.startScore,
    settings.outMode,
    ...(settings.setsToWin > 1 ? [`Bis ${settings.setsToWin} Sätze`] : []),
    `Bis ${settings.legsToWin} Legs`
  ].join(' · ');
};
