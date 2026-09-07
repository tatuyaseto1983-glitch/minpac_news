// e-Stat の応答の形を再現したデータで、取り出し処理を確かめます。
//   node scripts/lib/estat.test.mjs
import { extractIndicator, toNumber, classNames } from './estat.mjs';

let ng = 0;
const ok = (cond, name, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${extra ? `  ${extra}` : ''}`);
  if (!cond) ng++;
};

// e-Stat の getStatsData（JSON）の形。分類が1つだけのときは配列にならない点も再現しています。
const sample = {
  TABLE_INF: { TITLE: { $: '第1表 延べ宿泊者数（都道府県別・月次）' } },
  CLASS_INF: {
    CLASS_OBJ: [
      { '@id': 'tab', '@name': '表章項目', CLASS: { '@code': '001', '@name': '延べ宿泊者数' } },
      { '@id': 'area', '@name': '施設所在地', CLASS: [
        { '@code': '00000', '@name': '全国' },
        { '@code': '13000', '@name': '東京都' },
        { '@code': '27000', '@name': '大阪府' },
        { '@code': '26000', '@name': '京都府' },
        { '@code': '47000', '@name': '沖縄県' },
      ] },
      { '@id': 'time', '@name': '時間軸', CLASS: [
        { '@code': '2026000606', '@name': '2026年6月' },
        { '@code': '2026000707', '@name': '2026年7月' },
      ] },
    ],
  },
  DATA_INF: {
    VALUE: [
      // 先月ぶん（新しい時点だけ拾えているかの確認用）
      { '@tab': '001', '@area': '00000', '@time': '2026000606', $: '55,000,000' },
      { '@tab': '001', '@area': '13000', '@time': '2026000606', $: '9,000,000' },
      // 最新月
      { '@tab': '001', '@area': '00000', '@time': '2026000707', $: '59,820,000' },
      { '@tab': '001', '@area': '13000', '@time': '2026000707', $: '11,200,000' },
      { '@tab': '001', '@area': '27000', '@time': '2026000707', $: '6,400,000' },
      { '@tab': '001', '@area': '26000', '@time': '2026000707', $: '3,100,000' },
      { '@tab': '001', '@area': '47000', '@time': '2026000707', $: '-' }, // 秘匿・該当なし
    ],
  },
};

const ind = { key: 'overnight', label: '延べ宿泊者数', unit: '人泊', areaClass: 'area',
  nationwideCode: '00000', statsDataId: '0000000000' };

console.log('e-Stat 取り出し処理のテスト\n');

console.log('数値の変換');
ok(toNumber('1,234') === 1234, '桁区切りのカンマを外す');
ok(toNumber('-') === null, '「-」は数値なしとして扱う');
ok(toNumber('***') === null, '秘匿記号は数値なしとして扱う');
ok(toNumber('…') === null, '「…」は数値なしとして扱う');
ok(toNumber('0') === 0, '0 は 0 のまま（数値なしと混同しない）');

console.log('\n分類の対応表');
const names = classNames(sample);
ok(names.area['13000'] === '東京都', 'コードから都道府県名を引ける');
ok(names.tab['001'] === '延べ宿泊者数', '分類が1つだけでも配列として扱える');

console.log('\n指標の取り出し');
const r = extractIndicator(sample, ind);
ok(r.period === '2026年7月', 'いちばん新しい時点を選ぶ', `→ ${r.period}`);
ok(r.nationwide === 59820000, '全国の値を取れる', `→ ${r.nationwide.toLocaleString('ja-JP')}`);
ok(!r.byArea.some((x) => x.area === '全国'), '都道府県別に全国が混ざらない');
ok(r.byArea.length === 3, '数値のない県（沖縄県）は除く', `→ ${r.byArea.length}件`);
ok(r.byArea[0].area === '東京都' && r.byArea[0].value === 11200000, '多い順に並ぶ',
  `→ ${r.byArea.map((x) => x.area).join('、')}`);
ok(!r.byArea.some((x) => x.value === 55000000 || x.value === 9000000), '先月の値が混ざらない');
ok(r.tableTitle.startsWith('第1表'), '表の名前を拾う');

console.log('\nうまくいかない場合');
try { extractIndicator(sample, { ...ind, areaClass: 'cat01' }); ok(false, '分類IDが違えば分かるように失敗する'); }
catch (e) { ok(/分類/.test(e.message), '分類IDが違えば分かるように失敗する', `→ ${e.message}`); }
try { extractIndicator({ DATA_INF: { VALUE: [] } }, ind); ok(false, '数値が空なら失敗する'); }
catch (e) { ok(/空/.test(e.message), '数値が空なら失敗する', `→ ${e.message}`); }

console.log(ng ? `\n${ng}件 失敗` : '\nすべて通りました');
process.exit(ng ? 1 : 0);
