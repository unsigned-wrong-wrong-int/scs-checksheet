import {STATE_FAIL, STATE_CURR, STATE_PASS} from "./subject";

const buildRule = data => {
   let rule = {};
   let i;
   if (typeof data[0] === "number") {
      rule.first = data[0];
      rule.last = data[1];
      i = 2;
   } else {
      rule.spans = [];
      for (i = 0; i < data.length && typeof data[i] !== "number"; ++i) {
         rule.spans.push(buildRule(data[i], proto));
      }
   }
   if (i < data.length) {
      rule.count = Math.abs(data[i]);
      rule.saturates = data[i] < 0;
      if (++i < data.length) {
         rule.weight = data[i];
      }
   }
   return rule;
};

const TestContext = class {
   constructor() {
      this.passed = 0;
      this.pending = 0;
      this.state = STATE_PASS;
   }

   add(v) {
      if (v.state === STATE_PASS) {
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
            ? Math.min(this.state, STATE_CURR) : STATE_FAIL;
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
      for (const id of list.slice(rule.first, rule.last + 1)) {
         for (const v of grade.getForTest(id)) {
            ctx.add(v);
         }
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
      for (const id of list.slice(rule.first, rule.last + 1)) {
         for (const v of grade.getForCalc(id)) {
            ctx.add(v);
         }
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

const partition = ({name, list, test, calc}) =>
   ({name, list, testRule: buildRule(test), calcRule: buildRule(calc)});
