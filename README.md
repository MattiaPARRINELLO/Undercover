# Undercover (Web Mobile)

Jeu de deduction sociale en mode "passe l'ecran", developpe en HTML/CSS/JS vanilla.

## Apercu

Undercover se joue sur un seul telephone:
- chaque joueur voit son mot en prive,
- les Civils partagent un mot,
- les Undercover ont un mot proche,
- Mr. White n'a pas de mot et improvise.

Le jeu inclut:
- ecran d'accueil,
- configuration de partie (joueurs, presets, roles speciaux),
- distribution secrete des mots,
- tours de discussion,
- votes et resolutions (egalite, boomerang, vengeuse, etc.),
- recapitulatif final,
- mode PWA (manifest + service worker),
- textes externalises en JSON,
- base de mots externalisee en JSON,
- pack d'icones SVG.

## Stack technique

- HTML: `index.html`
- CSS: `css/style.css` + `assets/icons.css`
- JavaScript:
  - `js/app.js` (navigation, i18n, setup, orchestration)
  - `js/game.js` (moteur de regles)
  - `js/ui.js` (rendu UI et interactions)
- Donnees:
  - `lang.json` (traductions FR)
  - `words.json` (categories et paires de mots)
- PWA:
  - `manifest.json`
  - `sw.js`

## Lancer le projet

Le projet est 100% front-end, sans serveur backend.

### Option A (recommandee)

Lancer un serveur statique local:

- VS Code: extension Five Server / Live Server
- ou terminal:

```bash
cd /home/mattia/Documents/Perso/Undercover
python3 -m http.server 5500
```

Puis ouvrir:

`http://localhost:5500`

### Option B (ouverture directe du fichier)

Possible pour du test visuel rapide, mais certains comportements (PWA, fetch/cache) peuvent etre limites selon le navigateur.

## Structure du projet

```text
Undercover/
├── assets/
│   ├── icons.css
│   └── svg/
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── game.js
│   └── ui.js
├── index.html
├── lang.json
├── words.json
├── manifest.json
└── sw.js
```

## Personnalisation

### Modifier les textes

Edite `lang.json`.

Le moteur i18n est base sur:
- `t(key, params)`
- `initI18n()`

Exemple de cle dynamique: `vote.eliminated` avec `{player}`.

### Modifier les mots

Edite `words.json`:
- chaque categorie contient un `name`, une `icon`, et `pairs`.

Format d'une paire:

```json
["Mot Civil", "Mot Undercover"]
```

### Modifier les icones

- SVG: `assets/svg/*.svg`
- mapping CSS: `assets/icons.css`

## Presets et roles speciaux

Presets disponibles (exemples):
- Classique
- Hante
- Love Story
- Strategique
- Vendetta
- Drama
- Mind Games
- Full Drama
- Chaos Total
- Personnalise

Roles speciaux integres:
- Amoureux
- Fantome
- Vengeuse
- Boomerang
- Deesse

## PWA / Offline

- Le manifeste configure le mode standalone mobile.
- Le service worker met en cache les fichiers principaux.

Si tu ajoutes de nouveaux assets critiques (JSON, SVG, CSS), pense a les ajouter aussi dans le tableau `ASSETS` de `sw.js`.

## Qualite / verification

Checklist rapide avant release:
- tester une partie complete du setup a la victoire,
- verifier les presets en desktop et mobile,
- verifier le chargement des icones SVG,
- verifier le fonctionnement hors ligne apres un premier chargement,
- verifier l'absence d'erreurs console.

## Licence

Projet personnel. Adapte ce fichier selon ta licence (MIT, proprietaire, etc.).
