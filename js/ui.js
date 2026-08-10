import {
  GOAL,
  getActivePlayer,
  evaluatePlay,
  evaluateHazardTarget,
  getValidTargets,
  drawCardAction,
  discardCardAction,
  playCardAction,
  resolveCoupFourreAction,
} from './game.js';
import { chooseAiAction } from './ai.js';

const VEHICLES = ['🚗', '🚙', '🚕', '🏎️'];

let state = null;
let onRestart = null;
let revealedFor = null; // id du joueur humain dont la main est actuellement révélée (mode passe-et-joue)
let aiTimer = null;
let helpOpen = false;

const els = {
  trackLanes: document.getElementById('track-lanes'),
  opponentsRow: document.getElementById('opponents-row'),
  deckPile: document.getElementById('deck-pile'),
  deckCount: document.getElementById('deck-count'),
  discardPile: document.getElementById('discard-pile'),
  discardCount: document.getElementById('discard-count'),
  logPanel: document.getElementById('log-panel'),
  activeTableau: document.getElementById('active-tableau'),
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

els.helpBtn.onclick = () => {
  helpOpen = true;
  renderHelp();
};

export function mountGame(gameState, restartCallback) {
  state = gameState;
  onRestart = restartCallback;
  revealedFor = null;
  els.restartBtn.hidden = false;
  els.restartBtn.onclick = () => onRestart();
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

function canHumanAct() {
  const p = getActivePlayer(state);
  return state.phase === 'playing' && !p.isAI && !state.pendingCoupFourre;
}

function battleStatusInfo(player) {
  if (player.battleStatus === 'unstarted') return { icon: '🚦', label: 'À l’arrêt', kind: 'warn' };
  if (player.battleStatus === 'rolling') return { icon: '🟢', label: 'En route', kind: 'ok' };
  const info = state.subtypeInfo[player.battleStatus];
  return { icon: info.icon, label: info.label, kind: 'warn' };
}

function speedStatusInfo(player) {
  if (player.speedStatus === 'limited') return { icon: '🐢', label: 'Limité à 50', kind: 'warn' };
  return null;
}

function cardFace(card, extraClass) {
  const div = document.createElement('div');
  div.className = `card card-${card.type}${extraClass ? ' ' + extraClass : ''}`;
  const label = card.type === 'distance' ? `${card.label} km` : card.label;
  div.innerHTML = `<div class="card-icon">${card.icon}</div><div class="card-label">${label}</div>`;
  div.title = card.desc || card.label;
  return div;
}

function chip(info) {
  const span = document.createElement('span');
  span.className = `status-chip ${info.kind}`;
  span.textContent = `${info.icon} ${info.label}`;
  return span;
}

function render() {
  if (!state) return;
  renderTrack();
  renderOpponents();
  renderTable();
  renderActivePanel();
  renderModals();
  maybeRunAi();
}

function renderTrack() {
  els.trackLanes.innerHTML = '';
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
    car.textContent = VEHICLES[i % VEHICLES.length];
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

function renderHelp() {
  els.helpModalRoot.innerHTML = '';
  if (!helpOpen) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box text-left">
      <h3>Comment jouer ?</h3>
      <ol class="help-steps">
        <li>Piochez une carte pour commencer votre tour.</li>
        <li>Sélectionnez une carte de votre main.</li>
        <li>Jouez-la (choisissez un adversaire pour une Attaque) ou défaussez-la.</li>
      </ol>
      <ul class="help-list">
        <li><span class="swatch swatch-distance"></span> <span><strong>Distance</strong> — avance ta voiture. Il faut d'abord jouer un Feu Vert pour démarrer.</span></li>
        <li><span class="swatch swatch-hazard"></span> <span><strong>Attaque</strong> — bloque ou ralentit un adversaire en route.</span></li>
        <li><span class="swatch swatch-remedy"></span> <span><strong>Parade</strong> — répare ta voiture pour repartir.</span></li>
        <li><span class="swatch swatch-safety"></span> <span><strong>Botte</strong> — te protège pour toujours contre une attaque et te fait rejouer aussitôt.</span></li>
      </ul>
      <p class="muted">Premier à exactement 1000 bornes : victoire !</p>
    </div>`;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-primary';
  closeBtn.textContent = 'Compris !';
  closeBtn.style.marginTop = '14px';
  closeBtn.onclick = () => { helpOpen = false; renderHelp(); };
  backdrop.querySelector('.modal-box').appendChild(closeBtn);
  backdrop.onclick = (e) => { if (e.target === backdrop) { helpOpen = false; renderHelp(); } };
  els.helpModalRoot.appendChild(backdrop);
}

function renderOpponents() {
  els.opponentsRow.innerHTML = '';
  const activePlayer = getActivePlayer(state);
  const selectedCard = state.selectedCardId ? state.cardsById.get(state.selectedCardId) : null;
  let validTargetIds = new Set();
  if (selectedCard && selectedCard.type === 'hazard' && !activePlayer.isAI && !state.pendingCoupFourre) {
    validTargetIds = new Set(getValidTargets(state, activePlayer, selectedCard).map((p) => p.id));
  }

  for (const p of state.players) {
    if (p.id === state.activePlayerId) continue;
    const card = document.createElement('div');
    const canTarget = validTargetIds.has(p.id);
    card.className = `opp-card${canTarget ? ' can-target' : ''}`;
    if (canTarget) {
      card.onclick = () => {
        playCardAction(state, activePlayer.id, selectedCard.id, p.id);
        render();
      };
    }

    const head = document.createElement('div');
    head.className = 'opp-head';
    head.innerHTML = `<span class="opp-name">${p.name}${p.isAI ? ' 🤖' : ''}</span><span class="opp-dist">${p.distance} / ${GOAL}</span>`;
    card.appendChild(head);

    const statusRow = document.createElement('div');
    statusRow.className = 'opp-status-row';
    statusRow.appendChild(chip(battleStatusInfo(p)));
    const sp = speedStatusInfo(p);
    if (sp) statusRow.appendChild(chip(sp));
    const safetyWrap = document.createElement('span');
    safetyWrap.className = 'safety-icons';
    safetyWrap.innerHTML = p.safetyCards.map((c) => `<span title="${c.label}">${c.icon}</span>`).join('');
    statusRow.appendChild(safetyWrap);
    const handCount = document.createElement('span');
    handCount.className = 'hand-count';
    handCount.textContent = `🂠 ${p.hand.length}`;
    statusRow.appendChild(handCount);
    card.appendChild(statusRow);

    els.opponentsRow.appendChild(card);
  }
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
  els.activeTableau.innerHTML = '';

  const nameEl = document.createElement('span');
  nameEl.className = 'tableau-name';
  nameEl.textContent = `${player.name}${player.isAI ? ' 🤖' : ''} — ${player.distance} / ${GOAL} bornes`;
  els.activeTableau.appendChild(nameEl);
  els.activeTableau.appendChild(chip(battleStatusInfo(player)));
  const sp = speedStatusInfo(player);
  if (sp) els.activeTableau.appendChild(chip(sp));
  for (const c of player.safetyCards) {
    const s = document.createElement('span');
    s.className = 'status-chip ok';
    s.textContent = `${c.icon} ${c.label}`;
    els.activeTableau.appendChild(s);
  }

  const isHumanTurn = state.phase === 'playing' && !player.isAI && !state.pendingCoupFourre;
  const needsReveal = isHumanTurn && revealedFor !== player.id;

  els.handRow.innerHTML = '';
  els.actionHint.textContent = '';
  els.playBtn.disabled = true;

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
    const standings = [...state.players].sort((a, b) => b.distance - a.distance);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const box = document.createElement('div');
    box.className = 'modal-box';
    box.innerHTML = `<h3>🏆 ${winner.name} remporte la course !</h3>`;
    const list = document.createElement('div');
    list.className = 'standings';
    for (const p of standings) {
      const row = document.createElement('div');
      row.className = `standings-row${p.id === winner.id ? ' winner' : ''}`;
      row.innerHTML = `<span>${p.name}${p.isAI ? ' 🤖' : ''}</span><span>${p.distance} bornes</span>`;
      list.appendChild(row);
    }
    box.appendChild(list);
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
