const tabList = document.getElementById("tablist");
const tabs = [...tabList.getElementsByClassName("tab")];
const panels = document.getElementById("panels");

const moveFocus = d => {
   const prev = tabs.findIndex(t => t.getAttribute("tabindex") === String(0));
   tabs[prev].setAttribute("tabindex", -1);

   let next;
   if (d > 0) {
      next = prev + 1 === tabs.length ? 0 : prev + 1;
   } else {
      next = prev === 0 ? tabs.length - 1 : prev - 1;
   }
   tabs[next].setAttribute("tabindex", 0);
   tabs[next].focus();
};

const select = newTab => {
   const tab = tabs.find(t => t.getAttribute("aria-selected") === String(true));
   const panel = panels.querySelector(`#${tab.getAttribute("aria-controls")}`);
   tab.setAttribute("aria-selected", false);
   panel.setAttribute("hidden", true);

   const newPanel = panels.querySelector(`#${newTab.getAttribute("aria-controls")}`);
   newTab.setAttribute("aria-selected", true);
   newPanel.removeAttribute("hidden");
};

tabList.addEventListener("keydown", e => {
   switch (e.code) {
   case "ArrowUp":
      moveFocus(-1);
      e.preventDefault();
      break;
   case "ArrowDown":
      moveFocus(1);
      e.preventDefault();
      break;
   default:
      break;
   }
});

for (const tab of tabs) {
   tab.addEventListener("click", e => select(e.currentTarget));
}
