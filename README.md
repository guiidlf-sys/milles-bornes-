# Mille Bornes 🏁

Une adaptation web du célèbre jeu de cartes français **Mille Bornes**, jouable directement dans le navigateur — sans installation, sans dépendance.

## Le jeu

De 2 à 4 joueurs s'affrontent pour être les premiers à parcourir exactement **1000 bornes**.

- **Cartes Distance** (25, 50, 75, 100, 200 km) : à jouer sur votre propre tableau pour avancer, tant que votre voiture est en route.
- **Cartes Attaque** (Accident, Panne d'Essence, Crevaison, Limite de Vitesse, Stop) : à jouer sur un adversaire pour l'immobiliser ou le ralentir.
- **Cartes Parade** (Réparation, Essence, Roue de Secours, Fin de Limite, Feu Vert) : pour réparer votre voiture et repartir. Le Feu Vert est aussi nécessaire pour démarrer en début de partie.
- **Bottes** (Priorité, Réservoir Supplémentaire, Increvable, As du Volant) : des cartes de protection permanente. Jouer une botte permet immédiatement de rejouer. Si elle est jouée en réponse directe à l'attaque correspondante, c'est un **Coup Fourré** : l'attaque est annulée et un tour bonus complet est accordé !

Règles particulières implémentées : limite de 200 km maximum deux fois par joueur, interdiction de dépasser 1000 bornes, limitation à 50 km sous Limite de Vitesse, remélange automatique de la pioche quand elle est épuisée.

## Jouer

Ouvrez `index.html` via un petit serveur local (nécessaire pour les modules JavaScript), par exemple :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

Sur l'écran de préparation, choisissez le nombre de joueurs (2 à 4) et, pour chaque siège, un nom ainsi que « Humain » ou « Ordinateur ». Un mode **passe-et-joue** local permet à plusieurs humains de jouer sur le même appareil : la main de chaque joueur reste cachée jusqu'à ce qu'il clique pour la révéler à son tour.

## Structure du code

- `index.html` — structure de la page
- `css/style.css` — thème visuel (tapis vert, cartes, tableaux de bord)
- `js/cards.js` — définition du paquet de 106 cartes
- `js/game.js` — moteur de règles (tours, validité des coups, coup fourré, victoire)
- `js/ai.js` — heuristiques de décision pour les joueurs IA
- `js/ui.js` — rendu de l'interface et gestion des interactions
- `js/main.js` — écran de préparation et démarrage de la partie
