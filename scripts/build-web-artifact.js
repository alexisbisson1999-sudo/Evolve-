/**
 * Assemble la version web de l'app en UN seul fichier HTML autonome
 * (JS et fichiers intégrés), pour la publier comme page / artefact.
 *
 * Usage :
 *   npx expo export --platform web --output-dir dist-web   (avec asyncRoutes.web = false)
 *   node scripts/build-web-artifact.js dist-web evolve.html [titre]
 */
const fs = require('fs');
const path = require('path');

const [, , dir, out, title = 'Evolve'] = process.argv;
if (!dir || !out) {
  console.error('usage : node scripts/build-web-artifact.js <dossier-export> <sortie.html>');
  process.exit(1);
}

const MIME = { '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);

let js = scripts.map((src) => fs.readFileSync(path.join(dir, src), 'utf8')).join('\n;\n');

// Fichiers référencés par chemin absolu "/assets/..." → data: URI
let inlined = 0;
js = js.replace(/"\/assets\/([^"]+)"/g, (whole, rel) => {
  const file = path.join(dir, 'assets', rel);
  if (!fs.existsSync(file)) return whole;
  inlined++;
  const mime = MIME[path.extname(file)] || 'application/octet-stream';
  return `"data:${mime};base64,${fs.readFileSync(file).toString('base64')}"`;
});
// Empêche une balise </script> dans le code de fermer le bloc inline.
js = js.replace(/<\/script/gi, '<\\/script');

const page = `<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  :root { --bg: #F6FAF9; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E1715; color-scheme: dark; } }
  :root[data-theme="dark"] { --bg: #0E1715; color-scheme: dark; }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
  // L'app gère sa navigation elle-même : on part toujours de l'accueil.
  try { if (location.pathname !== '/') history.replaceState(null, '', '/'); } catch (e) {}
</script>
<script>
${js}
</script>
`;
fs.writeFileSync(out, page);
console.log(`écrit ${out} — ${(page.length / 1e6).toFixed(2)} Mo, ${inlined} fichiers intégrés`);
