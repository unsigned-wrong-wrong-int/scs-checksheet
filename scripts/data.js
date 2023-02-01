const subject = (id, [name, credit, fallC, flags, id_n = id]) =>
   ({id, name, credit, flags: flags, isFallC: fallC !== 0, id_n});

const commonSubject = (index, [name, credit, flags]) =>
   ({id: index, name, credit, flags, id_n: index});

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
      rule.first = rule.spans.at(0)?.first ?? -1;
      rule.last = rule.spans.at(-1)?.last ?? -1;
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
      return value.map((s, index) => commonSubject(index, s));
   case "subjects":
      return new Map(Object.entries(value).map(([id, s]) => [id, subject(id, s)]));
   case "special":
      return new Map(value.map(([flag, name, credit]) => [flag, {name, credit}]));
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
   const data = JSON.parse(await (await fetch(`../${year}.json`)).text(), transform);
   cache.set(year, data);
   return data;
};
