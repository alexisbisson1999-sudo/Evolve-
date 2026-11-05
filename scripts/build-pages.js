/**
 * Construit le site statique publié sur GitHub Pages :
 *   site/index.html        page d'accueil (choix de l'app)
 *   site/evolve/           Evolve (programme « Reprise maison »)
 *   site/douceur/          Evolve Douceur (programme « Remise en forme en douceur »)
 *   site/404.html          renvoie une adresse inconnue vers la bonne app
 *
 * Chaque app est un fichier HTML autonome (JS, police, son, images intégrés),
 * installable sur l'écran d'accueil du téléphone.
 *
 * Usage : node scripts/build-pages.js [nom-du-dépôt]   (défaut : Evolve-)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = process.argv[2] || process.env.PAGES_REPO || 'Evolve-';
const SITE = path.join(ROOT, 'site');
const TMP = path.join(ROOT, '.pages-build');

const EDITIONS = [
  { slug: 'evolve', title: 'Evolve', program: 'reprise-maison-4-semaines', desc: 'Reprise du sport à la maison avec barre et haltères.' },
  { slug: 'douceur', title: 'Evolve Douceur', program: 'remise-en-forme-douce', desc: 'Remise en forme en douceur, 30 minutes par jour.' },
];

const MIME = { '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const appJsonPath = path.join(ROOT, 'app.json');
const originalAppJson = fs.readFileSync(appJsonPath, 'utf8');

function exportEdition(ed, base) {
  // Config temporaire : un seul bundle (pas de chargement différé) et l'adresse de base du site.
  const cfg = JSON.parse(originalAppJson);
  cfg.expo.plugins = cfg.expo.plugins.map((p) =>
    p === 'expo-router' ? ['expo-router', { asyncRoutes: { web: false, default: 'development' } }] : p,
  );
  cfg.expo.experiments = { ...(cfg.expo.experiments || {}), baseUrl: base };
  cfg.expo.name = ed.title;
  fs.writeFileSync(appJsonPath, JSON.stringify(cfg, null, 2));
  const out = path.join(TMP, ed.slug);
  fs.rmSync(out, { recursive: true, force: true });
  try {
    execSync(`npx expo export --platform web --output-dir "${out}" --clear`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, CI: '1', EXPO_PUBLIC_PROGRAM: ed.program },
    });
  } finally {
    fs.writeFileSync(appJsonPath, originalAppJson);
  }
  return out;
}

function inlineApp(dir, base, ed) {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
  let js = scripts
    .map((src) => fs.readFileSync(path.join(dir, src.startsWith(base) ? src.slice(base.length) : src), 'utf8'))
    .join('\n;\n');
  const assetRe = new RegExp(`"${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/assets/([^"]+)"`, 'g');
  js = js.replace(assetRe, (whole, rel) => {
    const file = path.join(dir, 'assets', rel);
    if (!fs.existsSync(file)) return whole;
    const mime = MIME[path.extname(file)] || 'application/octet-stream';
    return `"data:${mime};base64,${fs.readFileSync(file).toString('base64')}"`;
  });
  js = js.replace(/<\/script/gi, '<\\/script');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${ed.title}</title>
<meta name="description" content="${ed.desc}">
<meta name="theme-color" content="#F3F4F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1114" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${ed.title}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="icon.png">
<link rel="icon" href="icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
  :root { --bg: #F3F4F6; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0F1114; color-scheme: dark; } }
  html, body { height: 100%; margin: 0; }
  body { overflow: hidden; background: var(--bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
</head>
<body>
<noscript>Active JavaScript pour utiliser ${ed.title}.</noscript>
<div id="root"></div>
<script>
  // L'app gère sa navigation elle-même : on démarre toujours sur l'accueil de l'app.
  try { var b = ${JSON.stringify(base + '/')}; if (location.pathname !== b) history.replaceState(null, '', b); } catch (e) {}
</script>
<script>
${js}
</script>
</body>
</html>
`;
}

function manifest(ed, base) {
  return JSON.stringify(
    {
      name: ed.title,
      short_name: ed.title,
      description: ed.desc,
      lang: 'fr',
      start_url: `${base}/`,
      scope: `${base}/`,
      display: 'standalone',
      background_color: '#F3F4F6',
      theme_color: '#D9481F',
      icons: [{ src: 'icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
    },
    null,
    2,
  );
}

function landing() {
  const cards = EDITIONS.map(
    (ed) => `      <a class="card" href="${ed.slug}/">
        <span class="name">${ed.title}</span>
        <span class="desc">${ed.desc}</span>
        <span class="go">Ouvrir →</span>
      </a>`,
  ).join('\n');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Evolve</title>
<meta name="description" content="Applications d'entraînement à la maison.">
<link rel="icon" href="evolve/icon.png">
<style>
  :root { --bg: #F3F4F6; --card: #FFFFFF; --ink: #14171C; --muted: #555C66; --accent: #D9481F; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0F1114; --card: #181B20; --ink: #F2F3F5; --muted: #A7ADB6; --accent: #FF6A3D; color-scheme: dark; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 520px; margin: 0 auto; padding-block: 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 16px; }
  h1 { font-size: 32px; margin: 0; letter-spacing: -0.02em; }
  p { margin: 0 0 8px; color: var(--muted); }
  .card { display: grid; gap: 4px; padding: 20px 22px; border-radius: 24px; background: var(--card); color: inherit; text-decoration: none; box-shadow: 0 6px 20px rgba(28,45,60,.07); }
  .card:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .name { font-weight: 800; font-size: 20px; }
  .desc { color: var(--muted); }
  .go { color: var(--accent); font-weight: 800; margin-top: 6px; }
</style>
</head>
<body>
  <main>
    <h1>Evolve</h1>
    <p>Choisis ton application. Sur iPhone : Partager → « Sur l'écran d'accueil » pour l'installer.</p>
${cards}
  </main>
</body>
</html>
`;
}

function notFound(prefix) {
  // GitHub Pages sert cette page pour toute adresse inconnue (ex. rechargement d'un écran de l'app).
  const routes = EDITIONS.map((ed) => `${prefix}/${ed.slug}`);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Evolve</title>
<script>
  var routes = ${JSON.stringify(routes)};
  var p = location.pathname, target = ${JSON.stringify(prefix + '/')};
  for (var i = 0; i < routes.length; i++) if (p.indexOf(routes[i]) === 0) target = routes[i] + '/';
  location.replace(target);
</script></head><body></body></html>
`;
}

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });
const prefix = `/${REPO}`;
for (const ed of EDITIONS) {
  const base = `${prefix}/${ed.slug}`;
  const dir = exportEdition(ed, base);
  const dest = path.join(SITE, ed.slug);
  fs.mkdirSync(dest, { recursive: true });
  const page = inlineApp(dir, base, ed);
  fs.writeFileSync(path.join(dest, 'index.html'), page);
  fs.copyFileSync(path.join(ROOT, 'assets', 'icon.png'), path.join(dest, 'icon.png'));
  fs.writeFileSync(path.join(dest, 'manifest.webmanifest'), manifest(ed, base));
  console.log(`✓ ${ed.slug} : ${(page.length / 1e6).toFixed(2)} Mo`);
}
fs.writeFileSync(path.join(SITE, 'index.html'), landing());
fs.writeFileSync(path.join(SITE, '404.html'), notFound(prefix));
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`Site prêt dans ${SITE}`);
