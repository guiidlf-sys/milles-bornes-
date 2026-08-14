// Vérification automatique de santé de Rallye Express.
// Usage : node scripts/health-check.mjs
// - Vérifie que le site GitHub Pages répond et sert les derniers fichiers.
// - Fait tourner une partie IA vs IA complète avec le moteur local pour détecter
//   toute exception dans la logique de jeu.
// Sort avec un code non-nul si un problème est détecté.

import { createGame, getActivePlayer, drawCardAction, playCardAction, discardCardAction, computeFinalScores, GOAL } from '../js/game.js';
import { chooseAiAction } from '../js/ai.js';

const SITE_BASE = 'https://guiidlf-sys.github.io/milles-bornes-/';
const FILES = ['index.html', 'css/style.css', 'js/main.js', 'js/ui.js', 'js/game.js', 'js/ai.js', 'js/cards.js'];

let failed = false;
function fail(msg) {
  failed = true;
  console.error('FAIL:', msg);
}
function ok(msg) {
  console.log('OK:', msg);
}

async function checkSiteLive() {
  for (const f of FILES) {
    try {
      const res = await fetch(SITE_BASE + f);
      if (!res.ok) {
        fail(`${f} a répondu ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (text.length < 20) {
        fail(`${f} semble vide (longueur ${text.length})`);
        continue;
      }
      ok(`${f} accessible (${text.length} octets)`);
    } catch (e) {
      fail(`${f} injoignable : ${e.message}`);
    }
  }
}

function simulateFullGame(vehicleType) {
  const configs = [
    { name: 'Alice', isAi: true },
    { name: 'Bob', isAi: true },
    { name: 'Chloé', isAi: true },
  ];
  const state = createGame(configs, vehicleType);
  let guard = 0;
  while (!state.winnerId && guard < 20000) {
    guard++;
    const player = getActivePlayer(state);
    if (state.turnStage === 'needs-draw') {
      drawCardAction(state, player.id);
      continue;
    }
    const action = chooseAiAction(state);
    if (!action) throw new Error(`Aucune action IA proposée (joueur ${player.name})`);
    if (action.kind === 'discard') {
      discardCardAction(state, player.id, action.cardId);
    } else if (action.kind === 'play') {
      playCardAction(state, player.id, action.cardId, action.targetId ?? null);
    } else {
      throw new Error(`Action IA inconnue : ${action.kind}`);
    }
  }
  if (!state.winnerId) throw new Error(`Partie non terminée après ${guard} actions (vehicleType=${vehicleType})`);
  const scores = computeFinalScores(state);
  if (!scores || !scores.length) throw new Error('computeFinalScores a renvoyé un résultat vide');
  const winner = state.players.find((p) => p.id === state.winnerId);
  if (!winner || winner.distance !== GOAL) throw new Error(`Le vainqueur n'a pas ${GOAL} bornes (a ${winner?.distance})`);
  return guard;
}

async function checkEngine() {
  for (const vehicleType of ['car', 'boat', 'plane', 'bike']) {
    try {
      const turns = simulateFullGame(vehicleType);
      ok(`Partie IA complète OK (${vehicleType}, ${turns} actions)`);
    } catch (e) {
      fail(`Simulation moteur échouée (${vehicleType}) : ${e.stack || e.message}`);
    }
  }
}

async function main() {
  await checkSiteLive();
  await checkEngine();
  if (failed) {
    console.error('\n=== HEALTH CHECK: ECHEC ===');
    process.exit(1);
  }
  console.log('\n=== HEALTH CHECK: OK ===');
}

main();
