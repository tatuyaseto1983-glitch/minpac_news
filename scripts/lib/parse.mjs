import { absolute } from './http.mjs';

const strip = (s) =>
  s.replace(/<[^>]*>/g, '')
   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
   .replace(/\s+/g, ' ').trim();

/** RSS 1.0 / 2.0 のどちらでも <item> を拾う */
export function parseRss(xml, sourceUrl) {
  const out = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const block = m[0];
    const title = strip(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = strip(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const date = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1]
              ?? block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    if (!title || !link) continue;
    out.push({ title, url: absolute(link, sourceUrl).replace(/^http:/, 'https:'), publishedAt: toIsoDate(date) });
  }
  return out;
}

/** 観光庁「報道発表」トップから、年別一覧ページのURLを新しい順で取り出す */
export function findYearPages(html, baseUrl) {
  return [...html.matchAll(/<div class="c-links__item">\s*<a href="([^"]+)">\s*(\d{4})年/g)]
    .map((m) => ({ url: absolute(m[1], baseUrl), year: Number(m[2]) }))
    .sort((a, b) => b.year - a.year);
}

/** 観光庁 年別報道発表ページ（日付ブロック＋リンクの繰り返し） */
export function parseJtaYearPage(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(
    /<p class="c-text-list__text">\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*<\/p>([\s\S]*?)<\/ul>/g
  )) {
    const [, y, mo, d, listHtml] = m;
    const publishedAt = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    for (const a of listHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const title = strip(a[2]);
      if (!title) continue;
      out.push({ title, url: absolute(a[1], baseUrl), publishedAt });
    }
  }
  return out;
}

/** 民泊制度ポータルの「新着情報」リスト（日付＋区分＋本文） */
export function parseMinpakuNews(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(
    /<li>\s*<span class="date">\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*<\/span>([\s\S]*?)<\/li>/g
  )) {
    const [, y, mo, d, rest] = m;
    const label = strip(rest.match(/<p class="news_[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '');
    const link = rest.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const linked = link ? strip(link[2]) : '';
    const plain = strip(rest.replace(/<p class="news_[^"]*">[\s\S]*?<\/p>/, ''));
    let title = linked.length > 8 ? linked : plain;
    if (!title) continue;
    if (title.length > 110) title = title.slice(0, 109) + '…';
    out.push({
      title: label ? `【${label}】${title}` : title,
      url: link ? absolute(link[1], baseUrl) : baseUrl,
      publishedAt: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  return out;
}

/** 民泊制度ポータル「施行状況」ページから件数を取り出す */
export function parseMinpakuSituation(html) {
  const text = strip(html);
  const asOf = text.match(/届出及び登録の状況（([^）]+)時点）/)?.[1] ?? null;
  const num = (re) => {
    const v = text.match(re)?.[1];
    return v ? Number(v.replace(/,/g, '')) : null;
  };
  const filed = num(/住宅宿泊事業の届出件数は([\d,]+)件/);
  const closed = num(/事業廃止件数が([\d,]+)件/);
  return {
    asOf,
    filed,
    closed,
    active: filed != null && closed != null ? filed - closed : null,
    managers: num(/住宅宿泊管理業の登録件数は([\d,]+)件/),
    brokers: num(/住宅宿泊仲介業の登録件数は([\d,]+)件/),
  };
}

function toIsoDate(raw) {
  if (!raw) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export { strip };
