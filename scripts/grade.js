import { fetchData } from "./data.js";

export
const STATE_FAILED = 0,
      STATE_PENDING = 1,
      STATE_PASSED = 2;

export
const grade = (subject, isLastYear) =>
   ({subject, isLastYear, score: null, state: STATE_PENDING});

const stateComp = (x, y) => {
   return Math.sign(x.state - y.state);
};

const scoreComp = (x, y) => {
   if (x.score === null) {
      return y.score === null ? 0 : -1;
   }
   return y.score === null ? 1 : Math.sign(x.score - y.score);
};

const SubjectGrade = class {
   constructor(item) {
      this.bestState = item;
      this.bestScore = item;
   }

   update(item) {
      if (stateComp(item, this.bestState) > 0) {
         this.bestState = item;
      }
      if (scoreComp(item, this.bestScore) > 0) {
         this.bestScore = item;
      }
   }
};

const collect = (common, subjects) => {
   const map = new Map(common.map(item => [item.subject.id, new SubjectGrade(item)]));
   for (const item of subjects) {
      const id = item.subject.id_n;
      if (map.has(id)) {
         map.get(id).update(item);
      } else {
         map.set(id, new SubjectGrade(item));
      }
   }
   const forTest = [], forCalc = [];
   for (const {bestState, bestScore} of map.values()) {
      if (bestState.state !== STATE_FAILED) {
         forTest.push(bestState);
      }
      if (bestScore.score !== null) {
         forCalc.push(bestScore);
      }
   }
   return [forTest, forCalc];
};

const GradeView = class {
   constructor(list) {
      this.list = list.slice();
   }

   take(id, noFallC) {
      const matches = typeof id === "number"
         ? noFallC
            ? item => (item.isLastYear || !item.subject.isFallC)
               && (item.subject.flags & id) === id
            : item => (item.subject.flags & id) === id
         : item => item.subject.id_n === id;
      const match = [], rest = [];
      for (const item of this.list) {
         (matches(item) ? match : rest).push(item);
      }
      this.list = rest;
      return match;
   }

   scanCredits(idList) {
      return idList.map(id =>
         this.take(id, false).reduce((a, item) => {
            a[item.state === STATE_PASSED ? 0 : 1] += item.subject.credit;
            return a;
         }, [0, 0])
      );
   }

   scanScores(idList) {
      return idList.map(id => this.take(id, true));
   }
};

const Test = class {
   constructor(list, rule, [states, ]) {
      this.credits = new GradeView(states).scanCredits(list);
      this.rule = rule;
      this.state = STATE_PASSED;
   }

   failed() {
      this.state = STATE_FAILED;
   }

   pending() {
      this.state = Math.min(this.state, STATE_PENDING);
   }

   runSpan(rule) {
      const credits = rule.spans?.map(span => this.runSpan(span))
         ?? this.credits.slice(rule.first, rule.last + 1);
      let [passed, pending] = credits.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
      if (rule.count) {
         if (rule.saturates) {
            passed = Math.min(passed, rule.count);
            pending = Math.min(pending, rule.count - passed);
         }
         if (passed < rule.count) {
            passed + pending < rule.count ? this.failed() : this.pending();
         }
      }
      return [passed, pending];
   }

   run() {
      this.runSpan(this.rule);
      return {state: this.state, credits: this.credits};
   }
};

const Buffer = class {
   constructor(weight, outer) {
      this.items = [];
      this.defaultWeight = weight ?? outer?.defaultWeight;
      this.outer = outer;
   }

   add(item, credit, weight = this.defaultWeight) {
      if (credit === 0 || weight === 0) {
         return;
      }
      this.items.push([item, credit, weight]);
   }

   flush(count, rest) {
      this.items.sort((x, y) => x[2] === y[2] ? y[0].score - x[0].score : y[2] - x[2]);
      let i = 0;
      for (let n = 0; i < this.items.length; ++i) {
         const [item, credit, weight] = this.items[i];
         if (n + credit >= count) {
            this.outer.add(item, count - n, weight);
            rest.add(item, n + credit - count);
            break;
         }
         this.outer.add(item, credit, weight);
         n += credit;
      }
      for (; i < this.items.length; ++i) {
         const [item, credit, ] = this.items[i];
         rest.add(item, credit);
      }
   }
};

const Calc = class {
   constructor(list, rule, [, scores]) {
      this.rule = rule;
      this.subjects = new GradeView(scores).scanScores(list);
      this.all = new Buffer(0);
   }

   runSpan(rule, outer) {
      const buf = rule.count ? new Buffer(rule.weight, outer) : outer;
      if (rule.spans) {
         rule.spans.forEach(span => this.runSpan(span, buf));
      } else {
         this.subjects.slice(rule.first, rule.last + 1).flat()
            .forEach(item => buf.add(item, item.subject.credit));
      }
      if (rule.count) {
         buf.flush(rule.count, rule.saturates ? this.all : outer);
      }
   }

   run() {
      this.runSpan(this.rule, this.all);
      const items = this.all.items;
      const sum = items.reduce((n, [{score}, credit, weight]) => n + score * credit * weight, 0);
      return {score: sum, items};
   }
};

const toeicScore = (max, score) => {
   if (max === undefined) {
      return {};
   }
   let result;
   if (score === null) {
      result = 0;
   } else if (score >= 800) {
      result = max;
   } else {
      result = Math.ceil((score - 10) * max * 10 / 79) / 100;
   }
   return {toeic: result};
};

const evaluate = (partition, grades, toeic) => {
   const result = {partition};
   const testResult = new Test(partition.list, partition.test, grades).run();
   const calcResult = new Calc(partition.list, partition.calc, grades).run();
   const toeicResult = toeicScore(partition.toeic, toeic.score);
   Object.assign(result, testResult);
   Object.assign(result, calcResult);
   Object.assign(result, toeicResult);
   return result;
};

export
const GradeData = class {
   constructor(year, data, common, subjects, toeic) {
      this.year = year;
      this.data = data;
      this.common = common;
      this.subjects = subjects;
      this.toeic = toeic;
      this.update();
   }

   update() {
      const grades = collect(this.common, this.subjects);
      this.partitions = this.data.partitions.map(p => evaluate(p, grades, this.toeic));
   }

   static async create(year) {
      const data = await fetchData(year);
      const common = data.common.map(s => grade(s, false));
      return new GradeData(year, data, common, [], {score: null});
   }

   toJSON() {
      return {
         year: this.year,
         common: this.common.map(({state}) => state),
         subjects: this.subjects.map(
            ({subject: {id, isLastYear}, score}) => [id, +isLastYear, score]),
         toeic: this.toeic.score,
      };
   }

   static async fromJSON(json) {
      const data = await fetchData(json.year);
      const common = json.common.map((state, i) => {
         const g = grade(data.common[i], false);
         g.state = state;
         return g;
      });
      const subjects = json.subjects.map(([id, isLastYear, score]) => {
         const g = grade(data.subjects.get(id), Boolean(isLastYear));
         g.score = score;
         if (score !== null) {
            g.state = score >= 60 ? STATE_PASSED : STATE_FAILED;
         }
         return g;
      });
      return new GradeData(json.year, data, common, subjects, {score: json.toeic});
   }
};
