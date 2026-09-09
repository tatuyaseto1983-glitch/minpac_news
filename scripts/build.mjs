#!/usr/bin/env node
// data/*.json と content/articles/*.md から静的サイトを dist/ に書き出します。
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderMarkdown, parseFrontMatter, esc } from './lib/md.mjs';
import { css } from './lib/theme.mjs';
import { categoryList, prefectures, detectAreas } from './lib/classify.mjs';
import { hueOf, clusterNews, summaryFor, impactFor } from './lib/cards.mjs';
import { hbars, proportionBar, legend } from './lib/charts.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
const OUT = new URL('dist/', root);

const site = {
  name: '民泊コンパス',
  tagline: '民泊の「いま」と「できる」がわかる。',
  lede: '法令、条例、行政発表、市場データ、開業情報をひとつに。',
  url: process.env.SITE_URL ?? '',
};

const articles = JSON.parse(readFileSync(p('data/articles.json'), 'utf8'));
const stats = JSON.parse(readFileSync(p('data/stats.json'), 'utf8'));
const areas = JSON.parse(readFileSync(p('data/areas.json'), 'utf8'));
const guide = JSON.parse(readFileSync(p('data/start-guide.json'), 'utf8'));
const muni = existsSync(p('data/municipalities.json'))
  ? JSON.parse(readFileSync(p('data/municipalities.json'), 'utf8')) : { areas: {}, pdfs: [] };
const docs = existsSync(p('data/documents.json'))
  ? JSON.parse(readFileSync(p('data/documents.json'), 'utf8')) : { sources: [] };
const filings = existsSync(p('data/filings.json'))
  ? JSON.parse(readFileSync(p('data/filings.json'), 'utf8')) : null;

// 都道府県を届出住宅数（いま生きている届出）の多い順に並べたもの。順位表示に使う。
const filingRank = filings
  ? Object.values(filings.areas).sort((a, b) => b.homes - a.homes).map((a, i) => ({ ...a, rank: i + 1 }))
  : [];
const filingOf = Object.fromEntries(filingRank.map((a) => [a.prefecture, a]));

const lodging = existsSync(p('data/lodging.json'))
  ? JSON.parse(readFileSync(p('data/lodging.json'), 'utf8')) : null;
const lodgingOf = lodging?.areas ?? {};

// 「泊まる人は多いのに民泊が少ない地域」を見るための割り算。
// 延べ宿泊者数（1か月）を、いま生きている届出住宅数で割った値。
const demandRank = (lodging && filingRank.length)
  ? Object.values(lodgingOf)
      .filter((a) => filingOf[a.prefecture]?.homes)
      .map((a) => ({
        prefecture: a.prefecture,
        overnight: a.overnight,
        homes: filingOf[a.prefecture].homes,
        occupancy: a.occupancy,
        perHome: Math.round(a.overnight / filingOf[a.prefecture].homes),
      }))
      .sort((x, y) => y.perHome - x.perHome)
      .map((a, i) => ({ ...a, rank: i + 1 }))
  : [];
const demandOf = Object.fromEntries(demandRank.map((a) => [a.prefecture, a]));
const slugs = JSON.parse(readFileSync(p('data/keywords.json'), 'utf8')).prefectureSlugs;

const news = articles.items;
const catOf = (n) => n.category.id;

// 報道は同じ出来事がいくつもの媒体から来るので、話題ごとにまとめる
const pressTopics = clusterNews(news.filter((n) => !n.isPrimary));
const govNews = news.filter((n) => n.isPrimary);
const feed = [...govNews.map((n) => ({ lead: n, others: [] })), ...pressTopics]
  .sort((a, b) => (b.lead.publishedAt ?? '').localeCompare(a.lead.publishedAt ?? ''));

// 重要度で分ける：規制の動き＞その他の報道＞行政発表
const important = feed.filter((e) => ['local', 'law'].includes(catOf(e.lead)));
const govFeed = feed.filter((e) => e.lead.isPrimary);

// ---------- 調査レポート ----------
// content/reports/ に置いたHTMLを、作ったままの形で公開します（中身は書き換えません）。
// 同じ名前の .json があれば表題や要約をそこから、無ければHTMLの中から読みます。
// _private/ に置いたものは公開しません。
const reportDir = p('content/reports/');
const reports = (existsSync(reportDir) ? readdirSync(reportDir).filter((f) => f.endsWith('.html')) : [])
  .map((file) => {
    const html = readFileSync(new URL(file, reportDir), 'utf8');
    const side = file.replace(/\.html$/, '.json');
    const meta = existsSync(new URL(side, reportDir))
      ? JSON.parse(readFileSync(new URL(side, reportDir), 'utf8')) : {};
    const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const pdf = file.replace(/\.html$/, '.pdf');
    return {
      file,
      title: meta.title ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim().split(/[｜|]/)[0].trim()
        ?? file.replace(/\.html$/, ''),
      summary: meta.summary ?? html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? '',
      kind: meta.kind ?? 'エリア分析',
      date: meta.date ?? file.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
        ?? statSync(new URL(file, reportDir)).mtime.toISOString().slice(0, 10),
      areas: meta.areas ?? detectAreas(text).filter((a) => a !== '全国'),
      pdf: existsSync(new URL(pdf, reportDir)) ? pdf : null,
      note: meta.note ?? null,
    };
  })
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

const reportHref = (base, r) => `${base}reports/${encodeURIComponent(r.file)}`;

// ---------- 編集部の解説記事 ----------
const guideDir = p('content/articles/');
const guides = (existsSync(guideDir) ? readdirSync(guideDir).filter((f) => f.endsWith('.md')) : []).map((f) => {
  const { meta, body } = parseFrontMatter(readFileSync(new URL(f, guideDir), 'utf8'));
  return { ...meta, summary: [].concat(meta.summary ?? []), html: renderMarkdown(body) };
}).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

// ---------- 共通 ----------
const fmt = (iso) => (iso ? iso.replaceAll('-', '.') : '—');
const num = (n) => (n == null ? '—' : n.toLocaleString('ja-JP'));

const NAV = [
  ['news/', 'ニュース', 'news'],
  ['area/', 'エリア', 'area'],
  ['stats/', 'データ', 'stats'],
  ['laws/', '法令・条例', 'laws'],
  ['guides/', '解説', 'guides'],
  ...(reports.length ? [['reports/', 'レポート', 'reports']] : []),
];

const SEARCH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

function layout(base, { title, description, current, body, wide = false }) {
  return `<!doctype html>
<html lang="ja">
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="${base}assets/site.css">
</head>
<body>
<header class="site-header" id="hdr"><div class="wrap">
  <a class="brand" href="${base}"><span class="mk"></span>${site.name}</a>
  <nav class="site-nav">${NAV.map(([href, label, id]) =>
    `<a href="${base}${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  <form class="headsearch" action="${base}news/" method="get" role="search">
    ${SEARCH_ICON}<input type="search" name="q" placeholder="キーワードで検索" aria-label="キーワードで検索">
  </form>
</div></header>
<main${wide ? '' : ' class="wrap"'}>
${body}
</main>
<footer class="site-footer"><div class="wrap">
  <div class="brandbar"><i></i><i></i></div>
  <nav class="footnav">
    <a href="${base}news/">ニュース</a><a href="${base}area/">エリア</a><a href="${base}stats/">データ</a>
    <a href="${base}laws/">法令・条例</a><a href="${base}start/">民泊を始める</a>
    <a href="${base}guides/">解説</a>${reports.length ? `<a href="${base}reports/">レポート</a>` : ''}<a href="${base}about.html">このサイトについて</a>
  </nav>
  <p class="micro">掲載しているのは各行政機関の発表と報道各社の見出し・リンクです。記事本文は転載していません。制度の適用可否など最終的な判断は、必ず物件所在地の管轄窓口（保健所・消防署・建築指導課）へご確認ください。</p>
  <p class="micro">${site.name}　／　データ更新日 ${articles.updatedAt}</p>
</div></footer>
<script>
(function(){var h=document.getElementById('hdr');var f=function(){h.classList.toggle('is-small',window.scrollY>60)};
window.addEventListener('scroll',f,{passive:true});f();})();
</script>
</body>
</html>`;
}

// ---------- 記事の部品 ----------
const catLabel = (n) => `<span class="cat" style="--cat:${hueOf(n)}">${esc(n.category.name)}</span>`;

const metaLine = (n) =>
  `<span class="meta">${fmt(n.publishedAt)}</span><span class="dot">·</span>` +
  `<span class="meta">${esc(n.sourceName)}</span>` +
  (n.isPrimary ? '<span class="tag tag--gov">一次情報</span>' : '');

const areaTags = (n) =>
  n.areas.filter((a) => a !== '全国').slice(0, 3).map((a) => `<span class="tag">${esc(a)}</span>`).join('');

const impactBox = (n, mild = false) => {
  const im = impactFor(n);
  return `<div class="impact${mild ? ' impact--n' : ''}">
    <span class="impact__k">民泊事業者への影響</span>
    <p class="impact__t">${esc(im.text)}</p></div>`;
};

/** 一覧の1件 */
function item(n, others = [], attrs = '', { hideImpact = false } = {}) {
  const sum = summaryFor(n);
  return `<a class="item" href="${esc(n.url)}" target="_blank" rel="noopener nofollow"${attrs}>
  <div class="item__top">${catLabel(n)}${metaLine(n)}</div>
  <h3 class="item__title">${esc(n.title)}</h3>
  ${sum ? `<p class="item__sum">${esc(sum.text)}${sum.ai ? '<span class="meta">（AI要約・下書き）</span>' : ''}</p>` : ''}
  ${hideImpact ? '' : impactBox(n)}
  <div class="item__tags">${areaTags(n)}${
    others.length ? `<span class="meta">ほか${others.length}媒体</span>` : ''}</div>
</a>`;
}

/**
 * 同じ文が並ぶと読みにくいので、まとまりの中で2回目以降の
 * 「民泊事業者への影響」は出さない。
 */
function itemsNoRepeat(entries) {
  const seen = new Set();
  return entries.map((e) => {
    const t = impactFor(e.lead ?? e)?.text ?? null;
    const dup = t != null && seen.has(t);
    if (t != null) seen.add(t);
    return item(e.lead ?? e, e.others ?? [], '', { hideImpact: dup });
  }).join('');
}

/** 最重要の1件 */
function leadItem(n, others = []) {
  const sum = summaryFor(n);
  return `<a class="lead" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">
  <div class="item__top">${catLabel(n)}${metaLine(n)}${
    others.length ? `<span class="meta">ほか${others.length}媒体が報じています</span>` : ''}</div>
  <h2 class="lead__title">${esc(n.title)}</h2>
  ${sum ? `<p class="item__sum">${esc(sum.text)}</p>` : ''}
  ${impactBox(n)}
  <div class="item__tags">${areaTags(n)}</div>
</a>`;
}

const feedList = (entries, empty = '該当する記事はまだありません。') =>
  entries.length
    ? `<div class="feed">${entries.map((e) => item(e.lead ?? e, e.others ?? [])).join('')}</div>`
    : `<p class="empty">${empty}</p>`;

const secHead = (title, note, moreHref, moreLabel) =>
  `<div class="sec__head"><h2>${title}</h2>${note ? `<span class="meta">${note}</span>` : ''}</div>`;

function statFigures() {
  const m = stats.minpaku;
  if (!m) return '';
  return `<dl class="tiles">
    <div class="tile"><dt>届出件数（累計）</dt><dd>${num(m.filed)}<span class="u">件</span></dd></div>
    <div class="tile"><dt>うち事業廃止</dt><dd>${num(m.closed)}<span class="u">件</span></dd></div>
    <div class="tile"><dt>現存する届出</dt><dd>${num(m.active)}<span class="u">件</span></dd></div>
    <div class="tile"><dt>住宅宿泊管理業の登録</dt><dd>${num(m.managers)}<span class="u">件</span></dd></div>
  </dl>`;
}

// ---------- ホーム（ダッシュボード） ----------
function pageHome() {
  const base = '';
  const m = stats.minpaku, r = stats.ryokan;
  const topAreas = prefectures
    .map((a) => [a, news.filter((n) => n.areas.includes(a)).length])
    .filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([a]) => a);
  const localFeed = feed.filter((e) => catOf(e.lead) === 'local');
  const wrap = (inner) => `<div class="wrap">${inner}</div>`;

  // いちばん上の1本
  const t = feed[0]?.lead;
  const tSum = t ? summaryFor(t) : null;
  const hero = t ? `<section class="band">${wrap(`
    <a class="top" href="${esc(t.url)}" target="_blank" rel="noopener nofollow">
      <span class="top__eyebrow">いま押さえておきたい</span>
      <h1 class="top__title">${esc(t.title)}</h1>
      <p class="top__sum">${esc(tSum?.text ?? impactFor(t)?.text ?? site.lede)}</p>
      <div class="top__meta">${fmt(t.publishedAt)}<span class="dot">·</span>${esc(t.sourceName)}
        ${t.areas.filter((a) => a !== '全国').slice(0, 3).map((a) => `<span class="tag">${esc(a)}</span>`).join('')}
      </div>
    </a>`)}</section>` : '';

  // 深く知る：解説記事と調査レポートを1本ずつの行で
  const deep = [
    ...reports.map((x) => ({ kind: x.kind, title: x.title, sum: x.summary, href: reportHref(base, x), date: x.date })),
    ...guides.map((g) => ({ kind: g.category ?? '解説', title: g.title, sum: g.summary[0] ?? '',
      href: `${base}guides/${g.slug}.html`, date: g.updated })),
  ].slice(0, 4);

  const body = `
${hero}

<section class="band band--dark">${wrap(`
  <div class="sec__head"><h2>新着</h2>
    <a class="sec__more" href="${base}news/" style="margin-left:auto">記事一覧 →</a></div>
  <div class="cards3">
    ${(() => { const seen = new Set(); return feed.slice(1, 7).map((e) => {
      const n = e.lead;
      let sum = summaryFor(n) ?? impactFor(n);
      if (sum && seen.has(sum.text)) sum = null; else if (sum) seen.add(sum.text);
      return `<a class="mini" href="${esc(n.url)}" target="_blank" rel="noopener nofollow"
        style="background:rgba(255,255,255,.06);box-shadow:none;color:#EAF5F3">
        <span class="cat" style="--cat:#7FD3C9">${esc(n.category.name)}</span>
        <h3 style="color:#fff">${esc(n.title)}</h3>
        ${sum ? `<p style="color:#B9DCD7">${esc(sum.text.slice(0, 84))}${sum.text.length > 84 ? '…' : ''}</p>` : ''}
        <span style="font-size:11.5px;color:#8FC3BC;margin-top:auto">${fmt(n.publishedAt)}　${esc(n.sourceName)}</span>
      </a>`;
    }).join(''); })()}
  </div>`)}</section>

<section class="band band--soft">${wrap(`
  <div class="sec__head"><h2>数字で見る民泊</h2>
    <a class="sec__more" href="${base}stats/" style="margin-left:auto">データ一覧 →</a></div>
  ${statFigures()}
  ${m && r ? `<div class="panel" style="margin-top:14px">
    <h3>宿泊の受け皿はどれくらいあるか</h3>
    <span class="meta">住宅宿泊事業は${esc(m.asOf ?? '')}時点、旅館業は${esc(r.asOfLabel ?? '')}現在</span>
    ${hbars([
      { name: '旅館・ホテル営業', value: r.hotels, key: 'k2' },
      { name: '住宅宿泊事業（現存）', value: m.active, key: 'k1' },
      { name: '簡易宿所', value: r.kani, key: 'k2' },
    ], { unit: '件' })}
    ${legend([{ name: '住宅宿泊事業法（民泊）', key: 'k1' }, { name: '旅館業法', key: 'k2' }])}
    <p class="lead-t"><strong>簡易宿所と民泊は、ほぼ同じ数です。</strong>始める前に、この2つのどちらで行くかを選ぶ場面が必ず来ます。</p>
  </div>` : ''}`)}</section>

${deep.length ? `<section class="band">${wrap(`
  <div class="sec__head"><h2>深く知る</h2>
    <a class="sec__more" href="${base}guides/" style="margin-left:auto">記事一覧 →</a></div>
  ${deep.map((d) => `<a class="readrow" href="${esc(d.href)}">
    <span class="cat" style="--cat:var(--c-law)">${esc(d.kind)}</span>
    <h3>${esc(d.title)}</h3>
    ${d.sum ? `<p>${esc(d.sum)}</p>` : ''}
    <span class="more">詳しく見る →</span></a>`).join('')}`)}</section>` : ''}

<section class="band band--soft">${wrap(`
  <div class="sec__head"><h2>カテゴリ記事</h2></div>

  ${localFeed.length ? `<div class="box">
    <div class="box__head"><h3>自治体のルール変更</h3>
      <a href="${base}news/?cat=local">もっと見る →</a></div>
    <div class="feature2">${itemsNoRepeat(localFeed.slice(0, 4))}</div>
  </div>` : ''}

  <div class="box">
    <div class="box__head"><h3>行政発表</h3>
      <a href="${base}news/?src=gov">もっと見る →</a></div>
    <div class="feature2">${itemsNoRepeat(govFeed.slice(0, 4))}</div>
  </div>

  <div class="box">
    <div class="box__head"><h3>民泊を始める</h3>
      <a href="${base}start/">全7ステップ →</a></div>
    <div class="steps">
      ${guide.steps.slice(0, 4).map((sx) => `<a class="step" href="${base}start/#step-${sx.n}">
        <span class="step__n">STEP ${String(sx.n).padStart(2, '0')}</span>
        <span class="step__t">${esc(sx.title)}</span>
        <span class="step__d">${esc(sx.lead.slice(0, 40))}…</span></a>`).join('')}
    </div>
  </div>`)}</section>

<section class="band">${wrap(`
  <div class="sec__head"><h2>さらに学ぶ</h2></div>
  <div class="learn">
    <a href="${base}area/"><strong>エリアから探す</strong>
      <span>47都道府県の届出の窓口、条例の有無、届出件数、宿泊需要。</span></a>
    <a href="${base}laws/"><strong>法令・条例を調べる</strong>
      <span>住宅宿泊事業法、旅館業法、消防法。関係する通知や資料へのリンク。</span></a>
    <a href="${base}about.html"><strong>このサイトについて</strong>
      <span>どこから情報を集めているか、どう扱っているか。</span></a>
  </div>
  <div class="pills" style="margin-top:22px">
    ${topAreas.map((a) => `<a class="pill" href="${base}area/${slugs[a]}.html">${a}</a>`).join('')}
    <a class="pill" href="${base}area/">47都道府県</a>
  </div>`)}</section>
`;
  return layout(base, {
    title: site.tagline, description: site.lede, current: 'home', body, wide: true,
  });
}

// ---------- ニュース一覧 ----------
function pageNews() {
  const base = '../';
  const PER = 20;
  const featured = feed.slice(0, 2);
  // 注目の2枚は下の一覧から外す（同じものがすぐ下に並ばないように）
  const rest = feed.slice(2);
  const rows = rest.map((e) => {
    const n = e.lead;
    const attrs = ` data-cat="${esc(n.category.name)}" data-area="${esc(n.areas.join('|'))}"` +
      ` data-src="${n.isPrimary ? '行政発表' : '報道'}" data-title="${esc(n.title)}"`;
    return item(n, e.others, attrs);
  }).join('');

  const areaOptions = prefectures
    .map((a) => [a, news.filter((n) => n.areas.includes(a)).length])
    .filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1]).slice(0, 10).map(([a]) => a);
  const themes = ['規制強化', '禁止', '条例', '旅館業', '特区民泊', '補助金', '宿泊税', 'インバウンド'];

  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ ニュース</p>
<div class="maghead">
  <h1>ニュース</h1>
  <p>民泊に関する行政発表・報道を、実務目線で整理。</p>
  <span class="meta">最終更新 ${articles.updatedAt}　／　${feed.length}件</span>
</div>

<div class="two">
  <div>
    ${featured.length ? `<section class="sec" style="margin-top:0">
      ${secHead('注目の話題', '')}
      <div class="feature2">${featured.map((e) => item(e.lead, e.others)).join('')}</div>
    </section>` : ''}

    <div class="sec__head" style="margin-top:34px;margin-bottom:12px">
      <h2 id="count-h">新着</h2><span class="meta" id="count"></span>
    </div>
    <div class="feed" id="list">${rows}</div>
    <p class="empty" id="empty" hidden>条件に合う記事が見つかりませんでした。キーワードを短くするか、絞り込みを解除してください。</p>
    <nav class="pager" id="pager" aria-label="ページ送り"></nav>
  </div>

  <aside class="rail">
    <section>
      <h2>キーワード検索</h2>
      <div class="sbox"><input id="q" type="search" placeholder="例：新宿区、条例、補助金" aria-label="キーワード">
        <button type="button" id="go">検索</button></div>
    </section>
    <section>
      <h2>エリアから探す</h2>
      <div class="pills">
        ${areaOptions.map((a) => `<button class="pill" type="button" data-kind="area" data-value="${esc(a)}" aria-pressed="false">${a}</button>`).join('')}
        <a class="pill" href="${base}area/">すべて</a>
      </div>
    </section>
    <section>
      <h2>テーマから探す</h2>
      <div class="pills">
        ${categoryList.map((c) => `<button class="pill" type="button" data-kind="cat" data-value="${esc(c.name)}" aria-pressed="false">${c.name}</button>`).join('')}
      </div>
    </section>
    <section>
      <h2>情報の種類</h2>
      <div class="pills">
        ${['行政発表', '報道'].map((v) => `<button class="pill" type="button" data-kind="src" data-value="${v}" aria-pressed="false">${v}</button>`).join('')}
      </div>
    </section>
    <section>
      <h2>注目キーワード</h2>
      <div class="pills">
        ${themes.map((t) => `<button class="pill" type="button" data-kind="word" data-value="${esc(t)}" aria-pressed="false">${t}</button>`).join('')}
      </div>
    </section>
  </aside>
</div>

<script>
(function () {
  var PER = ${PER};
  var cards = Array.prototype.slice.call(document.querySelectorAll('#list .item'));
  var q = document.getElementById('q');
  var pills = Array.prototype.slice.call(document.querySelectorAll('.pill[data-kind]'));
  var count = document.getElementById('count');
  var head = document.getElementById('count-h');
  var empty = document.getElementById('empty');
  var pager = document.getElementById('pager');
  var active = {};
  var page = 1;

  function matches(c) {
    var text = (active.word || q.value.trim());
    if (text && c.dataset.title.indexOf(text) < 0) return false;
    if (active.cat && c.dataset.cat !== active.cat) return false;
    if (active.src && c.dataset.src !== active.src) return false;
    if (active.area && c.dataset.area.split('|').indexOf(active.area) < 0) return false;
    return true;
  }

  function label() {
    var parts = [active.area, active.cat, active.src, active.word].filter(Boolean);
    if (q.value.trim()) parts.push('「' + q.value.trim() + '」');
    return parts.length ? parts.join(' × ') : '新着';
  }

  function render() {
    var hits = cards.filter(matches);
    var pages = Math.max(1, Math.ceil(hits.length / PER));
    if (page > pages) page = pages;
    var from = (page - 1) * PER;
    cards.forEach(function (c) { c.hidden = true; });
    hits.slice(from, from + PER).forEach(function (c) { c.hidden = false; });
    head.textContent = label();
    count.textContent = hits.length + '件' + (pages > 1 ? '（' + page + '/' + pages + '）' : '');
    empty.hidden = hits.length > 0;
    drawPager(pages);
  }

  function drawPager(pages) {
    pager.innerHTML = '';
    if (pages < 2) return;
    var add = function (label, target, opts) {
      opts = opts || {};
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      if (opts.arrow) { b.className = 'arrow'; b.setAttribute('aria-label', opts.label); }
      else if (target === page) b.setAttribute('aria-current', 'true');
      if (opts.disabled) b.disabled = true;
      b.addEventListener('click', function () {
        page = target; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      pager.appendChild(b);
    };
    add('‹', Math.max(1, page - 1), { arrow: true, label: '前へ', disabled: page === 1 });
    var shown = [];
    for (var i = 1; i <= pages; i++) if (i <= 3 || i > pages - 1 || Math.abs(i - page) <= 1) shown.push(i);
    shown.forEach(function (i, idx) {
      if (idx && i - shown[idx - 1] > 1) {
        var s = document.createElement('span'); s.className = 'gap'; s.textContent = '…'; pager.appendChild(s);
      }
      add(String(i), i);
    });
    add('›', Math.min(pages, page + 1), { arrow: true, label: '次へ', disabled: page === pages });
  }

  pills.forEach(function (b) {
    b.addEventListener('click', function () {
      var kind = b.dataset.kind, value = b.dataset.value;
      var on = active[kind] === value;
      pills.forEach(function (o) { if (o.dataset.kind === kind) o.setAttribute('aria-pressed', 'false'); });
      active[kind] = on ? null : value;
      if (!on) b.setAttribute('aria-pressed', 'true');
      page = 1; render();
    });
  });
  q.addEventListener('input', function () { active.word = null;
    pills.forEach(function (o) { if (o.dataset.kind === 'word') o.setAttribute('aria-pressed', 'false'); });
    page = 1; render(); });
  document.getElementById('go').addEventListener('click', function () { page = 1; render(); });

  var params = new URLSearchParams(location.search);
  if (params.get('q')) q.value = params.get('q');
  ['cat', 'area', 'src'].forEach(function (k) {
    var v = params.get(k); if (!v) return;
    var hit = pills.filter(function (b) { return b.dataset.kind === k && b.dataset.value === v; })[0];
    if (hit) { active[k] = v; hit.setAttribute('aria-pressed', 'true'); }
  });
  render();
  if (location.hash === '#q') q.focus();
})();
</script>`;
  return layout(base, { title: 'ニュース', description: '民泊に関する行政発表・報道を、実務目線で整理。', current: 'news', body });
}

// ---------- データ ----------
function pageStats() {
  const base = '../';
  const m = stats.minpaku, r = stats.ryokan, h = stats.history ?? [];
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const recent = news.filter((n) => (n.publishedAt ?? '') >= since);
  const countBy = (pick) => {
    const t = {};
    for (const n of recent) for (const v of [].concat(pick(n))) t[v] = (t[v] ?? 0) + 1;
    return Object.entries(t).sort((x, y) => y[1] - x[1]);
  };
  const areaRank = countBy((n) => n.areas).filter(([a]) => a !== '全国').slice(0, 10);
  const catRank = countBy((n) => n.category.name);

  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ データ</p>
<div class="phead">
  <h1 class="h-page">数字で見る民泊</h1>
  <p class="sub">行政が公表している数字を自動で読み取って並べています。すべて出典と時点つきです。</p>
  <span class="meta">最終更新 ${articles.updatedAt}</span>
</div>

${m ? `<dl class="tiles">
  <div class="tile"><dt>住宅宿泊事業の届出（現存）</dt><dd>${num(m.active)}<span class="u">件</span></dd>
    <span class="d">${esc(m.asOf ?? '')}時点</span></div>
  ${r ? `<div class="tile"><dt>簡易宿所</dt><dd>${num(r.kani)}<span class="u">件</span></dd>
    <span class="d">${esc(r.asOfLabel ?? '')}現在</span></div>
  <div class="tile"><dt>旅館・ホテル営業</dt><dd>${num(r.hotels)}<span class="u">件</span></dd>
    <span class="d">${esc(r.asOfLabel ?? '')}現在</span></div>` : ''}
  <div class="tile"><dt>住宅宿泊管理業の登録</dt><dd>${num(m.managers)}<span class="u">件</span></dd>
    <span class="d">${esc(m.asOf ?? '')}時点</span></div>
</dl>` : ''}

${m && r ? `<div class="panel">
  <h3>宿泊の受け皿はどれくらいあるか</h3>
  <span class="meta">住宅宿泊事業は${esc(m.asOf ?? '')}時点、旅館業は${esc(r.asOfLabel ?? '')}現在</span>
  ${hbars([
    { name: '旅館・ホテル営業', value: r.hotels, key: 'k2' },
    { name: '住宅宿泊事業（現存）', value: m.active, key: 'k1' },
    { name: '簡易宿所', value: r.kani, key: 'k2' },
  ], { unit: '件' })}
  ${legend([{ name: '住宅宿泊事業法（民泊）', key: 'k1' }, { name: '旅館業法', key: 'k2' }])}
  <p class="lead-t"><strong>簡易宿所と民泊は、ほぼ同じ数です。</strong>「民泊をやる」と決める前に、この2つのどちらで行くかを選ぶ場面が必ず来ます。数の上でも、実際にどちらも選ばれています。</p>
  <div class="notice" style="margin-top:14px">2つは調査の時点が違います。厳密な同時点の比較ではなく、規模感の目安としてご覧ください。</div>
</div>` : ''}

${m ? `<div class="panel">
  <h3>届出のうち、およそ3件に1件はすでにやめている</h3>
  <span class="meta">住宅宿泊事業の届出 累計${num(m.filed)}件の内訳　／　${esc(m.asOf ?? '')}時点</span>
  ${proportionBar([
    { name: 'いま届出が生きている', value: m.active, key: 'k1' },
    { name: 'すでに事業をやめた', value: m.closed, key: 'k1-pale' },
  ], { unit: '件' })}
  <p class="lead-t">参入しやすい制度である一方、続けるのは別の話だということが数字に出ています。<strong>始める前に、やめた人がなぜやめたのかを調べておく価値があります。</strong></p>
</div>` : ''}

<div class="panel">
  <h3>届出件数の推移</h3>
  ${h.length > 1
    ? `<span class="meta">このサイトが取得できた時点のみ</span><div class="scroller" style="margin-top:14px">${historyChart(h)}</div>`
    : `<p class="lead-t">時点の違うデータが2件以上たまると、ここに推移のグラフが出ます（現在 ${h.length} 件）。観光庁は年6回ほど更新しているため、半年ほどで形が見えてきます。</p>`}
</div>

${lodging ? `<div class="panel">
  <h3>宿泊の需要はどこに大きいか</h3>
  <span class="meta">延べ宿泊者数　／　${esc(lodging.period)}（${esc(lodging.stage)}）　／　全国${num(Math.round(lodging.national.overnight / 10000))}万人泊</span>
  ${hbars(Object.values(lodgingOf).sort((a, b) => b.overnight - a.overnight).slice(0, 15)
    .map((a, i) => ({ name: `${i + 1}. ${a.prefecture}`, value: Math.round(a.overnight / 10000), key: 'k2' })), { unit: '万人泊' })}
  <p class="lead-t">1か月に何泊されたかの合計です。ホテルも旅館も民泊もすべて含みます。<strong>民泊の数（上のグラフ）とは順番が違います。</strong>そこが次の話につながります。</p>
</div>` : ''}

${demandRank.length ? `<div class="panel">
  <h3>泊まる人は多いのに、民泊が少ない地域</h3>
  <span class="meta">民泊1軒あたりの延べ宿泊者数　／　宿泊は${esc(lodging.period)}、民泊は${esc(filings.asOf)}時点</span>
  ${hbars(demandRank.slice(0, 12).map((a) => ({ name: `${a.rank}. ${a.prefecture}`, value: a.perHome, key: 'k1' })), { unit: '人泊' })}
  <p class="lead-t">宿泊の需要を民泊の軒数で割った数字です。<strong>大きいほど「泊まる人はいるのに、民泊はまだ少ない」ことを表します。</strong>この数字がいちばん大きい${esc(demandRank[0].prefecture)}（民泊${num(demandRank[0].homes)}軒）と、いちばん小さい${esc(demandRank.at(-1).prefecture)}（同${num(demandRank.at(-1).homes)}軒）では${Math.round(demandRank[0].perHome / demandRank.at(-1).perHome)}倍の開きがあります。</p>
  <div class="notice" style="margin-top:14px"><strong>この数字だけで「空いている」とは言えません。</strong>需要の受け皿はホテルや旅館もあるためです。目安として、
    ${demandRank.slice(0, 5).map((a) => `${esc(a.prefecture)}の客室稼働率は${a.occupancy}%`).join('、')}
    です。稼働率が低ければ、宿そのものは足りている可能性があります。上位に入った地域を、次に稼働率と季節で確かめる、という順番で見てください。</div>
</div>` : ''}

${lodging ? `<div class="panel">
  <h3>外国人の割合が高い都道府県</h3>
  <span class="meta">延べ宿泊者数に占める外国人の割合　／　${esc(lodging.period)}（${esc(lodging.stage)}）　／　全国${lodging.national.foreignShare}%</span>
  ${hbars(Object.values(lodgingOf).sort((a, b) => b.foreignShare - a.foreignShare).slice(0, 12)
    .map((a, i) => ({ name: `${i + 1}. ${a.prefecture}`, value: a.foreignShare, key: 'k2' })), { unit: '%' })}
  <p class="lead-t">外国人の割合が高い地域は、案内表示や連絡の手段を先に整える必要があります。<strong>同じ「民泊」でも、来る人が違えば準備するものが変わります。</strong></p>
</div>` : ''}

${filingRank.length ? `<div class="panel">
  <h3>民泊はどこに多いか</h3>
  <span class="meta">いま生きている届出の件数　／　${esc(filings.asOf)}時点　／　全国${num(filings.totals.all.homes)}件</span>
  ${hbars(filingRank.slice(0, 15).map((a) => ({ name: `${a.rank}. ${a.prefecture}`, value: a.homes, key: 'k1' })), { unit: '件' })}
  <p class="lead-t"><strong>上位3都道府県で全国の${Math.round((filingRank.slice(0, 3).reduce((t, a) => t + a.homes, 0) / filings.totals.all.homes) * 100)}%を占めます。</strong>いちばん少ない${esc(filingRank.at(-1).prefecture)}は${num(filingRank.at(-1).homes)}件で、上位との差は100倍以上あります。人が集まる場所に、そのまま集まっている形です。</p>
  <div class="notice" style="margin-top:14px">この数字は「届出のあった住宅の数」で、実際に客を受け入れている数ではありません。届出をしたまま動いていない物件も含まれます。</div>
</div>` : ''}

${filings ? `<div class="panel">
  <h3>受付の窓口はどこか</h3>
  <span class="meta">届出は都道府県・保健所を持つ市・東京23区のどこかが受け付けます　／　${esc(filings.asOf)}時点</span>
  ${proportionBar([
    { name: '東京23区', value: filings.totals.ward.homes, key: 'k1' },
    { name: '保健所設置市', value: filings.totals.city.homes, key: 'k2' },
    { name: '都道府県', value: filings.totals.prefecture.homes, key: 'k1-pale' },
  ], { unit: '件' })}
  <p class="lead-t">全国の民泊の${Math.round((filings.totals.ward.homes / filings.totals.all.homes) * 100)}%が東京23区にあります。<strong>「どこに届け出るか」は、物件の住所で決まります。</strong>同じ都内でも、23区なら区、それ以外なら都が窓口です。</p>
  ${filings.tokku ? `<dl class="tiles" style="margin-top:20px">
    <div class="tile"><dt>特区民泊の認定居室数</dt><dd>${num(filings.tokku.rooms)}<span class="u">居室</span></dd>
      <span class="d">${esc(filings.tokku.asOfLabel ?? '')}時点</span></div>
    <div class="tile"><dt>住宅宿泊管理業の登録</dt><dd>${num(filings.managers)}<span class="u">件</span></dd>
      <span class="d">${esc(filings.asOf)}時点</span></div>
    <div class="tile"><dt>住宅宿泊仲介業の登録</dt><dd>${num(filings.brokers)}<span class="u">件</span></dd>
      <span class="d">${esc(filings.asOf)}時点</span></div>
  </dl>` : ''}
</div>` : ''}

${areaRank.length ? `<div class="panel">
  <h3>いま話題になっている場所</h3>
  <span class="meta">直近90日にこのサイトが集めた記事の本数（${recent.length}件が対象）</span>
  ${hbars(areaRank.map(([name, value]) => ({ name, value, key: 'k1' })), { unit: '件' })}
  <p class="lead-t">条例の見直しが動いている地域ほど、記事が集まります。<strong>施設の数ではなく、話題の多さです。</strong></p>
</div>` : ''}

${catRank.length ? `<div class="panel">
  <h3>何が話題になっているか</h3>
  <span class="meta">直近90日 ／ テーマ別の記事本数</span>
  ${hbars(catRank.map(([name, value]) => ({ name, value, key: 'k1' })), { unit: '件' })}
  <div class="notice" style="margin-top:14px">この2つは、このサイトが集めた記事の本数です。世の中の出来事の総数ではありません。集め方の都合で古い時期ほど取りこぼすため、月ごとの推移は出していません。</div>
</div>` : ''}

${(() => {
  const L = stats.lodging;
  if (!L) return '';
  const man = (n) => `${Math.round(n / 10000).toLocaleString('ja-JP')}<span class="u">万人泊</span>`;
  const yoy = (v) => (v == null ? '' : `<span class="d">前年同月比 ${v > 0 ? '+' : ''}${v}%</span>`);
  const foreignShare = L.overnightForeign
    ? Math.round((L.overnightForeign.value / L.overnight.value) * 1000) / 10 : null;
  return `<div class="panel">
    <h3>宿泊の実績（${esc(L.period)}）</h3>
    <span class="meta">出典：<a href="${esc(L.sourceUrl)}" rel="noopener" target="_blank">${esc(L.source)}</a>（${esc(L.publishedAt)} 発表・取得日 ${esc(L.fetchedAt)}）</span>
    <dl class="tiles" style="margin-top:16px">
      <div class="tile"><dt>延べ宿泊者数</dt><dd>${man(L.overnight.value)}</dd>${yoy(L.overnight.yoy)}</div>
      ${L.overnightForeign ? `<div class="tile"><dt>うち外国人</dt><dd>${man(L.overnightForeign.value)}</dd>${yoy(L.overnightForeign.yoy)}</div>` : ''}
      ${foreignShare != null ? `<div class="tile"><dt>外国人の割合</dt><dd>${foreignShare}<span class="u">%</span></dd>
        <span class="d">延べ宿泊者数に占める</span></div>` : ''}
      ${L.occupancy != null ? `<div class="tile"><dt>客室稼働率</dt><dd>${L.occupancy}<span class="u">%</span></dd>
        <span class="d">全体</span></div>` : ''}
    </dl>
    <p class="lead-t">全国の宿泊需要の大きさと、そのうちどれくらいが外国人かが分かります。<strong>稼働率は、民泊の稼働の見込みを立てるときの目安になります。</strong></p>
    ${L.caution ? `<div class="notice" style="margin-top:14px">${esc(L.caution)}</div>` : ''}
  </div>`;
})()}

${(() => {
  const e = stats.estat ?? {};
  const keys = Object.keys(e).filter((k) => e[k]?.nationwide != null || (e[k]?.byArea ?? []).length);
  if (!keys.length) return '';
  const tiles = keys.map((k) => {
    const d = e[k];
    return `<div class="tile"><dt>${esc(d.label)}</dt>
      <dd>${num(d.nationwide)}<span class="u">${esc(d.unit ?? '')}</span></dd>
      <span class="d">${esc(d.period ?? '')}　全国</span></div>`;
  }).join('');
  const withAreas = keys.map((k) => e[k]).filter((d) => (d.byArea ?? []).length >= 5)[0];
  return `<div class="panel">
    <h3>宿泊の実績（宿泊旅行統計調査）</h3>
    <span class="meta">出典：観光庁 宿泊旅行統計調査（e-Stat API）　／　取得日 ${esc(e[keys[0]].fetchedAt ?? '')}</span>
    <dl class="tiles" style="margin-top:16px">${tiles}</dl>
    ${withAreas ? `<h3 style="margin-top:26px">${esc(withAreas.label)}　都道府県別 上位10</h3>
      <span class="meta">${esc(withAreas.period ?? '')}</span>
      ${hbars(withAreas.byArea.slice(0, 10).map((r) => ({ name: r.area, value: r.value, key: 'k1' })),
        { unit: withAreas.unit ?? '' })}` : ''}
    <p class="lead-t">数字は e-Stat の API から自動で取り込んでいます。表そのものは
      <a href="${esc(e[keys[0]].sourceUrl ?? 'https://www.e-stat.go.jp/')}" rel="noopener" target="_blank">e-Stat</a> で確認できます。</p>
  </div>`;
})()}

<div class="panel">
  <h3>これから足したい数字</h3>
  <p class="lead-t">次の数字は、公開されている一次情報の形式の都合で、まだ取り込めていません。</p>
  <div class="scroller"><table class="srctable">
    <thead><tr><th>数字</th><th>状況</th></tr></thead>
    <tbody>
      ${stats.lodging ? '' : '<tr><td>延べ宿泊者数・客室稼働率</td><td>観光庁の報道発表ページから読み取ります</td></tr>'}
      <tr><td>ADR（平均客室単価）・掲載件数</td><td>公的な無料の出典が見つかっていません</td></tr>
    </tbody>
  </table></div>
</div>

<div class="panel" style="margin-bottom:60px">
  <h3>このページの数字の出どころ</h3>
  <div class="scroller"><table class="srctable">
    <thead><tr><th>数字</th><th>出典</th><th>時点</th><th>取得日</th></tr></thead>
    <tbody>
      ${m ? `<tr><td>住宅宿泊事業の届出・廃止・登録件数</td>
        <td><a href="${esc(m.sourceUrl)}" rel="noopener" target="_blank">${esc(m.source)}</a></td>
        <td>${esc(m.asOf ?? '—')}</td><td>${esc(m.fetchedAt)}</td></tr>` : ''}
      ${r ? `<tr><td>旅館業の営業許可施設数</td>
        <td><a href="${esc(r.sourceUrl)}" rel="noopener" target="_blank">${esc(r.source)}</a></td>
        <td>${esc(r.asOfLabel ?? '—')}</td><td>${esc(r.fetchedAt)}</td></tr>` : ''}
      ${lodging ? `<tr><td>都道府県別の延べ宿泊者数・外国人比率・客室稼働率</td>
        <td><a href="${esc(lodging.pdfUrl)}" rel="noopener" target="_blank">${esc(lodging.source)}</a>（PDF）</td>
        <td>${esc(lodging.period)}（${esc(lodging.stage)}）</td><td>${esc(lodging.updatedAt)}</td></tr>` : ''}
      ${filings ? `<tr><td>都道府県別の届出件数・特区民泊の認定居室数</td>
        <td><a href="${esc(filings.pdfUrl)}" rel="noopener" target="_blank">${esc(filings.source)}</a>（PDF）</td>
        <td>${esc(filings.asOf)}</td><td>${esc(filings.updatedAt)}</td></tr>` : ''}
      ${stats.lodging ? `<tr><td>延べ宿泊者数・客室稼働率</td>
        <td><a href="${esc(stats.lodging.sourceUrl)}" rel="noopener" target="_blank">${esc(stats.lodging.source)}</a></td>
        <td>${esc(stats.lodging.period)}</td><td>${esc(stats.lodging.fetchedAt)}</td></tr>` : ''}
      ${Object.values(stats.estat ?? {}).map((d) => `<tr><td>${esc(d.label)}</td>
        <td><a href="${esc(d.sourceUrl)}" rel="noopener" target="_blank">観光庁 宿泊旅行統計調査（e-Stat）</a></td>
        <td>${esc(d.period ?? '—')}</td><td>${esc(d.fetchedAt ?? '—')}</td></tr>`).join('')}
      <tr><td>話題の本数</td><td>このサイトが集めた記事</td><td>直近90日</td><td>${esc(articles.updatedAt)}</td></tr>
    </tbody>
  </table></div>
</div>`;
  return layout(base, { title: 'データ', description: '住宅宿泊事業の届出件数、旅館業の営業許可施設数など、民泊に関する公的な数字。', current: 'stats', body });
}

function historyChart(h) {
  const W = 640, H = 210, L = 60, R = 20, T = 16, B = 38;
  const vals = h.map((r) => r.filed);
  const max = Math.max(...vals) * 1.05, min = Math.min(...vals) * 0.95;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, h.length - 1);
  const y = (v) => T + ((max - v) * (H - T - B)) / (max - min || 1);
  const pts = h.map((r, i) => `${x(i).toFixed(1)},${y(r.filed).toFixed(1)}`);
  const ticks = [min, (min + max) / 2, max];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px;display:block" role="img" aria-label="届出件数の推移">
  <g stroke="var(--line)">${ticks.map((t) => `<line x1="${L}" y1="${y(t).toFixed(1)}" x2="${W - R}" y2="${y(t).toFixed(1)}"/>`).join('')}</g>
  <g fill="var(--ink-3)" font-size="11" text-anchor="end">
    ${ticks.map((t) => `<text x="${L - 8}" y="${(y(t) + 4).toFixed(1)}">${Math.round(t).toLocaleString('ja-JP')}</text>`).join('')}</g>
  <path fill="var(--k1)" fill-opacity="0.1" d="M${pts.join(' L')} L${x(h.length - 1).toFixed(1)},${H - B} L${L},${H - B} Z"/>
  <path fill="none" stroke="var(--k1)" stroke-width="2.5" stroke-linejoin="round" d="M${pts.join(' L')}"/>
  <circle cx="${x(h.length - 1).toFixed(1)}" cy="${y(vals.at(-1)).toFixed(1)}" r="4.5" fill="var(--k2)" stroke="var(--surface)" stroke-width="2"/>
  <g fill="var(--ink-3)" font-size="11">
    <text x="${L}" y="${H - 12}">${esc(h[0].asOf ?? '')}</text>
    <text x="${W - R}" y="${H - 12}" text-anchor="end">${esc(h.at(-1).asOf ?? '')}</text></g>
</svg>`;
}

// ---------- エリア ----------
function pageAreaIndex() {
  const base = '../';
  const counts = Object.fromEntries(prefectures.map((a) => [a, news.filter((n) => n.areas.includes(a)).length]));
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ エリア</p>
<div class="phead">
  <h1 class="h-page">エリアから探す</h1>
  <p class="sub">民泊のルールは市区町村ごとに違います。まず都道府県を選んでください。</p>
</div>
<div class="pills" style="padding-bottom:20px">
  ${prefectures.map((a) => {
    const m = muni.areas?.[a];
    const ord = m ? (m.self?.hasOrdinance ? 1 : 0) + m.municipalities.filter((o) => o.hasOrdinance).length : 0;
    return `<a class="pill" href="${base}area/${slugs[a]}.html">${a}${ord ? `　<span style="color:var(--green-ink)">条例${ord}</span>` : ''}</a>`;
  }).join('')}
</div>
<div class="notice">数字は、その都道府県で条例が定められている自治体の数です（観光庁の一覧に基づく）。条例があると、区域や期間などに法律への上乗せの決まりがある場合があります。</div>

${filingRank.length ? `<div class="panel" style="margin-bottom:60px">
  <h3>民泊の多い都道府県</h3>
  <span class="meta">いま生きている届出の件数　／　${esc(filings.asOf)}時点</span>
  ${hbars(filingRank.slice(0, 12).map((a) => ({ name: `${a.rank}. ${a.prefecture}`, value: a.homes, key: 'k1' })), { unit: '件' })}
  <p class="lead-t">上位に偏っています。<strong>全国${num(filings.totals.all.homes)}件のうち、上位3都道府県だけで${Math.round((filingRank.slice(0, 3).reduce((t, a) => t + a.homes, 0) / filings.totals.all.homes) * 100)}%を占めます。</strong>都市部と観光地に集中している、というのが数字の形です。</p>
  <p class="meta" style="margin-top:10px">出典：<a href="${esc(filings.pdfUrl)}" rel="noopener" target="_blank">${esc(filings.source)}</a>（PDF・取得日 ${esc(filings.updatedAt)}）</p>
</div>` : '<div style="margin-bottom:60px"></div>'}`;
  return layout(base, { title: 'エリア', description: '都道府県ごとの民泊関連ニュースとルール情報。', current: 'area', body });
}

function pageArea(pref) {
  const base = '../';
  const items = feed.filter((e) => e.lead.areas.includes(pref));
  const m = muni.areas?.[pref];
  const entry = (areas.entries ?? []).find((e) => e.pref === pref && !e.city);

  const badge = (on) => (on ? '<span class="tag tag--gov">条例あり</span>' : '');
  const office = (o, big = false) => `<div class="item" style="cursor:default">
    <div class="item__top">
      ${big ? `<span class="cat" style="--cat:var(--c-local)">${esc(pref)}の窓口</span>` : ''}
      ${badge(o.hasOrdinance)}
    </div>
    <h3 class="item__title">${o.url ? `<a href="${esc(o.url)}" rel="noopener" target="_blank">${esc(o.name)}</a>` : esc(o.name)}</h3>
    ${o.dept ? `<p class="item__sum">${esc(o.dept)}</p>` : ''}
    <div class="item__tags">
      ${o.tel ? `<span class="tag">${esc(o.tel)}</span>` : ''}
      ${o.address ? `<span class="meta">${esc(o.address)}</span>` : ''}
    </div></div>`;

  const rules = entry && entry.status === '確認済'
    ? `<div class="scroller"><table class="srctable">
        <thead><tr><th>制度</th><th>可否</th><th>主な条件</th><th>窓口</th></tr></thead>
        <tbody>${entry.systems.map((sx) => `<tr><td><strong>${esc(sx.type)}</strong></td><td>${esc(sx.availability)}</td>
          <td>${esc(sx.conditions ?? '')}</td><td>${esc(sx.contact ?? '')}</td></tr>`).join('')}</tbody></table></div>
       <p class="meta" style="margin-top:10px">最終確認 ${esc(entry.verifiedAt ?? '—')}　／　${esc(entry.verifiedBy ?? '')}</p>`
    : '';

  const f = filingOf[pref];
  const KIND = { prefecture: '都道府県が窓口', city: '保健所設置市', ward: '特別区' };
  const numbers = f ? `<section class="sec" style="margin-top:0">
      ${secHead('この地域の届出件数', `${esc(filings.asOf)}時点`)}
      <dl class="tiles">
        <div class="tile"><dt>いま生きている届出</dt><dd>${num(f.homes)}<span class="u">件</span></dd>
          <span class="d">全国${filingRank.length}都道府県中 ${f.rank}位</span></div>
        <div class="tile"><dt>これまでの届出</dt><dd>${num(f.filed)}<span class="u">件</span></dd>
          <span class="d">制度が始まってからの累計</span></div>
        <div class="tile"><dt>すでにやめた</dt><dd>${num(f.closed)}<span class="u">件</span></dd>
          <span class="d">累計のうち${Math.round((f.closed / f.filed) * 100)}%</span></div>
      </dl>
      ${f.breakdown.length > 1 ? `<h3 style="margin-top:26px">窓口ごとの内訳</h3>
        <span class="meta">いま生きている届出の件数</span>
        ${hbars(f.breakdown.map((b) => ({ name: b.name, value: b.homes, key: b.kind === 'prefecture' ? 'k2' : 'k1' })), { unit: '件' })}
        <p class="meta" style="margin-top:10px">${esc(pref)}の行は、市区が自分で受け付ける地域を除いた残りの件数です。</p>` : ''}
      <p class="meta" style="margin-top:12px">出典：<a href="${esc(filings.pdfUrl)}" rel="noopener" target="_blank">${esc(filings.source)}</a>（PDF・取得日 ${esc(filings.updatedAt)}）</p>
    </section>` : '';

  const L = lodgingOf[pref];
  const dm = demandOf[pref];
  const yoy = (v) => (v == null ? '' : `<span class="d">前年同月比 ${v > 0 ? '+' : ''}${v}%</span>`);
  const demand = L ? `<section class="sec">
      ${secHead('この地域に泊まっている人', `${esc(lodging.period)}（${esc(lodging.stage)}）`)}
      <dl class="tiles">
        <div class="tile"><dt>延べ宿泊者数</dt><dd>${num(Math.round(L.overnight / 10000))}<span class="u">万人泊</span></dd>
          ${yoy(L.overnightYoy)}</div>
        ${L.foreignShare != null ? `<div class="tile"><dt>うち外国人</dt><dd>${L.foreignShare}<span class="u">%</span></dd>
          <span class="d">全国は${lodging.national.foreignShare}%</span></div>` : ''}
        ${L.occupancy != null ? `<div class="tile"><dt>客室稼働率</dt><dd>${L.occupancy}<span class="u">%</span></dd>
          <span class="d">全国47都道府県中 ${L.occupancyRank}位</span></div>` : ''}
        ${L.kaniOccupancy != null ? `<div class="tile"><dt>簡易宿所の稼働率</dt><dd>${L.kaniOccupancy}<span class="u">%</span></dd>
          <span class="d">全国は${lodging.national.kaniOccupancy}%</span></div>` : ''}
      </dl>
      ${dm ? `<p class="lead-t" style="margin-top:18px">この地域では、<strong>民泊1軒あたり月${num(dm.perHome)}人泊</strong>の需要があります（宿泊は${esc(lodging.period)}、民泊は${esc(filings.asOf)}時点）。
        数字が大きいほど「泊まる人はいるのに民泊は少ない」ことを表し、${esc(pref)}は<strong>全国${demandRank.length}都道府県中${dm.rank}位</strong>です。
        ただし受け皿はホテルや旅館もあるため、この数字だけでは判断できません。${esc(pref)}の客室稼働率${L.occupancy}%と併せてご覧ください。</p>` : ''}
      <p class="meta" style="margin-top:10px">出典：<a href="${esc(lodging.pdfUrl)}" rel="noopener" target="_blank">${esc(lodging.source)}</a>（PDF・取得日 ${esc(lodging.updatedAt)}）</p>
    </section>` : '';

  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ <a href="${base}area/">エリア</a> ＞ ${esc(pref)}</p>
<div class="phead">
  <h1 class="h-page">${esc(pref)}で民泊を始めるには</h1>
  <p class="sub">届出の窓口、条例の有無、この地域のニュースをまとめています。</p>
</div>

<div class="two">
  <div>
    ${numbers}
    ${demand}
    ${m ? `<section class="sec"${f ? '' : ' style="margin-top:0"'}>
      ${secHead('届出の窓口', m.municipalities.length ? `${esc(pref)}と、届出を受け付ける${m.municipalities.length}市区` : '')}
      <div class="feed">
        ${m.self ? office(m.self, true) : ''}
        ${m.municipalities.map((o) => office(o)).join('')}
      </div>
      <div class="notice" style="margin-top:14px">
        <strong>「条例あり」は、観光庁の一覧でその印が付いている自治体です。</strong>
        区域や期間の制限など、法律に上乗せした決まりがある可能性があります。
        <strong>中身は必ず自治体名のリンク先でご確認ください。</strong>
        ${m.municipalities.length ? `${esc(pref)}内でも、上に挙げた市区は自分のところで届出を受け付けます。それ以外の地域は${esc(pref)}が窓口です。` : ''}
      </div>
      ${muni.pdfs?.length ? `<div class="item__tags" style="margin-top:12px">
        ${muni.pdfs.map((f) => `<a class="tag" href="${esc(f.url)}" rel="noopener" target="_blank">${esc(f.title)}（PDF）</a>`).join('')}
      </div>` : ''}
      <p class="meta" style="margin-top:10px">出典：<a href="${esc(muni.sourceUrl)}" rel="noopener" target="_blank">${esc(muni.source)}</a>（取得日 ${esc(muni.updatedAt)}）</p>
    </section>` : `<div class="notice">この地域の窓口情報を取得できていません。
      <a href="https://www.mlit.go.jp/kankocho/minpaku/" rel="noopener" target="_blank">民泊制度ポータルサイト</a>でご確認ください。</div>`}

    ${rules ? `<section class="sec">${secHead('制度ごとの可否', '')}${rules}</section>` : ''}

    <section class="sec">
      ${secHead(`${esc(pref)}に関わるニュース`, `${items.length}件`)}
      ${feedList(items.slice(0, 20), `${esc(pref)}を名指しした発表はまだ取得できていません。全国向けの発表は<a href="${base}news/">ニュース</a>をご覧ください。`)}
    </section>
  </div>
  <aside class="rail">
    ${(() => {
      const rs = reports.filter((r) => r.areas.includes(pref));
      return rs.length ? `<section>
        <h2>${esc(pref)}の調査レポート</h2>
        <div class="linklist">
          ${rs.map((r) => `<a href="${reportHref(base, r)}">${esc(r.title)}</a>`).join('')}
        </div>
      </section>` : '';
    })()}
    <section>
      <h2>開業までの流れ</h2>
      <div class="linklist">
        ${guide.steps.slice(0, 4).map((sx) => `<a href="${base}start/#step-${sx.n}">STEP ${sx.n}　${esc(sx.title)}</a>`).join('')}
        <a href="${base}start/">全7ステップを見る</a>
      </div>
    </section>
    <section>
      <h2>ほかのエリア</h2>
      <div class="pills">
        ${prefectures.filter((x) => x !== pref && news.some((n) => n.areas.includes(x))).slice(0, 8)
          .map((x) => `<a class="pill" href="${base}area/${slugs[x]}.html">${x}</a>`).join('')}
        <a class="pill" href="${base}area/">すべて</a>
      </div>
    </section>
  </aside>
</div>`;
  return layout(base, {
    title: `${pref}の民泊`,
    description: `${pref}で民泊を始めるには。届出の窓口、条例の有無、この地域のニュース。`,
    current: 'area', body,
  });
}

// ---------- 法令・条例 ----------
function pageLaws() {
  const base = '../';
  const allDocs = docs.sources.flatMap((s) => s.sections.flatMap((sec) => sec.groups.flatMap((g) => g.items)));
  const linkFor = (key) => allDocs.find((d) => d.title === key || d.title.startsWith(key))?.url ?? null;
  const src = docs.sources[0];

  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ 法令・条例</p>
<div class="phead">
  <h1 class="h-page">法令・条例</h1>
  <p class="sub">民泊に関係する法律を、何を決めているかから引けるようにしています。</p>
  ${src ? `<span class="meta">出典：<a href="${esc(src.url)}" rel="noopener" target="_blank">${esc(src.name)}</a>（取得日 ${esc(src.fetchedAt)}）</span>` : ''}
</div>

<section class="sec" style="margin-top:0">
  ${secHead('民泊に関係する法律', '')}
  <div class="feed">
    ${guide.laws.map((l) => {
      const url = linkFor(l.key);
      return `<div class="item" style="cursor:default">
        <div class="item__top"><span class="cat" style="--cat:var(--c-law)">${esc(l.one)}</span></div>
        <h3 class="item__title">${esc(l.key)}</h3>
        <p class="item__sum">${esc(l.detail)}</p>
        <div class="item__tags">
          ${url ? `<a class="tag" href="${esc(url)}" rel="noopener" target="_blank">条文を読む（e-Gov）</a>` : ''}
          <a class="tag" href="${base}start/">開業の流れで確認する</a>
        </div></div>`;
    }).join('')}
  </div>
</section>

${docs.sources.map((s) => s.sections.filter((sec) => sec.title !== '関係法令').map((sec) => `
<section class="sec">
  ${secHead(esc(sec.title), `${sec.groups.reduce((a, g) => a + g.items.length, 0)}件`)}
  ${sec.groups.map((g) => `
    ${g.label ? `<h3 class="meta" style="margin:18px 0 6px">${esc(g.label)}</h3>` : ''}
    <div class="linklist">${g.items.map((it) => `
      <a href="${esc(it.url)}" rel="noopener" target="_blank">
        ${it.date ? `<span class="meta">${fmt(it.date)}　</span>` : ''}${esc(it.title)}
        ${it.size ? `<span class="meta">（${esc(it.fileType)} ${esc(it.size)}）</span>` : `<span class="meta">（${esc(it.fileType)}）</span>`}
      </a>`).join('')}</div>`).join('')}
</section>`).join('')).join('')}

<div class="notice" style="margin:36px 0 60px">条文と通知のリンク先は、すべて e-Gov または各府省のページです。自治体ごとの条例は、エリアのページで順次まとめていきます。</div>`;
  return layout(base, { title: '法令・条例', description: '住宅宿泊事業法・旅館業法・建築基準法など、民泊に関係する法律と主な通知。', current: 'laws', body });
}

// ---------- 民泊を始める ----------
function pageStart() {
  const base = '../';
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ 民泊を始める</p>
<div class="phead">
  <h1 class="h-page">民泊開業ガイド</h1>
  <p class="sub">物件を決める前にやることから、開業後の義務まで。順番を間違えると、後戻りの費用が大きくなります。</p>
</div>

<div class="two">
  <div>
    <div class="feed">
      ${guide.steps.map((s) => `<div class="item" id="step-${s.n}" style="cursor:default">
        <div class="item__top"><span class="cat" style="--cat:var(--c-start)">STEP ${s.n}</span></div>
        <h2 class="item__title">${esc(s.title)}</h2>
        <p class="item__sum">${esc(s.lead)}</p>
        <div class="impact impact--n">
          <span class="impact__k">確認すること</span>
          <ul style="margin:6px 0 0;padding-left:1.2em;font-size:13px;line-height:1.9">
            ${s.checks.map((c) => `<li>${esc(c)}</li>`).join('')}
          </ul>
        </div></div>`).join('')}
    </div>
    <div class="disclaimer">この流れは一般的な手順の説明です。実際に必要な手続きは、物件の場所・建物・選ぶ制度によって変わります。<strong>最終的な判断は、必ず物件所在地の保健所・消防署・建築指導課へご確認ください。</strong></div>
  </div>
  <aside class="rail">
    <section>
      <h2>ステップ</h2>
      <div class="linklist">
        ${guide.steps.map((s) => `<a href="#step-${s.n}">STEP ${s.n}　${esc(s.title)}</a>`).join('')}
      </div>
    </section>
    <section>
      <h2>あわせて読む</h2>
      <div class="linklist">
        <a href="${base}laws/">民泊に関係する法律</a>
        ${guides.map((g) => `<a href="${base}guides/${g.slug}.html">${esc(g.title)}</a>`).join('')}
        <a href="${base}area/">エリアごとのルール</a>
      </div>
    </section>
  </aside>
</div>`;
  return layout(base, { title: '民泊を始める', description: '民泊開業までの7ステップ。制度選び、物件確認、自治体・消防・保健所への確認、申請、開業後の義務まで。', current: 'start', body });
}

// ---------- 解説記事 ----------
function pageGuideIndex() {
  const base = '../';
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ 解説</p>
<div class="phead">
  <h1 class="h-page">解説</h1>
  <p class="sub">行政の発表だけでは分かりにくい部分を、編集部が言い換えて説明しています。</p>
</div>
<div class="feed" style="padding-bottom:60px">
  ${guides.map((g) => `<a class="item" href="${base}guides/${g.slug}.html">
    <div class="item__top"><span class="cat" style="--cat:var(--c-law)">${esc(g.category ?? '解説')}</span>
      <span class="meta">${fmt(g.updated)}</span></div>
    <h2 class="item__title">${esc(g.title)}</h2>
    <p class="item__sum">${esc(g.summary[0] ?? '')}</p></a>`).join('')}
</div>`;
  return layout(base, { title: '解説', description: '民泊の制度をやさしく解説した記事の一覧。', current: 'guides', body });
}

function pageGuide(g) {
  const base = '../';
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ <a href="${base}guides/">解説</a></p>
<article class="phead" style="padding-bottom:60px">
  <span class="eyebrow">${esc(g.category ?? '解説')}</span>
  <h1 class="h-page" style="margin-top:8px">${esc(g.title)}</h1>
  <span class="meta">最終更新 ${esc(g.updated ?? '—')}</span>
  ${g.summary.length ? `<div class="summarybox"><span class="k">結論</span><ul>${g.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
  <div class="prose">${g.html}</div>
</article>`;
  return layout(base, { title: g.title, description: g.summary[0] ?? g.title, current: 'guides', body });
}

// ---------- 調査レポート ----------
function pageReportIndex() {
  const base = '../';
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ レポート</p>
<div class="phead">
  <h1 class="h-page">調査レポート</h1>
  <p class="sub">エリアごとの宿泊需要や競合の状況を、独自にまとめた資料です。</p>
</div>
<div class="feed" style="padding-bottom:24px">
  ${reports.map((r) => `<a class="item" href="${reportHref(base, r)}">
    <div class="item__top"><span class="cat" style="--cat:var(--c-market)">${esc(r.kind)}</span>
      <span class="meta">${fmt(r.date)}</span>${r.pdf ? '<span class="tag">PDFあり</span>' : ''}</div>
    <h2 class="item__title">${esc(r.title)}</h2>
    ${r.summary ? `<p class="item__sum">${esc(r.summary)}</p>` : ''}
    ${r.areas.length ? `<div class="item__tags">${r.areas.slice(0, 5).map((a) => `<span class="tag">${esc(a)}</span>`).join('')}</div>` : ''}
  </a>`).join('')}
</div>
<div class="notice" style="margin-bottom:60px">レポートは別のページとして開きます。行政の発表そのものではなく、公表データをもとにこちらでまとめた分析です。判断の材料としてお使いください。</div>`;
  return layout(base, { title: 'レポート', description: 'エリアごとの宿泊需要と競合状況をまとめた調査レポートの一覧。', current: 'reports', body });
}

/** レポートのHTMLは書き換えず、サイトに戻れる細い帯だけを先頭に足す */
function wrapReport(r) {
  const html = readFileSync(new URL(r.file, reportDir), 'utf8');
  const bar = `<div style="position:sticky;top:0;z-index:99999;display:flex;align-items:center;gap:14px;
  padding:9px 18px;background:#12312F;color:#fff;font-size:13px;line-height:1.5;
  font-family:system-ui,-apple-system,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif">
  <a href="../reports/" style="color:#fff;text-decoration:none;font-weight:600">← ${esc(site.name)} のレポート一覧</a>
  <span style="opacity:.6">${esc(r.kind)}　${esc(fmt(r.date))}</span>
  ${r.pdf ? `<a href="./${encodeURIComponent(r.pdf)}" style="color:#fff;margin-left:auto;text-decoration:underline">PDF版</a>` : ''}
</div>`;
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + bar) : bar + html;
}

// ---------- このサイトについて ----------
function pageAbout() {
  const base = '';
  const sources = JSON.parse(readFileSync(p('data/sources.json'), 'utf8'));
  const body = `
<p class="crumb"><a href="${base}">ホーム</a> ＞ このサイトについて</p>
<article class="phead prose" style="padding-bottom:60px">
  <h1 class="h-page">情報の集め方と扱い方</h1>

  <h2>何をしているサイトか</h2>
  <p>観光庁・厚生労働省などの発表と、報道各社のニュースのうち、民泊・簡易宿所・旅館業に関わるものを毎日自動で集めています。見出しをクリックすると、発表元や報道元のページがそのまま開きます。</p>

  <h2>取得している情報源</h2>
  <div class="scroller"><table>
    <thead><tr><th>名称</th><th>取得方法</th><th>URL</th></tr></thead><tbody>
    ${sources.map((s) => `<tr><td>${esc(s.name)}</td><td>${
      s.type === 'rss' ? 'RSS' : s.type === 'google-news' ? '検索RSS' :
      s.type === 'mhlw-docs' ? '資料リンクの取り込み' : 'ページ巡回'}</td>
      <td><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url.slice(0, 52))}${s.url.length > 52 ? '…' : ''}</a></td></tr>`).join('')}
    </tbody></table></div>

  <h2>守っていること</h2>
  <ul>
    <li>記事の本文は保存も転載もしていません。保存しているのは見出し・公開日・発表元・リンクだけです。</li>
    <li>行政サイトへのアクセスは1日1回、同じサイトへの連続アクセスは1.5秒以上あけています。</li>
    <li>数字を載せるときは、出典と取得日を必ず添えます。</li>
    <li>「民泊事業者への影響」は記事の中身の要約ではなく、見出しの動きとこちらの分類から組み立てた文です。何を確認すればよいかの手がかりとしてお使いください。</li>
    <li>自動で集めて自動で分類しているため、テーマやエリアの判定に誤りが含まれることがあります。</li>
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
write('start/index.html', pageStart());
write('guides/index.html', pageGuideIndex());
write('about.html', pageAbout());
if (docs.sources.length) write('laws/index.html', pageLaws());
for (const g of guides) write(`guides/${g.slug}.html`, pageGuide(g));
for (const pref of prefectures) write(`area/${slugs[pref]}.html`, pageArea(pref));
if (reports.length) {
  write('reports/index.html', pageReportIndex());
  for (const r of reports) {
    write(`reports/${r.file}`, wrapReport(r));
    if (r.pdf) {
      mkdirSync(new URL('reports/', OUT).pathname, { recursive: true });
      copyFileSync(new URL(r.pdf, reportDir), new URL(`reports/${r.pdf}`, OUT));
    }
  }
}
write('robots.txt', `User-agent: *\nAllow: /\n${site.url ? `Sitemap: ${site.url}/sitemap.xml\n` : ''}`);
write('.nojekyll', '');

const pages = ['', 'news/', 'stats/', 'area/', 'start/', 'guides/', 'about.html',
  ...(docs.sources.length ? ['laws/'] : []),
  ...(reports.length ? ['reports/', ...reports.map((r) => `reports/${encodeURIComponent(r.file)}`)] : []),
  ...guides.map((g) => `guides/${g.slug}.html`), ...prefectures.map((a) => `area/${slugs[a]}.html`)];
if (site.url) {
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((u) => `<url><loc>${site.url}/${u}</loc><lastmod>${articles.updatedAt}</lastmod></url>`).join('\n')}
</urlset>\n`);
}

console.log(`生成 ${pages.length + 1} ページ → dist/`);
console.log(`  ニュース ${news.length}件 → ${feed.length}話題（うち規制の動き ${important.length}件） / 解説 ${guides.length}本 / レポート ${reports.length}本`);
