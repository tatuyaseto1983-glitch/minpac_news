// 行政サイトに負荷をかけないための、ごく控えめな取得ユーティリティ。
const UA = 'minpaku-news-bot/0.1 (+https://github.com/tatuyaseto1983-glitch/minpac_news)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1500; // 同一プロセスからの連続アクセス間隔

export async function getText(url, { encoding = 'utf-8', retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait) await sleep(wait);
    lastRequestAt = Date.now();

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return decode(buf, encoding);
    } catch (err) {
      if (attempt === retries) throw new Error(`${url} の取得に失敗しました: ${err.message}`);
      await sleep(2000 * 2 ** attempt);
    }
  }
}

function decode(buf, declared) {
  // 宣言された文字コードを優先しつつ、本文の charset 宣言も見る。
  let enc = declared;
  const head = buf.subarray(0, 2048).toString('latin1');
  const m = head.match(/charset=["']?([\w-]+)/i);
  if (m) enc = m[1].toLowerCase().replace('shift-jis', 'shift_jis').replace('sjis', 'shift_jis');
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

export const absolute = (href, base) => new URL(href, base).toString();
