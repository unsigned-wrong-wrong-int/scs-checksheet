let data;

const setup = async () => {
   data = await (await fetch("./data/data.json")).json();

   initPartitionList();
};

const initPartitionList = () => {
   const partitons = document.getElementById("partitions");
   partitons.append(...data.table.map(({name}, index) => {
      const row = document.createElement("tr");
      row.addEventListener("click", () => createCheckSheet(index));
      const nameCell = document.createElement("td");
      nameCell.innerText = name;
      const stateCell = document.createElement("td");
      stateCell.innerText = "―";
      const scoreCell = document.createElement("td");
      scoreCell.innerText = "0";
      row.append(nameCell, stateCell, scoreCell);
      return row;
   }));
};

const createRow = id => {
   const subject = data.subjects[id];
   const idCell = document.createElement("td");
   idCell.innerText = typeof id === "number" ? "" : id;
   const nameCell = document.createElement("td");
   nameCell.innerText = subject[0];
   const creditCell = document.createElement("td");
   creditCell.innerText = subject[1] === 0 ? "" : subject[1];
   const cell1 = document.createElement("td");
   const cell2 = document.createElement("td");
   cell1.innerText = cell2.innerText = "0";
   const row = document.createElement("tr");
   row.append(cell1, cell2, idCell, nameCell, creditCell);
   return row;
};

const prependMin = (rows, min) => {
   let current = 0;
   for (const [index, n, ...sub] of min) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         const cell = document.createElement("td");
         cell.rowSpan = begin - current;
         cell.colSpan = 2;
         rows[current].prepend(cell);
      }
      if (sub.length > 0) {
         let current1 = begin;
         for (const [index1, m] of sub) {
            const [begin1, end1] = typeof index1 === "number" ? [index1, index1] : index1;
            if (current1 < begin1) {
               const cell = document.createElement("td");
               cell.rowSpan = begin1 - current1;
               rows[current1].prepend(cell);
            }
            {
               const cell = document.createElement("td");
               cell.rowSpan = end1 - begin1 + 1;
               cell.innerText = m < 0 ? `${-m}単位\nまで` : `${m}単位`;
               rows[begin1].prepend(cell);
            }
            current1 = end1 + 1;
         }
         if (current1 < end) {
            const cell = document.createElement("td");
            cell.rowSpan = end - current1 + 1;
            rows[current1].prepend(cell);
         }
      }
      {
         const cell = document.createElement("td");
         cell.rowSpan = end - current + 1;
         if (sub.length === 0) {
            cell.colSpan = 2;
         }
         cell.innerText = `${n}単位`;
         rows[begin].prepend(cell);
      }
      current = end + 1;
   }
   if (current < rows.length) {
      const cell = document.createElement("td");
      cell.rowSpan = rows.length - current;
      cell.colSpan = 2;
      rows[current].prepend(cell);
   }
};

const appendWeight = (rows, weight) => {
   let current = 0;
   for (const [index, w] of weight) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         const cell = document.createElement("td");
         cell.rowSpan = begin - current;
         rows[current].append(cell);
      }
      {
         const cell = document.createElement("td");
         cell.rowSpan = end - begin + 1;
         if (typeof w === "number") {
            cell.innerText = w.toFixed(1);
         } else {
            cell.innerText = w.map(v => v.toFixed(1)).join("\n");
         }
         rows[begin].append(cell);
      }
      current = end + 1;
   }
   if (current < rows.length) {
      const cell = document.createElement("td");
      cell.rowSpan = rows.length - current;
      rows[current].append(cell);
   }
};

const appendMax = (rows, max) => {
   let current = 0;
   for (const [index, n, ...sub] of max.slice(1)) {
      const [begin, end] = typeof index === "number" ? [index, index] : index;
      if (current < begin) {
         const cell = document.createElement("td");
         cell.rowSpan = begin - current;
         cell.colSpan = 2;
         rows[current].append(cell);
      }
      if (sub.length > 0) {
         let current1 = begin;
         for (const [index1, m] of sub) {
            const [begin1, end1] = typeof index1 === "number" ? [index1, index1] : index1;
            if (current1 < begin1) {
               const cell = document.createElement("td");
               cell.rowSpan = begin1 - current1;
               rows[current1].append(cell);
            }
            {
               const cell = document.createElement("td");
               cell.rowSpan = end1 - begin1 + 1;
               if (typeof m === "number") {
                  cell.innerText = `${m}単位`;
               } else {
                  cell.innerText = m.map(l => `${l}単位`).join("\n");
               }
               rows[begin1].append(cell);
            }
            current1 = end1 + 1;
         }
         if (current1 < end) {
            const cell = document.createElement("td");
            cell.rowSpan = end - current1 + 1;
            rows[current1].append(cell);
         }
      }
      {
         const cell = document.createElement("td");
         cell.rowSpan = end - begin + 1;
         if (sub.length === 0) {
            cell.colSpan = 2;
         }
         cell.innerText = `${n}単位`;
         rows[begin].append(cell);
      }
      current = end + 1;
   }
   if (current < rows.length) {
      const cell = document.createElement("td");
      cell.rowSpan = rows.length - current;
      cell.colSpan = 2;
      rows[current].append(cell);
   }
   {
      const cell = document.createElement("td");
      cell.rowSpan = 0;
      cell.innerText = `${max[0]}単位`;
      rows[0].append(cell);
   }
};

const createCheckSheet = index => {
   const {list, min, weight, max} = data.table[index];
   const rows = list.map(createRow);
   prependMin(rows, min);
   appendWeight(rows, weight);
   appendMax(rows, max);
   const table = document.getElementById("specified-subjects");
   while (table.firstChild)  {
      table.removeChild(table.firstChild);
   }
   table.append(...rows);
};

addEventListener("load", setup);
