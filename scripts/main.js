import {PinnedTab, Tab} from "./tabs.js";

const list = [
   "人文学類",
   "比較文化学類",
   "日本語・日本文化学類",
   "社会学類",
   "国際総合学類",
   "教育学類",
   "心理学類",
   "障害科学類",
   "生物学類 (区分A)",
   "生物学類 (区分B)",
   "生物資源学類",
   "地球学類",
   "数学類",
   "物理学類",
   "化学類",
   "応用理工学類",
   "工学システム学類",
   "社会工学類",
   "情報科学類 (区分A)",
   "情報科学類 (区分B)",
   "情報メディア創成学類",
   "知識情報・図書館学類",
   "医学類",
   "看護学類",
   "医療科学類",
   "芸術専門学群",
];

const inputPage = document.createElement("div");
inputPage.textContent = "(成績入力)";

const listPage = document.createElement("div");
listPage.append(...list.map((t, i) => {
   const btn = document.createElement("button");
   btn.textContent = t;
   btn.style.display = "block";
   btn.addEventListener("click", () => tabs[i + 2].open());
   return btn;
}));

const tabs = [new PinnedTab("input", inputPage), new PinnedTab("list", listPage)];
list.forEach((t, i) => {
   const page = document.createElement("div");
   page.textContent = t;
   tabs.push(new Tab(i, t, page));
});
