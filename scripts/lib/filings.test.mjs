// 観光庁「都道府県別届出状況一覧」PDFの読み取りを、実物と同じ形の文字列で確かめます。
//   node scripts/lib/filings.test.mjs
import { parseFilingsPdf, checkFilings, findPdfLink } from './parse.mjs';

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

console.log(ng ? `\n${ng}件 失敗` : '\nすべて通りました');
process.exit(ng ? 1 : 0);
