#!/usr/bin/env node
// ワークフローの書き間違いを見つけます。
// 同じ階層に同じキーが2つあると GitHub は受け付けず、ジョブが1つも動かないまま失敗します。
// YAMLのパーサは重複を黙って上書きすることがあるので、行を見て確かめます。
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const dir = new URL('../.github/workflows/', import.meta.url);
if (!existsSync(dir)) { console.log('ワークフローはありません'); process.exit(0); }

let ng = 0;
for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
  const lines = readFileSync(new URL(file, dir), 'utf8').split('\n');
  // 「インデントの深さ」ごとに、いま見ているまとまりの中で出てきたキーを覚える
  const seen = new Map(); // 深さ → Set(キー)
  lines.forEach((line, i) => {
    if (/^\s*#/.test(line) || !line.trim()) return;
    const m = line.match(/^(\s*)(-\s+)?([A-Za-z_][\w-]*):(\s|$)/);
    if (!m) return;
    const depth = m[1].length + (m[2] ? m[2].length : 0);
    const key = m[3];
    // 自分より深い階層の記録は、まとまりが変わったので捨てる
    for (const d of [...seen.keys()]) if (d > depth) seen.delete(d);
    // 「- name:」のように新しい要素が始まったら、その階層の記録を作り直す
    if (m[2]) seen.set(depth, new Set());
    if (!seen.has(depth)) seen.set(depth, new Set());
    const set = seen.get(depth);
    if (set.has(key)) {
      console.log(`  ✗ ${file}:${i + 1}  同じ階層に「${key}:」が2つあります → ${line.trim()}`);
      ng++;
    }
    set.add(key);
  });
}
console.log(ng ? `\n${ng}件の重複が見つかりました` : 'ワークフロー：重複キーなし');
process.exit(ng ? 1 : 0);
