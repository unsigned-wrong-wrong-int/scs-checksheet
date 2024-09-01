const data = await (await fetch(new URL("../data/data.json", import.meta.url))).json();

export
const year = data.year;

const internal = {
   flags: Symbol("flags"),
   code: Symbol("code"),
   status: Symbol("status"),
   score: Symbol("score"),
   index: Symbol("index"),
   weightX10: Symbol("weightX10"),
   take: Symbol("take"),
   apply: Symbol("apply"),
};

const Subject = class {
   #id;
   #name;
   #credits;
   #flags;
   #code;

   constructor(id, [name, credits, flags, code]) {
      this.#id = id;
      this.#name = name;
      this.#credits = credits;
      this.#flags = flags;
      this.#code = code;
   }

   get id() { return this.#id; }
   get name() { return this.#name; }
   get credits() { return this.#credits; }

   get [internal.flags]() { return this.#flags; }
   get [internal.code]() { return this.#code; }
};

export
const specialSubjects = data.specialSubjects.map(info => new Subject(info[3], info));
Object.freeze(specialSubjects);

export
const subjects = new Map(
   Object.entries(data.subjects).map(([id, info]) => [id, new Subject(id, info)]));
Object.freeze(subjects);

export
const Record = class {
   #subject;
   #year;
   #flags;
   #status;
   #score;

   constructor(subject, year, status, score) {
      this.#subject = subject;
      this.#year = year;
      this.#flags = subject[internal.flags];
      if (year !== null && year < thisYear) {
         this.#flags |= 1;
      }
      this.#status = status;
      this.#score = score;
   }

   get subject() { return this.#subject; }
   get year() { return this.#year; }
   get status() { return this.#status; }
   get score() { return this.#score; }

   get [internal.flags]() { return this.#flags; }
   set [internal.score](score) { this.#score = score; }
   set [internal.status](status) { this.#status = status; }
};

const Result = class {
   constructor(code) {
      this.code = code;
      this.all = [];
      this.valid = [];
      this.scored = [];
   }

   add(record) {
      this.all.push(record);
   }

   remove(record) {
      this.all.splice(this.all.indexOf(record), 1);
   }

   isEmpty() {
      return this.all.length === 0;
   }

   getWith(pred, flag, comp = null) {
      let list = this.all.filter(pred);
      if (flag) list = list.filter(({[internal.flags]: flags}) => (flags & flag) === flag);
      if (comp) list.sort(comp);
      return list.slice(0, 1);
   }

   getValid(flag) {
      return this.getWith(({status}) => status !== false, flag);
   }

   getScored(flag) {
      return this.getWith(({score}) => score !== null, flag, (a, b) => b.score - a.score);
   }

   update() {
      this.valid = this.getValid(0);
      this.scored = this.getScored(0);
   }
};

const ResultGroup = class {
   constructor(flag) {
      this.flag = flag;
      this.valid = [];
      this.scored = [];
   }

   update(result, record) {
      if ((record.flags & this.flag) !== this.flag) return;
      this.valid = this.valid.filter(({subject}) => subject.code !== result.code);
      this.valid.push(...result.getValid(this.flag));
      this.scored = this.scored.filter(({subject}) => subject.code !== result.code);
      this.scored.push(...result.getScored(this.flag));
   }
};

export
const RecordList = class {
   #all;
   #map;
   #groups;

   constructor() {
      this.#all = [];
      this.#map = new Map();
      this.#groups = data.categories.map(([, , flag]) => new ResultGroup(flag));
   }

   add(record) {
      this.#all.push(record);
      const code = record.subject[internal.code];
      const result = this.#map.get(code) ?? new Result(code);
      if (result.isEmpty()) {
         this.#map.set(code, result);
      }
      result.add(record);
      this.update(record);
   }

   remove(record) {
      this.#all.splice(this.#all.indexOf(record));
      const code = record.subject[internal.code];
      const result = this.#map.get(code);
      result.remove(record);
      this.update(record);
      if (result.isEmpty()) {
         this.#map.delete(code);
      }
   }

   setStatus(record, status) {
      record[internal.status] = status;
      this.update(record);
   }

   setScore(record, score) {
      record[internal.score] = score;
      this.update(record);
   }

   getValid(code) {
      return (typeof code === "string"
         ? this.#map.get(code) : this.#groups[code])?.valid ?? [];
   }

   getScored(code) {
      return (typeof code === "string"
         ? this.#map.get(code) : this.#groups[code])?.scored ?? [];
   }

   update(record) {
      const result = this.#map.get(record.subject[internal.code]);
      result.update();
      this.#groups.forEach(group => group.update(result, record));
   }

   get length() {
      return this.#all.length;
   }

   *[Symbol.iterator]() {
      yield *this.#all;
   }
};

const Item = class {
   #index;
   #record;
   #credits;
   #weightX10;

   constructor(index, record) {
      this.#index = index;
      this.#record = record;
      this.#credits = record.credits;
      this.#weightX10 = null;
   }

   get subject() { return this.#record.subject; }
   get status() { return this.#record.status; }
   get credits() { return this.#credits; }
   get weightX10() { return this.#weightX10; }
   get scoreX10() { return this.#weightX10 * this.#record.score; }

   get [internal.index]() { return this.#index; }
   set [internal.weightX10](weightX10) { this.#weightX10 = weightX10; }

   [internal.take](credits) {
      const rest = new Item(this.#index, this.#record);
      rest.#credits = this.#credits - credits;
      this.#credits = credits;
      return rest;
   }
};

const Op = class {
   #range;
   #func;
   #param;

   constructor(i, j, func, param) {
      this.#range = [i, j + 1];
      this.#func = func;
      this.#param = param;
   }

   [internal.apply](list, comp) {
      const span = list.slice(...this.#range);
      const items = span.flat().sort(comp);
      span.forEach(row => row.length = 0);
      return this.#func(span, items, this.#param);
   }
};

const TestOp = class extends Op {
   #true;
   #false;
   #status;

   [internal.apply](list) {
      const result = super[internal.apply](list,
         (a, b) => a.status === b.status ? 0 : a.status ? -1 : 1);
      this.#true = Object.freeze(result[true]);
      this.#false = Object.freeze(result[false]);
      this.#status = result.status;
      return this.#status;
   }

   get true() { return this.#true; }
   get false() { return this.#false; }
   get status() { return this.#status; }
};

const SumOp = class extends Op {
   #_20;
   #_10;
   #_1;
   #null;

   [internal.apply](list) {
      const result = super[internal.apply](list, (a, b) => b.score - a.score);
      this.#_20 = Object.freeze(result[20]);
      this.#_10 = Object.freeze(result[10]);
      this.#_1 = Object.freeze(result[1]);
      this.#null = Object.freeze(result[null]);
   }

   get 20() { return this.#_20; }
   get 10() { return this.#_10; }
   get 1() { return this.#_1; }
   get null() { return this.#null; }
};

const testMin = (list, items, credits) => {
   const result = {true: [], false: [], status: true};
   const strict = 0, any = 0;
   for (const item of items) {
      if (item.status) {
         strict += item.credits;
      }
      any += item.credits;
      list[item[internal.index]].push(item);
      result[true].push(item);
   }
   result.status = strict >= credits ? true : any >= credits ? null : false;
   return result;
};

const testMax = (list, items, credits) => {
   const result = {true: [], false: [], status: true};
   for (const item of items) {
      if (item.credits <= credits) {
         credits -= item.credits;
         list[item[internal.index]].push(item);
         result[true].push(item);
      } else if (credits > 0) {
         const rest = item[internal.take](credits);
         credits = 0;
         list[item[internal.index]].push(item);
         result[true].push(item);
         result[false].push(rest);
      } else {
         result[false].push(item);
      }
   }
   return result;
};

const sumWeight = (list, items, weightX10) => {
   const result = {20: [], 10: [], 1: [], null: []};
   for (const item of items) {
      if (item.weightX10 === null) {
         item[internal.weightX10] = weightX10;
      }
      list[item[internal.index]].push(item);
      result[item.weightX10].push(item);
   }
   return result;
};

const sumMax = (list, items, credits) => {
   const result = {20: [], 10: [], 1: [], null: []};
   for (const item of items) {
      if (item.credits <= credits) {
         credits -= item.credits;
         list[item[internal.index]].push(item);
         result[item.weightX10].push(item);
      } else if (credits > 0) {
         const rest = item[internal.take](credits);
         credits = 0;
         list[item[internal.index]].push(item, rest);
         result[item.weightX10].push(item);
         result[null].push(rest);
      } else {
         item[internal.weightX10] = null;
         list[item[internal.index]].push(item);
         result[null].push(item);
      }
   }
   return result;
};

export
const Division = class {
   #name;
   #abbr;
   #allot;
   #toeic;
   #exam;
   #intvw;
   #list;
   #test;
   #sum;
   #status;
   #score

   static all() {
      return Object.freeze(data.divisions.map(desc => new Division(desc)));
   }

   constructor({name, abbr, list, test, sum, allot, toeic, exam, intvw}) {
      this.#name = name;
      this.#abbr = abbr;
      this.#list = list;
      this.#allot = allot;
      this.#toeic = toeic;
      this.#exam = exam;
      this.#intvw = intvw;
      this.#test = Object.freeze(test.flatMap(([i, j, {min, max} = {}]) => {
         if (min) {
            return new TestOp(i, j, testMin, min);
         }
         if (max) {
            return new TestOp(i, j, testMax, max);
         }
         return [];
      }));
      this.#sum = Object.freeze(sum.flatMap(([i, j, {weight, max} = {}]) => {
         if (weight) {
            return new SumOp(i, j, sumWeight, weight * 10);
         }
         if (max) {
            return new SumOp(i, j, sumMax, max);
         }
         return [];
      }));
   }

   get name() { return this.#name; }
   get abbr() { return this.#abbr; }
   get allot() { return this.#allot; }
   get toeic() { return this.#toeic; }
   get exam() { return this.#exam; }
   get intvw() { return this.#intvw; }

   get test() { return this.#test; }
   get sum() { return this.#sum; }
   get status() { return this.#status; }
   get score() { return this.#score; }

   update(recordList) {
      const testList = this.#list.map((code, index) =>
         recordList.getValid(code).map(record => new Item(index, record)));
      let status = true;
      for (const op of this.#test) {
         switch (op[internal.apply](testList)) {
         case false:
            status = false;
            break;
         case null:
            status &&= null;
            break;
         default:
            break;
         }
      }
      const sumList = this.#list.map((code, index) =>
         recordList.getScored(code).map(record => new Item(index, record)));
      for (const op of this.#sum) {
         op[internal.apply](sumList);
      }
      let score = 0;
      for (const item of sumList.flat()) {
         if (item.weightX10) {
            score += item.score;
         }
      }
      score /= 10;
      this.#status = status;
      this.#score = score;
   }
};
