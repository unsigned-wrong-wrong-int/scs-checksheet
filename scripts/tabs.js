const tabBar = document.getElementById("tab-bar");
const tabPage = document.getElementById("tab-page");
let tabList = null;

const TabBase = class {
   constructor(radio, content) {
      radio.addEventListener("change", () => this.activate());
      this.radio = radio;
      this.content = content;
   }

   activate() {
      if (tabList?.tab !== this) {
         for (let node = tabList; node !== null; node = node.next) {
            if (node.next?.tab === this) {
               node.next = node.next.next;
               break;
            }
         }
         tabList = {tab: this, next: tabList};
      }
      tabPage.firstElementChild.replaceWith(this.content);
   }
};

export
const PinnedTab = class extends TabBase {
   constructor(id, content) {
      const radio = document.getElementById("tab-" + id);
      super(radio, content);
      radio.click();
   }
};

export
const Tab = class extends TabBase {
   constructor(id, title, content) {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "tab";
      radio.id = "tab-" + id;
      const label = document.createElement("label");
      label.htmlFor = "tab-" + id;
      const text = document.createElement("span");
      text.textContent = title;
      const close = document.createElement("button");
      close.textContent = "×";
      close.addEventListener("click", () => this.close());
      label.append(text, close);
      super(radio, content);
      this.label = label;
   }

   open() {
      if (tabList.tab === this) return;
      let exists = false;
      for (let node = tabList; node !== null; node = node.next) {
         if (node.next?.tab === this) {
            node.next = node.next.next;
            exists = true;
            break;
         }
      }
      if (!exists) {
         tabBar.append(this.radio, this.label);
      }
      this.radio.click();
   }

   close() {
      this.radio.checked = false;
      this.label.remove();
      this.radio.remove();
      if (tabList.tab === this) {
         tabList = tabList.next;
         tabList.tab.radio.click();
      } else {
         for (let node = tabList; node !== null; node = node.next) {
            if (node.next?.tab === this) {
               node.next = node.next.next;
               break;
            }
         }
      }
   }
};
