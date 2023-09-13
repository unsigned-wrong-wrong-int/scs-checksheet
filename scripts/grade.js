const {subjects, tables, categories} =
   await (await fetch(new URL("./data/data.json", import.meta.url))).json();

export
const STATUS_TAKING = undefined, STATUS_FAILED = 0, STATUS_PASSED = 60;

export
const Grade = class {
   #year;
   #id;
   #score;
   #subject;

   constructor(year, id, subject) {
      this.#year = year;
      this.#id = id;
      this.#score = null;
      this.#subject = subject;
   }

   static subject(year, id) {
      const subject = subjects[year][id];
      if (subject === undefined) return undefined;
      return new this(year, id, subject);
   }

   static commonSubjects() {
      return subjects.common.map((subject, id) => new this("common", id, subject));
   }

   get year() {
      return this.#year;
   }

   get id() {
      return this.#id;
   }

   get name() {
      return this.#subject[0];
   }

   get credits() {
      return this.#subject[1];
   }

   get flags() {
      return this.#subject[2];
   }

   get code() {
      return this.#subject[3];
   }

   set score(value) {
      if (value === undefined || Number.isInteger(value) && 0 <= value && value <= 100) {
         this.#score = value;
      }
   }

   get score() {
      return this.#score;
   }

   set status(value) {
      switch (value) {
      case STATUS_PASSED:
      case STATUS_TAKING:
      case STATUS_FAILED:
         this.#score = value;
      }
   }

   get status() {
      if (this.#score === undefined) return STATUS_TAKING;
      return this.#score >= 60 ? STATUS_PASSED : STATUS_FAILED;
   }
};

export
const GradeMap = class {
   // 科目コード → 成績の Set の対応づけ
   // Set を用いるのは再履修にも対応するため
   // 同一科目を再履修した場合、最も点数の高いものが成績点に算入される
   #data;

   constructor() {
      this.#data = new Map;
   }

   add(grade) {
      if (this.#data.has(grade.code)) {
         this.#data.get(grade.code).add(grade);
      } else {
         this.#data.set(grade.code, new Set([grade]));
      }
   }

   delete(grade) {
      const set = this.#data.get(grade.code);
      set.delete(grade);
      if (set.size === 0) {
         this.#data.delete(grade.code);
      }
   }

   #take(result, set, flag = 0) {
      let passed = 0, taking = 0, max;
   loop:
      for (const grade of set) {
         if ((grade.flags & flag) !== flag) continue;
         switch (grade.status) {
         case STATUS_PASSED:
            passed = grade.credits;
            taking = 0;
            max = grade;
            break loop;
         case STATUS_TAKING:
            taking = grade.credits;
            break;
         case STATUS_FAILED:
            if (grade.score > (max?.score ?? -1)) {
               max = grade;
            }
            break;
         }
      }
      if (passed || taking || max) {
         result.passed += passed;
         result.taking += taking;
         result.grades.push(max);
         return true;
      }
      return false;
   }

   collect(list) {
      const map = new Map(this.#data);
      return list.map(x => {
         const result = {passed: 0, taking: 0, grades: []};
         if (typeof x === "number") {
            for (const [code, set] of map) {
               if (this.#take(result, set, x)) {
                  map.delete(code);
               }
            }
         } else if (map.has(x)) {
            if (this.#take(result, map.get(x))) {
               map.delete(code);
            }
         }
         return result;
      });
   }
};

// 応募要件の確認
// 充足: STATUS_PASSED, 仮充足: STATUS_TAKING, 不足: STATUS_FAILED
const Check = class {
   constructor() {
      this.passed = 0;
      this.taking = 0;
      this.status = STATUS_PASSED;
   }

   merge(other) {
      this.passed += other.passed;
      this.taking += other.taking;
      switch (other.status) {
      case STATUS_FAILED:
         this.status = STATUS_FAILED;
         break;
      case STATUS_TAKING:
         if (this.status === STATUS_PASSED) {
            this.status = STATUS_TAKING;
         }
         break;
      }
   }

   max(count) {
      if (this.passed > count) {
         this.passed = count;
         this.taking = 0;
      } else if (this.passed + this.taking > count) {
         this.taking = count - this.passed;
      }
   }

   min(count) {
      if (this.passed < count) {
         if (this.passed + this.taking < count) {
            this.status = STATUS_FAILED;
         } else if (this.status === STATUS_PASSED) {
            this.status = STATUS_TAKING;
         }
      }
   }

   runStep(list, rule) {
      if (rule.sub) {
         for (const span of rule.sub) {
            this.merge(new Check().runStep(list, span));
         }
      } else {
         for (const {passed, taking} of list.slice(rule.range[0], rule.range[1] + 1)) {
            this.passed += passed;
            this.taking += taking;
         }
      }
      if (rule.max) {
         this.max(rule.max);
      } else if (rule.min) {
         this.min(rule.min);
      }
      return this;
   }

   run(list, required) {
      if (required) {
         for (const rule of required) {
            this.merge(new Check().runStep(list, rule));
         }
      }
      return this.status;
   }
};

// 成績点の計算
const Calc = class {
   constructor() {
      this.selected = [];
      this.isWeighted = true;
   }

   add(grades) {
      for (const grade of grades) {
         this.selected.push({credits: grade.credits, weight: undefined, grade});
      }
      this.isWeighted = false;
   }

   merge(other) {
      this.selected.push(...other.selected);
      this.isWeighted &&= other.isWeighted;
   }

   weight(value) {
      for (const item of this.selected) {
         item.weight ??= value;
      }
      this.isWeighted = true;
   }

   max(count, weight, dropped) {
      if (weight) {
         this.weight(weight);
      }
      this.selected.sort(this.isWeighted
         ? (a, b) => b.weight * b.grade.score - a.weight * a.grade.score
         : (a, b) => b.grade.score - a.grade.score);
      let n = 0, i = 0;
      for (; i < this.selected.length && n < count; ++i) {
         const item = this.selected[i];
         if (n + item.credits > count) {
            this.selected.push({credits: n + item.credits - count,
               weight: undefined, grade: item.grade});
            item.credits = count - n;
         }
         n += item.credits;
      }
      if (!weight) {
         for (const item of this.selected.splice(i)) {
            item.weight = undefined;
            dropped.push(item);
         }
      }
   }

   runStep(list, rule, dropped) {
      if (rule.sub) {
         for (const span of rule.sub) {
            this.merge(new Calc().runStep(list, span, dropped));
         }
      } else {
         for (const {grades} of list.slice(rule.range[0], rule.range[1] + 1)) {
            this.add(grades);
         }
      }
      if (rule.max) {
         this.max(rule.max, rule.weight, dropped);
      } else if (rule.weight) {
         this.weight(rule.weight);
      }
      return this;
   }

   run(list, weighted, max) {
      if (weighted) {
         for (const rule of weighted) {
            this.merge(new Calc().runStep(list, rule, this.selected));
         }
         this.add(list[list.length - 1]);
         this.weight(0.1);
      } else {
         for (const {grades} of list) {
            this.add(grades);
         }
         this.weight(1);
      }
      this.max(max, {push() {}});
      return this.selected.reduce((sum, item) =>
         sum + item.weight * item.credits * item.grade.score, 0);
   }
};
