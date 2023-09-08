import * as xlsx from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

const groups = [
   // 成績点算入対象科目
   [1, "全ての科目"],
   [2, "専門基礎科目・専門科目"],
   [4, "専門導入科目"],
   [8, "専門導入科目・看護学類の指定する科目"],
   [16, "医学類開設科目"],
   // 共通科目
   [-1, "英語(春)", 2, [
      ["English Reading Skills I", 1],
      ["English Presentation Skills I", 1],
   ]],
   [-2, "英語(秋)", 2, [
      ["English Reading Skills II", 1],
      ["English Presentation Skills II", 1],
   ]],
   [-3, "情報", 4, [
      ["情報リテラシー(講義)", 1],
      ["情報リテラシー(演習)", 1],
      ["データサイエンス", 2],
   ]],
   [-4, "ファーストイヤーセミナー", 1],
   [-5, "学問への誘い", 1],
   [-6, "体育(春・秋)", 1, [
      ["基礎体育(春)", 0.5],
      ["基礎体育(秋)", 0.5],
   ]],
];

// 除外科目:
//  ファーストイヤーセミナー, 学問への誘い, EPS, ERS, 情報, 国語, 芸術, 教職, 博物館
const isExcluded = (id, module, isThisYear) => /^11|^122[78]|^31[H-L]|^[4569]/.test(id);

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

const flags = (id, name, module, info, isThisYear) => {
   // 秋C以降に成績が確定する科目は重点科目を除いて算入しない
   if (isThisYear && /秋(?:A?B?C|学期)|春季休業中|通年/.test(module)) {
      return 0;
   }
   // フラグの値は `groups` を参照
   let f = 1;
   if (/^[A-Y]/.test(id)) f |= 2;
   if (name === "生物学序説") f |= 4;
   else if (info.includes("専門導入科目")) f |= 4 | 8;
   else if (/^AB6|^C[CE]|^HC1/.test(id) || cccList.includes(name)) f |= 8;
   if (/^HB/.test(id)) f |= 16;
   return f;
};

const options = {raw: true, dense: true, cellFormula: false, cellHTML: false, cellText: false};

const read = (path, isThisYear) => Object.fromEntries(
   xlsx.readFile(path, options)
      .Sheets["開設科目一覧"]["!data"]
      .map(row => row.map(({v}) => v))
      .filter(([id]) => /^[A-Z0-9]{7}$/.test(id) && !isExcluded(id))
      .reduce((map, [id, name, , credits, , module, , , , , info, , , , , , code]) => {
         if (!map.has(id)) {
            // 科目番号 → [科目名, 単位数, フラグ, 科目コード]
            map.set(id, [name, +credits, flags(id, name, module, info, isThisYear), code]);
         }
         return map;
      }, new Map)
      .entries()
);

const tables = JSON.parse(Deno.readTextFileSync("./tables.json"));
const kdb2022 = read("./kdb_2022.xlsx", false), kdb2023 = read("kdb_2023.xlsx", true);

// 科目番号の正規化: 同一の科目は同じ科目番号で検索できるようにする
//  e.g. FA01111 数学リテラシー と FA01121
// チェックシートの科目番号と kdb の科目コードは一致しないので、チェックシートに合わせる
{
   // 要件・重点科目全て
   const ids = new Set(tables.flatMap(({list}) => list.filter(id => typeof id === "string")));
   // 科目コード → 要件・重点科目の科目番号
   const map = new Map();

   for (const id of ids) {
      const v = kdb2023[id] ?? kdb2022[id];
      map.set(v[3], id);
   }

   // 社工のプログラミング入門を情報学群のプログラミング入門に読み替える (科目コードが異なるので必要)
   map.set("FH60474", "GA18212");

   const update = subjects => {
      for (const [id, v] of Object.entries(subjects)) {
         // 科目番号 → [科目名, 単位数, フラグ, 正規化された科目番号]
         v[3] = map.get(v[3]) ?? id;
         // 正規化で番号が変わらない場合は省略
         if (v[3] === id) v.pop();
      }
   };
   update(kdb2022);
   update(kdb2023);
}

const data = {
   tables,
   groups,
   2022: kdb2022,
   2023: kdb2023,
};

Deno.writeTextFileSync("./data.json", JSON.stringify(data));
