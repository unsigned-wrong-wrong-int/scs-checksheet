const partitions = await (await fetch(new URL("../data/tables.json", import.meta.url))).json();
const {categories, subjects, specialSubjects} =
   await (await fetch(new URL("../data/data.json", import.meta.url))).json();

const year = 2024;
const url = "https://github.com/unsigned-wrong-wrong-int/scs-checksheet";

const getSubject = id => typeof id === "number" ? categories[id] : subjects[id];

const template = await(await fetch(new URL("./template.html", import.meta.url))).text();
const generated = eval("`" + template + "`").replace(/^(?: *<!---->\n| +)/gm, "");

Deno.writeTextFileSync(new URL("../index.html", import.meta.url), generated);
