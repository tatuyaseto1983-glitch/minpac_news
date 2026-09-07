// 観光庁のPDF（届出状況一覧・宿泊旅行統計調査）の読み取りを、実物と同じ形の文字列で確かめます。
//   node scripts/lib/filings.test.mjs
import { parseFilingsPdf, checkFilings, findPdfLink, parseLodgingPdf, checkLodging } from './parse.mjs';

let ng = 0;
const ok = (cond, name, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${extra ? `  ${extra}` : ''}`);
  if (!cond) ng++;
};

// pdftotext -layout が出す形（3列が横に並び、列ごとに通し番号が振り直される）
const sample = [
  '住宅宿泊事業法に基づく届出及び登録の状況一覧                            令和8年7月15日時点',
  '',
  ' 都道府県       件       止           保健所設置市      件      止            特別区      件       止',
  '',
  ' 1 北海道     1,998    547     1,451     1   札幌市     6,075   3,034   3,041   1    千代田区     69       13      56',
  ' 2 東京都      668     136      532     2   八王子市      62      25      37    2    新宿区    5,496    1,721   3,775',
  ' 3 京都府      150      27      123     3   京都市     1,818     503   1,315',
  ' 4 沖縄県    1,897     701    1,196',
  '          4,713   1,411    3,302               7,955   3,562   4,393               5,565   1,734   3,831',
  '',
  '住宅宿泊事業の届出状況                    住宅宿泊管理業者の登録状況（令和8年7月時点）        住宅宿泊仲介業者の登録状況',
  '                                  登録件数          4,529 件               登録件数               66 件',
  '',
  '都道府県      4,713    1,411    3,302        特区法に基づく特区民泊の認定居室数',
  '                                          （令和8年4月末時点）',
  '保健所設置市    7,955    3,562    4,393',
  '                                                 26,167           居室',
  '特別区       5,565    1,734    3,831',
  '合計       18,233    6,707   11,526',
].join('\n');

const opts = {
  prefectures: ['北海道', '東京都', '京都府', '沖縄県'],
  cityToPref: { 札幌市: '北海道', 八王子市: '東京都', 京都市: '京都府' },
};

const r = parseFilingsPdf(sample, opts);
ok(r.asOf === '2026-07-15', '「令和8年7月15日時点」を日付に直せる', `→ ${r.asOf}`);
ok(r.rows.length === 9, '3列ぶんの行をすべて拾える', `→ ${r.rows.length}行`);
ok(r.rows.filter((x) => x.kind === 'prefecture').length === 4, '都道府県の行だけを数えられる');
ok(r.rows.filter((x) => x.kind === 'ward').length === 2, '特別区の行だけを数えられる');
ok(!r.unmapped.length, 'どの県にも結び付かない市が無い');

ok(r.byPrefecture['北海道'].homes === 1451 + 3041, '北海道＝道＋札幌市で合算される',
  `→ ${r.byPrefecture['北海道'].homes}`);
ok(r.byPrefecture['東京都'].homes === 532 + 37 + 56 + 3775, '東京都＝都＋八王子市＋特別区で合算される',
  `→ ${r.byPrefecture['東京都'].homes}`);
ok(r.byPrefecture['東京都'].breakdown[0].name === '新宿区', '内訳は届出住宅数の多い順にならぶ',
  `→ ${r.byPrefecture['東京都'].breakdown.map((b) => b.name).join('、')}`);
ok(r.byPrefecture['沖縄県'].breakdown.length === 1, '市が無い県は県の行だけになる');

ok(r.managers === 4529 && r.brokers === 66, '管理業と仲介業の登録件数を取り違えない',
  `→ 管理${r.managers} / 仲介${r.brokers}`);
ok(r.tokku.rooms === 26167 && r.tokku.asOfLabel === '令和8年4月末', '特区民泊の認定居室数も拾える',
  `→ ${r.tokku.rooms}居室 / ${r.tokku.asOfLabel}`);

// 集計欄との突き合わせ
ok(checkFilings(r, { expect: 4 }) === r, '集計欄と一致していれば通る');

const broken = parseFilingsPdf(sample.replace('1,998    547     1,451', '1,998    547     1,450'), opts);
try {
  checkFilings(broken, { expect: 4 });
  ok(false, '数字が1つでも狂えば取り込まない');
} catch (e) {
  ok(/合計が合いません/.test(e.message), '数字が1つでも狂えば取り込まない', `→ ${e.message}`);
}

try {
  checkFilings(r); // 実物と同じ 47件 を求める
  ok(false, '都道府県が47件に満たなければ取り込まない');
} catch (e) {
  ok(/揃いませんでした/.test(e.message), '都道府県が47件に満たなければ取り込まない',
    `→ ${e.message.slice(0, 40)}…`);
}

// PDFのURLは更新のたびに変わるので、見出しの文言で毎回探し直す
const html = `<p><a href="/a/001.pdf">都道府県別届出状況マップ<img alt=""></a><br>
<a href="/a/002.pdf">都道府県別届出状況一覧<img alt=""></a></p>`;
ok(findPdfLink(html, 'https://www.mlit.go.jp/x/', '都道府県別届出状況一覧') === 'https://www.mlit.go.jp/a/002.pdf',
  '見出しの文言でPDFのリンクを選び分けられる');
ok(findPdfLink(html, 'https://www.mlit.go.jp/x/', '存在しない見出し') === null,
  '見つからないときは null を返す');

// ---- 宿泊旅行統計調査のPDF（都道府県別の3つの表）----
// 節の見出しと表の見出しに同じ文言が出てくること、稼働率の符号が全角なこと、
// 前年同月差が符号なしの 0.0 になることまで再現しています。
const lodging = [
  '１．都道府県別延べ宿泊者数',
  '   都道府県別延べ宿泊者数及び日本人延べ宿泊者数（2026年6月（第2次速報））',
  '          全国      45,815,140        -8.4%    33,595,270       -6.3%',
  '          北海道      3,542,690        -7.6%     2,776,250       -7.8%',
  '          東京都      7,365,780       -15.9%     3,138,660      -14.2%',
  '         鹿児島県        569,560        -1.2%       534,530       -0.6%',
  '',
  '(１)都道府県別外国人延べ宿泊者数',
  '            都道府県別外国人延べ宿泊者数（2026年6月（第2次速報））',
  '                  全国        12,219,870      -14.0%      26.7%',
  '                 北海道           766,440       -6.8%      21.6%',
  '                 東京都         4,227,120      -17.0%      57.4%',
  '                鹿児島県            35,030       -9.6%       6.2%',
  '',
  '３．都道府県別宿泊施設タイプ別客室稼働率',
  '         都道府県別宿泊施設タイプ別客室稼働率（2026年6月（第2次速報））',
  '  全国      57.2 -    －1.6    36.7     -   50.8        -    71.5    -    69.2    -    26.1    -',
  '  北海道     63.4 5    －1.3    52.7     1    54.1       11    77.9   5    77.8    1     26.3   10',
  '  東京都     75.4 1    ＋2.2    52.1     2    60.3        5    79.4   1    76.3    2     47.9    4',
  '  鹿児島県    45.1 41    0.0     30.7   36    28.5       41    61.8   44    59.9   32    16.3   28',
].join('\n');

const three = ['北海道', '東京都', '鹿児島県'];
const L = parseLodgingPdf(lodging, { prefectures: three });
ok(L.period === '2026年6月' && L.stage === '第2次速報',
  '表の見出しから時点を読む（節の見出しと取り違えない）', `→ ${L.period}・${L.stage}`);
ok(L.national.overnight === 45815140 && L.national.foreignShare === 26.7,
  '全国の行を3つの表から拾える');
ok(L.areas['東京都'].overnight === 7365780 && L.areas['東京都'].japanese === 3138660,
  '延べ宿泊者数と日本人の列を取り違えない');
ok(L.areas['東京都'].foreign === 4227120 && L.areas['東京都'].foreignShare === 57.4,
  '外国人の数と比率を拾える');
ok(L.areas['東京都'].occupancy === 75.4 && L.areas['東京都'].occupancyRank === 1,
  '客室稼働率（全体）と順位を拾える');
ok(L.areas['東京都'].kaniOccupancy === 47.9 && L.areas['東京都'].kaniRank === 4,
  '6つ並ぶ列のうち、いちばん右の簡易宿所を拾える');
ok(L.areas['北海道'].occupancyYoyDiff === -1.3, '全角のマイナス（－）を数値に直せる',
  `→ ${L.areas['北海道'].occupancyYoyDiff}`);
ok(L.areas['東京都'].occupancyYoyDiff === 2.2, '全角のプラス（＋）を数値に直せる');
ok(L.areas['鹿児島県'].occupancyYoyDiff === 0, '符号の付かない 0.0 も読み落とさない');

// 全国の行との突き合わせ
const okAll = { ...L, missingForeign: [], missingOccupancy: [] };
try {
  checkLodging({ ...okAll, areas: { ...L.areas, ダミー: L.areas['北海道'] } });
  ok(false, '47都道府県そろわなければ取り込まない');
} catch (e) {
  ok(/揃いませんでした/.test(e.message), '47都道府県そろわなければ取り込まない',
    `→ ${e.message.slice(0, 32)}…`);
}

const full = { ...L, areas: {} };
// 全国＝各県の合計になるよう、47件ぶんに割り付けた作り物で突き合わせを試す
for (let i = 0; i < 47; i++) {
  full.areas[`ダミー${i}`] = {
    overnight: L.national.overnight / 47, japanese: L.national.japanese / 47, foreign: L.national.foreign / 47,
  };
}
full.missingForeign = []; full.missingOccupancy = [];
ok(checkLodging(full) === full, '合計が全国と合えば通る');
full.areas['ダミー0'].overnight *= 2; // 1県だけ倍にすると合計が2%ずれる
try {
  checkLodging(full);
  ok(false, '合計が全国と食い違えば取り込まない');
} catch (e) {
  ok(/全国の合計が合いません/.test(e.message), '合計が全国と食い違えば取り込まない',
    `→ ${e.message.slice(0, 40)}…`);
}

console.log(ng ? `\n${ng}件 失敗` : '\nすべて通りました');
process.exit(ng ? 1 : 0);
