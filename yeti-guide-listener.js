/**
 * Yeti Guide — Parent Page Listener
 * Add this script to your website to enable scroll/navigate actions from the yeti widget.
 * This script listens for postMessage from the yeti iframe and executes the actions.
 */
(function () {
  "use strict";

  window.addEventListener("message", function (e) {
    // Verify message is from yeti widget
    if (!e.data || e.data.type !== "yeti-guide") return;

    const action = e.data.action;
    if (!action) return;

    if (action.type === "scroll") {
      // Scroll to element by ID or class
      const target = action.target; // e.g., "#pricing" or ".hero"
      let element = null;

      if (target.startsWith("#")) {
        element = document.getElementById(target.slice(1));
      } else if (target.startsWith(".")) {
        element = document.querySelector(target);
      }

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        // Optional: highlight the element briefly
        element.style.transition = "box-shadow 0.3s";
        element.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.4)";
        setTimeout(() => {
          element.style.boxShadow = "";
        }, 1500);
      } else {
        console.warn("[Yeti Guide] Element not found:", target);
      }
    } else if (action.type === "navigate") {
      // Navigate to a different page
      const target = action.target; // e.g., "/pricing" or "/features"
      window.location.href = target;
    }
  });

  console.log("[Yeti Guide] Listener ready — widget can now guide visitors.");
})();
