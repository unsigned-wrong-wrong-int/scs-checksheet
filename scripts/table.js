const Row = class {
   constructor(tag = "td") {
      this.tag = tag;
      this.elem = document.createElement("tr");
   }

   cell(content, attrs = {}) {
      const cell = document.createElement(this.tag);
      if (content instanceof Node) {
         cell.appendChild(content);
      } else {
         cell.textContent = content;
      }
      for (const [key, value] of Object.entries(attrs)) {
         cell.setAttribute(key, value);
      }
      this.elem.appendChild(cell);
      return this;
   }

   outputCell(name, attrs = {}) {
      const output = document.createElement("output");
      this.cell(output, attrs);
      this[name] = value => void (output.value = value);
      return this;
   }

   prepend(cell) {
      this.elem.prepend(cell);
   }

   append(cell) {
      this.elem.append(cell);
   }
};

const Column = class {
   constructor(rowCount) {
      this.col = new Array(rowCount);
      this.index = 0;
   }

   begin(range) {
      this.index = range[0];
   }

   end(range) {
      if (this.index === range[0]) return false;
      this.pad(1, range[1] + 1);
      return true;
   }

   pad(colSpan, index = this.col.length) {
      if (index <= this.index) return;
      const blank = document.createElement("td");
      this.col[this.index] = blank;
      blank.rowSpan = index - this.index;
      blank.colSpan = colSpan;
      this.index = index;
   }

   cell(colSpan, [first, last], content, attrs = {}) {
      if (first < this.index) {
         first += this.col[first].rowSpan;
      }
      const cell = document.createElement("td");
      this.col[first] = cell;
      if (content instanceof Node) {
         cell.appendChild(content);
      } else {
         cell.textContent = content;
      }
      for (const [key, value] of Object.entries(attrs)) {
         cell.setAttribute(key, value);
      }
      this.index = last + 1;
      cell.rowSpan = this.index - first;
      cell.colSpan = colSpan;
   }

   prependTo(rows) {
      this.col.forEach((cell, index) => {
         rows[index].prepend(cell);
      });
   }

   appendTo(rows) {
      this.col.forEach((cell, index) => {
         rows[index].append(cell);
      });
   }
};

/*
[
   {
      min,
      sub?: [{} | {min} | {max}]
   }
]
*/
const prependRequired = (rows, rules) => {
   const col = new Column(rows.length), subCol = new Column(rows.length);
   for (const rule of rules ?? []) {
      col.pad(2, rule.range[0]);
      if (rule.sub) {
         subCol.begin(rule.range);
         for (const span of rule.sub) {
            if (span.max) {
               subCol.pad(1, span.range[0]);
               subCol.cell(1, span.range, `${span.max}単位まで`);
            } else if (span.min) {
               subCol.pad(1, span.range[0]);
               subCol.cell(1, span.range, `${span.min}単位`);
            }
         }
         subCol.end(rule.range);
         col.cell(1, rule.range, `${rule.min}単位`);
      } else {
         col.cell(2, rule.range, `${rule.min}単位`);
      }
   }
   col.pad(2);
   subCol.prependTo(rows);
   col.prependTo(rows);
};

/*
[
   {}
|
   {
      max, weight,
      sub?: [{} | {max} | {max, weight}]
   }
|
   {
      max,
      sub: [{
         weight,
         sub?: [{} | {max}]
      }]
   }
|
   {
      weight,
      sub: [{
         max,
         sub?: [{} | {max}]
      }]
   }
]
*/
const appendWeighted = (rows, rules) => {
   const wCol = new Column(rows.length);
   const col = new Column(rows.length), subCol = new Column(rows.length);
   for (const rule of rules ?? []) {
      wCol.pad(1, rule.range[0]);
      subCol.pad(2, rule.range[0]);
      if (rule.max) {
         if (rule.weight) {
            if (rule.sub) {
               subCol.begin(rule.range);
               for (const span of rule.sub) {
                  if (span.weight) {
                     wCol.cell(1, span.range, `${span.max}単位まで${span.weight}`);
                  } else if (span.max) {
                     subCol.pad(1, span.range[0]);
                     subCol.cell(1, span.range, `${span.max}単位まで`);
                  }
               }
               subCol.end(rule.range);
               col.cell(1, rule.range, `${rule.max}単位まで`);
            } else {
               subCol.cell(2, rule.range, `${rule.max}単位まで`);
            }
            wCol.cell(1, rule.range, rule.weight);
         } else {
            // const hasSub = rule.sub.some(({sub}) => sub);
            subCol.begin(rule.range);
            for (const span of rule.sub) {
               if (span.sub) {
                  for (const sub of span.sub) {
                     if (sub.max) {
                        subCol.pad(1, sub.range[0]);
                        subCol.cell(1, sub.range, `${sub.max}単位まで`);
                     }
                  }
               }
               wCol.cell(1, span.range, span.weight);
            }
            if (subCol.end(rule.range)) {
               col.cell(1, rule.range, `${rule.max}単位まで`);
            } else {
               subCol.cell(2, rule.range, `${rule.max}単位まで`);
            }
         }
      } else if (rule.weight) {
         for (const span of rule.sub) {
            if (span.sub) {
               subCol.begin(span.range);
               for (const sub of span.sub) {
                  if (sub.max) {
                     subCol.pad(1, sub.range[0]);
                     subCol.cell(1, sub.range, `${sub.max}単位まで`);
                  }
               }
               subCol.end(span.range);
               col.cell(1, span.range, `${span.max}単位まで`);
            } else {
               subCol.cell(2, span.range, `${span.max}単位まで`);
            }
         }
         wCol.cell(1, rule.range, rule.weight);
      }
   }
   wCol.pad(1);
   subCol.pad(2);
   wCol.appendTo(rows);
   subCol.appendTo(rows);
   col.appendTo(rows);
};

const appendMax = (rows, max) => {
   const col = new Column(rows.length);
   col.cell(1, [0, rows.length - 1], `${max}単位まで`);
   col.appendTo(rows);
};

const Table = class {
   constructor(data) {
      const head = new.target.head(data);
      const body = new.target.rows(data);
      const foot = new.target.foot?.(data);
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.appendChild(head.elem);
      this.head = head;
      const tbody = document.createElement("tbody");
      tbody.append(...body.map(row => row.elem));
      this.rows = body;
      if (foot) {
         const tfoot = document.createElement("tfoot");
         tfoot.appendChild(foot.elem);
         this.foot = foot;
         table.append(thead, tbody, tfoot);
      } else {
         table.append(thead, tbody);
      }
      this.data = data;
      this.elem = table;
   }
};

const CheckSheet = class extends Table {
   static head(_) {
      return new Row("th")
         .cell("応募要件", {colSpan: 2}).cell("修得").cell("履修中")
         .cell("科目番号").cell("科目名").cell("単位")
         .cell("重み").cell("重点科目上限", {colSpan: 2}).cell("算入上限");
   }

   static rows(division) {
      const rows = division.list.map(item => new Row()
         .outputCell("passed").outputCell("taking")
         .cell(item.code ?? "―").cell(item.name).cell(item.credits ?? "―"));
      prependRequired(rows, division.required);
      appendWeighted(rows, division.weighted);
      appendMax(rows, division.max);
      return rows;
   }

   update() {
      this.data.list.forEach((item, index) => {
         this.rows[index].passed(item.passed);
         this.rows[index].taking(item.taking);
      });
   }
};

export
const DetailsPage = class {
   constructor(division) {
      this.contents = document.createElement("div");
      this.checkSheet = new CheckSheet(division);
      this.contents.append(this.checkSheet.elem);
   }

   update() {
      this.checkSheet.update();
   }
};
