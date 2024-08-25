const data = await (await fetch(new URL("../data/data.json", import.meta.url))).json();

const internal = {
   flags: new Symbol("flags"),
   code: new Symbol("code"),
   status: new Symbol("status"),
   score: new Symbol("score"),
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
const subjects = new Map(Object.entries(data.subjects).map(([id, info]) => [id, new Subject(id, info)]));
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
      return list.splice(1);
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
      this.#groups = data.categories.map(([flag]) => new ResultGroup(flag));
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

   update(record) {
      const result = this.#map.get(record.subject[internal.code]);
      result.update();
      this.#groups.forEach(group => group.update(result, record));
   }

   [Symbol.iterator]() {
      return this.#all[Symbol.iterator]();
   }
};
