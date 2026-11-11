## Verdict : PRÊT AVEC RÉSERVES

Pour le site web, le jeu peut sortir : il est stable, mignon, et les corrections du round 1 tiennent. Mais la difficulté a été réglée avec un joueur simulé défectueux. Avec un joueur simulé corrigé, quelqu'un qui bouge vraiment son doigt gagne presque tous les niveaux avec 3 étoiles, même sans rien acheter dans l'Atelier. À corriger avant la version YouTube Playables, ce qui demande une nouvelle passe de réglage.

## Problèmes restants

**final-1 · MAJEUR · Le jeu est beaucoup trop facile pour un vrai joueur**
- **Le problème :** le constructeur avait raison sur le défaut du joueur simulé des critiques. Ce joueur poursuit sa propre position passée au lieu de la cible, donc le profil « moyen » ne bouge presque pas. Tout le réglage s'est fait sur ce profil.
- **Preuve :** j'ai écrit un joueur simulé corrigé (`review/final/human.js`), testé sur 12 parties par niveau, sur les niveaux 1, 3, 6, 10, 13, 18, 24, 28 et 30.
  - Joueur attentif (réaction 0,3 s) : 100 % de victoires, 3 étoiles partout.
  - Joueur « casual » (réaction 0,4 s, 20 % de mauvaises portes) : pareil.
  - Joueur maladroit (réaction 0,55 s, 35 % de mauvaises portes) : 100 % de victoires, 2,8 à 3 étoiles.
  - Joueur faible (réaction 0,75 s, une porte sur deux ratée) : 100 % jusqu'au niveau 28, et encore 83 % sur le boss final.
  - Avec une sauvegarde neuve (arme de départ, aucune amélioration), le joueur casual gagne aussi le niveau 30. La boutique et les armes ne servent donc à rien pour progresser.
- **Limite de ce test :** mon joueur « voit » le terrain aussi bien que le bot. Un vrai débutant sera un peu moins bon, mais l'écart reste énorme.
- **Correction :**
  1. Réparer le joueur simulé dans `js/debug/humans.js:33-51` : garder la dernière cible du bot dans une variable séparée au lieu de relire la position du joueur.
  2. Relancer `tests/balance.js`.
  3. Remonter la courbe de difficulté des mondes 2 à 5 : les 4 points de réglage de `G_KNOTS` dans `js/data/balance.js:15` sont tous à 1.00 aujourd'hui, et `BOSS_TUNE` aussi. Le monde 1 peut rester facile.

**final-2 · MAJEUR · Le mode Marathon dure beaucoup trop longtemps**
- **Le problème :** c'est le mode du classement Playables, et une partie y dure environ 12 minutes au lieu de 2 à 4.
- **Preuve :** avec mon joueur corrigé, une partie dure en moyenne 12,7 minutes (casual) et 12,1 minutes (maladroit). L'objectif était 2 à 4 minutes pour un joueur moyen et 4 à 7 minutes pour un bon joueur.
- **Correction :** accélérer la montée en difficulté. Cela se règle par `EL.LE_RATE` dans `js/game/endless.js:14`, puis par la part de portes pièges, de monstres d'élite et d'obstacles. Ajuster avec le joueur corrigé.

**final-3 · MINEUR · Le boss passe sous la barre du haut de l'écran**
- **Le problème :** ce n'est pas seulement à la hauteur 600. Ça touche aussi tous les téléphones tenus à l'horizontale, et la couronne du boss final atteint la barre même sur un grand écran 390×844.
- **Preuve :** captures `review/final/shots/360x600_boss_L30.png`, `844x390_boss_L6.png` et `390x844_boss_L30.png`.
- **Correction :** descendre la position de repos du boss, `BS.HOME = 152` dans `js/game/bosses.js:26`, vers environ 180, à toutes les hauteurs pour que le jeu reste identique partout. Revérifier ensuite l'équilibrage des boss.

**final-4 · MINEUR · Le dossier Playables actuel n'a pas le SDK YouTube**
- **Le problème :** le dossier `dist/playables` présent sur le disque ne contient pas la ligne qui charge le SDK. Si on le zippe tel quel, YouTube le refusera.
- **Preuve :** le test de régression le reconstruit sans le SDK (option `--no-sdk`, `tests/regress.js:372`). Il écrase donc le paquet à chaque lancement des tests.
- **Correction :** faire écrire ce test dans un autre dossier (`--out dist/playables_test`). Et toujours relancer `node tools/package_playables.js` juste avant de zipper.

**final-5 · MINEUR · Le message « Mieux en mode portrait » cache les personnages**
- **Le problème :** à l'horizontale, ce message reste 7 secondes à l'écran. Si on lance un niveau tout de suite, il recouvre la troupe de personnages en bas de la route.
- **Preuve :** capture `review/final/shots/844x390_boss_L6.png`.
- **Correction :** le masquer dès le début d'une partie, ou le placer en haut de l'écran (`js/ui/ui.js:80`).

## Vérifié et correct

- **Tests :** j'ai relancé moi-même `tests/regress.js` (59/59) et `tests/mobile.js` (99/99, boutons d'au moins 48 px et textes d'au moins 11 px sur tous les formats).
- **Paquet Playables :** testé avec un faux SDK YouTube.
  - Le démarrage se fait dans le bon ordre.
  - Aucun code de debug n'est présent et les paramètres d'URL sont ignorés.
  - La langue française vient bien de la plateforme.
  - La pause système met bien le jeu en pause.
  - Aucune erreur et aucune requête externe.
- **Défaut du joueur simulé :** confirmé dans le code, la cible du bot n'est mise à jour qu'une image sur six.
- **Même jeu sur toutes les hauteurs d'écran :** position des personnages et du boss identique à 600, 640 et 780.
- **Écrans :** menus, carte, victoire, défaite (titre « Nice try! » selon la progression, astuce Atelier), carte de niveau avec « Go to boss », et pause en deux colonnes à l'horizontale. Tout est propre et lisible.

## Non vérifié

- Vrais téléphones, vraie encoche, son, Firefox et Safari.
- Le vrai SDK YouTube (je n'ai testé qu'avec un faux).
- Les autres suites de tests (e2e, perf, balance) : je ne les ai pas relancées, je me fie au rapport du constructeur.
- Le tableau d'équilibrage complet sur les 30 niveaux : de toute façon, il repose sur le joueur simulé défectueux.

Mes scripts, captures et un résumé technique pour le développeur sont dans `review/final/`, le résumé dans `REPORT.md`. Je n'ai modifié aucun fichier du jeu.