# Super Pixel Quest (style 16 bits)

Jeu plateforme en pur HTML5 Canvas (sans dépendance), avec un seul niveau.

## Tester le jeu (local)

Il n'y a pas de zone d'exécution interactive directement dans ce chat.

Pour le tester sur ta machine :

1. Ouvre un terminal dans le dossier du projet.
2. Lance un petit serveur web local :

```bash
python3 -m http.server 8000
```

3. Ouvre ton navigateur sur :

```text
http://localhost:8000
```

4. Clique sur `index.html` (ou ouvre directement `http://localhost:8000/index.html`).

> Pourquoi un serveur local ?
> Certains navigateurs gèrent mieux les assets/scripts modules via HTTP que via un simple double-clic fichier.

## Contrôles

- `← / →` ou `A / D`: se déplacer
- `Espace` (ou `↑` / `W`): sauter
- `R`: recommencer après victoire/défaite

## Vérifier rapidement le code

```bash
node --check src/game.js
```

## Notes sprites

Les sprites sont dessinés en pixel-art directement dans le code (`src/game.js`) avec une palette inspirée SNES et des frames d'animation (idle, course, saut, ennemi).
