import {year, Record, RecordList, Division, subjects, specialSubjects} from "./subject.js";

const DivisionTab = class {
   #division;
   #tabStatus;
   #tabScore;
   #summaryStatus;
   #summaryScore;
   #summaryToeic;
   #testButtons;
   #sumButtons;

   constructor(division, index) {
      this.#division = division;
      const tab = document.getElementById(`tab-${index}`);
      this.#tabStatus = tab.querySelector(":scope .tab-status");
      this.#tabScore = tab.querySelector(":scope .tab-score-value");
      const panel = document.getElementById(`panel-${index}`);
      this.#summaryStatus = panel.querySelector(":scope td.summary-status");
      this.#summaryScore = panel.querySelector(":scope .summary-score-value");
      this.#summaryToeic = panel.querySelector(":scope .summary-toeic-value");
      this.#testButtons = [...panel.querySelectorAll(":scope [popovertarget=\"status-details\"]")];
      this.#sumButtons = [...panel.querySelectorAll(":scope [popovertarget=\"score-details\"]")];
   }

   update() {
      const statusText = {
         true: "充足",
         null: "仮充足",
         false: "不足",
      }[this.#division.status];
      const scoreText = this.#division.score.toFixed(2);
      this.#tabStatus.textContent = statusText;
      this.#tabScore.textContent = scoreText;
      this.#summaryStatus.textContent = statusText;
      this.#summaryScore.textContent = scoreText;
      if (this.#summaryToeic) {
         this.#summaryToeic.textContent = 0 .toFixed(2);
      }
      for (const button of this.#testButtons) {
         button.dataset.status = this.#division.status ?? "";
      }
   }
};

const recordList = new RecordList();
const divisions = Division.all();
const tabs = divisions.map((division, index) => new DivisionTab(division, index));

divisions.forEach(division => division.update(recordList));
tabs.forEach(tab => tab.update());
