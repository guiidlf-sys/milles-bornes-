import { createGame } from './game.js';
import { mountGame, showRulesIntro } from './ui.js';

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const restartBtn = document.getElementById('restart-btn');
const playerCountSelect = document.getElementById('player-count');
const seatList = document.getElementById('seat-list');
const startBtn = document.getElementById('start-btn');

const DEFAULT_NAMES = ['Vous', 'IA Alice', 'IA Bruno', 'IA Chloé'];

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

    const typeSelect = document.createElement('select');
    typeSelect.dataset.role = 'type';
    typeSelect.innerHTML = `
      <option value="human"${i === 0 ? ' selected' : ''}>Humain</option>
      <option value="ai"${i === 0 ? '' : ' selected'}>Ordinateur</option>
    `;

    row.append(badge, nameInput, typeSelect);
    seatList.appendChild(row);
  }
}

playerCountSelect.addEventListener('change', renderSeats);
renderSeats();

startBtn.addEventListener('click', () => {
  const rows = [...seatList.querySelectorAll('.seat-row')];
  const configs = rows.map((row, i) => {
    const name = row.querySelector('[data-role="name"]').value.trim() || `Joueur ${i + 1}`;
    const isAI = row.querySelector('[data-role="type"]').value === 'ai';
    return { name, isAI };
  });
  showRulesIntro(() => startGame(configs));
});

function startGame(configs) {
  const state = createGame(configs);
  setupScreen.hidden = true;
  gameScreen.hidden = false;
  mountGame(state, () => {
    gameScreen.hidden = true;
    setupScreen.hidden = false;
    restartBtn.hidden = true;
  });
}
