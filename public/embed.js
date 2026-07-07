(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var planId = script.getAttribute("data-subflow-plan");
  if (!planId) {
    console.error("[Subflow] data-subflow-plan is required on the embed script tag.");
    return;
  }

  var baseUrl = script.src.replace(/\/embed\.js.*$/, "");
  var checkoutUrl = baseUrl + "/checkout/" + encodeURIComponent(planId);

  var email = script.getAttribute("data-subflow-email");
  var name = script.getAttribute("data-subflow-name");
  var phone = script.getAttribute("data-subflow-phone");
  var label = script.getAttribute("data-subflow-label") || "Subscribe";
  var mode = script.getAttribute("data-subflow-mode") || "modal";

  if (email) checkoutUrl += (checkoutUrl.indexOf("?") >= 0 ? "&" : "?") + "email=" + encodeURIComponent(email);
  if (name) checkoutUrl += (checkoutUrl.indexOf("?") >= 0 ? "&" : "?") + "name=" + encodeURIComponent(name);
  if (phone) checkoutUrl += (checkoutUrl.indexOf("?") >= 0 ? "&" : "?") + "phone=" + encodeURIComponent(phone);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.setAttribute("data-subflow-embed-button", planId);
  btn.style.cssText =
    "display:inline-flex;align-items:center;justify-content:center;" +
    "padding:0.625rem 1.25rem;font-family:ui-sans-serif,system-ui,sans-serif;" +
    "font-size:0.9375rem;font-weight:600;line-height:1.25;" +
    "color:#fff;background:#4f46e5;border:none;border-radius:0.625rem;" +
    "cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.08);";

  btn.onmouseover = function () {
    btn.style.background = "#4338ca";
  };
  btn.onmouseout = function () {
    btn.style.background = "#4f46e5";
  };

  function openModal() {
    var overlay = document.createElement("div");
    overlay.setAttribute("data-subflow-overlay", "1");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,0.55);" +
      "display:flex;align-items:center;justify-content:center;padding:1rem;";

    var frameWrap = document.createElement("div");
    frameWrap.style.cssText =
      "position:relative;width:100%;max-width:28rem;height:min(90vh,640px);" +
      "background:#fff;border-radius:0.75rem;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.25);";

    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "\u00d7";
    close.style.cssText =
      "position:absolute;top:0.5rem;right:0.5rem;z-index:2;width:2rem;height:2rem;" +
      "border:none;border-radius:9999px;background:rgba(15,23,42,0.08);cursor:pointer;" +
      "font-size:1.25rem;line-height:1;color:#334155;";

    var iframe = document.createElement("iframe");
    iframe.src = checkoutUrl;
    iframe.title = "Subflow checkout";
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";

    function dismiss() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    close.onclick = dismiss;
    overlay.onclick = function (e) {
      if (e.target === overlay) dismiss();
    };

    frameWrap.appendChild(close);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
  }

  btn.onclick = function () {
    if (mode === "redirect") {
      window.location.href = checkoutUrl;
    } else {
      openModal();
    }
  };

  script.parentNode.insertBefore(btn, script.nextSibling);
})();
