import { STATE_FAILED, STATE_PASSED, STATE_PENDING, grade } from "./grade.js";

const Row = class {
   constructor() {
      this.element = document.createElement("tr");
   }

   addCell(class_, ...content) {
      const cell = document.createElement("td");
      cell.append(...content);
      cell.className = class_;
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

export
const CommonRecord = class {
   constructor(data) {
      this.data = data;
      const row = new Row;
      row.addCell("subject-id", "―");
      row.addCell("subject-name", data.subject.name);
      row.addCell("subject-credit", data.subject.credit);
      this.stateSelect = selectElement(stateMap, () => this.change());
      this.stateSelect.value = data.state;
      row.addCell("subject-score", this.stateSelect);
      row.addCell("subject-button");
      this.element = row.element;
   }

   change() {
      this.data.state = +this.stateSelect.value;
      this.onChange?.();
   }
};

export
const ToeicRecord = class {
   constructor(data) {
      this.data = data;
      const row = new Row;
      row.addCell("subject-id", "―");
      row.addCell("subject-name", "TOEIC-IP スコア");
      row.addCell("subject-credit", "―");
      this.scoreEdit = scoreInput(5, 990, 5);
      this.scoreEdit.value = data.score ?? "";
      this.scoreCell = row.addCell("subject-score", data.score ?? "");
      this.editButton = buttonElement("編集", () => this.beginEdit());
      this.applyButton = buttonElement("完了", () => this.endEdit());
      this.buttonCell = row.addCell("subject-button", this.editButton);
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
      this.onChange?.();
   }
};

export
const SubjectRecord = class {
   constructor(data, list) {
      this.data = data;
      this.list = list;
      const row = new Row;
      this.lastYearCheck = checkBox();
      this.lastYearLabel = labeled(this.lastYearCheck, "前年度分");
      this.idCell = row.addCell("subject-id", data.subject.id);
      row.addCell("subject-name", data.subject.name);
      row.addCell("subject-credit", data.subject.credit);
      this.scoreEdit = scoreInput();
      this.scoreEdit.value = data.score ?? "";
      this.scoreCell = row.addCell("subject-score", data.score ?? "");
      this.editButton = buttonElement("編集", () => this.beginEdit());
      this.applyButton = buttonElement("完了", () => this.endEdit());
      this.deleteButton = buttonElement("削除", () => this.delete());
      this.buttonCell = row.addCell("subject-button", this.editButton);
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
      this.onChange?.();
   }

   delete() {
      this.list.splice(this.list.indexOf(this.data), 1);
      this.element.remove();
      this.onChange?.();
   }
};

export
const NewSubjectRecord = class {
   constructor(dict, list) {
      this.dict = dict;
      this.list = list;
      this.subject = null;
      const row = new Row;
      this.idEdit = idInput(() => this.findSubject());
      this.lastYearCheck = checkBox();
      row.addCell("subject-id", this.idEdit,
         labeled(this.lastYearCheck, "前年度分"));
      this.nameCell = row.addCell("subject-name");
      this.creditCell = row.addCell("subject-credit");
      this.scoreEdit = scoreInput();
      row.addCell("subject-score", this.scoreEdit);
      const appendButton = buttonElement("追加", () => this.append());
      row.addCell("subject-button", appendButton);
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
      this.onChange?.();
   }
};

const achievement = new Map([
   [STATE_FAILED, "不足"],
   [STATE_PENDING, "仮充足"],
   [STATE_PASSED, "充足"],
]);

export
const PartitionRecord = class {
   constructor(data) {
      const row = new Row;
      row.addCell("partition-name", data.partition.name);
      this.state = row.addCell("partition-state");
      this.score = row.addCell("partition-score");
      this.toeic = row.addCell("partition-toeic");
      this.total = row.addCell("partition-total");
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
      this.onSelect?.(this.data);
   }
};

const testRuleCell = (rule, colSpan) => {
   const td = document.createElement("td");
   td.className = `specified-test-${colSpan}`;
   td.rowSpan = rule.last - rule.first + 1;
   td.colSpan = colSpan;
   if (rule.count) {
      td.innerText = `${rule.count}単位${rule.saturates ? "\nまで" : ""}`;
      if (rule.spans && colSpan === 1) {
         td.classList.add("test-nested");
      }
   } else {
      td.classList.add("test-blank");
   }
   return td;
};

const noTestCell = (rowSpan, colSpan) => {
   const td = document.createElement("td");
   td.className = `specified-test-${colSpan}`;
   td.rowSpan = rowSpan;
   td.colSpan = colSpan;
   td.innerText = "―";
   return td;
};

const weightCell = (rule, weight) => {
   const td = document.createElement("td");
   td.className = "specified-weight";
   td.rowSpan = rule.last - rule.first + 1;
   td.innerText = weight.toFixed(1);
   return td;
};

const noWeightCell = rowSpan => {
   const td = document.createElement("td");
   td.className = "specified-weight";
   td.rowSpan = rowSpan;
   td.innerText = "―";
   return td;
};

const calcRuleCell = (rule, colSpan) => {
   const td = document.createElement("td");
   td.className = `specified-calc-${colSpan}`;
   td.rowSpan = rule.last - rule.first + 1;
   td.colSpan = colSpan;
   if (rule.count) {
      td.innerText = `${rule.count}単位`;
      if (rule.spans && colSpan === 1) {
         td.classList.add("calc-nested");
      }
   } else {
      td.classList.add("calc-blank");
   }
   return td;
};

const noCalcCell = (rowSpan, colSpan) => {
   const td = document.createElement("td");
   td.className = `specified-calc-${colSpan}`;
   td.rowSpan = rowSpan;
   td.colSpan = colSpan;
   td.innerText = "―";
   return td;
};

const textCell = (text, class_) => {
   const td = document.createElement("td");
   td.className = class_;
   td.innerText = text;
   return td;
};

const testCols = (rows, rule) => {
   if (0 < rule.first) {
      rows[0].push(noTestCell(rule.first, 2));
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
      rows[rule.last + 1].push(noTestCell(rows.length - rule.last - 1, 2));
   }
};

const subjectCols = (rows, credits, subjects) => {
   for (let i = 0; i < rows.length; ++i) {
      const row = rows[i];
      const subject = subjects[i];
      row.push(
         textCell(credits[i][0], "specified-credit"),
         textCell(credits[i][1], "specified-credit"),
         textCell(subject.id ?? "―", "specified-id"),
         textCell(subject.name, "specified-name"),
         textCell(subject.credit ?? "―", "specified-credit"),
      );
   }
};

const calcCols = (rows, rule) => {
   if (0 < rule.first) {
      rows[0].push(noWeightCell(rule.first), noCalcCell(rule.first, 3));
   }
   if (rule.spans) {
      for (const span of rule.spans) {
         if (span.spans) {
            for (const sub of span.spans) {
               rows[sub.first].push(weightCell(sub, sub.weight ?? span.weight),
                  calcRuleCell(sub, 1));
            }
            rows[span.first].push(calcRuleCell(span, 1));
         } else {
            rows[span.first].push(weightCell(span, span.weight ?? rule.weight),
               calcRuleCell(span, 2));
         }
      }
      rows[rule.first].push(calcRuleCell(rule, 1));
   } else {
      rows[rule.first].push(weightCell(rule, rule.weight),
         noCalcCell(rule.last - rule.first + 1, 2), calcRuleCell(rule, 1));
   }
   if (rule.last + 1 < rows.length) {
      rows[rule.last + 1].push(noWeightCell(rows.length - rule.last - 1),
         noCalcCell(rows.length - rule.last - 1, 3));
   }
};

const listCols = ([{subject: {id, name}, score}, credit, weight]) => [
   textCell(id, "details-id"),
   textCell(name, "details-name"),
   textCell(weight, "details-weight"),
   textCell(credit, "details-credit"),
   textCell(score, "details-score"),
];

const setRows = (body, rows) => body.replaceChildren(...rows.map(cells => {
   const row = document.createElement("tr");
   row.append(...cells);
   return row;
}));

export
const showTable = (body, data, dict) => {
   const subjects = data.partition.list.map(id =>
      (typeof id === "number" ? dict.special : dict.subjects).get(id));
   const rows = data.partition.list.map(() => []);
   testCols(rows, data.partition.test);
   subjectCols(rows, data.credits, subjects);
   calcCols(rows, data.partition.calc);
   setRows(body, rows);
};

export
const showList = (body, data) => {
   const rows = data.items.map(listCols);
   setRows(body, rows);
};
