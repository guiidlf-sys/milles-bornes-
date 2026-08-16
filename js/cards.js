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

// Icône dessinée à la main (roue crevée + clou) pour la carte Crevaison,
// distincte de tout emoji standard suite au retour d'un joueur.
const FLAT_TIRE_ICON = '<svg width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Crevaison"><path d="M22,52 C22,26 34,10 50,10 C66,10 78,26 78,52 C78,70 74,80 66,85 C71,90 68,95 60,95 C57,92 54,91 50,91 C46,91 43,92 40,95 C32,95 29,90 34,85 C26,80 22,70 22,52 Z" fill="#262626" stroke="#141414" stroke-width="2.5"/><path d="M26,50 C26,30 34,16 44,12 C34,18 30,32 30,52 C30,66 33,76 39,82 C31,78 26,68 26,50 Z" fill="#4d4d4d" opacity="0.5"/><circle cx="54" cy="50" r="21" fill="#9aa0a6" stroke="#1a1a1a" stroke-width="2.5"/><ellipse cx="54" cy="35" rx="6.5" ry="12" fill="#262626"/><ellipse cx="54" cy="65" rx="6.5" ry="12" fill="#262626"/><ellipse cx="69" cy="50" rx="12" ry="6.5" fill="#262626"/><ellipse cx="39" cy="50" rx="12" ry="6.5" fill="#262626"/><circle cx="54" cy="50" r="21" fill="none" stroke="#1a1a1a" stroke-width="2.5"/><circle cx="54" cy="50" r="7.5" fill="#f2f3f4" stroke="#1a1a1a" stroke-width="2"/><line x1="4" y1="6" x2="32" y2="26" stroke="#1a1a1a" stroke-width="9" stroke-linecap="round"/><line x1="4" y1="6" x2="32" y2="26" stroke="#a9adb1" stroke-width="6" stroke-linecap="round"/><ellipse cx="4" cy="6" rx="7.5" ry="4.5" transform="rotate(35 4 6)" fill="#d8dadc" stroke="#1a1a1a" stroke-width="2"/></svg>';

const DEFS = [
  // Distance
  { type: 'distance', subtype: 'd25', value: 25, count: 10, label: '25', icon: '🛣️' },
  { type: 'distance', subtype: 'd50', value: 50, count: 10, label: '50', icon: '🛣️' },
  { type: 'distance', subtype: 'd75', value: 75, count: 10, label: '75', icon: '🛣️' },
  { type: 'distance', subtype: 'd100', value: 100, count: 12, label: '100', icon: '🛣️' },
  { type: 'distance', subtype: 'd200', value: 200, count: 4, label: '200', icon: '🛣️' },

  // Attaques (hazards)
  { type: 'hazard', subtype: 'accident', count: 3, label: 'Accident', icon: '💥', desc: 'Immobilise l’adversaire.' },
  { type: 'hazard', subtype: 'out-of-gas', count: 3, label: "Panne d'Essence", icon: '🪫', desc: 'Immobilise l’adversaire.' },
  { type: 'hazard', subtype: 'flat-tire', count: 3, label: 'Crevaison', icon: FLAT_TIRE_ICON, desc: 'Immobilise l’adversaire.' },
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
  { type: 'safety', subtype: 'extra-tank', count: 1, label: 'Réservoir Supplémentaire', icon: '🛢️', desc: "Immunise contre la panne d'essence." },
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
