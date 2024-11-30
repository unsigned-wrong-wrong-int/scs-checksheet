import * as xlsx from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

const year = 2024;

// [名前, 単位数, フラグ]
const categories = [
   ["全ての科目", , 1],
   ["専門基礎科目・専門科目", , 3],
   ["専門導入科目", , 5],
   ["専門導入科目・看護学類の指定する科目", , 9],
   ["医学類開設科目", , 17],
   ["ファーストイヤーセミナー", 1, 32],
   ["学問への誘い", 1, 64],
   ["英語(春・秋)", 4, 128],
   ["英語(春)", 2, 256],
   ["情報", 4, 512],
   ["体育(春・秋)", 1, 1024],
];

// 共通科目のうち、移行要件に設定されるもの
// [科目名, 単位数, フラグ, 番号]
const specialSubjects = [
   ["ファーストイヤーセミナー", 1, 32],
   ["学問への誘い", 1, 64],
   ["English Reading Skills I", 1, 128 | 256],
   ["English Presentation Skills I", 1, 128 | 256],
   ["English Reading Skills II", 1, 128],
   ["English Presentation Skills II", 1, 128],
   ["情報リテラシー(講義)", 1, 512],
   ["情報リテラシー(演習)", 1, 512],
   ["データサイエンス", 2, 512],
   ["基礎体育(春)", 0.5, 1024],
   ["基礎体育(秋)", 0.5, 1024],
].map((data, id) => [...data, id]);

// 除外科目:
//  ファーストイヤーセミナー, 学問への誘い, EPS, ERS, 情報, 国語, 芸術, 教職, 博物館
const isExcluded = id => /^11|^122[78]|^31[H-L]|^[4569]/.test(id);

// 比文の「哲学・倫理学・宗教学」科目 (看護学類の重点科目)
const cccList = [
   "現代思想概論",
   "比較宗教概論Ⅰ", "比較宗教概論Ⅱ",
   "文化創造論研究Ⅴ",
   "表象芸術論研究Ⅰ", "表象芸術論研究Ⅱ",
   "先端文化学研究Ⅲ", "先端文化学研究Ⅳ", "先端文化学研究Ⅴ", "先端文化学研究Ⅵ",
   "記号文化論",
   "分析哲学",
   "現代倫理学",
   "哲学カフェ",
   "日本・東洋思想史研究Ⅰ", "日本・東洋思想史研究Ⅱ",
   "比較思想研究",
   "比較思想史研究",
   "比較宗教論Ⅲ", "比較宗教論Ⅳ", "比較宗教論Ⅴ", "比較宗教論Ⅵ",
];

const flags = (id, name, module, info) => {
   let f = 1;
   // 秋C以降に成績が確定する科目は(重点科目以外)算入されない
   if (/秋(?:A?B?C|学期)|春季休業中|通年/.test(module)) f = 0;
   // フラグの値は `categories` を参照
   if (/^[A-Y]/.test(id)) f |= 2;
   if (name === "生物学序説") f |= 4;
   else if (info.includes("専門導入科目")) f |= 4 | 8;
   else if (/^AB6|^C[CE]|^HC1/.test(id) || cccList.includes(name)) f |= 8;
   if (/^HB/.test(id)) f |= 16;
   return f;
};

const options = {raw: true, dense: true, cellFormula: false, cellHTML: false, cellText: false};

const readKDB = (year) =>
   xlsx.readFile(Deno.realPathSync(new URL(`./kdb_${year}.xlsx`, import.meta.url)), options)
      .Sheets["開設科目一覧"]["!data"]
      .map(row => row.map(({v}) => v))
      .filter(([id]) => /^[A-Z0-9]{7}$/.test(id) && !isExcluded(id))
      .map(([id, name, , credits, , module, , , , , info, , , , , , code]) =>
         // [科目番号, [科目名, 単位数, フラグ, 科目コード]]
         [id, [name, Number(credits), flags(id, name, module, info), code]]);

const divisions = await (await fetch(new URL("./divisions.json", import.meta.url))).json();

const subjects = new Map(
   // 科目番号順にソート
   Array.from(new Map(function *() {
      yield *readKDB(year - 1);
      yield *readKDB(year);
   }())).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
);

// 科目番号の正規化: 同一の科目は同じ科目番号で検索できるようにする
//  e.g. FA01111 数学リテラシー と FA01121
// チェックシートの科目番号と kdb の科目コードは一致しないので、チェックシートに合わせる
// また、体育の科目コードは同一性の判定に使えないようなので科目名で区別する
{
   // 要件・重点科目全て
   const ids = Array.from(new Set(
      divisions.flatMap(({list}) => list.filter(id => typeof id === "string"))));
   // 科目コード → 要件・重点科目の科目番号
   const map = new Map(
      ids.map(id => [subjects.get(id)[3], id]).filter(([code, id]) => code !== id));
   // 体育の科目名 → 科目番号
   const pe = new Map();

   for (const [id, subject] of subjects) {
      if (id.startsWith("2")) {
         // 体育
         // 括弧の全角半角が統一されていないので変換して比較する
         const name = subject[0].replace("（", "(").replace("）", ")");
         if (pe.has(name)) {
            subject[3] = pe.get(name);
         } else {
            pe.set(name, id);
         }
      } else if (map.has(subject[3])) {
         subject[3] = map.get(subject[3]);
      }
   }
}

const data = {
   year,
   divisions,
   categories,
   specialSubjects,
   subjects: Object.fromEntries(subjects.entries()),
};

Deno.writeTextFileSync(new URL("./data.json", import.meta.url), JSON.stringify(data));
