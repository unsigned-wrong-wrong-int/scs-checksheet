export
const STATE_FAILED = 0,
      STATE_PENDING = 1,
      STATE_PASSED = 2;

export
const grade = (subject, isLastYear) =>
   ({subject, beforeFallC: isLastYear || !subject.isFallC, score: null, state: STATE_PENDING});

const GradeList = class {
   constructor(common, subjects) {
      this.data = common.concat(subjects);
   }

   filter(id, pred) {
      if (typeof id === "number") {
         return this.data
            .filter(v => v.beforeFallC && (v.subject.flags & id_n) === id_n && pred(v));
      } else {
         return this.data.filter(v => v.subject.id_n === id && pred(v));
      }
   }

   groupById(list, field) {
      const map = new Map();
      for (const v of list) {
         if (!map.has(v.subject.id_n) || map.get(v.subject.id_n)[field] < v[field]) {
            map.set(v.subject.id_n, v);
         }
      }
      return map;
   }

   drop(map) {
      const ids = [...map.keys()];
      this.data = this.data.filter(v => !ids.includes(v.subject.id_n));
      return [...map.values()];
   }

   getForTest(id) {
      return this.drop(this.groupById(this.filter(id, v => v.state !== STATE_FAILED), "state"));
   }

   getForCalc(id) {
      return this.drop(this.groupById(this.filter(id, v => v.score !== null), "score"));
   }
};

const TestContext = class {
   constructor() {
      this.passed = 0;
      this.pending = 0;
      this.state = STATE_PASSED;
   }

   add(v) {
      if (v.state === STATE_PASSED) {
         this.passed += v.subject.credit;
      } else {
         this.pending += v.subject.credit;
      }
   }

   limit(count, saturates) {
      if (saturates) {
         this.passed = Math.min(this.passed, count);
         this.pending = Math.min(this.pending, count - this.passed);
      }
      if (this.passed < count) {
         this.state = this.passed + this.pending >= count
            ? Math.min(this.state, STATE_PENDING) : STATE_FAILED;
      }
   }

   merge(other) {
      this.passed += other.passed;
      this.pending += other.pending;
      this.state = Math.min(this.state, other.state);
   }

   result() {
      return this.state;
   }
};

const test = (list, grade, rule, outer = null) => {
   const ctx = rule.count ? new TestContext() : outer;
   if (rule.spans) {
      for (const span of rule.spans) {
         test(list, grade, span, ctx);
      }
   } else {
      for (const v of list.slice(rule.first, rule.last + 1).flatMap(id => grade.getForTest(id))) {
         ctx.add(v);
      }
   }
   if (rule.count) {
      ctx.limit(rule.count, rule.saturates);
      if (outer === null) {
         return ctx.result();
      }
      outer.merge(ctx);
   }
};

const CalcContext = class {
   constructor(weight) {
      this.data = [];
      this.weight = weight;
      this.half = null;
   }

   add(v, credit = v.subject.credit, weight = this.weight) {
      if (!Number.isInteger(credit)) {
         credit = Math.trunc(credit);
         this.addHalf(v);
      }
      this.addFixed(v, credit, weight);
   }

   addHalf(v) {
      if (this.half) {
         const u = this.half;
         this.half = null;
         const pair = [u, v];
         pair.score = u.score + v.score;
         this.addFixed(pair, 1.0, this.weight);
      } else {
         this.half = v;
      }
   }

   addFixed(v, credit, weight) {
      const i = this.data.findIndex(x => x[2] < weight || x[2] === weight && x[0].score < v.score);
      this.data.splice(i === -1 ? this.data.length : i, 0, [v, credit, weight]);
   }

   limit(count, rest) {
      let credit = 0;
      for (let i = 0; i < this.data.length; ++i) {
         const [v, c, w] = this.data[i];
         if (credit + c >= count) {
            this.data[i] = [v, count - credit, w];
            if (credit + c > count) {
               rest?.addFixed(v, c + credit - count, rest.weight)
            }
            for (const [v, c, ] of this.data.splice(i + 1)) {
               rest?.addFixed(v, c, rest.weight);
            }
            if (this.half) {
               rest?.addHalf(this.half);
               this.half = null;
            }
            return;
         }
         credit += c;
      }
      if (this.half) {
         this.addFixed(this.half, 0.5, this.weight);
         this.half = null;
      }
   }

   merge(other) {
      for (const [v, c, w] of other.data) {
         this.addFixed(v, c, w);
      }
   }

   result() {
      const sum = this.data
         .reduce((s, [v, c, w]) => s + Math.round(100 * w * c * v.score), 0) / 100;
      return [sum, this.data];
   }
};

const calc = (list, grade, rule, outer = null, unweighted = null) => {
   const ctx = rule.count ? new CalcContext(rule.weight ?? outer.weight) : outer;
   if (rule.spans) {
      for (const span of rule.spans) {
         calc(list, grade, span, ctx, unweighted ?? ctx);
      }
   } else {
      for (const v of list.slice(rule.first, rule.last + 1).flatMap(id => grade.getForCalc(id))) {
         ctx.add(v);
      }
   }
   if (rule.count) {
      ctx.limit(rule.count, rule.saturates ? unweighted : outer);
      if (outer === null) {
         return ctx.result();
      }
      outer.merge(ctx);
   }
};

const toeicScore = (max, score) => {
   if (score >= 800) {
      return max;
   }
   const a = max === 200 ? 2000 : 1000, b = max === 50 ? 158 : 79;
   return Math.ceil((score - 10) * a / b) / 100;
};

export
const evaluate = ({list, testRule, calcRule, toeic: toeicMax}, {common, subjects, toeic}) => {
   const state = test(list, new GradeList(common, subjects), testRule);
   const [sum, items] = calc(list, new GradeList(common, subjects), calcRule);
   return {state, sum, items, toeic: toeicScore(toeicMax, toeic)};
};
