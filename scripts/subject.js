export
const SUBJ_ALL = 1,
      SUBJ_HUMAN = 2,
      SUBJ_ESYS = 4,
      SUBJ_INTRO = 8,
      SUBJ_NURSE = 16,
      SUBJ_MED = 32,
      SUBJ_FALL_C = 64,
      SUBJ_PE_SPR_FALL = 128,
      SUBJ_ENG_SPR = 256,
      SUBJ_ENG_SPR_FALL = 512,
      SUBJ_INFO = 1024;

const subject = (id, [name, credit, flags, id_n = id]) =>
   ({id, name, credit, flags, id_n});

const commonSubject = ([name, credit, flags]) =>
   ({id: "", name, credit, flags, id_n: ""});

export
const SubjectDict = class {
   constructor(common, all, special) {
      this.common = common.map(s => commonSubject(s));
      this.all = new Map(Object.entries(all).map(([id, s]) => [id, subject(id, s)]));
      this.special = new Map(Object.entries(special)
         .map(([id, [name, credit]]) => [+id, {name, credit}]));
   }

   get(id) {
      return this.all.get(id);
   }

   getSpecial(id) {
      return this.special.get(id);
   }

   *common() {
      yield* this.common;
   }
}

export
const STATE_FAIL = 0,
      STATE_CURR = 1,
      STATE_PASS = 2;

export
const GradeList = class {
   #list = [];

   add(subject, isLastYear) {
      const beforeFallC = isLastYear || (subject.flags & SUBJ_FALL_C) === 0;
      const v = {subject, beforeFallC, score: null, state: STATE_CURR};
      this.#list.splice(this.#list.findIndex(u => u.subject.id > subject.id), 0, v);
      return v;
   }

   remove(v) {
      this.#list.splice(this.#list.indexOf(v), 1);
   }

   getByCredit(id_n) {
      return this.#list
         .filter(v => v.subject.id_n === id_n && v.state !== STATE_FAIL)
         .reduce((x, v) => x?.state <= v.state ? v : x, null);
   }

   getByScore(id_n) {
      return this.#list
         .filter(v => v.subject.id_n === id_n)
         .reduce((x, v) => +x?.score <= +v.score ? v : x, null);
   }

   collect(flags) {
      return [...this.#list
         .filter(v => v.beforeFallC && (v.subject.flags & flags) === flags)
         .reduce((m, v) =>
            !m.has(v.subject.id_n) || +m.get(v.subject.id_n).score <= +v.score
               ? m.set(v.subject.id_n, v) : m
         , new Map())
         .values()];
   }

   get length() {
      return this.#list.length;
   }

   *[Symbol.iterator]() {
      yield* this.#list;
   }

   toJSON() {
      return this.#list;
   }
};
