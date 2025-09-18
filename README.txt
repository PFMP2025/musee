
# Musée des Résistantes – Démo prête à l'emploi

## Comment tester rapidement
- Téléchargez le dossier (ou le ZIP) et ouvrez `index.html` **avec un petit serveur local** (recommandé) :
  - VSCode > Live Server, ou
  - Python : `python -m http.server` (puis ouvrir http://localhost:8000/musee_demo/)
- Sinon, certains navigateurs refusent `fetch()` en `file://` (sécurité).

## Ajouter un nouveau groupe
1. Placez la page du groupe (ex: `EXEMPLES/marieCURIE.html`) à côté du hub.
2. Éditez `data/resistantes.json` et ajoutez :
   {
     "id": "marie",
     "nom": "Marie Exemple",
     "annee": 1944,
     "ville": "Toulouse",
     "coords": [43.6, 1.44],
     "url": "./EXEMPLES/marieCURIE.html",
     "vignette": "",
     "tags": ["résistance","exemple"]
   }

## Remarques
- Cette démo n'utilise **aucune librairie externe** pour rester simple et portable.
- La carte Leaflet peut être ajoutée ensuite si besoin.
- Pour un usage hors-ligne complet, ajoutez un `manifest.webmanifest` + `service worker`.
