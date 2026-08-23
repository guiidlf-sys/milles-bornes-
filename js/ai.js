import { evaluatePlay, evaluateHazardTarget, getActivePlayer } from './game.js';

// Choisit la meilleure action pour l'IA à partir de son état actuel.
// Retourne { kind: 'play', cardId, targetId? } ou { kind: 'discard', cardId }
export function chooseAiAction(state) {
  const player = getActivePlayer(state);
  const hand = player.hand.map((id) => state.cardsById.get(id));

  const playable = [];
  for (const card of hand) {
    const res = evaluatePlay(state, player, card);
    if (!res.ok) continue;
    if (card.type === 'hazard') {
      const targets = state.players.filter(
        (p) => p.id !== player.id && evaluateHazardTarget(state, player, card, p).ok
      );
      if (targets.length > 0) playable.push({ card, targets });
    } else {
      playable.push({ card, targets: null });
    }
  }

  // Priorité 1 : redémarrer / réparer sa propre voiture
  const priorityOrder = ['roll', 'repairs', 'gasoline', 'spare-tire', 'end-of-limit'];
  for (const subtype of priorityOrder) {
    const found = playable.find((p) => p.card.subtype === subtype);
    if (found) return { kind: 'play', cardId: found.card.id };
  }

  // Priorité 2 : jouer une botte de sécurité (bonus de rejouer)
  const safety = playable.find((p) => p.card.type === 'safety');
  if (safety) return { kind: 'play', cardId: safety.card.id };

  // Priorité 3 : avancer avec la plus grande distance jouable
  const distances = playable
    .filter((p) => p.card.type === 'distance')
    .sort((a, b) => b.card.value - a.card.value);
  if (distances.length > 0) {
    return { kind: 'play', cardId: distances[0].card.id };
  }

  // Priorité 4 : attaquer l'adversaire le plus avancé
  const attacks = playable.filter((p) => p.card.type === 'hazard');
  if (attacks.length > 0) {
    // Préfère Stop/Accident/Panne/Crevaison sur le leader, sinon limite de vitesse
    attacks.sort((a, b) => {
      const bestA = a.targets.reduce((m, t) => Math.max(m, t.distance), -1);
      const bestB = b.targets.reduce((m, t) => Math.max(m, t.distance), -1);
      return bestB - bestA;
    });
    const chosen = attacks[0];
    const target = chosen.targets.reduce((best, t) => (t.distance > best.distance ? t : best), chosen.targets[0]);
    return { kind: 'play', cardId: chosen.card.id, targetId: target.id };
  }

  // Sinon : défausser la carte la moins utile (attaque non jouable, sinon la première)
  const uselessHazard = hand.find((c) => c.type === 'hazard');
  const toDiscard = uselessHazard || hand[0];
  return { kind: 'discard', cardId: toDiscard.id };
}
