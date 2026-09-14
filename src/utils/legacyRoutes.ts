/**
 * Wohin ein alter Link auf `/offline` heute führt.
 *
 * Bis v1.17 lagen Match-Setup und Training als zwei Reiter unter `/offline`,
 * gesteuert über `?tab=` und `?mode=`. Seit v2.0.0 sind es die Routen `/play`
 * und `/training`. Lesezeichen, installierte PWAs und Links aus älteren Builds
 * zeigen noch auf die alte Adresse und sollen trotzdem dort landen, wo sie
 * hinwollten — samt Direktstart (`?start=1`) und Trainingsmodus.
 */
export const legacyOfflineTarget = (search: string): string => {
  const params = new URLSearchParams(search);

  if (params.get('tab') === 'training') {
    const mode = params.get('mode');
    return mode ? `/training?mode=${encodeURIComponent(mode)}` : '/training';
  }

  params.delete('tab');
  params.delete('mode');
  const rest = params.toString();
  return rest ? `/play?${rest}` : '/play';
};
