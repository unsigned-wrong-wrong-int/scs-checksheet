import { GradeData } from './grade.js';
import { CommonRecord, NewSubjectRecord, PartitionRecord, SubjectRecord, ToeicRecord,
   showList, showTable } from './ui.js';

const Main = class {
   constructor() {
      this.menuOpen = document.getElementById("menu-open");
      this.menuSave = document.getElementById("menu-save");
      this.menuInput = document.getElementById("menu-input");
      this.menuList = document.getElementById("menu-list");
      this.filePicker = document.getElementById("file-picker");
      this.fileLink = document.getElementById("file-link");
      this.pageName = document.getElementById("page-name");
      this.inputPage = document.getElementById("input");
      this.listPage = document.getElementById("list");
      this.sheetPage = document.getElementById("sheet");
      this.subjects = document.getElementById("subjects");
      this.partitions = document.getElementById("partitions");
      this.specified = document.getElementById("specified");
      this.details = document.getElementById("details");
      this.menuOpen.addEventListener("click", () => this.filePicker.click());
      this.filePicker.addEventListener("change", this.loadFile.bind(this));
      this.menuSave.addEventListener("click", this.saveFile.bind(this));
      this.menuInput.addEventListener("click", this.openInput.bind(this));
      this.menuList.addEventListener("click", this.openList.bind(this));
      this.active = this.inputPage;
   }

   bind(grade) {
      this.grade = grade;
      this.subjectsUI = [
         ...grade.common.map(s => new CommonRecord(s)),
         new ToeicRecord(grade.toeic),
         new NewSubjectRecord(grade.data.subjects, grade.subjects),
         ...grade.subjects.map(s => new SubjectRecord(s, grade.subjects)),
      ];
      const updateFn = () => void (this.changed = true);
      this.subjectsUI.forEach(s => s.onChange = updateFn);
      this.partitionsUI = [
         ...grade.partitions.map(p => new PartitionRecord(p)),
      ];
      const openFn = this.openSheet.bind(this);
      this.partitionsUI.forEach(p => p.onSelect = openFn);
      this.subjects.replaceChildren(...this.subjectsUI.map(({element}) => element));
      this.partitions.replaceChildren(...this.partitionsUI.map(({element}) => element));
      this.changed = true;
      this.openInput();
   }

   update() {
      if (!this.changed) {
         return;
      }
      this.changed = false;
      this.grade.update();
      for (let i = 0; i < this.grade.partitions.length; ++i) {
         this.partitionsUI[i].update(this.grade.partitions[i]);
      }
   }

   async init(year) {
      this.bind(await GradeData.create(year));
   }

   async loadFile() {
      const file = this.filePicker.files.item(0);
      if (!file) {
         return;
      }
      const content = JSON.parse(await file.text());
      this.bind(await GradeData.fromJSON(content));
   }

   async saveFile() {
      const content = JSON.stringify(this.grade);
      const blob = new Blob([content], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      this.fileLink.href = url;
      this.fileLink.click();
      URL.revokeObjectURL(url);
      this.fileLink.href = "";
   }

   openInput() {
      this.menuInput.disabled = true;
      this.menuList.disabled = false;
      this.active.classList.remove("active");
      this.pageName.innerText = "";
      this.pageName.classList.remove("opened");
      this.update();
      this.active = this.inputPage;
      this.active.classList.add("active");
      window.scrollTo(0, 0);
   }

   openList() {
      this.menuInput.disabled = false;
      this.menuList.disabled = true;
      this.active.classList.remove("active");
      this.pageName.innerText = "";
      this.pageName.classList.remove("opened");
      this.update();
      this.active = this.listPage;
      this.active.classList.add("active");
      window.scrollTo(0, 0);
   }

   openSheet(data) {
      this.menuInput.disabled = this.menuList.disabled = false;
      this.active.classList.remove("active");
      this.update();
      this.pageName.innerText = data.partition.name;
      this.pageName.classList.add("opened");
      showTable(this.specified, data, this.grade.data);
      showList(this.details, data);
      this.active = this.sheetPage;
      this.active.classList.add("active");
      window.scrollTo(0, 0);
   }
};

new Main().init(2022);
