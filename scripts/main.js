import {PinnedTab, Tab} from "./tabs.js";
import {Division} from "./grade.js";
import {DetailsPage} from "./table.js";

const inputPage = document.createElement("div");
inputPage.textContent = "(成績入力)";

const listPage = document.createElement("div");
listPage.append(...Division.all.map((division, i) => {
   const btn = document.createElement("button");
   btn.textContent = division.name;
   btn.style.display = "block";
   btn.addEventListener("click", () => tabs[i + 2].open());
   return btn;
}));

const tabs = [new PinnedTab("input", inputPage), new PinnedTab("list", listPage)];
Division.all.forEach((division, i) => {
   tabs.push(new Tab(i, division.name, new DetailsPage(division).contents));
});
