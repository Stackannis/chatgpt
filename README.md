# SUNFOX — Emerald Coast

Un niveau de jeu de plateforme **style 16 bits** (SNES / Mega Drive), 100 % original, en HTML5 pur :
aucun moteur, aucune dépendance, aucune image ni fichier son — tout le pixel art est dessiné pixel par
pixel dans le code (`src/art/*.js`) et toute la musique / les bruitages sont synthétisés en WebAudio
(`src/audio.js`).

- Résolution native **384×216** (16:9), tuiles de 16 px, mise à l'échelle entière, 60 fps à pas fixe.
- Héros : **Kit**, un jeune renard à écharpe turquoise. Niveau : **Emerald Coast**, île tropicale au matin.
- Collines et pentes (22° et 45°), plateformes traversables, plateformes mobiles, ascenseur le long d'une
  cascade, ressorts, blocs à prix, pics, eau, 3 types d'ennemis, 3 checkpoints, 3 médailles étoile cachées,
  route haute / route basse, écran titre, carte d'intro, écran de fin avec décompte.
- Sensations « console » : saut à hauteur variable, *coyote time*, *jump buffer*, élan sur les pentes,
  rebond sur les ennemis, *hit-stop*, tremblement d'écran, poussière, transition en iris.

## Jouer

Ouvre simplement `index.html` dans un navigateur (ça marche aussi en `file://`), ou le fichier unique
`dist/sunfox.html` (tout le jeu en un seul fichier, pratique à partager).

| Action | Clavier | Manette | Tactile |
| --- | --- | --- | --- |
| Courir | ← → (ou A / D, Q / D) | croix / stick | ◀ ▶ |
| Sauter (maintenir = plus haut) | Espace, Z, X, ↑, W | A / B / X | JUMP |
| Se baisser | ↓ (ou S) | bas | — |
| Pause | Entrée, P, Échap | Start | II |
| Couper le son | M | — | — |

Sauter sur les ennemis violets à cornes et les volants ; **ne pas** sauter sur ceux qui ont des piquants.
100 éclats de soleil = 1 vie. Les blocs à prix se frappent par en dessous.

## Structure

```
index.html            page + contrôles tactiles
src/lib.js            helpers pixel art (G.px, palette maîtresse, formes de collision des tuiles)
src/terrain_render.js rendu du terrain (terre, ombrage de profondeur tramé, herbe qui suit les pentes)
src/level.js          le niveau, décrit avec un petit DSL (profil du sol, objets, décor)
src/game.js           moteur : physique avec pentes, entités, caméra, parallaxe, HUD, états du jeu
src/audio.js          musique + bruitages en synthèse WebAudio
src/art/*.js          tout le pixel art (terrain, décor, arrière-plans, héros, ennemis, objets, police, logo)
docs/ART_GUIDE.md     bible graphique + contrat des assets
tools/sheet.js        planche contact d'un module d'art  → shots/sheet-<module>.png
tools/shot.js         captures en jeu / vue d'ensemble du niveau
tools/bot.js          bot qui joue le niveau en headless (vérifie qu'il est finissable)
tools/build.js        génère dist/sunfox.html (fichier unique)
```

## Outils (Node + Playwright)

```
node tools/sheet.js player 8     # regarder les sprites du héros à 8x
node tools/shot.js overview      # tout le niveau en bandes
node tools/shot.js play 1700     # capture en jeu autour de x = 1700
node tools/bot.js 0,0 god        # le bot termine-t-il le niveau ?
node tools/build.js              # dist/sunfox.html
```

## Méthode

Les assets ont été produits avec une *gauntlet loop* : pour chaque module (terrain, décor, arrière-plans,
héros, ennemis, objets/UI, audio), un agent **constructeur** spécialisé dessine, rend une planche, la
regarde et itère ; puis un agent **critique** indépendant, volontairement sévère, rend un verdict binaire
(« est-ce que ça sortirait tel quel dans un jeu 16 bits first-party ? ») avec une liste de défauts
concrets, que le constructeur corrige — nombre de tours fixé à l'avance.
