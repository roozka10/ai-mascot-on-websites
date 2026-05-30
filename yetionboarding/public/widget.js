/**
 * Yeti Guide — Embeddable Widget Loader
 * Usage: <script src="https://your-domain.com/widget.js" data-yeti="y_abc123" async></script>
 *
 * This tiny script creates an iframe that loads the full yeti widget
 * with the customer's personalized config fetched from Supabase.
 */
(function () {
  // Find our own script tag to read data-yeti
  var scripts = document.getElementsByTagName("script");
  var self = scripts[scripts.length - 1];
  var yetiId = self.getAttribute("data-yeti");

  if (!yetiId) {
    console.warn("[Yeti] Missing data-yeti attribute. Get your ID at yetigu.ide");
    return;
  }

  // The host where the widget assets are deployed
  var host = self.src.replace(/\/widget\.js.*$/, "");

  // Create the iframe container
  var container = document.createElement("div");
  container.id = "yeti-widget-container";
  container.style.cssText =
    "position:fixed;bottom:0;right:0;z-index:99999;pointer-events:none;width:100%;height:100%;";

  var iframe = document.createElement("iframe");
  iframe.src = host + "/widget/index.html?id=" + encodeURIComponent(yetiId) + "&embed=1";
  iframe.style.cssText =
    "position:absolute;bottom:0;right:0;width:400px;height:520px;border:none;background:transparent;pointer-events:auto;color-scheme:normal;";
  iframe.allow = "microphone";
  iframe.setAttribute("allowtransparency", "true");
  iframe.title = "Yeti Guide";

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Listen for resize and guide messages from the widget iframe.
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "yeti-resize") {
      iframe.style.width = e.data.width + "px";
      iframe.style.height = e.data.height + "px";
      return;
    }

    if (!e.data || e.data.type !== "yeti-guide" || !e.data.action) return;

    var action = e.data.action;
    if (action.type === "scroll" && action.target) {
      var target = action.target;
      var element = target.charAt(0) === "#"
        ? document.getElementById(target.slice(1))
        : document.querySelector(target);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.style.transition = "box-shadow 0.3s";
        element.style.boxShadow = "0 0 0 4px rgba(124, 91, 239, 0.28)";
        setTimeout(function () {
          element.style.boxShadow = "";
        }, 1500);
      }
    }

    if (action.type === "navigate" && action.target) {
      window.location.href = action.target;
    }
  });
})();
