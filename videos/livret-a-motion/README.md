# Livret A — édition motion design

Vidéo explicative de 4 min 12 sur le Livret A (20 ans, 10 000 €, inflation), **100 % code** :
animation en canvas (JavaScript), capture image par image avec Playwright, bande-son (musique 120 BPM + bruitages)
synthétisée en Python/numpy, assemblage avec ffmpeg. Aucun générateur d'images, de vidéo ni de son. Pas de voix.

- `livret_a_motion_1080p60.mp4` : la vidéo (1080p, 60 i/s, recompressée sous 100 Mo pour GitHub).
- `miniatures/` : trois propositions de miniature YouTube (1280×720).

## Structure
| Fichier | Rôle |
|---|---|
| `core.js` | boîte à outils : easings, typographie cinétique, compteur à rouleaux, pièces 3D, isométrique, particules, données |
| `scenes.js`, `scenes2.js` | les 13 séquences (chacune calée en temps musicaux) et le montage (`render(t)`) |
| `index.html` | page de rendu (polices Google Fonts) |
| `rendu.py` | `python rendu.py apercu t1 t2…` (planche) · `python rendu.py` (vidéo complète) · options `depuis=` / `jusqua=` |
| `son.py` | musique + bruitages synthétisés, lus depuis `rendu/sons.json` (écrit par `rendu.py`) |
| `miniature.html`, `miniature.py` | génération des miniatures |

## Régénérer
```bash
pip install playwright numpy   # + ffmpeg ; Chromium pour Playwright
python rendu.py                # ≈ 16 min de capture à 60 i/s sur 4 cœurs, puis son + encodage
python miniature.py            # miniatures dans miniatures/
```

## Sources des chiffres
Taux du Livret A (mes-livrets.fr, economie.gouv.fr), inflation annuelle moyenne IPC (Insee), encours et nombre de livrets
(Caisse des dépôts, déc. 2024), LEP / fonds euros (taux 2025-2026), MSCI World ≈ 8,5 %/an 2006-2025 en EUR dividendes
réinvestis (trajectoire de la bourse illustrative, recalée sur ≈ 51 000 €). Ceci n'est pas un conseil en investissement.
