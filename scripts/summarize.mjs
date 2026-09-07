#!/usr/bin/env node
// 行政ページの中身を読んで、記事に「つまりどうなる」の短い要約を付けます。
//
//   OPENAI_API_KEY=sk-...     node scripts/summarize.mjs --limit 20
//   ANTHROPIC_API_KEY=sk-...  node scripts/summarize.mjs --limit 20
//
// ・要約するのは行政の発表だけです（報道の見出しには手を加えません）。
// ・鍵が設定されていなければ何もせず終了します。GitHub Actions で必須にはしていません。
import { readFileSync, writeFileSync } from 'node:fs';
import { getText } from './lib/http.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg('--limit', 15));

const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const provider = process.env.AI_PROVIDER ?? (openaiKey ? 'openai' : anthropicKey ? 'anthropic' : null);

if (!provider) {
  console.log('APIキーが設定されていないので、要約は行いませんでした。');
  console.log('  OPENAI_API_KEY か ANTHROPIC_API_KEY を設定すると動きます。');
  process.exit(0);
}

const PROMPT = `次の行政ページの内容を、民泊をこれから始める人に向けて要約してください。

条件:
- 専門用語（業界用語・カタカナ語）を避け、その分野を知らない人に伝わる平易な言葉で書く
- 2〜3行。1行はおおむね40〜60字
- 「つまり読む人にとってどうなるか」を書く
- ページに書かれていないことは絶対に足さない。分からない点は書かない
- 前置きや見出しは付けず、本文だけを出力する`;

async function askOpenAI(text, title) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `見出し: ${title}\n\n本文:\n${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).choices?.[0]?.message?.content?.trim() ?? null;
}

async function askAnthropic(text, title) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
      max_tokens: 300,
      system: PROMPT,
      messages: [{ role: 'user', content: `見出し: ${title}\n\n本文:\n${text}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).content?.[0]?.text?.trim() ?? null;
}

const ask = provider === 'openai' ? askOpenAI : askAnthropic;

/** HTMLから本文らしい文字だけを取り出す */
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const store = JSON.parse(readFileSync(p('data/articles.json'), 'utf8'));
const targets = store.items
  .filter((n) => n.isPrimary && !n.summary && /\.html?($|\?)/i.test(n.url))
  .slice(0, limit);

console.log(`${provider} で ${targets.length} 件を要約します`);

let done = 0;
for (const item of targets) {
  try {
    const text = toText(await getText(item.url)).slice(0, 6000);
    if (text.length < 200) {
      console.log(`  - 本文が短いので飛ばしました: ${item.title.slice(0, 30)}`);
      continue;
    }
    const summary = await ask(text, item.title);
    if (!summary) continue;
    item.summary = summary.replace(/\s*\n\s*/g, ' ');
    item.summarySource = 'ai';
    item.summarizedAt = new Date().toISOString().slice(0, 10);
    done++;
    console.log(`  ✓ ${item.title.slice(0, 34)}`);
  } catch (err) {
    console.log(`  ✗ ${item.title.slice(0, 30)}: ${err.message}`);
  }
}

writeFileSync(p('data/articles.json'), JSON.stringify(store, null, 2) + '\n');
console.log(`${done} 件に要約を付けました。公開前に内容をご確認ください。`);
