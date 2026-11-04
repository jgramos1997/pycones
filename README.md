# PyConES 26 · App del viatge de GISCE-TI

App web (PWA) per al viatge a la PyConES 2026. Funciona **sense connexió** un cop s'ha obert una vegada amb cobertura.

## Com publicar-la a GitHub Pages

1. Copia **tot el contingut d'aquesta carpeta** a l'arrel del repositori (o a la carpeta que publiqui GitHub Pages, per exemple `docs/`).
   El fitxer principal ha de dir-se `index.html` i `sw.js` ha d'estar al mateix nivell.
2. Fes commit i push.
3. Obre la URL de GitHub Pages una vegada amb connexió. A partir d'aquí ja obre sense xarxa.

> Demaneu a tothom que obri l'app **amb connexió abans de sortir** (el divendres, per exemple). Aquesta primera visita és la que la guarda al mòbil.

## Fitxers

| Fitxer | Què és |
|---|---|
| `index.html` | L'app |
| `app.css` | Tailwind compilat (substitueix el CDN) |
| `lucide.js` | Icones Lucide 1.67.0, fixades en local (substitueix `unpkg.com/lucide@latest`) |
| `fonts/` | Inter i Bricolage Grotesque (cortina) en local (substitueixen Google Fonts) |
| `manifest.webmanifest`, `icons/`, `favicon.ico` | Icones de la pestanya, de l'iPhone i d'Android, pantalles d'arrencada d'iPhone (`icons/splash/`) i la imatge per compartir l'enllaç (`icons/og-image.png`) |
| `sw.js` | Service worker: guarda l'app per funcionar sense connexió |

## Quan canviïs alguna cosa

- **Només `index.html`** (horaris, textos...): puja'l i ja està. L'HTML es demana sempre primer a la xarxa, així que el canvi arriba a tothom la propera vegada que obri l'app amb cobertura.
- **`app.css`, `lucide.js`, fonts o icones**: a més, obre `sw.js` i puja el número de `VERSION` (`'v1'` → `'v2'`). Si no, els mòbils continuarien amb la versió antiga guardada.
- **Has afegit classes de Tailwind noves a l'HTML**: cal recompilar `app.css` (ja no hi ha el CDN que les generava al vol):

  ```bash
  npx tailwindcss@3 -c tailwind.config.js -i src.css -o app.css --minify
  ```

  amb aquest `tailwind.config.js`:

  ```js
  module.exports = {
    content: ['./index.html'],
    darkMode: 'class',
    theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }, colors: { primary: '#2974CA' } } }
  }
  ```

  i un `src.css` amb les línies `@font-face` del principi d'`app.css` més `@tailwind base; @tailwind components; @tailwind utilities;`.
  Després, puja `VERSION` a `sw.js`.

## Fotos sense connexió

- Les fotos fetes sense cobertura es guarden al mòbil (IndexedDB) i es pugen soles quan torna la connexió, mentre l'app estigui oberta. Si es tanca, es pugen la propera vegada que s'obri amb xarxa.
- La galeria mostra l'última llista carregada i les fotos que ja s'havien vist.
- Des de "De la Galeria" ara es poden triar diverses fotos alhora.

## Vista prèvia en compartir l'enllaç

Perquè WhatsApp, Telegram, Slack o X mostrin la imatge en enganxar l'enllaç, les etiquetes `og:` de l'`index.html` necessiten l'adreça **completa**.
Busca `https://EL-TEU-USUARI.github.io/EL-TEU-REPO` a l'`index.html` (surt 3 vegades) i canvia-ho per la URL real de GitHub Pages.

Les apps guarden la vista prèvia uns dies: si ja havies compartit l'enllaç abans, pot trigar a actualitzar-se.
