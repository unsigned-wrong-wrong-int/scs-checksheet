const {categories, subjects, specialSubjects, divisions} =
   await (await fetch(new URL("../data/data.json", import.meta.url))).json();

const year = 2024;
const url = "https://github.com/unsigned-wrong-wrong-int/scs-checksheet";

const getSubject = id => typeof id === "number" ? categories[id] : subjects[id];

divisions.forEach(division => {
   const {list, test, sum} = division;
   const testTbl = list.map(_ => []);
   const testRng = [test.at(0)?.[0] ?? 0, test.at(-1)?.[1] ?? -1];
   if (testRng[0] > 0) {
      testTbl[0].unshift([0, testRng[0] - 1, false]);
   }
   if (testRng[1] < list.length - 1) {
      testTbl[testRng[1] + 1].unshift([testRng[1] + 1, list.length - 1, false]);
   }
   for (const rule of test) {
      testTbl[rule[0]].unshift(rule);
   }
   testTbl.cols = Math.max(...testTbl.map(({length}) => length));
   const sumTbl = list.map(_ => []);
   const sumRng = [sum.at(0)?.[0] ?? 0, sum.at(-1)?.[1] ?? -1];
   if (sumRng[0] > 0) {
      sumTbl[0].push([0, sumRng[0] - 1, false]);
   }
   if (sumRng[1] < list.length - 1) {
      sumTbl[sumRng[1] + 1].push([sumRng[1] + 1, list.length - 1, false]);
   }
   for (const rule of sum) {
      if (Array.isArray(rule[0])) console.log(rule);
      sumTbl[rule[0]].push(rule);
   }
   sumTbl.cols = Math.max(...sumTbl.map(({length}) => length));
   Object.assign(division, {test: testTbl, sum: sumTbl});
});

const template = await(await fetch(new URL("./template.html", import.meta.url))).text();
const generated = eval("`" + template + "`").replace(/^(?: *<!---->\n| +)/gm, "");

Deno.writeTextFileSync(new URL("../index.html", import.meta.url), generated);
