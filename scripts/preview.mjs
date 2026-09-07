#!/usr/bin/env node
// dist/ の全ページを1枚のHTMLにまとめて、そのまま共有できるプレビューを作ります。
// ページ間のリンクは #アンカー に置き換え、JavaScript で表示を切り替えます。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const dist = join(root, 'dist');

// ---------- dist/ のHTMLを集める ----------
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) files.push(full);
  }
})(dist);

const idOf = (sitePath) => {
  if (sitePath === '/' || sitePath === '/index.html') return 'home';
  return sitePath.replace(/^\//, '').replace(/index\.html$/, '').replace(/\.html$/, '')
    .replace(/\/$/, '').replace(/\//g, '-') || 'home';
};

const pages = files.map((full) => {
  const rel = '/' + relative(dist, full).split('\\').join('/');
  const html = readFileSync(full, 'utf8');
  return {
    file: rel,
    sitePath: rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel,
    id: idOf(rel),
    title: (html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').split('｜')[0],
    main: html.match(/<main class="wrap">([\s\S]*?)<\/main>/)?.[1] ?? '',
    nav: html.match(/<nav class="site-nav">([\s\S]*?)<\/nav>/)?.[1] ?? '',
  };
});

// パス → アンカーID の対応表
const byPath = new Map();
for (const pg of pages) {
  byPath.set(pg.file, pg.id);
  byPath.set(pg.sitePath, pg.id);
}

/** ページ内リンクを #アンカー に、外部リンクはそのままにする */
function rewrite(html, fromFile) {
  const dir = fromFile.replace(/[^/]*$/, '');
  return html.replace(/href="([^"]+)"/g, (whole, href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return whole;
    let path;
    try {
      path = new URL(href, `https://x${dir}`).pathname;
    } catch {
      return whole;
    }
    const id = byPath.get(path) ?? byPath.get(path.replace(/\/$/, '/index.html'));
    return id ? `href="#${id}"` : `href="#home"`;
  });
}

const home = pages.find((pg) => pg.id === 'home');
const order = ['home', 'news', 'area', 'stats', 'docs', 'guides', 'about',
  ...pages.map((pg) => pg.id).filter((id) => !['home', 'news', 'area', 'stats', 'docs', 'guides', 'about'].includes(id))];
pages.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

const css = readFileSync(join(dist, 'assets/site.css'), 'utf8');
const updatedAt = JSON.parse(readFileSync(join(root, 'data/articles.json'), 'utf8')).updatedAt;

const out = `<title>民泊コンパス プレビュー</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap">
<style>
${css}
.previewBar{background:var(--teal-deep);color:var(--paper);font-family:var(--mono);font-size:11px;
  letter-spacing:.06em;padding:7px 20px;text-align:center}
.previewBar b{font-family:var(--display);letter-spacing:0}
[hidden]{display:none!important}
</style>

<div class="previewBar"><b>プレビュー</b>　実際は${pages.length}枚の独立したページです。ここでは1枚にまとめて表示しています（データ更新日 ${updatedAt}）</div>

<header class="site-header"><div class="wrap">
  <a class="brand" href="#home"><span class="mk"></span>民泊コンパス</a>
  <nav class="site-nav">${rewrite(home.nav, home.file)}</nav>
</div></header>

${pages.map((pg) => `<main class="wrap" id="${pg.id}" hidden>\n${rewrite(pg.main, pg.file)}\n</main>`).join('\n')}

<footer class="site-footer"><div class="wrap">
  <div class="brandbar"><i></i><i></i></div>
  <p class="stamp">掲載しているのは各行政機関の発表の見出しとリンクです。本文は転載していません。制度の適用可否など最終的な判断は、必ず物件所在地の管轄窓口（保健所・消防署・建築指導課）へご確認ください。</p>
  <p class="stamp">民泊コンパス ／ データ更新日 ${updatedAt}</p>
</div></footer>

<script>
(function () {
  var ids = ${JSON.stringify(pages.map((pg) => pg.id))};
  function show() {
    var want = location.hash.replace('#', '') || 'home';
    if (ids.indexOf(want) < 0) want = 'home';
    ids.forEach(function (id) { document.getElementById(id).hidden = (id !== want); });
    document.querySelectorAll('.site-nav a').forEach(function (a) {
      var on = a.getAttribute('href') === '#' + want;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    requestAnimationFrame(function () { window.scrollTo(0, 0); });
  }
  window.addEventListener('hashchange', show);
  show();
})();
</script>
`;

writeFileSync(join(dist, 'preview.html'), out);
console.log(`プレビュー生成: dist/preview.html（${pages.length}ページ, ${Math.round(out.length / 1024)}KB）`);
