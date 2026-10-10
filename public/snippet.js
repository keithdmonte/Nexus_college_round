// PATCHWORK snippet (Phase 0 stub): confirms it loads on the store.
(function () {
  var script = document.currentScript;
  var key = script && script.getAttribute("data-key");
  console.log("[PATCHWORK] snippet ran", { key: key });
})();
