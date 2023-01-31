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

const selectElement = (map, action) => {
   const element = document.createElement("select");
   for (const [value, text] of map) {
      const option = document.createElement("option");
      option.value = value;
      option.innerText = text;
      element.appendChild(option);
   }
   element.addEventListener("change", action);
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

const buttonElement = (text, action) => {
   const element = document.createElement("button");
   element.innerText = text;
   element.addEventListener("click", action);
   return element;
}

const newLine = () => document.createElement("br");

const idInput = action => {
   const element = document.createElement("input");
   element.type = "text";
   element.pattern = "[\\dA-Z]{3}\\d{4}";
   element.placeholder = "科目番号";
   element.addEventListener("input", action);
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
      this.stateSelect = selectElement(stateMap, () => this.change());
      this.stateSelect.value = data.state;
      row.addCell(this.stateSelect);
      row.addCell();
      this.element = row.element;
   }

   change() {
      this.data.state = +this.stateSelect.value;
   }
};

const ToeicRecord = class {
   constructor(data) {
      this.data = data;
      const row = new Row;
      row.addCell("―");
      row.addCell("TOEIC-IP スコア");
      row.addCell("―");
      this.scoreEdit = scoreInput(5, 990, 5);
      this.scoreEdit.value = data.score ?? "";
      this.scoreCell = row.addCell(data.score ?? "");
      this.editButton = buttonElement("編集", () => this.beginEdit());
      this.applyButton = buttonElement("更新", () => this.endEdit());
      this.buttonCell = row.addCell(this.editButton);
      this.element = row.element;
   }

   beginEdit() {
      this.scoreCell.replaceChildren(this.scoreEdit);
      this.buttonCell.replaceChildren(this.applyButton);
   }

   endEdit() {
      if (!this.scoreEdit.checkValidity()) {
         return;
      }
      const value = this.scoreEdit.value;
      if (value === "") {
         this.data.score = null;
      } else {
         this.data.score = +value;
      }
      this.scoreCell.replaceChildren(value);
      this.buttonCell.replaceChildren(this.editButton);
   }
};

const SubjectRecord = class {
   constructor(data, list) {
      this.data = data;
      this.list = list;
      const row = new Row;
      this.lastYearCheck = checkBox();
      this.lastYearLabel = labeled(this.lastYearCheck, "前年度分");
      this.idCell = row.addCell(data.subject.id);
      row.addCell(data.subject.name);
      row.addCell(data.subject.credit);
      this.scoreEdit = scoreInput();
      this.scoreEdit.value = data.score ?? "";
      this.scoreCell = row.addCell(data.score ?? "");
      this.editButton = buttonElement("編集", () => this.beginEdit());
      this.applyButton = buttonElement("更新", () => this.endEdit());
      this.deleteButton = buttonElement("削除", () => this.delete());
      this.buttonCell = row.addCell(this.editButton);
      this.element = row.element;
   }

   beginEdit() {
      this.idCell.appendChild(this.lastYearLabel);
      this.scoreCell.replaceChildren(this.scoreEdit);
      this.buttonCell.replaceChildren(this.applyButton, this.deleteButton);
   }

   endEdit() {
      if (!this.scoreEdit.checkValidity()) {
         return;
      }
      this.data.isLastYear = this.lastYearCheck.checked;
      const value = this.scoreEdit.value;
      if (value === "") {
         this.data.state = STATE_PENDING;
         this.data.score = null;
      } else {
         this.data.state = +value >= 60 ? STATE_PASSED : STATE_FAILED;
         this.data.score = +value;
      }
      this.idCell.removeChild(this.lastYearLabel);
      this.scoreCell.replaceChildren(value);
      this.buttonCell.replaceChildren(this.editButton);
   }

   delete() {
      this.list.splice(this.list.indexOf(this.item), 1);
      this.element.remove();
   }
};

const NewSubjectRecord = class {
   constructor(dict, list) {
      this.dict = dict;
      this.list = list;
      this.subject = null;
      const row = new Row;
      this.idEdit = idInput(() => this.findSubject());
      this.lastYearCheck = checkBox();
      row.addCell(idEdit, labeled(this.lastYearCheck, "前年度分"));
      this.nameCell = row.addCell();
      this.creditCell = row.addCell();
      this.scoreEdit = scoreInput();
      row.addCell(this.scoreEdit);
      const appendButton = buttonElement("追加", () => this.append());
      row.addCell(appendButton);
      this.element = row.element;
   }

   findSubject() {
      const subject = this.dict.get(this.idEdit.value);
      if (subject === undefined) {
         this.subject = null;
         this.nameCell.innerText = "";
         this.creditCell.innerText = "";
         return;
      }
      this.subject = subject;
      this.nameCell.innerText = subject.name;
      this.creditCell.innerText = subject.credit;
   }

   append() {
      if (this.subject === null || !this.scoreEdit.checkValidity()) {
         return;
      }
      const item = grade(this.subject, this.lastYearCheck.checked);
      const value = this.scoreEdit.value;
      if (value === "") {
         item.state = STATE_PENDING;
         item.score = null;
      } else {
         item.state = +value >= 60 ? STATE_PASSED : STATE_FAILED;
         item.score = +value;
      }
      this.list.push(item);
      this.element.parentElement
         .appendChild(new SubjectRecord(item, this.list).element);
      this.subject = null;
      this.nameCell.innerText = "";
      this.creditCell.innerText = "";
      this.idEdit.value = "";
      this.scoreEdit.value = "";
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

const testRuleCell = (rule, colSpan) => {
   const td = document.createElement("td");
   td.rowSpan = rule.last - rule.first + 1;
   td.colSpan = colSpan;
   if (rule.count) {
      td.innerText = `${rule.count}単位${rule.saturates ? "\nまで" : ""}`;
      if (rule.span && colSpan === 1) {
         td.classList.add("test-nested");
      }
   } else {
      td.classList.add("test-blank");
   }
   return td;
};

const weightCell = (rule, weight) => {
   const td = document.createElement("td");
   td.rowSpan = rule.last - rule.first + 1;
   td.innerText = weight.toFixed(2);
   return td;
};

const calcRuleCell = (rule, colSpan) => {
   const td = document.createElement("td");
   td.rowSpan = rule.last - rule.first + 1;
   td.colSpan = colSpan;
   if (rule.count) {
      td.innerText = `${rule.count}単位`;
      if (rule.span && colSpan === 1) {
         td.classList.add("calc-nested");
      }
   } else {
      td.classList.add("calc-blank");
   }
   return td;
};

const blankCell = (rowSpan, colSpan) => {
   const td = document.createElement("td");
   td.rowSpan = rowSpan;
   td.colSpan = colSpan;
   td.classList.add("blank");
   return td;
};

const textCell = text => {
   const td = document.createElement("td");
   td.innerText = text;
   return td;
};

const testCols = (rows, rule) => {
   if (0 < rule.first) {
      rows[0].push(blankCell(rule.first, 2));
   }
   for (const span of rule.spans) {
      if (span.spans) {
         rows[span.first].push(testRuleCell(span, 1));
         for (const sub of span.spans) {
            rows[sub.first].push(testRuleCell(sub, 1));
         }
      } else {
         rows[span.first].push(testRuleCell(span, 2));
      }
   }
   if (rule.last + 1 < rows.length) {
      rows[rule.last + 1].push(blankCell(rows.length - rule.last - 1, 2));
   }
};

const subjectCols = (rows, credits, subjects) => {
   for (let i = 0; i < rows.length; ++i) {
      const row = rows[i];
      row.push(textCell(credits[i][0]), textCell(credits[i][1]));
      const subject = subjects[i];
      row.push(textCell(subject.id ?? "―"), textCell(subject.name));
   }
};

const calcCols = (rows, rule) => {
   if (0 < rule.first) {
      rows[0].push(blankCell(rule.first, 1), blankCell(rule.first, 3));
   }
   if (rule.spans) {
      for (const span of rule.spans) {
         if (span.spans) {
            for (const sub of sub.spans) {
               rows[sub.first].push(weightCell(sub, sub.weight ?? span.weight),
                  calcRuleCell(sub, 1));
            }
            rows[span.first].push(calcRuleCell(span, 1));
         } else {
            rows[span.first].push(weightCell(span, span.weight ?? rule.weight),
               calcRuleCell(span, 2));
         }
      }
      rows[rule.first].push(calcRuleCell(span, 1));
   } else {
      rows[rule.first].push(weightCell(rule, rule.weight), calcRuleCell(span, 3));
   }
   if (rule.last + 1 < rows.length) {
      rows[rule.last + 1].push(blankCell(rows.length - rule.last - 1, 1),
         blankCell(rows.length - rule.last - 1, 3));
   }
};

const makeTable = (result, data) => {
   const subjects = result.partition.list.map(id =>
      (typeof id === "number" ? data.special : data.subjects).get(id));
   const rows = result.partition.list.map(() => []);
   testCols(rows, result.partition.test);
   subjectCols(rows, result.credits, subjects);
   calcCols(rows, result.partition.calc);
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
         ...grade.common.map(s => new CommonRecord(s)),
         new ToeicRecord(grade.toeic),
         new NewSubjectRecord(grade.data.subjects, grade.subjects),
         ...grade.subjects.map(s => new SubjectRecord(s, grade.subjects)),
      ];
      this.partitionsUI = [
         ...grade.partitions.map(p => new PartitionRecord(p)),
      ];
      this.subjects.replaceChildren(...this.subjectsUI.map(({element}) => element));
      this.partitions.replaceChildren(...this.partitionsUI.map(({element}) => element));
   }

   update() {
      this.grade.update();
      for (let i = 0; i < this.grade.partitions.length; ++i) {
         this.partitionsUI[i].update(this.grade.partitions[i]);
      }
   }
};

const main = async () => {
   let ui = new UI();
   let data = await fetchData(2022);
   let grade = new GradeData(2022, data);
   grade.update();
   ui.bind(grade);
   document.getElementById("update").addEventListener("click", () => ui.update());
};

main();
