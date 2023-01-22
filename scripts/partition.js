import {STATE_FAIL, STATE_CURR, STATE_PASS} from "./subject";

const asPair = range => typeof range === "number" ? [range, range] : range;

const requirementSpan = (first, last, min = 0) =>
   min < 0 ? {first, last, limit: -min} : min > 0 ? {first, last, min} : {first, last};

const requirement = ([range, min, ...sub]) => {
   const [first, last] = asPair(range);
   const spans = [];
   let i = first;
   for (const [range, min] of sub) {
      const [first, last] = asPair(range);
      if (i < first) {
         spans.push(requirementSpan(i, first - 1));
      }
      spans.push(requirementSpan(first, last), min);
      i = last + 1;
   }
   if (i < last) {
      spans.push(requirementSpan(i, last));
   }
   return {first, last, spans, min};
};

const CheckContext = class {
   constructor(list, reqs, grade) {
      this.list = list;
      this.reqs = reqs;
      this.grade = grade;
      this.state = STATE_PASS;
   }

   result(state) {
      this.state = Math.min(this.state, state);
   }

   checkSpan(span) {
      let credit = 0, currCredit = 0;
      for (let i = span.first; i <= span.last; ++i) {
         const v = this.grade.getByCredit(this.list[i]);
         if (v === null || v.state === STATE_FAIL) {
            continue;
         }
         if (v.state === STATE_PASS) {
            credit += v.subject.credit;
         } else {
            currCredit += v.subject.credit;
         }
      }
      if (span.limit) {
         if (credit > span.limit) {
            credit = span.limit;
         }
         if (currCredit + credit > span.limit) {
            currCredit = span.limit - credit;
         }
      }
      if (span.min && credit < span.min) {
         if (credit + currCredit < span.min) {
            this.result(STATE_FAIL);
         } else {
            this.result(STATE_CURR);
         }
      } else {
         this.result(STATE_PASS);
      }
      return [credit, currCredit];
   }

   checkReq(req) {
      const [credit, currCredit] = req.spans.map(s => this.checkSpan(s))
         .reduce((a, b) => [a[0] + b[0], a[1] + b[1]]);
      if (credit < req.min) {
         if (credit + currCredit < req.min) {
            this.result(STATE_FAIL);
         } else {
            this.result(STATE_CURR);
         }
      } else {
         this.result(STATE_PASS);
      }
   }

   check() {
      this.reqs.forEach(r => this.checkReq(r));
      return this.state;
   }
};

const Partition = class {
   constructor({name, list, min, weight, max}) {
      this.name = name;
      this.list = list;
      this.reqs = min.map(requirement);
      // TODO: weight, max
   }

   state(grade) {
      const ctx = new CheckContext(this.list, this.reqs, grade);
      return ctx.check();
   }
};
