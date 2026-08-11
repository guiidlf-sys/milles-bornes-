import { createGame } from './game.js';
import { mountGame, showRulesIntro } from './ui.js';

const modeScreen = document.getElementById('mode-screen');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const restartBtn = document.getElementById('restart-btn');

const modeSoloBtn = document.getElementById('mode-solo-btn');
const modeMultiBtn = document.getElementById('mode-multi-btn');
const backToModeBtn = document.getElementById('back-to-mode-btn');
const setupTitle = document.getElementById('setup-title');
const setupSubtitle = document.getElementById('setup-subtitle');
const soloFields = document.getElementById('solo-fields');
const multiFields = document.getElementById('multi-fields');
const soloNameInput = document.getElementById('solo-name');
const aiCountSelect = document.getElementById('ai-count');
const playerCountSelect = document.getElementById('player-count');
const seatList = document.getElementById('seat-list');
const startBtn = document.getElementById('start-btn');

const DEFAULT_NAMES = ['Vous', 'Joueur 2', 'IA Bruno', 'IA Chloé'];
const AI_NAMES = ['IA Alice', 'IA Bruno', 'IA Chloé'];

let mode = 'solo'; // 'solo' | 'multi'

function showScreen(screen) {
  modeScreen.hidden = screen !== 'mode';
  setupScreen.hidden = screen !== 'setup';
  gameScreen.hidden = screen !== 'game';
}

modeSoloBtn.addEventListener('click', () => openSetup('solo'));
modeMultiBtn.addEventListener('click', () => openSetup('multi'));
backToModeBtn.addEventListener('click', () => showScreen('mode'));

function openSetup(chosenMode) {
  mode = chosenMode;
  const isSolo = mode === 'solo';
  soloFields.hidden = !isSolo;
  multiFields.hidden = isSolo;
  setupTitle.textContent = isSolo ? 'Solo — contre l’IA' : 'Multijoueur';
  setupSubtitle.textContent = isSolo
    ? 'Affrontez 1 à 3 adversaires contrôlés par l’IA.'
    : 'De 2 à 4 joueurs sur cet appareil. Activez un bot IA pour compléter les sièges libres.';
  if (!isSolo) renderSeats();
  showScreen('setup');
}

function renderSeats() {
  const count = parseInt(playerCountSelect.value, 10);
  seatList.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'seat-row';

    const badge = document.createElement('div');
    badge.className = 'seat-badge';
    badge.textContent = String(i + 1);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 20;
    nameInput.value = DEFAULT_NAMES[i] || `Joueur ${i + 1}`;
    nameInput.dataset.role = 'name';

    // Les deux premiers sièges sont humains par défaut (pour jouer à 2 réellement),
    // les suivants sont des bots IA que l'on peut activer/désactiver.
    const defaultIsAI = i >= 2;
    const typeSelect = document.createElement('select');
    typeSelect.dataset.role = 'type';
    typeSelect.innerHTML = `
      <option value="human"${!defaultIsAI ? ' selected' : ''}>Humain</option>
      <option value="ai"${defaultIsAI ? ' selected' : ''}>Bot IA</option>
    `;

    row.append(badge, nameInput, typeSelect);
    seatList.appendChild(row);
  }
}

playerCountSelect.addEventListener('change', renderSeats);

startBtn.addEventListener('click', () => {
  const configs = mode === 'solo' ? buildSoloConfigs() : buildMultiConfigs();
  showRulesIntro(() => startGame(configs));
});

function buildSoloConfigs() {
  const aiCount = parseInt(aiCountSelect.value, 10);
  const you = { name: soloNameInput.value.trim() || 'Vous', isAI: false };
  const bots = Array.from({ length: aiCount }, (_, i) => ({ name: AI_NAMES[i], isAI: true }));
  return [you, ...bots];
}

function buildMultiConfigs() {
  const rows = [...seatList.querySelectorAll('.seat-row')];
  return rows.map((row, i) => {
    const name = row.querySelector('[data-role="name"]').value.trim() || `Joueur ${i + 1}`;
    const isAI = row.querySelector('[data-role="type"]').value === 'ai';
    return { name, isAI };
  });
}

function startGame(configs) {
  const state = createGame(configs);
  showScreen('game');
  mountGame(state, () => {
    restartBtn.hidden = true;
    showScreen('mode');
  });
}
