const subject = (id, [name, credit, fallC, flags, id_n = id]) =>
   ({id, name, credit, flags: flags, isFallC: fallC !== 0, id_n});

const commonSubject = ([name, credit, flags]) =>
   ({id: flags, name, credit, flags, id_n: flags});

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
         rule.spans.push(buildRule(data[i]));
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

const transform = (key, value) => {
   switch (key) {
   case "common":
      return value.map(s => commonSubject(s));
   case "subjects":
      return new Map(Object.entries(value).map(([id, s]) => [id, subject(id, s)]));
   case "special":
      return new Map(Object.entries(value).map(([id, [name, credit]]) => [+id, {name, credit}]));
   case "test":
   case "calc":
      return buildRule(value);
   default:
      return value;
   }
};

const cache = new Map();

export
const fetchData = async year => {
   year = Number(year);
   if (cache.has(year)) {
      return cache.get(year);
   }
   const data = JSON.parse(await (await fetch(`../data/${year}.json`)).text(), transform);
   cache.set(year, data);
   return data;
};
