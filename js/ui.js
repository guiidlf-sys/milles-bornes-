import {
  GOAL,
  getActivePlayer,
  evaluatePlay,
  getValidTargets,
  drawCardAction,
  discardCardAction,
  playCardAction,
  resolveCoupFourreAction,
  computeFinalScores,
} from './game.js';
import { chooseAiAction } from './ai.js';

let state = null;
let onRestart = null;
let revealedFor = null; // id du joueur humain dont la main est actuellement révélée (mode passe-et-joue)
let aiTimer = null;
let helpOpen = false;
let clockTimer = null;

const VEHICLE_SETS = {
  car: ['🚗', '🚙', '🚕', '🏎️'],
  boat: ['⛵', '🚤', '🛥️', '🛶'],
  plane: ['✈️', '🛩️', '🚁', '🛫'],
  bike: ['🚲', '🛵', '🏍️', '🛴'],
};

const els = {
  trackLanes: document.getElementById('track-lanes'),
  gameTimer: document.getElementById('game-timer'),
  playerBoards: document.getElementById('player-boards'),
  deckPile: document.getElementById('deck-pile'),
  deckCount: document.getElementById('deck-count'),
  discardPile: document.getElementById('discard-pile'),
  discardCount: document.getElementById('discard-count'),
  logPanel: document.getElementById('log-panel'),
  handHeader: document.getElementById('hand-header'),
  actionHint: document.getElementById('action-hint'),
  handRow: document.getElementById('hand-row'),
  drawBtn: document.getElementById('draw-btn'),
  playBtn: document.getElementById('play-btn'),
  discardBtn: document.getElementById('discard-btn'),
  modalRoot: document.getElementById('modal-root'),
  helpModalRoot: document.getElementById('help-modal-root'),
  restartBtn: document.getElementById('restart-btn'),
  helpBtn: document.getElementById('help-btn'),
};

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

els.helpBtn.onclick = () => {
  helpOpen = true;
  renderHelp();
};

export function mountGame(gameState, restartCallback) {
  state = gameState;
  onRestart = restartCallback;
  revealedFor = null;
  document.documentElement.dataset.vehicle = state.vehicleType || 'car';
  els.restartBtn.hidden = false;
  els.restartBtn.onclick = () => {
    stopClock();
    onRestart();
  };

  stopClock();
  const tick = () => {
    if (!els.gameTimer) return;
    const end = state.endedAt || Date.now();
    els.gameTimer.textContent = formatDuration(end - state.startedAt);
  };
  tick();
  clockTimer = setInterval(() => {
    tick();
    if (state.phase !== 'playing') stopClock();
  }, 1000);
  els.deckPile.onclick = () => {
    if (canHumanAct() && state.turnStage === 'needs-draw') {
      drawCardAction(state, state.activePlayerId);
      render();
    }
  };
  els.drawBtn.onclick = () => {
    if (canHumanAct()) {
      drawCardAction(state, state.activePlayerId);
      render();
    }
  };
  els.playBtn.onclick = () => {
    if (!canHumanAct() || !state.selectedCardId) return;
    const player = getActivePlayer(state);
    const card = state.cardsById.get(state.selectedCardId);
    const evalRes = evaluatePlay(state, player, card);
    if (evalRes.ok && !evalRes.needsTarget) {
      playCardAction(state, player.id, card.id, null);
      render();
    }
  };
  els.discardBtn.onclick = () => {
    if (canHumanAct() && state.selectedCardId) {
      discardCardAction(state, state.activePlayerId, state.selectedCardId);
      render();
    }
  };
  render();
}

function stopClock() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function canHumanAct() {
  const p = getActivePlayer(state);
  return state.phase === 'playing' && !p.isAI && !state.pendingCoupFourre;
}

function cardFace(card, extraClass) {
  const div = document.createElement('div');
  div.className = `card card-${card.type}${extraClass ? ' ' + extraClass : ''}`;
  const label = card.type === 'distance' ? `${card.label} km` : card.label;
  div.innerHTML = `<div class="card-icon">${card.icon}</div><div class="card-label">${label}</div>`;
  div.title = card.desc || card.label;
  return div;
}

function render() {
  if (!state) return;
  renderTrack();
  renderBoard();
  renderTable();
  renderActivePanel();
  renderModals();
  maybeRunAi();
}

// ---------- Piste de course ----------

function renderTrack() {
  els.trackLanes.innerHTML = '';
  const vehicles = VEHICLE_SETS[state.vehicleType] || VEHICLE_SETS.car;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    const pct = Math.min(100, (p.distance / GOAL) * 100);

    const lane = document.createElement('div');
    lane.className = `track-lane${p.id === state.activePlayerId ? ' is-active' : ''}`;

    const name = document.createElement('div');
    name.className = 'lane-name';
    name.textContent = `${p.name}${p.isAI ? ' 🤖' : ''}`;
    lane.appendChild(name);

    const road = document.createElement('div');
    road.className = 'lane-road';
    const inner = document.createElement('div');
    inner.className = 'lane-track-inner';
    const car = document.createElement('div');
    car.className = 'lane-car';
    car.style.left = `${pct}%`;
    car.textContent = vehicles[i % vehicles.length];
    inner.appendChild(car);
    road.appendChild(inner);
    const finish = document.createElement('div');
    finish.className = 'lane-finish';
    road.appendChild(finish);
    lane.appendChild(road);

    const dist = document.createElement('div');
    dist.className = 'lane-dist';
    dist.textContent = `${p.distance} km`;
    lane.appendChild(dist);

    els.trackLanes.appendChild(lane);
  }
}

// ---------- Plateau : tableau de chaque joueur ----------

function renderBoard() {
  els.playerBoards.innerHTML = '';
  const activePlayer = getActivePlayer(state);
  const selectedCard = state.selectedCardId ? state.cardsById.get(state.selectedCardId) : null;
  let validTargetIds = new Set();
  if (selectedCard && selectedCard.type === 'hazard' && !activePlayer.isAI && !state.pendingCoupFourre) {
    validTargetIds = new Set(getValidTargets(state, activePlayer, selectedCard).map((p) => p.id));
  }

  for (const p of state.players) {
    const isActive = p.id === state.activePlayerId;
    const canTarget = validTargetIds.has(p.id);
    const board = document.createElement('div');
    board.className = `board-card${isActive ? ' is-active' : ''}${canTarget ? ' can-target' : ''}`;
    if (canTarget) {
      board.onclick = () => {
        playCardAction(state, activePlayer.id, selectedCard.id, p.id);
        render();
      };
    }

    const head = document.createElement('div');
    head.className = 'board-head';
    head.innerHTML = `<span class="board-name">${p.name}${p.isAI ? ' 🤖' : ''}</span><span class="board-dist">${p.distance} / ${GOAL}</span>`;
    board.appendChild(head);

    const piles = document.createElement('div');
    piles.className = 'tableau-piles';
    piles.appendChild(pileSlot('Bataille', p.battlePile, 'En attente'));
    piles.appendChild(pileSlot('Vitesse', p.speedPile, 'Libre'));
    piles.appendChild(safetySlot(p.safetyCards));
    piles.appendChild(pileSlot('Kilométrage', p.distancePile, 'Départ'));
    board.appendChild(piles);

    const handCount = document.createElement('div');
    handCount.className = 'hand-count';
    handCount.textContent = `🂠 ${p.hand.length} en main`;
    board.appendChild(handCount);

    els.playerBoards.appendChild(board);
  }
}

function pileSlot(label, cards, emptyLabel) {
  const slot = document.createElement('div');
  slot.className = 'pile-slot';
  const lbl = document.createElement('div');
  lbl.className = 'pile-slot-label';
  lbl.textContent = label;
  slot.appendChild(lbl);
  slot.appendChild(pileStackEl(cards, emptyLabel));
  return slot;
}

function safetySlot(cards) {
  const slot = document.createElement('div');
  slot.className = 'pile-slot';
  const lbl = document.createElement('div');
  lbl.className = 'pile-slot-label';
  lbl.textContent = 'Bottes';
  slot.appendChild(lbl);
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pile-empty';
    empty.textContent = 'Aucune';
    slot.appendChild(empty);
  } else {
    const row = document.createElement('div');
    row.className = 'safety-row';
    for (const c of cards) row.appendChild(cardFace(c, 'pile-card'));
    slot.appendChild(row);
  }
  return slot;
}

function pileStackEl(cards, emptyLabel) {
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pile-empty';
    empty.textContent = emptyLabel;
    return empty;
  }
  const stack = document.createElement('div');
  stack.className = 'pile-cards';
  cards.forEach((c, i) => {
    const el = cardFace(c, 'pile-card');
    const offset = Math.min(i, 6) * 3;
    el.style.top = `${offset}px`;
    el.style.left = `${offset}px`;
    el.style.zIndex = String(i);
    stack.appendChild(el);
  });
  return stack;
}

function rulesContentHtml({ withGoal }) {
  const goal = withGoal
    ? `<p class="muted"><strong>But du jeu :</strong> soyez le premier à parcourir exactement <strong>1000 bornes</strong> pour remporter la course !</p>`
    : '';
  return `
    <h3>Comment jouer ?</h3>
    ${goal}
    <ol class="help-steps">
      <li>Piochez une carte pour commencer votre tour.</li>
      <li>Sélectionnez une carte de votre main.</li>
      <li>Jouez-la (choisissez un adversaire pour une Attaque) ou défaussez-la.</li>
    </ol>
    <ul class="help-list">
      <li><span class="swatch swatch-distance"></span> <span><strong>Distance</strong> — avance ta voiture. Il faut d'abord jouer un Feu Vert pour démarrer.</span></li>
      <li><span class="swatch swatch-hazard"></span> <span><strong>Attaque</strong> — bloque ou ralentit un adversaire en route.</span></li>
      <li><span class="swatch swatch-remedy"></span> <span><strong>Parade</strong> — répare ta voiture pour repartir.</span></li>
      <li><span class="swatch swatch-safety"></span> <span><strong>Botte</strong> — te protège pour toujours contre une attaque et te fait rejouer aussitôt. Jouée juste après avoir été attaqué, c'est un <strong>Coup Fourré</strong> : l'attaque est annulée et tu rejoues immédiatement.</span></li>
    </ul>
    <p class="muted">Le tableau de chaque joueur montre ses piles : Bataille (pannes/réparations), Vitesse (limitation), Bottes (protections) et Kilométrage (bornes parcourues). Ne dépassez jamais 1000 bornes pile !</p>
  `;
}

function renderHelp() {
  els.helpModalRoot.innerHTML = '';
  if (!helpOpen) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal-box text-left">${rulesContentHtml({ withGoal: true })}</div>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-primary';
  closeBtn.textContent = 'Compris !';
  closeBtn.style.marginTop = '14px';
  closeBtn.onclick = () => { helpOpen = false; renderHelp(); };
  backdrop.querySelector('.modal-box').appendChild(closeBtn);
  backdrop.onclick = (e) => { if (e.target === backdrop) { helpOpen = false; renderHelp(); } };
  els.helpModalRoot.appendChild(backdrop);
}

// Affiche le but du jeu et les règles avant le début d'une partie ; onConfirm est appelé
// une fois l'écran fermé (bouton ou clic hors de la boîte).
export function showRulesIntro(onConfirm) {
  els.helpModalRoot.innerHTML = '';
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal-box text-left">${rulesContentHtml({ withGoal: true })}</div>`;
  const startBtn = document.createElement('button');
  startBtn.className = 'btn btn-primary';
  startBtn.textContent = 'Commencer la partie !';
  startBtn.style.marginTop = '14px';
  const proceed = () => { els.helpModalRoot.innerHTML = ''; onConfirm(); };
  startBtn.onclick = proceed;
  backdrop.querySelector('.modal-box').appendChild(startBtn);
  backdrop.onclick = (e) => { if (e.target === backdrop) proceed(); };
  els.helpModalRoot.appendChild(backdrop);
}

function renderTable() {
  els.deckCount.textContent = `${state.deck.length} carte(s)`;
  els.deckPile.disabled = state.phase !== 'playing' || getActivePlayer(state).isAI || state.turnStage !== 'needs-draw' || !!state.pendingCoupFourre;

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  if (topDiscard) {
    els.discardPile.className = `card card-${topDiscard.type}`;
    const label = topDiscard.type === 'distance' ? `${topDiscard.label} km` : topDiscard.label;
    els.discardPile.innerHTML = `<div class="card-icon">${topDiscard.icon}</div><div class="card-label">${label}</div>`;
  } else {
    els.discardPile.className = 'card card-empty';
    els.discardPile.innerHTML = '';
  }
  els.discardCount.textContent = `${state.discardPile.length} carte(s)`;

  els.logPanel.innerHTML = state.log.slice(-40).map((l) => `<div>${escapeHtml(l)}</div>`).join('');
  els.logPanel.scrollTop = els.logPanel.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function renderActivePanel() {
  const player = getActivePlayer(state);
  els.handRow.innerHTML = '';
  els.actionHint.textContent = '';
  els.playBtn.disabled = true;
  els.handHeader.textContent = state.phase === 'playing' ? `${player.name}${player.isAI ? ' 🤖' : ''} — votre main` : '';

  if (state.phase !== 'playing') {
    els.handRow.innerHTML = '';
    els.drawBtn.disabled = true;
    els.discardBtn.disabled = true;
    return;
  }

  if (player.isAI) {
    els.actionHint.textContent = `🤖 ${player.name} réfléchit...`;
    for (let i = 0; i < player.hand.length; i++) {
      els.handRow.appendChild(backCard());
    }
    els.drawBtn.disabled = true;
    els.discardBtn.disabled = true;
    return;
  }

  if (state.pendingCoupFourre) {
    els.actionHint.textContent = 'En attente d’une décision de coup fourré...';
    for (let i = 0; i < player.hand.length; i++) els.handRow.appendChild(backCard());
    els.drawBtn.disabled = true;
    els.discardBtn.disabled = true;
    return;
  }

  const needsReveal = revealedFor !== player.id;
  if (needsReveal) {
    const overlay = document.createElement('button');
    overlay.className = 'btn btn-primary';
    overlay.textContent = `Passez l'appareil à ${player.name}, puis cliquez ici pour révéler votre main`;
    overlay.style.width = '100%';
    overlay.style.minHeight = '80px';
    overlay.onclick = () => {
      revealedFor = player.id;
      render();
    };
    els.handRow.appendChild(overlay);
    els.drawBtn.disabled = true;
    els.discardBtn.disabled = true;
    return;
  }

  // Main visible et jouable
  els.drawBtn.disabled = state.turnStage !== 'needs-draw';

  if (state.turnStage === 'needs-draw') {
    els.actionHint.textContent = 'Cliquez sur "Piocher" ou sur la pioche pour commencer votre tour.';
    els.discardBtn.disabled = true;
    els.playBtn.disabled = true;
    for (const cardId of player.hand) {
      els.handRow.appendChild(handCardEl(state.cardsById.get(cardId), false));
    }
    return;
  }

  // needs-action
  const selectedCard = state.selectedCardId ? state.cardsById.get(state.selectedCardId) : null;
  let evalRes = null;
  if (selectedCard) evalRes = evaluatePlay(state, player, selectedCard);

  for (const cardId of player.hand) {
    const card = state.cardsById.get(cardId);
    els.handRow.appendChild(handCardEl(card, card.id === state.selectedCardId));
  }

  els.discardBtn.disabled = !selectedCard;
  els.playBtn.disabled = !selectedCard || !evalRes.ok || evalRes.needsTarget;

  if (!selectedCard) {
    els.actionHint.textContent = 'Sélectionnez une carte ci-dessous, puis jouez-la ou défaussez-la.';
  } else if (!evalRes.ok) {
    els.actionHint.textContent = `⚠️ ${evalRes.reason} — vous pouvez la défausser.`;
  } else if (evalRes.needsTarget) {
    const targets = getValidTargets(state, player, selectedCard);
    els.actionHint.textContent = targets.length
      ? '👉 Cliquez sur un adversaire ci-dessus pour jouer cette attaque.'
      : 'Aucune cible valide pour cette attaque — vous pouvez la défausser.';
  } else {
    els.actionHint.textContent = 'Carte valide : cliquez sur "Jouer la carte sélectionnée".';
  }
}

function backCard() {
  const div = document.createElement('div');
  div.className = 'card card-back';
  return div;
}

function handCardEl(card, isSelected) {
  const el = cardFace(card, `hand-card${isSelected ? ' selected' : ''}`);
  el.onclick = () => {
    state.selectedCardId = state.selectedCardId === card.id ? null : card.id;
    render();
  };
  return el;
}

function renderModals() {
  els.modalRoot.innerHTML = '';

  if (state.pendingCoupFourre) {
    const { targetId, hazardLabel } = state.pendingCoupFourre;
    const target = state.players.find((p) => p.id === targetId);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-box">
        <h3>⚡ Coup Fourré possible !</h3>
        <p>${target.name}, vous venez d'être touché par <strong>${hazardLabel}</strong> mais vous avez la botte qui protège contre cette attaque en main.</p>
        <p class="muted">Jouez-la immédiatement pour l'annuler et obtenir un tour bonus !</p>
      </div>`;
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const yes = document.createElement('button');
    yes.className = 'btn btn-primary';
    yes.textContent = 'Jouer le Coup Fourré';
    yes.onclick = () => { resolveCoupFourreAction(state, true); render(); };
    const no = document.createElement('button');
    no.className = 'btn btn-ghost';
    no.textContent = 'Pas maintenant';
    no.onclick = () => { resolveCoupFourreAction(state, false); render(); };
    actions.append(yes, no);
    backdrop.querySelector('.modal-box').appendChild(actions);
    els.modalRoot.appendChild(backdrop);
    return;
  }

  if (state.phase === 'gameover') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    const scores = computeFinalScores(state);
    const duration = formatDuration((state.endedAt || Date.now()) - state.startedAt);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = `<h3>🏆 ${winner.name} remporte la course !</h3><p class="muted">Partie jouée en ${duration} — Feuille de score officielle</p>`;

    const sheet = document.createElement('div');
    sheet.className = 'score-sheet';
    for (const { player, breakdown, total } of scores) {
      const row = document.createElement('div');
      row.className = `score-player${player.id === winner.id ? ' winner' : ''}`;
      const head = document.createElement('div');
      head.className = 'score-player-head';
      head.innerHTML = `<span class="name">${player.name}${player.isAI ? ' 🤖' : ''}</span><span class="total">${total} pts</span>`;
      row.appendChild(head);

      const lines = document.createElement('div');
      lines.className = 'score-lines';
      const items = [
        ['Distance parcourue', breakdown.distance],
        ['Bottes jouées', breakdown.safety],
        ['Toutes les bottes', breakdown.allSafety],
        ['Coup(s) fourré(s)', breakdown.coupFourre],
        ['Voyage terminé', breakdown.tripCompleted],
        ['Voyage sans accroc', breakdown.safeTrip],
        ['Capot adverse', breakdown.shutout],
      ];
      for (const [label, value] of items) {
        const line = document.createElement('div');
        line.className = `score-line${value ? ' nonzero' : ''}`;
        line.innerHTML = `<span>${label}</span><span>${value ? '+' + value : '—'}</span>`;
        lines.appendChild(line);
      }
      row.appendChild(lines);
      sheet.appendChild(row);
    }
    box.appendChild(sheet);
    box.appendChild(buildStatsTable(scores));

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const again = document.createElement('button');
    again.className = 'btn btn-primary';
    again.textContent = 'Nouvelle partie';
    again.onclick = () => onRestart();
    actions.appendChild(again);
    box.appendChild(actions);
    backdrop.appendChild(box);
    els.modalRoot.appendChild(backdrop);
  }
}

function buildStatsTable(scores) {
  const wrap = document.createElement('div');
  wrap.className = 'stats-wrap';

  const title = document.createElement('h4');
  title.className = 'stats-title';
  title.textContent = 'Statistiques de la partie';
  wrap.appendChild(title);

  const scroll = document.createElement('div');
  scroll.className = 'stats-scroll';
  const table = document.createElement('table');
  table.className = 'stats-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Joueur</th>
        <th>Km</th>
        <th>Attaques</th>
        <th>Bottes</th>
        <th>Coup Fourré</th>
        <th>Cartes en main</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  for (const { player } of scores) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${player.name}${player.isAI ? ' 🤖' : ''}</td>
      <td>${player.distance}</td>
      <td>${player.attacksPlayed}</td>
      <td>${player.safetyCards.length}</td>
      <td>${player.coupFourreCount}</td>
      <td>${player.hand.length}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  scroll.appendChild(table);
  wrap.appendChild(scroll);
  return wrap;
}

function maybeRunAi() {
  if (aiTimer) return;
  if (state.phase !== 'playing') return;
  if (state.pendingCoupFourre) return;
  const player = getActivePlayer(state);
  if (!player.isAI) return;

  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (state.phase !== 'playing' || state.pendingCoupFourre) { render(); return; }
    const active = getActivePlayer(state);
    if (!active.isAI) { render(); return; }

    if (state.turnStage === 'needs-draw') {
      drawCardAction(state, active.id);
      render();
      return;
    }

    const action = chooseAiAction(state);
    if (action.kind === 'discard') {
      discardCardAction(state, active.id, action.cardId);
    } else {
      playCardAction(state, active.id, action.cardId, action.targetId ?? null);
    }
    render();
  }, 800);
}
