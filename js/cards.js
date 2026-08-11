// Définition des cartes du jeu de course et fabrication du paquet.

export const HAZARD_TO_REMEDY = {
  'accident': 'repairs',
  'out-of-gas': 'gasoline',
  'flat-tire': 'spare-tire',
  'speed-limit': 'end-of-limit',
  'stop': 'roll',
};

// Sous-type de botte (safety) qui protège contre chaque attaque.
export const HAZARD_TO_SAFETY = {
  'accident': 'driving-ace',
  'out-of-gas': 'extra-tank',
  'flat-tire': 'puncture-proof',
  'stop': 'right-of-way',
  'speed-limit': 'right-of-way',
};

// Sous-types que chaque botte neutralise/immunise.
export const SAFETY_COUNTERS = {
  'right-of-way': ['stop', 'speed-limit'],
  'extra-tank': ['out-of-gas'],
  'puncture-proof': ['flat-tire'],
  'driving-ace': ['accident'],
};

const DEFS = [
  // Distance
  { type: 'distance', subtype: 'd25', value: 25, count: 10, label: '25', icon: '🛣️' },
  { type: 'distance', subtype: 'd50', value: 50, count: 10, label: '50', icon: '🛣️' },
  { type: 'distance', subtype: 'd75', value: 75, count: 10, label: '75', icon: '🛣️' },
  { type: 'distance', subtype: 'd100', value: 100, count: 12, label: '100', icon: '🛣️' },
  { type: 'distance', subtype: 'd200', value: 200, count: 4, label: '200', icon: '🛣️' },

  // Attaques (hazards)
  { type: 'hazard', subtype: 'accident', count: 3, label: 'Accident', icon: '💥', desc: 'Immobilise l’adversaire.' },
  { type: 'hazard', subtype: 'out-of-gas', count: 3, label: "Panne d'Essence", icon: '⛽', desc: 'Immobilise l’adversaire.' },
  { type: 'hazard', subtype: 'flat-tire', count: 3, label: 'Crevaison', icon: '🛞', desc: 'Immobilise l’adversaire.' },
  { type: 'hazard', subtype: 'speed-limit', count: 4, label: 'Limite de Vitesse', icon: '🐢', desc: 'Limite à 50 km max.' },
  { type: 'hazard', subtype: 'stop', count: 5, label: 'Stop', icon: '🚧', desc: 'Immobilise l’adversaire.' },

  // Parades (remedies)
  { type: 'remedy', subtype: 'repairs', count: 6, label: 'Réparation', icon: '🔧', desc: "Répare l'accident." },
  { type: 'remedy', subtype: 'gasoline', count: 6, label: 'Essence', icon: '⛽', desc: "Répare la panne d'essence." },
  { type: 'remedy', subtype: 'spare-tire', count: 6, label: 'Roue de Secours', icon: '🛞', desc: 'Répare la crevaison.' },
  { type: 'remedy', subtype: 'end-of-limit', count: 6, label: 'Fin de Limite', icon: '🏁', desc: 'Lève la limite de vitesse.' },
  { type: 'remedy', subtype: 'roll', count: 14, label: 'Feu Vert', icon: '🚦', desc: 'Démarre ou relance la voiture.' },

  // Bottes (safety)
  { type: 'safety', subtype: 'right-of-way', count: 1, label: 'Priorité', icon: '🔶', desc: 'Immunise contre Stop et Limite de Vitesse.' },
  { type: 'safety', subtype: 'extra-tank', count: 1, label: 'Réservoir Supplémentaire', icon: '⛽', desc: "Immunise contre la panne d'essence." },
  { type: 'safety', subtype: 'puncture-proof', count: 1, label: 'Increvable', icon: '🛡️', desc: 'Immunise contre la crevaison.' },
  { type: 'safety', subtype: 'driving-ace', count: 1, label: 'As du Volant', icon: '🏎️', desc: "Immunise contre l'accident." },
];

export function buildDeck() {
  const deck = [];
  let n = 0;
  for (const def of DEFS) {
    for (let i = 0; i < def.count; i++) {
      n++;
      deck.push({
        id: `${def.type}-${def.subtype}-${n}`,
        type: def.type,
        subtype: def.subtype,
        value: def.value ?? null,
        label: def.label,
        icon: def.icon,
        desc: def.desc ?? '',
      });
    }
  }
  return deck;
}

export function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
