import { fetchData } from "./data.js";
import { STATE_FAILED, STATE_PASSED, STATE_PENDING, GradeData, grade } from "./grade.js";

const Row = class {
   constructor() {
      this.element = document.createElement("tr");
   }

   addCell(...content) {
      const cell = document.createElement("td");
      cell.append(...content);
      this.element.appendChild(cell);
      return cell;
   }
};

const selectElement = map => {
   const element = document.createElement("select");
   for (const [value, text] of map) {
      const option = document.createElement("option");
      option.value = value;
      option.innerText = text;
      element.appendChild(option);
   }
   return element;
};

const scoreInput = (min = 0, max = 100, step = 1) => {
   const element = document.createElement("input");
   element.type = "number";
   element.min = min;
   element.max = max;
   element.step = step;
   return element;
};

const buttonElement = text => {
   const element = document.createElement("button");
   element.innerText = text;
   return element;
}

const newLine = () => document.createElement("br");

const idInput = () => {
   const element = document.createElement("input");
   element.type = "text";
   element.pattern = "[\\dA-Z]{3}\\d{4}";
   element.placeholder = "科目番号";
   return element;
};

const checkBox = () => {
   const element = document.createElement("input");
   element.type = "checkbox";
   return element;
};

const labeled = (target, text) => {
   const element = document.createElement("label");
   element.append(target, text);
   return element;
};

const stateMap = [
   [STATE_PENDING, "履修中"],
   [STATE_PASSED, "修得"],
   [STATE_FAILED, "未修得"],
];

const CommonRecord = class {
   constructor(data) {
      this.data = data;
      const row = new Row;
      row.addCell("―");
      row.addCell(data.subject.name);
      row.addCell(data.subject.credit);
      const state = selectElement(stateMap);
      state.value = data.state;
      state.addEventListener("change", () => this.onChange());
      row.addCell(state);
      this.state = state;
      row.addCell();
      this.element = row.element;
   }

   onChange() {
      this.data.state = +this.state.value;
   }
};

const ToeicRecord = class {
   constructor(data) {
      this.data = data;
      const row = new Row;
      row.addCell("―");
      row.addCell("TOEIC-IP スコア");
      row.addCell("―");
      const score = scoreInput(5, 990, 5);
      if (data.toeic !== null) {
         score.value = data.toeic;
      }
      score.addEventListener("change", () => this.onChange());
      row.addCell(score);
      this.score = score;
      row.addCell();
      this.element = row.element;
   }

   onChange() {
      if (!this.score.willValidate) {
         return;
      }
      if (this.score.value === "") {
         this.data.score = null;
      } else {
         this.data.score = +this.score.value;
      }
   }
};

const SubjectRecord = class {
   constructor(data, list) {
      this.data = data;
      this.list = list;
      const row = new Row;
      row.addCell(data.subject.id);
      row.addCell(data.subject.name);
      row.addCell(data.subject.credit);
      const score = scoreInput();
      if (data.score !== null) {
         score.value = data.score;
      }
      score.addEventListener("change", () => this.onChange());
      row.addCell(score);
      this.score = score;
      const button = buttonElement("削除");
      button.addEventListener("click", () => this.delete());
      row.addCell(button);
      this.element = row.element;
   }

   onChange() {
      if (!this.score.willValidate) {
         return;
      }
      if (this.score.value === "") {
         this.data.state = STATE_PENDING;
         this.data.score = null;
      } else {
         const value = +this.score.value;
         this.data.state = value >= 60 ? STATE_PASSED : STATE_FAILED;
         this.data.score = value;
      }
   }

   delete() {
      this.list.splice(this.list.indexOf(this.item), 1);
      this.element.remove();
   }
};

const EditSubjectRecord = class {
   constructor(dict, list) {
      this.dict = dict;
      this.list = list;
      this.subject = null;
      const row = new Row;
      const id = idInput();
      id.addEventListener("input", () => this.findSubject());
      const isLastYear = checkBox();
      row.addCell(id, newLine(), labeled(isLastYear, "前年度分"));
      this.id = id;
      this.isLastYear = isLastYear;
      this.name = row.addCell();
      this.credit = row.addCell();
      row.addCell();
      const button = buttonElement("追加");
      button.addEventListener("click", () => this.create());
      row.addCell(button);
      this.element = row.element;
   }

   findSubject() {
      const subject = this.dict.get(this.id.value);
      if (subject === undefined) {
         this.subject = null;
         this.name.innerText = "";
         this.credit.innerText = "";
         return;
      }
      this.subject = subject;
      this.name.innerText = subject.name;
      this.credit.innerText = subject.credit;
   }

   create() {
      if (this.subject === null) {
         return;
      }
      const item = grade(this.subject, this.isLastYear.checked);
      this.list.push(item);
      this.element.parentElement
         .appendChild(new SubjectRecord(item, this.list).element);
      this.subject = null;
      this.name.innerText = "";
      this.credit.innerText = "";
      this.id.value = "";
   }
};

const achievement = new Map([
   [STATE_FAILED, "不足"],
   [STATE_PENDING, "仮充足"],
   [STATE_PASSED, "充足"],
]);

const PartitionRecord = class {
   constructor(data) {
      const row = new Row;
      row.addCell(data.partition.name);
      this.state = row.addCell();
      this.score = row.addCell();
      this.toeic = row.addCell();
      this.total = row.addCell();
      this.update(data);
      this.element = row.element;
      this.element.addEventListener("click", () => this.showDetails());
   }

   update(data) {
      this.data = data;
      this.state.innerText = achievement.get(data.state);
      this.score.innerText = data.score.toFixed(2);
      this.toeic.innerText = data.toeic?.toFixed(2) ?? "―";
      this.total.innerText = (data.score + (data.toeic ?? 0)).toFixed(2);
   }

   showDetails() {
      // ...
   }
};

const UI = class {
   constructor() {
      this.subjects = document.getElementById("subjects");
      this.partitions = document.getElementById("partitions");
      this.specified = document.getElementById("specified");
      this.details = document.getElementById("details");
   }

   bind(grade) {
      this.grade = grade;
      this.subjectsUI = [
         new EditSubjectRecord(grade.data.subjects, grade.subjects),
         ...grade.common.map(s => new CommonRecord(s)),
         new ToeicRecord(grade.toeic),
         ...grade.subjects.map(s => new SubjectRecord(s, grade.subject)),
      ];
      this.partitionsUI = [
         ...grade.partitions.map(p => new PartitionRecord(p)),
      ];
      this.subjects.replaceChildren(...this.subjectsUI.map(({element}) => element));
      this.partitions.replaceChildren(...this.partitionsUI.map(({element}) => element));
   }
};

const main = async () => {
   let ui = new UI();
   let data = await fetchData(2022);
   let grade = new GradeData(2022, data);
   grade.update();
   ui.bind(grade);
};

main();
