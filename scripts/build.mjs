#!/usr/bin/env node
// data/*.json と content/articles/*.md から静的サイトを dist/ に書き出します。
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderMarkdown, parseFrontMatter, esc } from './lib/md.mjs';
import { css } from './lib/theme.mjs';
import { categoryList, prefectures } from './lib/classify.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
const OUT = new URL('dist/', root);

const site = {
  name: '民泊コンパス',
  tagline: '民泊・簡易宿所・旅館業法の最新情報を、行政の一次情報から。',
  url: process.env.SITE_URL ?? '',
};

const articles = JSON.parse(readFileSync(p('data/articles.json'), 'utf8'));
const stats = JSON.parse(readFileSync(p('data/stats.json'), 'utf8'));
const areas = JSON.parse(readFileSync(p('data/areas.json'), 'utf8'));
const docs = existsSync(p('data/documents.json'))
  ? JSON.parse(readFileSync(p('data/documents.json'), 'utf8'))
  : { sources: [] };
const slugs = JSON.parse(readFileSync(p('data/keywords.json'), 'utf8')).prefectureSlugs;

const news = articles.items;
const catOf = (n) => n.category.id;
const system = news.filter((n) => catOf(n) === 'system');                        // 運営システムの告知
const statsFeed = news.filter((n) => catOf(n) === 'stats');                      // 統計・施行状況の更新
const core = news.filter((n) => n.score === 3 && !['system', 'stats'].includes(catOf(n))); // 制度・実務
const around = news.filter((n) => n.score < 3 && !['system', 'stats'].includes(catOf(n))); // 観光まわり

// ---------- 編集部の解説記事 ----------
const guideDir = p('content/articles/');
const guides = (existsSync(guideDir) ? readdirSync(guideDir).filter((f) => f.endsWith('.md')) : []).map((f) => {
  const { meta, body } = parseFrontMatter(readFileSync(new URL(f, guideDir), 'utf8'));
  return { ...meta, summary: [].concat(meta.summary ?? []), html: renderMarkdown(body) };
}).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

// ---------- 共通パーツ ----------
const fmt = (iso) => (iso ? iso.replaceAll('-', '.').slice(2) : '—');
const num = (n) => (n == null ? '—' : n.toLocaleString('ja-JP'));

function layout(base, { title, description, current, body }) {
  const nav = [
    ['', 'ホーム', 'home'],
    ['news/', 'ニュース一覧', 'news'],
    ['area/', 'エリア別', 'area'],
    ['stats/', '数字で見る', 'stats'],
    ['docs/', '法令・通知', 'docs'],
    ['guides/', '解説記事', 'guides'],
    ['about.html', 'このサイトについて', 'about'],
  ];
  return `<!doctype html>
<html lang="ja"${''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}｜${site.name}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="${base}assets/site.css">
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="brand" href="${base}"><span class="mk"></span>${site.name}</a>
  <nav class="site-nav">${nav
    .map(([href, label, id]) => `<a href="${base}${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`)
    .join('')}</nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer class="site-footer"><div class="wrap">
  <div class="brandbar"><i></i><i></i></div>
  <p class="stamp">${site.name} ／ ${site.tagline}</p>
  <p class="stamp">掲載しているのは各行政機関の発表の見出しとリンクです。本文は転載していません。制度の適用可否など最終的な判断は、必ず物件所在地の管轄窓口（保健所・消防署・建築指導課）へご確認ください。</p>
  <p class="stamp">データ更新日：${articles.updatedAt ?? '—'}　／　<a href="${base}about.html">情報の扱い方針</a></p>
</div></footer>
</body>
</html>`;
}

const tagChips = (base, n) =>
  [
    `<span class="chip cat">${esc(n.category.name)}</span>`,
    ...n.areas.map((a) =>
      slugs[a] ? `<a class="chip" href="${base}area/${slugs[a]}.html">${esc(a)}</a>` : `<span class="chip">${esc(a)}</span>`
    ),
    ...n.businessTypes.map((b) => `<span class="chip">${esc(b)}</span>`),
    n.isPrimary ? '<span class="chip gov">一次情報</span>' : '',
  ].join('');

const newsItem = (base, n) => `<li>
  <span class="d">${fmt(n.publishedAt)}</span>
  <div>
    <h3><a class="ext" href="${esc(n.url)}" rel="noopener nofollow" target="_blank">${esc(n.title)}</a></h3>
    <p class="src">出典：${esc(n.sourceName)}</p>
    <div class="tags">${tagChips(base, n)}</div>
  </div>
</li>`;

const newsList = (base, items, emptyText = '該当する記事はまだありません。') =>
  items.length
    ? `<ul class="newslist">${items.map((n) => newsItem(base, n)).join('')}</ul>`
    : `<p class="empty">${emptyText}</p>`;

function statFigures() {
  const m = stats.minpaku;
  if (!m) return '';
  return `<dl class="figs">
    <div><dt>届出件数（累計）</dt><dd>${num(m.filed)}<span class="unit">件</span></dd></div>
    <div><dt>うち事業廃止</dt><dd>${num(m.closed)}<span class="unit">件</span></dd></div>
    <div><dt>現存する届出</dt><dd>${num(m.active)}<span class="unit">件</span></dd></div>
    <div><dt>住宅宿泊管理業の登録</dt><dd>${num(m.managers)}<span class="unit">件</span></dd></div>
  </dl>
  <p class="stamp" style="margin-top:8px">${esc(m.asOf ?? '')}時点　／　出典：<a href="${esc(m.sourceUrl)}" rel="noopener" target="_blank">${esc(m.source)}</a>（取得日 ${m.fetchedAt}）</p>`;
}

// ---------- 各ページ ----------
function pageHome() {
  const base = '';
  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">${articles.updatedAt} 更新</p>
  <h1 class="page-title">${site.tagline}</h1>
  <p class="lede">観光庁の民泊制度ポータルと報道発表を毎日自動でチェックし、民泊・宿泊事業に関わるものだけを抜き出しています。見出しをクリックすると、発表元のページがそのまま開きます。</p>
</section>

<div class="cols">
  <div>
    <div class="blockhead"><h2>民泊制度に関わる発表</h2><span class="stamp">${core.length}件</span></div>
    ${newsList(base, core.slice(0, 10))}
    <p style="margin-top:14px"><a href="${base}news/">すべて見る →</a></p>

    <div class="blockhead" style="margin-top:44px"><h2>統計・施行状況の更新</h2><span class="stamp">${statsFeed.length}件</span></div>
    ${newsList(base, statsFeed.slice(0, 6))}

    <div class="blockhead" style="margin-top:44px"><h2>観光・インバウンドの周辺情報</h2><span class="stamp">${around.length}件</span></div>
    ${newsList(base, around.slice(0, 5))}
  </div>

  <aside class="side">
    <div class="panel">
      <h2>民泊のいまの数字</h2>
      ${statFigures() || '<p>データ取得中です。</p>'}
      <p style="margin-top:12px"><a href="${base}stats/">数字のページへ →</a></p>
    </div>
    ${guides.length ? `<div class="panel accent">
      <h2>はじめての方へ</h2>
      <p>${esc(guides[0].title)}</p>
      <p style="margin-top:10px"><a href="${base}guides/${guides[0].slug}.html">読む →</a></p>
    </div>` : ''}
    ${docs.sources.length ? `<div class="panel">
      <h2>法令・通知をまとめて見る</h2>
      <p>旅館業法・住宅宿泊事業法の条文と、厚生労働省の主な通知を一覧にしています。</p>
      <p style="margin-top:10px"><a href="${base}docs/">法令・通知の一覧へ →</a></p>
    </div>` : ''}
    ${system.length ? `<div class="panel">
      <h2>民泊制度運営システムの告知</h2>
      <ul style="list-style:none;padding:0;margin:10px 0 0;font-size:13px">
        ${system.slice(0, 4).map((n) => `<li style="padding:7px 0;border-top:1px solid var(--line)">
          <span class="stamp">${fmt(n.publishedAt)}</span><br>
          <a href="${esc(n.url)}" rel="noopener nofollow" target="_blank">${esc(n.title.slice(0, 46))}${n.title.length > 46 ? '…' : ''}</a></li>`).join('')}
      </ul>
    </div>` : ''}
    <div class="panel">
      <h2>エリアから探す</h2>
      <div class="chipgrid" style="margin-top:10px">
        ${(() => {
          const withNews = prefectures.filter((a) => news.some((n) => n.areas.includes(a)));
          const major = ['北海道', '東京都', '神奈川県', '千葉県', '群馬県', '長野県', '静岡県', '京都府', '大阪府', '福岡県', '沖縄県'];
          const shown = [...new Set([...withNews, ...major])].slice(0, 12);
          return shown.map((a) => `<a class="chip" href="${base}area/${slugs[a]}.html">${a}</a>`).join('');
        })()}
        <a class="chip" href="${base}area/">すべての都道府県</a>
      </div>
    </div>
  </aside>
</div>`;
  return layout(base, { title: 'ホーム', description: site.tagline, current: 'home', body });
}

function pageNews() {
  const base = '../';
  const payload = news.map((n) => ({
    t: n.title, u: n.url, d: n.publishedAt, s: n.sourceName, p: n.isPrimary,
    c: n.category.name, a: n.areas, b: n.businessTypes,
  }));
  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">ニュース一覧</p>
  <h1 class="page-title">行政発表からの新着</h1>
  <p class="lede">観光庁・国土交通省の発表から、民泊・宿泊事業に関わるものを抜き出した一覧です。カテゴリ・エリア・キーワードで絞り込めます。</p>
</section>

<div class="filters">
  <div><label for="f-cat">カテゴリ</label>
    <select id="f-cat"><option value="">すべて</option>${categoryList.map((c) => `<option>${c.name}</option>`).join('')}</select></div>
  <div><label for="f-area">エリア</label>
    <select id="f-area"><option value="">すべて</option><option>全国</option>${prefectures.map((a) => `<option>${a}</option>`).join('')}</select></div>
  <div><label for="f-type">事業形態</label>
    <select id="f-type"><option value="">すべて</option><option>住宅宿泊事業</option><option>簡易宿所</option><option>特区民泊</option></select></div>
  <div><label for="f-q">キーワード</label><input id="f-q" type="search" placeholder="例：条例、統計、届出"></div>
</div>
<p class="count" id="count"></p>
<div id="list"></div>

<script id="news-data" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  var data = JSON.parse(document.getElementById('news-data').textContent);
  var els = { cat:document.getElementById('f-cat'), area:document.getElementById('f-area'),
              type:document.getElementById('f-type'), q:document.getElementById('f-q') };
  var list = document.getElementById('list'), count = document.getElementById('count');
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

  function render(){
    var q = els.q.value.trim();
    var rows = data.filter(function(n){
      if (els.cat.value && n.c !== els.cat.value) return false;
      if (els.area.value && n.a.indexOf(els.area.value) < 0) return false;
      if (els.type.value && n.b.indexOf(els.type.value) < 0) return false;
      if (q && n.t.indexOf(q) < 0) return false;
      return true;
    });
    count.textContent = rows.length + ' 件';
    list.innerHTML = rows.length ? '<ul class="newslist">' + rows.map(function(n){
      return '<li><span class="d">' + esc(n.d ? n.d.replace(/-/g,'.').slice(2) : '—') + '</span><div>'
        + '<h3><a class="ext" target="_blank" rel="noopener nofollow" href="' + esc(n.u) + '">' + esc(n.t) + '</a></h3>'
        + '<p class="src">出典：' + esc(n.s) + '</p>'
        + '<div class="tags"><span class="chip cat">' + esc(n.c) + '</span>'
        + n.a.map(function(a){ return '<span class="chip">' + esc(a) + '</span>'; }).join('')
        + n.b.map(function(b){ return '<span class="chip">' + esc(b) + '</span>'; }).join('')
        + (n.p ? '<span class="chip gov">一次情報</span>' : '')
        + '</div></div></li>';
    }).join('') + '</ul>' : '<p class="empty">条件に合う記事が見つかりませんでした。条件をゆるめてお試しください。</p>';
  }
  Object.keys(els).forEach(function(k){ els[k].addEventListener('input', render); });
  var params = new URLSearchParams(location.search);
  if (params.get('area')) els.area.value = params.get('area');
  if (params.get('cat')) els.cat.value = params.get('cat');
  render();
})();
</script>`;
  return layout(base, { title: 'ニュース一覧', description: '民泊・宿泊事業に関わる行政発表の一覧。カテゴリ・エリアで絞り込めます。', current: 'news', body });
}

function pageStats() {
  const base = '../';
  const h = stats.history ?? [];
  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">数字で見る</p>
  <h1 class="page-title">民泊のいまを数字で見る</h1>
  <p class="lede">観光庁の民泊制度ポータルサイトが公表している届出・登録の状況を、自動で読み取って表示しています。数字はすべて出典元へのリンク付きです。</p>
</section>

<div style="margin:26px 0 0">${statFigures() || '<p class="empty">データ取得中です。</p>'}</div>

${h.length > 1 ? `<div style="margin-top:40px">
  <div class="blockhead"><h2>届出件数の推移</h2><span class="stamp">このサイトで取得できた時点のみ</span></div>
  <div class="scroller" style="margin-top:14px">${historyChart(h)}</div>
</div>` : `<p class="stamp" style="margin-top:24px">推移のグラフは、時点の異なるデータが2件以上たまると表示されます（現在 ${h.length} 件）。</p>`}

<div class="panel" style="margin:36px 0 56px">
  <h2>この数字の読み方</h2>
  <p>「届出件数」は制度が始まってからの累計です。すでにやめた事業者ぶん（事業廃止件数）を差し引いた「現存する届出」が、いま動いている民泊のおおよその数にあたります。<br>
  なお、この数字には旅館業法の簡易宿所や特区民泊は含まれません。</p>
</div>`;
  return layout(base, { title: '数字で見る', description: '住宅宿泊事業の届出件数など、民泊に関する公的な数字をまとめています。', current: 'stats', body });
}

function historyChart(h) {
  const W = 640, H = 220, L = 56, R = 20, T = 18, B = 40;
  const vals = h.map((r) => r.filed);
  const max = Math.max(...vals) * 1.05, min = Math.min(...vals) * 0.95;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, h.length - 1);
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min || 1);
  const pts = h.map((r, i) => `${x(i).toFixed(1)},${y(r.filed).toFixed(1)}`);
  const ticks = [min, (min + max) / 2, max];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px;display:block" role="img" aria-label="届出件数の推移">
  <g stroke="var(--line)">${ticks.map((t) => `<line x1="${L}" y1="${y(t).toFixed(1)}" x2="${W - R}" y2="${y(t).toFixed(1)}"/>`).join('')}</g>
  <g fill="var(--ink-3)" font-family="JetBrains Mono, monospace" font-size="10" text-anchor="end">
    ${ticks.map((t) => `<text x="${L - 8}" y="${(y(t) + 3.5).toFixed(1)}">${Math.round(t).toLocaleString('ja-JP')}</text>`).join('')}
  </g>
  <path fill="var(--teal)" fill-opacity="0.12" d="M${pts.join(' L')} L${x(h.length - 1).toFixed(1)},${H - B} L${L},${H - B} Z"/>
  <path fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round" d="M${pts.join(' L')}"/>
  <circle cx="${x(h.length - 1).toFixed(1)}" cy="${y(vals.at(-1)).toFixed(1)}" r="4.5" fill="var(--amber)" stroke="var(--surface)" stroke-width="2"/>
  <g fill="var(--ink-3)" font-family="JetBrains Mono, monospace" font-size="10">
    <text x="${L}" y="${H - 14}">${esc(h[0].asOf ?? '')}</text>
    <text x="${W - R}" y="${H - 14}" text-anchor="end">${esc(h.at(-1).asOf ?? '')}</text>
  </g>
</svg>`;
}

function pageAreaIndex() {
  const base = '../';
  const counts = Object.fromEntries(prefectures.map((a) => [a, news.filter((n) => n.areas.includes(a)).length]));
  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">エリア別</p>
  <h1 class="page-title">地域から探す</h1>
  <p class="lede">民泊のルールは市区町村ごとに違います。まずは都道府県を選んでください。地域ごとのルール一覧は順次整備中です（データは <code>data/areas.json</code> で管理しています）。</p>
</section>
<div class="chipgrid" style="margin:26px 0 56px;gap:8px">
  ${prefectures.map((a) => `<a class="chip" style="padding:6px 12px;font-size:12px" href="${base}area/${slugs[a]}.html">${a}${counts[a] ? ` <span style="color:var(--teal-deep);margin-left:5px">${counts[a]}</span>` : ''}</a>`).join('')}
</div>`;
  return layout(base, { title: 'エリア別', description: '都道府県ごとの民泊関連ニュースとルール情報。', current: 'area', body });
}

function pageArea(pref) {
  const base = '../';
  const items = news.filter((n) => n.areas.includes(pref));
  const entry = (areas.entries ?? []).find((e) => e.pref === pref && !e.city);
  const rules = entry && entry.status === '確認済'
    ? `<div class="scroller" style="margin-top:16px"><table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr>${['制度', '可否', '主な条件', '窓口'].map((h) => `<th style="border:1px solid var(--line);padding:8px 11px;text-align:left;background:var(--surface-2);font-family:var(--mono);font-size:11px;color:var(--ink-3);font-weight:400">${h}</th>`).join('')}</tr></thead>
        <tbody>${entry.systems.map((s) => `<tr>
          <td style="border:1px solid var(--line);padding:9px 11px;font-weight:700">${esc(s.type)}</td>
          <td style="border:1px solid var(--line);padding:9px 11px">${esc(s.availability)}</td>
          <td style="border:1px solid var(--line);padding:9px 11px;color:var(--ink-2)">${esc(s.conditions ?? '')}</td>
          <td style="border:1px solid var(--line);padding:9px 11px;color:var(--ink-2)">${esc(s.contact ?? '')}</td></tr>`).join('')}</tbody></table></div>
       <p class="stamp" style="margin-top:10px">最終確認 ${esc(entry.verifiedAt ?? '—')}　／　確認方法：${esc(entry.verifiedBy ?? '—')}</p>
       ${(entry.sources ?? []).length ? `<ul style="margin-top:10px;padding-left:1.2em;font-size:13px">${entry.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a></li>`).join('')}</ul>` : ''}`
    : `<p class="empty">この地域のルール情報は準備中です。<br>
        現時点では、観光庁の<a href="https://www.mlit.go.jp/kankocho/minpaku/" rel="noopener" target="_blank">民泊制度ポータルサイト</a>と、お住まいの市区町村の保健所・建築指導課へご確認ください。</p>`;

  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow"><a href="${base}area/">エリア別</a> ＞ ${esc(pref)}</p>
  <h1 class="page-title">${esc(pref)}の民泊ニュースとルール</h1>
</section>

<div class="cols">
  <div>
    <div class="blockhead"><h2>${esc(pref)}に関わる発表</h2><span class="stamp">${items.length}件</span></div>
    ${newsList(base, items, `${esc(pref)}を名指しした発表はまだ取得できていません。全国向けの発表は<a href="${base}news/">ニュース一覧</a>をご覧ください。`)}
  </div>
  <aside class="side">
    <div class="panel">
      <h2>制度ごとの可否</h2>
      ${rules}
    </div>
  </aside>
</div>`;
  return layout(base, {
    title: `${pref}の民泊`,
    description: `${pref}の民泊・簡易宿所に関わる行政発表と、制度ごとの可否をまとめています。`,
    current: 'area', body,
  });
}

function pageGuideIndex() {
  const base = '../';
  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">解説記事</p>
  <h1 class="page-title">制度をやさしく読み解く</h1>
  <p class="lede">行政の発表だけでは分かりにくい部分を、編集部が言い換えて説明しています。</p>
</section>
<ul class="newslist" style="margin:26px 0 56px">
  ${guides.map((g) => `<li><span class="d">${fmt(g.updated)}</span><div>
    <h3><a href="${base}guides/${g.slug}.html">${esc(g.title)}</a></h3>
    <p class="src">${esc(g.summary[0] ?? '')}</p></div></li>`).join('')}
</ul>`;
  return layout(base, { title: '解説記事', description: '民泊の制度をやさしく解説した記事の一覧。', current: 'guides', body });
}

function pageGuide(g) {
  const base = '../';
  const body = `
<article style="padding:36px 0 56px">
  <p class="eyebrow">${esc(g.category ?? '解説')}</p>
  <h1 class="page-title">${esc(g.title)}</h1>
  <p class="stamp">最終更新 ${esc(g.updated ?? '—')}</p>
  ${g.summary.length ? `<div class="summarybox"><p class="k">つまり、どうなる？</p><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
  <div class="prose">${g.html}</div>
</article>`;
  return layout(base, { title: g.title, description: g.summary[0] ?? g.title, current: 'guides', body });
}

function pageDocs() {
  const base = '../';
  const total = docs.sources.reduce(
    (a, src) => a + src.sections.reduce((b, sec) => b + sec.groups.reduce((c, g) => c + g.items.length, 0), 0), 0);

  const item = (it) => `<li>
    <span class="d">${it.date ? fmt(it.date) : '—'}</span>
    <div>
      <h3><a class="ext" href="${esc(it.url)}" rel="noopener" target="_blank">${esc(it.title)}</a></h3>
      <div class="tags"><span class="chip">${esc(it.fileType)}</span>${it.size ? `<span class="chip">${esc(it.size)}</span>` : ''}</div>
    </div></li>`;

  const body = `
<section style="padding:36px 0 0">
  <p class="eyebrow">法令・通知</p>
  <h1 class="page-title">旅館業法まわりの法令と通知</h1>
  <p class="lede">厚生労働省が「旅館業のページ」でまとめている法令・通知・資料を、そのまま取り込んで並べています。リンク先はすべて厚生労働省または e-Gov のページです。</p>
</section>

${docs.sources.map((src) => `
<p class="stamp" style="margin-top:22px">出典：<a href="${esc(src.url)}" rel="noopener" target="_blank">${esc(src.name)}</a>（取得日 ${esc(src.fetchedAt)}）　全${total}件</p>
${src.sections.map((sec) => `
<div style="margin-top:36px">
  <div class="blockhead"><h2>${esc(sec.title)}</h2><span class="stamp">${sec.groups.reduce((a, g) => a + g.items.length, 0)}件</span></div>
  ${sec.groups.map((g) => `
    ${g.label ? `<h3 style="font-size:13px;font-family:var(--mono);letter-spacing:.08em;color:var(--teal-deep);margin:22px 0 2px">${esc(g.label)}</h3>` : ''}
    <ul class="newslist">${g.items.map(item).join('')}</ul>`).join('')}
</div>`).join('')}`).join('')}

<div class="panel" style="margin:40px 0 56px">
  <h2>日付がない資料について</h2>
  <p>厚生労働省のページ上で発出日が書かれていないものは「—」と表示しています。日付の記載がない＝古い、という意味ではありません。内容の新しさはリンク先でご確認ください。</p>
</div>`;
  return layout(base, {
    title: '法令・通知',
    description: '旅館業法・住宅宿泊事業法の法令と、厚生労働省の主な通知・資料の一覧。',
    current: 'docs', body,
  });
}

function pageAbout() {
  const base = '';
  const sources = JSON.parse(readFileSync(p('data/sources.json'), 'utf8'));
  const body = `
<article style="padding:36px 0 56px" class="prose">
  <p class="eyebrow">このサイトについて</p>
  <h1 class="page-title">情報の集め方と扱い方</h1>

  <h2>何をしているサイトか</h2>
  <p>観光庁・国土交通省などが公表した発表のうち、民泊・簡易宿所・旅館業に関わるものを毎日自動で集めて並べています。見出しをクリックすると、発表元のページがそのまま開きます。</p>

  <h2>取得している情報源</h2>
  <div class="scroller"><table><thead><tr><th>名称</th><th>取得方法</th><th>URL</th></tr></thead><tbody>
  ${sources.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.type === 'rss' ? 'RSS' : s.type === 'mhlw-docs' ? '資料リンクの取り込み' : 'ページ巡回'}</td><td><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url)}</a></td></tr>`).join('')}
  </tbody></table></div>

  <h2>守っていること</h2>
  <ul>
    <li>記事の本文は保存も転載もしていません。保存しているのは見出し・公開日・発表元・リンクだけです。</li>
    <li>行政サイトへのアクセスは1日1回、同じサイトへの連続アクセスは1.5秒以上あけています。</li>
    <li>数字を載せるときは、出典と取得日を必ず添えます。</li>
    <li>自動で集めた情報をそのまま並べているため、分類（カテゴリ・エリア）に誤りが含まれることがあります。</li>
  </ul>

  <div class="disclaimer">制度の適用可否、必要な手続き、費用などの最終的な判断は、必ず物件所在地の管轄窓口（保健所・消防署・建築指導課）へご確認ください。本サイトは一般的な情報提供であり、個別の案件について結果を保証するものではありません。</div>

  <h2>更新のしくみ</h2>
  <p>GitHub Actions で1日1回、収集スクリプトを動かして自動的に更新しています。サーバーは使っていません。</p>
</article>`;
  return layout(base, { title: 'このサイトについて', description: '情報源、情報の扱い方、免責事項。', current: 'about', body });
}

// ---------- 書き出し ----------
rmSync(OUT, { recursive: true, force: true });
const write = (rel, content) => {
  const file = new URL(rel, OUT);
  mkdirSync(dirname(file.pathname), { recursive: true });
  writeFileSync(file, content);
};

write('assets/site.css', css.trim() + '\n');
write('index.html', pageHome());
write('news/index.html', pageNews());
write('stats/index.html', pageStats());
write('area/index.html', pageAreaIndex());
write('about.html', pageAbout());
write('guides/index.html', pageGuideIndex());
if (docs.sources.length) write('docs/index.html', pageDocs());
for (const g of guides) write(`guides/${g.slug}.html`, pageGuide(g));
for (const pref of prefectures) write(`area/${slugs[pref]}.html`, pageArea(pref));
write('robots.txt', `User-agent: *\nAllow: /\n${site.url ? `Sitemap: ${site.url}/sitemap.xml\n` : ''}`);
write('.nojekyll', '');

const pages = ['', 'news/', 'stats/', 'area/', 'guides/', 'about.html', ...(docs.sources.length ? ['docs/'] : []),
  ...guides.map((g) => `guides/${g.slug}.html`), ...prefectures.map((a) => `area/${slugs[a]}.html`)];
if (site.url) {
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `<url><loc>${site.url}/${u}</loc><lastmod>${articles.updatedAt}</lastmod></url>`).join('\n')}
</urlset>\n`);
}

console.log(`生成 ${pages.length + 2} ページ → dist/`);
console.log(`  ニュース ${news.length}件（うち制度に直結 ${core.length}件） / 解説記事 ${guides.length}本 / エリア ${prefectures.length}件`);
