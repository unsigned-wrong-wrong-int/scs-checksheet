const partitions = await (await fetch(new URL("../data/tables.json", import.meta.url))).json();
const {categories, subjects} = await (await fetch(new URL("../data/data.json", import.meta.url))).json();

const year = 2024;
const url = "https://github.com/unsigned-wrong-wrong-int/scs-checksheet";

const getSubject = id => {
   if (typeof id === "number") {
      return categories[id];
   }
   return subjects[2023][id] ?? subjects[2022][id];
};

const template = await(await fetch(new URL("./template.html", import.meta.url))).text();
const generated = eval("`" + template + "`").replace(/^(?: *<!---->\n| +)/gm, "");

Deno.writeTextFileSync(new URL("../index.html", import.meta.url), generated);
