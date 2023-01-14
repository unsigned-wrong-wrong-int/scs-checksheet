let data;

const setup = async () => {
   data = await (await fetch("./data/data.json")).json();

   initSubjectList();
   initPartitionList();
};

const newElem = (tag, attrs, children) => {
   const elem = document.createElement(tag);
   for (const [key, value] of Object.entries(attrs)) {
      elem[key] = value;
   }
   if (children !== undefined) {
      elem.append(...children);
   }
   return elem;
};

const initSubjectList = () => {
   const select = newElem("select", {
      innerHTML: "<option>履修中</option><option>修得</option><option>未修得</option>",
   });
   const common = document.getElementById("common-subjects");
   common.append(...data.common.map(id => {
      const [name, credit] = data.subjects[id];
      return newElem("tr", {}, [
         newElem("td", {innerText: name}),
         newElem("td", {innerText: credit}),
         newElem("td", {}, [select.cloneNode(true)])
      ]);
   }));
};

const initPartitionList = () => {
   const partitons = document.getElementById("partitions");
   partitons.append(...data.table.map(({name}, index) => {
      const row = newElem("tr", {}, [
         newElem("td", {innerText: name}),
         newElem("td", {innerText: "―"}),
         newElem("td", {innerText: "0"}),
      ]);
      row.addEventListener("click", () => createCheckSheet(index));
      return row;
   }));
};

const createRow = id => {
   const subject = data.subjects[id];
   const row = newElem("tr", {}, [
      newElem("td", {innerText: "0"}),
      newElem("td", {innerText: "0"}),
      newElem("td", {innerText: typeof id === "number" ? "" : id}),
      newElem("td", {innerText: subject[0]}),
      newElem("td", {innerText: subject[1] === 0 ? "" : subject[1]}),
   ]);
   return row;
};

const prependMin = (rows, min) => {
   let current = 0;
   for (const [index, n, ...sub] of min) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         rows[current].prepend(newElem("td", {
            rowSpan: begin - current,
            colSpan: 2,
         }));
      }
      if (sub.length > 0) {
         let current1 = begin;
         for (const [index1, m] of sub) {
            const [begin1, end1] = typeof index1 === "number" ? [index1, index1] : index1;
            if (current1 < begin1) {
               rows[current1].prepend(newElem("td", {
                  rowSpan: begin1 - current1,
               }));
            }
            rows[begin1].prepend(newElem("td", {
               rowSpan: end1 - begin1 + 1,
               innerText: m < 0 ? `${-m}単位\nまで` : `${m}単位`,
            }));
            current1 = end1 + 1;
         }
         if (current1 < end) {
            rows[current1].prepend(newElem("td", {
               rowSpan: end - current1 + 1,
            }));
         }
      }
      rows[begin].prepend(newElem("td", {
         rowSpan: end - current + 1,
         colSpan: sub.length === 0 ? 2 : 1,
         innerText: `${n}単位`,
      }));
      current = end + 1;
   }
   if (current < rows.length) {
      rows[current].prepend(newElem("td", {
         rowSpan: rows.length - current,
         colSpan: 2,
      }));
   }
};

const appendWeight = (rows, weight) => {
   let current = 0;
   for (const [index, w] of weight) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         rows[current].append(newElem("td", {
            rowSpan: begin - current,
         }));
      }
      rows[begin].append(newElem("td", {
         rowSpan: end - begin + 1,
         innerText: typeof w === "number" ? w.toFixed(1) : w.map(v => v.toFixed(1)).join("\n"),
      }));
      current = end + 1;
   }
   if (current < rows.length) {
      rows[current].append(newElem("td", {
         rowSpan: rows.length - current,
      }));
   }
};

const appendMax = (rows, max) => {
   let current = 0;
   for (const [index, n, ...sub] of max.slice(1)) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         rows[current].append(newElem("td", {
            rowSpan: begin - current,
            colSpan: 2,
         }));
      }
      if (sub.length > 0) {
         let current1 = begin;
         for (const [index1, m] of sub) {
            const [begin1, end1] = typeof index1 === "number" ? [index1, index1] : index1;
            if (current1 < begin1) {
               rows[current1].append(newElem("td", {
                  rowSpan: begin1 - current1,
               }));
            }
            rows[begin1].append(newElem("td", {
               rowSpan: end1 - begin1 + 1,
               innerText: typeof m === "number" ? `${m}単位` : m.map(l => `${l}単位`).join("\n"),
            }));
            current1 = end1 + 1;
         }
         if (current1 < end) {
            rows[current1].append(newElem("td", {
               rowSpan: end - current1 + 1,
            }));
         }
      }
      rows[begin].append(newElem("td", {
         rowSpan: end - begin + 1,
         colSpan: sub.length === 0 ? 2 : 1,
         innerText: `${n}単位`
      }));
      current = end + 1;
   }
   if (current < rows.length) {
      rows[current].append(newElem("td", {
         rowSpan: rows.length - current,
         colSpan: 2,
      }));
   }
   rows[0].append(newElem("td", {
      rowSpan: rows.length,
      innerText: `${max[0]}単位`,
   }));
};

const createCheckSheet = index => {
   const {list, min, weight, max} = data.table[index];
   const rows = list.map(createRow);
   prependMin(rows, min);
   appendWeight(rows, weight);
   appendMax(rows, max);
   const table = document.getElementById("specified-subjects");
   table.replaceChildren(...rows);
};

addEventListener("load", setup);
