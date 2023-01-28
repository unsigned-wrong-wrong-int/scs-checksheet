import { fetchData } from "./data.js";
import { STATE_FAILED, STATE_PASSED, STATE_PENDING, GradeData } from "./grade.js";

const make = (tag, attrs, children, events) => {
   const elem = document.createElement(tag);
   for (const [key, value] of Object.entries(attrs)) {
      elem[key] = value;
   }
   if (children !== undefined) {
      elem.append(...children);
   }
   if (events !== undefined) {
      for (const [name, callback] of Object.entries(events)) {
         elem.addEventListener(name, callback);
      }
   }
   return elem;
};

const select = state => make("select", {}, [
   make("option", {value: STATE_PENDING, innerText: "履修中", selected: state === STATE_PENDING}),
   make("option", {value: STATE_PASSED, innerText: "修得", selected: state === STATE_PASSED}),
   make("option", {value: STATE_FAILED, innerText: "未修得", selected: state === STATE_FAILED}),
]);

const common = ({subject: {name, credit}, state}) => make("tr", {}, [
   make("td", {innerText: name}),
   make("td", {innerText: credit}),
   make("td", {}, [select(state)]),
]);

const subject = ({subject: {id, name, credit}, state, score}) => make("tr", {}, [
   make("td", {innerText: id}),
   make("td", {innerText: name}),
   make("td", {innerText: credit}),
   make("td", {}, [select(state)]),
   make("input", {type: "number", min: "0", max: "100", value: score ?? ""}),
]);

const partition = ({partition: {name}, state, sum}) => make("tr", {}, [
   make("td", {innerText: name}),
   make("td", {innerText: {[STATE_PASSED]: "充足", [STATE_PENDING]: "仮充足", [STATE_FAILED]: "不足"}[state]}),
   make("td", {innerText: sum.toFixed(2)}),
]);

const details = ([{subject: {id, name}, score}, credit, weight]) => make("tr", {}, [
   make("td", {innerText: id}),
   make("td", {innerText: name}),
   make("td", {innerText: credit}),
   make("td", {innerText: weight.toFixed(1)}),
   make("td", {innerText: score}),
]);

const UI = class {
   constructor() {
      this.common = document.getElementById("common-subjects");
      this.subjects = document.getElementById("other-subjects");
      this.partitions = document.getElementById("partitions");
      this.specified = document.getElementById("specified-subjects");
      this.details = document.getElementById("score-details");
   }

   bind(grade) {
      grade.update();
      this.grade = grade;
      this.common.replaceChildren(...grade.common.map(common));
      this.subjects.replaceChildren(...grade.subjects.map(subject));
      this.partitions.replaceChildren(...grade.partitions.map(partition));
   }
};

const main = async () => {
   let ui = new UI();
   let data = await fetchData(2022);
   let grade = new GradeData(2022, data);
   ui.bind(grade);
};

main();
