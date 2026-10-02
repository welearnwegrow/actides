The Tides of Atlantic College — website package

Upload the whole folder to any static host (Netlify, GitHub Pages, your own server). index.html is the entry point.

Contents
- index.html, sketch.js, graph.js, tides.js — the piece
- photos/ — the photographs used
- icons/ — favicon set (ico, svg, 16, 32, apple-touch 180, android 192/512), site.webmanifest, og-image.jpg (1200x630 share image)

After publishing
Social platforms need absolute URLs for the share image. Once you know the live address, replace "icons/og-image.jpg" in the og:image, twitter:image and JSON-LD tags with the full URL (e.g. https://your-domain/icons/og-image.jpg), and add:
  <link rel="canonical" href="https://your-domain/">
  <meta property="og:url" content="https://your-domain/">
