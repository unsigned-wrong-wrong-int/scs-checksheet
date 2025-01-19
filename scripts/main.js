import {year, Record, RecordList, Division, subjects, specialSubjects} from "./subject.js";

const InputTab = class {
   #recordList;
   #updateFn;
   #statusSelects;
   #subjectsBody;
   #newItem;
   #items;

   constructor(recordList, updateFn) {
      this.#recordList = recordList;
      this.#updateFn = updateFn;
      const special = document.getElementById("input-table-special");
      this.#statusSelects = [...special.querySelectorAll(":scope select")];
      const subjects = document.getElementById("input-table-subj");
      this.#subjectsBody = subjects.querySelector(":scope tbody");
      const subjectNew = document.getElementById("subj-new");
      this.#newItem = {
         subject: null,
         year: document.getElementById("subj-year-input"),
         id: document.getElementById("subj-id-input"),
         name: document.getElementById("subj-name-output"),
         credits: document.getElementById("subj-credits-output"),
         score: document.getElementById("subj-score-input"),
         addButton: document.getElementById("subj-add"),
         template: document.getElementById("subj-row"),
      };
      this.#newItem.id.addEventListener("input", () => this.onInputId());
      this.#newItem.addButton.addEventListener("click", () => this.add());
      this.#items = [];
   }

   onInputId() {
      const id = this.#newItem.id.value;
      const subject = subjects.get(id);
      if (subject === undefined) {
         this.#newItem.subject = null;
         this.#newItem.name.value = "";
         this.#newItem.credits.value = "";
         this.#newItem.addButton.setAttribute("disabled", "");
      } else {
         this.#newItem.subject = subject;
         this.#newItem.name.value = subject.name;
         this.#newItem.credits.value = subject.credits;
         this.#newItem.addButton.removeAttribute("disabled");
      }
   }

   add() {
      const {subject, year: {value: year_}, score: {value: score_}} = this.#newItem;
      const year = +year_;
      const score = score_ === "" || Number.isNaN(+score_) ? null : +score_;
      const record = new Record(subject, year, score === null ? null : score >= 60, score);
      const row = this.#newItem.template.content.cloneNode(true);
      const td = row.querySelectorAll("td");
      td[0].textContent = year;
      td[1].textContent = subject.id;
      td[2].textContent = subject.name;
      td[3].textContent = subject.credits;
      td[4].firstElementChild.value = score ?? "";
      td[5].firstElementChild.addEventListener("click",
         e => this.delete(e.target.parentElement.parentElement));
      this.#subjectsBody.appendChild(row);
      this.#items.push({row, record});
      this.#recordList.add(record);
      this.#updateFn(this.#recordList);
      this.#newItem.id.value = "";
      this.#newItem.score.value = "";
      this.onInputId();
   }

   delete(row) {
      this.#subjectsBody.removeChild(row);
      const i = this.#items.findIndex(({row: r}) => r === row);
      const record = this.#items.splice(i, 1)[0].record;
      this.#recordList.remove(record);
      this.#updateFn(this.#recordList);
   }
};

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

   update(recordList) {
      this.#division.update(recordList);
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
         const i = +button.dataset.index;
         button.dataset.status = this.#division.test[i].status ?? "";
      }
   }
};

const recordList = new RecordList();

specialSubjects
   .forEach(subject => recordList.add(new Record(subject, null, null, null)));

const divisions = Division.all();
const tabs = divisions
   .map((division, index) => new DivisionTab(division, index));

const update = () => {
   tabs.forEach(tab => tab.update(recordList));
};

const inputTab = new InputTab(recordList, update);

update();

console.log(recordList);
console.log(divisions);
