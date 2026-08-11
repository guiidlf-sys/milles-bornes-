import { buildDeck, shuffle, HAZARD_TO_SAFETY, SAFETY_COUNTERS } from './cards.js';

const GOAL = 1000;
const HAND_SIZE = 6;

export function createGame(playerConfigs) {
  const deck = shuffle(buildDeck());

  const players = playerConfigs.map((cfg, i) => ({
    id: `p${i}`,
    name: cfg.name,
    isAI: cfg.isAI,
    hand: [],
    battleStatus: 'unstarted', // unstarted | rolling | accident | out-of-gas | flat-tire | stop
    speedStatus: 'normal', // normal | limited
    safeties: new Set(),
    safetyCards: [],
    battlePile: [],
    speedPile: [],
    distancePile: [],
    distance: 0,
    count200: 0,
    coupFourreCount: 0,
    everHit: false,
  }));

  const state = {
    phase: 'playing',
    players,
    cardsById: new Map(),
    deck,
    discardPile: [],
    turnOrder: players.map((p) => p.id),
    turnIndex: 0,
    insertedQueue: [],
    activePlayerId: players[0].id,
    turnStage: 'needs-draw', // needs-draw | needs-action
    selectedCardId: null,
    pendingCoupFourre: null,
    log: [],
    winnerId: null,
  };

  for (const c of deck) state.cardsById.set(c.id, c);

  state.subtypeInfo = {};
  for (const c of deck) {
    if (!state.subtypeInfo[c.subtype]) {
      state.subtypeInfo[c.subtype] = { icon: c.icon, label: c.label, type: c.type };
    }
  }

  // Distribution initiale
  for (let round = 0; round < HAND_SIZE; round++) {
    for (const p of players) {
      dealOne(state, p);
    }
  }

  logMsg(state, `La partie commence ! ${players.map((p) => p.name).join(', ')} — objectif ${GOAL} bornes.`);
  return state;
}

function dealOne(state, player) {
  if (state.deck.length === 0) reshuffleDiscardIntoDeck(state);
  if (state.deck.length === 0) return null;
  const card = state.deck.pop();
  player.hand.push(card.id);
  return card;
}

function reshuffleDiscardIntoDeck(state) {
  if (state.discardPile.length === 0) return;
  state.deck = shuffle(state.discardPile);
  state.discardPile = [];
  logMsg(state, 'La pioche est vide : la défausse est remélangée.');
}

function getPlayer(state, id) {
  return state.players.find((p) => p.id === id);
}

function getCard(state, id) {
  return state.cardsById.get(id);
}

function logMsg(state, text) {
  state.log.push(text);
  if (state.log.length > 200) state.log.shift();
}

export function getActivePlayer(state) {
  return getPlayer(state, state.activePlayerId);
}

// ---------- Validation des coups ----------

export function evaluatePlay(state, player, card) {
  switch (card.type) {
    case 'distance': {
      if (player.battleStatus !== 'rolling') {
        return { ok: false, reason: 'La voiture doit être en route pour jouer une distance.' };
      }
      if (player.speedStatus === 'limited' && card.value > 50) {
        return { ok: false, reason: 'Limité à 50 km max sous limitation de vitesse.' };
      }
      if (card.subtype === 'd200' && player.count200 >= 2) {
        return { ok: false, reason: 'Maximum deux bornes de 200 km par joueur.' };
      }
      if (player.distance + card.value > GOAL) {
        return { ok: false, reason: `Dépasserait ${GOAL} bornes.` };
      }
      return { ok: true, needsTarget: false };
    }
    case 'remedy': {
      if (card.subtype === 'roll') {
        if (player.battleStatus === 'unstarted' || player.battleStatus === 'stop') {
          return { ok: true, needsTarget: false };
        }
        return { ok: false, reason: 'Pas besoin de redémarrer.' };
      }
      const need = { repairs: 'accident', gasoline: 'out-of-gas', 'spare-tire': 'flat-tire' }[card.subtype];
      if (need) {
        if (player.battleStatus === need) return { ok: true, needsTarget: false };
        return { ok: false, reason: "Aucune panne à réparer avec cette carte." };
      }
      if (card.subtype === 'end-of-limit') {
        if (player.speedStatus === 'limited') return { ok: true, needsTarget: false };
        return { ok: false, reason: 'Pas de limite de vitesse à lever.' };
      }
      return { ok: false, reason: 'Carte inconnue.' };
    }
    case 'safety': {
      return { ok: true, needsTarget: false };
    }
    case 'hazard': {
      return { ok: true, needsTarget: true };
    }
    default:
      return { ok: false, reason: 'Type de carte inconnu.' };
  }
}

export function evaluateHazardTarget(state, attacker, card, target) {
  if (target.id === attacker.id) return { ok: false, reason: 'Impossible de se cibler soi-même.' };
  if (target.distance >= GOAL) return { ok: false, reason: 'Ce joueur a déjà terminé.' };
  if (card.subtype === 'speed-limit') {
    if (target.speedStatus === 'limited') return { ok: false, reason: 'Déjà limité.' };
    if (target.battleStatus !== 'rolling') return { ok: false, reason: 'La cible doit être en route.' };
  } else {
    if (target.battleStatus !== 'rolling') return { ok: false, reason: 'La cible doit être en route.' };
  }
  if (target.safeties.has(card.subtype)) {
    return { ok: false, reason: 'La cible est protégée par une botte.' };
  }
  return { ok: true };
}

export function getValidTargets(state, attacker, card) {
  if (card.type !== 'hazard') return [];
  return state.players.filter((p) => p.id !== attacker.id && evaluateHazardTarget(state, attacker, card, p).ok);
}

// ---------- Actions ----------

export function drawCardAction(state, playerId) {
  if (state.phase !== 'playing') return { ok: false, reason: 'Partie terminée.' };
  if (state.pendingCoupFourre) return { ok: false, reason: 'En attente d’une décision de coup fourré.' };
  if (state.activePlayerId !== playerId) return { ok: false, reason: "Ce n'est pas votre tour." };
  if (state.turnStage !== 'needs-draw') return { ok: false, reason: 'Vous avez déjà pioché.' };

  const player = getPlayer(state, playerId);
  const card = dealOne(state, player);
  if (card) logMsg(state, `${player.name} pioche une carte.`);
  state.turnStage = 'needs-action';
  return { ok: true };
}

export function discardCardAction(state, playerId, cardId) {
  if (state.phase !== 'playing') return { ok: false, reason: 'Partie terminée.' };
  if (state.pendingCoupFourre) return { ok: false, reason: 'En attente d’une décision de coup fourré.' };
  if (state.activePlayerId !== playerId) return { ok: false, reason: "Ce n'est pas votre tour." };
  if (state.turnStage !== 'needs-action') return { ok: false, reason: 'Piochez d’abord.' };

  const player = getPlayer(state, playerId);
  const idx = player.hand.indexOf(cardId);
  if (idx === -1) return { ok: false, reason: "Carte absente de la main." };
  const card = getCard(state, cardId);
  player.hand.splice(idx, 1);
  state.discardPile.push(card);
  logMsg(state, `${player.name} défausse ${card.label}.`);
  state.selectedCardId = null;
  advanceTurn(state);
  return { ok: true };
}

export function playCardAction(state, playerId, cardId, targetId) {
  if (state.phase !== 'playing') return { ok: false, reason: 'Partie terminée.' };
  if (state.pendingCoupFourre) return { ok: false, reason: 'En attente d’une décision de coup fourré.' };
  if (state.activePlayerId !== playerId) return { ok: false, reason: "Ce n'est pas votre tour." };
  if (state.turnStage !== 'needs-action') return { ok: false, reason: 'Piochez d’abord.' };

  const player = getPlayer(state, playerId);
  const idx = player.hand.indexOf(cardId);
  if (idx === -1) return { ok: false, reason: "Carte absente de la main." };
  const card = getCard(state, cardId);

  const evalRes = evaluatePlay(state, player, card);
  if (!evalRes.ok) return { ok: false, reason: evalRes.reason };

  let target = null;
  if (card.type === 'hazard') {
    if (!targetId) return { ok: false, reason: 'Choisissez une cible.' };
    target = getPlayer(state, targetId);
    const targetEval = evaluateHazardTarget(state, player, card, target);
    if (!targetEval.ok) return { ok: false, reason: targetEval.reason };
  }

  // Retirer la carte de la main
  player.hand.splice(idx, 1);

  applyEffect(state, player, card, target);

  // Victoire ?
  if (player.distance >= GOAL) {
    state.phase = 'gameover';
    state.winnerId = player.id;
    logMsg(state, `🏆 ${player.name} atteint ${GOAL} bornes et remporte la course !`);
    return { ok: true };
  }

  // Opportunité de coup fourré pour la cible
  if (card.type === 'hazard') {
    const safetySubtype = HAZARD_TO_SAFETY[card.subtype];
    const safetyCardId = target.hand.find((id) => {
      const c = getCard(state, id);
      return c.type === 'safety' && c.subtype === safetySubtype;
    });

    if (safetyCardId) {
      if (target.isAI) {
        applyCoupFourre(state, target, getCard(state, safetyCardId));
        advanceTurn(state);
        return { ok: true };
      }
      state.pendingCoupFourre = { targetId: target.id, safetyCardId, hazardLabel: card.label };
      return { ok: true, awaitingCoupFourre: true };
    }
  }

  // Bonus botte : rejouer immédiatement
  if (card.type === 'safety') {
    state.turnStage = 'needs-draw';
    state.selectedCardId = null;
    return { ok: true, bonusTurn: true };
  }

  state.selectedCardId = null;
  advanceTurn(state);
  return { ok: true };
}

function applyEffect(state, player, card, target) {
  switch (card.type) {
    case 'distance': {
      player.distancePile.push(card);
      player.distance += card.value;
      if (card.subtype === 'd200') player.count200 += 1;
      logMsg(state, `${player.name} parcourt ${card.value} bornes (total ${player.distance}).`);
      break;
    }
    case 'remedy': {
      if (card.subtype === 'end-of-limit') {
        player.speedPile.push(card);
        player.speedStatus = 'normal';
        logMsg(state, `${player.name} lève la limite de vitesse.`);
      } else {
        player.battlePile.push(card);
        player.battleStatus = 'rolling';
        logMsg(state, `${player.name} joue ${card.label} et repart.`);
      }
      break;
    }
    case 'safety': {
      player.safetyCards.push(card);
      for (const s of (SAFETY_COUNTERS[card.subtype] || [])) {
        player.safeties.add(s);
      }
      if (player.safeties.has(player.battleStatus)) {
        player.battlePile.push(card);
        player.battleStatus = 'rolling';
      }
      if (card.subtype === 'right-of-way' && player.speedStatus === 'limited') {
        player.speedPile.push(card);
        player.speedStatus = 'normal';
      }
      logMsg(state, `${player.name} joue la botte ${card.label} et rejoue !`);
      break;
    }
    case 'hazard': {
      target.everHit = true;
      if (card.subtype === 'speed-limit') {
        target.speedPile.push(card);
        target.speedStatus = 'limited';
      } else {
        target.battlePile.push(card);
        target.battleStatus = card.subtype;
      }
      logMsg(state, `${player.name} attaque ${target.name} avec ${card.label} !`);
      break;
    }
  }
}

function applyCoupFourre(state, player, safetyCard) {
  const idx = player.hand.indexOf(safetyCard.id);
  if (idx !== -1) player.hand.splice(idx, 1);
  player.safetyCards.push(safetyCard);
  for (const s of (SAFETY_COUNTERS[safetyCard.subtype] || [])) {
    player.safeties.add(s);
  }
  if (player.safeties.has(player.battleStatus)) {
    player.battleStatus = 'rolling';
  }
  if (safetyCard.subtype === 'right-of-way' && player.speedStatus === 'limited') {
    player.speedStatus = 'normal';
  }
  player.coupFourreCount += 1;
  logMsg(state, `⚡ Coup Fourré ! ${player.name} contre-attaque avec ${safetyCard.label} et rejouera bientôt !`);
  state.insertedQueue.push(player.id);
}

export function resolveCoupFourreAction(state, accept) {
  if (!state.pendingCoupFourre) return { ok: false, reason: 'Aucun coup fourré en attente.' };
  const { targetId, safetyCardId } = state.pendingCoupFourre;
  const target = getPlayer(state, targetId);
  if (accept) {
    applyCoupFourre(state, target, getCard(state, safetyCardId));
  } else {
    logMsg(state, `${target.name} choisit de ne pas jouer le coup fourré maintenant.`);
  }
  state.pendingCoupFourre = null;
  advanceTurn(state);
  return { ok: true };
}

function advanceTurn(state) {
  state.selectedCardId = null;
  if (state.insertedQueue.length > 0) {
    state.activePlayerId = state.insertedQueue.shift();
  } else {
    state.turnIndex = (state.turnIndex + 1) % state.turnOrder.length;
    state.activePlayerId = state.turnOrder[state.turnIndex];
  }
  state.turnStage = 'needs-draw';
}

// ---------- Score officiel de fin de partie ----------

export function computeFinalScores(state) {
  const someoneAtZero = state.players.some((p) => p.id !== state.winnerId && p.distance === 0);

  return state.players
    .map((p) => {
      const tripCompleted = p.distance >= GOAL;
      const breakdown = {
        distance: p.distance,
        safety: p.safetyCards.length * 100,
        allSafety: p.safetyCards.length === 4 ? 300 : 0,
        coupFourre: p.coupFourreCount * 300,
        tripCompleted: tripCompleted ? 400 : 0,
        safeTrip: tripCompleted && !p.everHit ? 300 : 0,
        shutout: p.id === state.winnerId && someoneAtZero ? 500 : 0,
      };
      const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
      return { player: p, breakdown, total };
    })
    .sort((a, b) => b.total - a.total);
}

export { GOAL };
