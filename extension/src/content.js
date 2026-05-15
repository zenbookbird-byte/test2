/* Slipstream content script — the overlay engine.
 * Scans any page for on-chain addresses, then injects inline intel badges,
 * a rich hover card, and a floating HUD. Works both as an installed
 * extension content script and when included directly on a demo page. */
(function () {
  if (window.__slipstreamLoaded) return;
  window.__slipstreamLoaded = true;

  const DATA = window.SLIP_DATA || { wallets: [], index: {} };
  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  /* ---------- settings + custom labels ---------- */
  let settings = { enabled: true, highlightSmart: true };
  let customLabels = {}; // addr(lower) -> { label, note }

  function loadState() {
    return new Promise((resolve) => {
      if (hasChrome) {
        chrome.storage.local.get(["slip_settings", "slip_labels"], (r) => {
          if (r.slip_settings) settings = Object.assign(settings, r.slip_settings);
          if (r.slip_labels) customLabels = r.slip_labels;
          resolve();
        });
      } else {
        try {
          const s = JSON.parse(localStorage.getItem("slip_settings") || "null");
          const l = JSON.parse(localStorage.getItem("slip_labels") || "null");
          if (s) settings = Object.assign(settings, s);
          if (l) customLabels = l;
        } catch (e) {}
        resolve();
      }
    });
  }
  function saveLabels() {
    if (hasChrome) chrome.storage.local.set({ slip_labels: customLabels });
    else localStorage.setItem("slip_labels", JSON.stringify(customLabels));
  }
  if (hasChrome) {
    chrome.storage.onChanged.addListener((ch) => {
      if (ch.slip_settings) { settings = Object.assign(settings, ch.slip_settings.newValue || {}); apply(); }
      if (ch.slip_labels) { customLabels = ch.slip_labels.newValue || {}; rescanAll(); }
    });
  }

  /* ---------- address detection ---------- */
  const RE = /(0x[a-fA-F0-9]{40})|([1-9A-HJ-NP-Za-km-z]{32,44})/g;
  const key = (a) => a.toLowerCase();

  function lookup(addr) {
    const k = key(addr);
    const base = DATA.index[k];
    const custom = customLabels[k];
    if (!base && !custom) return null;
    if (base && custom) return Object.assign({}, base, { customLabel: custom.label, customNote: custom.note });
    if (base) return base;
    return {
      address: addr, chain: guessChain(addr), display: custom.label, handle: null,
      type: "custom", pnl30d: null, winRate: null, riskScore: null, tags: ["my-label"],
      customLabel: custom.label, customNote: custom.note, recent: [], sparkline: null, firstSeen: null,
    };
  }
  function guessChain(a) { return a.startsWith("0x") ? "EVM" : "SOL"; }

  /* ---------- formatting ---------- */
  function usd(n, sign) {
    if (n == null) return "—";
    const s = sign && n > 0 ? "+" : "";
    const abs = Math.abs(n);
    if (abs >= 1e6) return s + "$" + (n / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return s + "$" + (n / 1e3).toFixed(1) + "k";
    return s + "$" + n.toFixed(0);
  }
  const short = (a) => a.slice(0, 4) + "…" + a.slice(-4);

  const TYPE_META = {
    "smart-money": { label: "Smart money", cls: "slip-t-smart" },
    "kol": { label: "KOL", cls: "slip-t-kol" },
    "sniper": { label: "Sniper", cls: "slip-t-sniper" },
    "contrarian": { label: "Fade", cls: "slip-t-fade" },
    "fresh": { label: "Fresh wallet", cls: "slip-t-fresh" },
    "danger": { label: "High risk", cls: "slip-t-danger" },
    "custom": { label: "My label", cls: "slip-t-custom" },
  };

  function sparkSvg(data, w, h, color) {
    if (!data || !data.length) return "";
    const min = Math.min(...data), max = Math.max(...data), rng = Math.max(1, max - min);
    const step = w / (data.length - 1);
    const pts = data.map((v, i) => [i * step, h - ((v - min) / rng) * h]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<path d="' + d + " L" + w + "," + h + " L0," + h + ' Z" fill="' + color + '22"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.5"/></svg>';
  }

  /* ---------- the hover card (single shared node) ---------- */
  let card = null, cardHideTimer = null, cardAnchor = null;
  function ensureCard() {
    if (card) return card;
    card = document.createElement("div");
    card.className = "slip-card";
    card.addEventListener("mouseenter", () => clearTimeout(cardHideTimer));
    card.addEventListener("mouseleave", hideCard);
    document.body.appendChild(card);
    return card;
  }
  function hideCard() {
    cardHideTimer = setTimeout(() => { if (card) card.style.display = "none"; cardAnchor = null; }, 160);
  }
  function riskTone(r) { return r == null ? "" : r < 35 ? "slip-good" : r < 60 ? "slip-warn" : "slip-bad"; }

  function renderCard(w) {
    const tm = TYPE_META[w.type] || TYPE_META.custom;
    const sparkColor = (w.pnl30d || 0) >= 0 ? "#34d399" : "#f87171";
    const name = w.customLabel || w.display;
    const initials = (name || "?").trim()[0].toUpperCase();
    let html = "";
    html += '<div class="slip-card-head">';
    html += '<div class="slip-av">' + initials + "</div>";
    html += '<div class="slip-card-id"><div class="slip-card-name">' + esc(name) +
      (w.handle ? ' <span class="slip-mut">' + esc(w.handle) + "</span>" : "") + "</div>";
    html += '<div class="slip-row-chips"><span class="slip-pill ' + tm.cls + '">' + tm.label + "</span>" +
      '<span class="slip-pill slip-chain">' + w.chain + "</span>" +
      '<span class="slip-mono slip-mut">' + short(w.address) + "</span></div></div></div>";

    if (w.type !== "custom") {
      html += '<div class="slip-stats">';
      html += stat("PnL 30d", usd(w.pnl30d, true), (w.pnl30d || 0) >= 0 ? "slip-good" : "slip-bad");
      html += stat("Win rate", w.winRate != null ? w.winRate + "%" : "—", "");
      html += stat("Risk", w.riskScore != null ? w.riskScore + "/100" : "—", riskTone(w.riskScore));
      html += "</div>";
      html += '<div class="slip-spark">' + sparkSvg(w.sparkline, 244, 40, sparkColor) +
        '<span class="slip-mut slip-tiny">30d equity · ' + (w.trades30d || 0) + " trades · holds ~" +
        fmtHold(w.holdMins) + "</span></div>";
      if (w.recent && w.recent.length) {
        html += '<div class="slip-recent"><div class="slip-mut slip-tiny">RECENT</div>';
        w.recent.slice(0, 3).forEach((r) => {
          const buy = r.indexOf("BUY") === 0;
          html += '<div class="slip-trade"><span class="' + (buy ? "slip-good" : "slip-bad") +
            '">' + esc(r) + "</span></div>";
        });
        html += "</div>";
      }
    }
    if (w.tags && w.tags.length) {
      html += '<div class="slip-tags">';
      w.tags.forEach((t) => { html += '<span class="slip-tag">' + esc(t) + "</span>"; });
      html += "</div>";
    }
    if (w.customNote) html += '<div class="slip-note">“' + esc(w.customNote) + "”</div>";

    html += '<div class="slip-card-actions">';
    html += '<button class="slip-btn" data-act="label">' + (w.customLabel ? "Edit label" : "Add label") + "</button>";
    html += '<button class="slip-btn" data-act="copy">Copy address</button>';
    html += "</div>";
    html += '<div class="slip-card-foot">Slipstream' + (w.firstSeen ? " · first seen " + w.firstSeen : "") + "</div>";
    return html;
  }
  function fmtHold(m) {
    if (m == null) return "—";
    if (m < 60) return m + "m";
    if (m < 1440) return Math.round(m / 60) + "h";
    return Math.round(m / 1440) + "d";
  }
  function stat(label, val, tone) {
    return '<div class="slip-stat"><div class="slip-stat-l">' + label + '</div><div class="slip-stat-v ' +
      tone + '">' + val + "</div></div>";
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function showCard(anchor, w) {
    clearTimeout(cardHideTimer);
    const c = ensureCard();
    if (cardAnchor === anchor && c.style.display === "block") return;
    cardAnchor = anchor;
    c.innerHTML = renderCard(w);
    c.style.display = "block";
    c.querySelectorAll(".slip-btn").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.dataset.act === "copy") {
          navigator.clipboard && navigator.clipboard.writeText(w.address);
          b.textContent = "Copied ✓";
          setTimeout(() => { b.textContent = "Copy address"; }, 1200);
        } else if (b.dataset.act === "label") {
          promptLabel(w.address);
        }
      });
    });
    // position
    const r = anchor.getBoundingClientRect();
    const cw = c.offsetWidth, chh = c.offsetHeight;
    let left = r.left;
    let top = r.bottom + 8;
    if (left + cw > window.innerWidth - 12) left = window.innerWidth - cw - 12;
    if (left < 12) left = 12;
    if (top + chh > window.innerHeight - 12) top = r.top - chh - 8;
    c.style.left = Math.max(12, left) + "px";
    c.style.top = Math.max(12, top) + "px";
  }

  function promptLabel(addr) {
    const k = key(addr);
    const existing = customLabels[k] || {};
    const label = window.prompt("Slipstream — label for " + short(addr) + ":", existing.label || "");
    if (label === null) return;
    if (label.trim() === "") delete customLabels[k];
    else customLabels[k] = { label: label.trim(), note: existing.note || "" };
    saveLabels();
    rescanAll();
  }

  /* ---------- badge injection ---------- */
  function makeBadge(w) {
    const tm = TYPE_META[w.type] || TYPE_META.custom;
    const b = document.createElement("span");
    b.className = "slip-badge " + tm.cls;
    b.setAttribute("data-slip", "1");
    const name = w.customLabel || w.display;
    let txt = name;
    if (w.type !== "custom" && w.pnl30d != null) {
      txt += " · " + usd(w.pnl30d, true);
    }
    b.innerHTML = '<span class="slip-dot"></span><span class="slip-badge-txt">' + esc(txt) + "</span>";
    b.addEventListener("mouseenter", () => showCard(b, w));
    b.addEventListener("mouseleave", hideCard);
    b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); showCard(b, w); });
    return b;
  }

  // wrap a matched address inside a text node
  function decorateTextNode(node) {
    const text = node.nodeValue;
    RE.lastIndex = 0;
    let m, hits = [];
    while ((m = RE.exec(text))) {
      const addr = m[0];
      const w = lookup(addr);
      if (w) hits.push({ index: m.index, addr, w });
    }
    if (!hits.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    hits.forEach((h) => {
      if (h.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, h.index)));
      const wrap = document.createElement("span");
      wrap.className = "slip-addr-wrap";
      wrap.setAttribute("data-slip", "1");
      const addrSpan = document.createElement("span");
      addrSpan.className = "slip-addr";
      addrSpan.textContent = h.addr;
      addrSpan.addEventListener("mouseenter", () => showCard(addrSpan, h.w));
      addrSpan.addEventListener("mouseleave", hideCard);
      wrap.appendChild(addrSpan);
      wrap.appendChild(makeBadge(h.w));
      fragment.appendChild(wrap);
      cursor = h.index + h.addr.length;
    });
    if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode && node.parentNode.replaceChild(fragment, node);
  }

  // decorate anchors whose href carries a full address (truncated-text case)
  function decorateAnchors(root) {
    const anchors = root.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      if (a.hasAttribute("data-slip-done")) return;
      const href = a.getAttribute("href") || "";
      RE.lastIndex = 0;
      const m = RE.exec(href);
      if (!m) return;
      const w = lookup(m[0]);
      if (!w) return;
      a.setAttribute("data-slip-done", "1");
      a.classList.add("slip-anchor");
      const b = makeBadge(w);
      b.classList.add("slip-badge-inline");
      a.insertAdjacentElement("afterend", b);
    });
  }

  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
  function scan(root) {
    if (!settings.enabled) return;
    // text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || n.nodeValue.length < 32) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName) || p.closest("[data-slip]") || p.isContentEditable)
          return NodeFilter.FILTER_REJECT;
        RE.lastIndex = 0;
        return RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(decorateTextNode);
    // anchors
    decorateAnchors(root instanceof Element ? root : document.body);
    updateHud();
  }

  function rescanAll() {
    // remove existing decorations, then rescan
    document.querySelectorAll(".slip-addr-wrap").forEach((wrap) => {
      const t = document.createTextNode(wrap.querySelector(".slip-addr").textContent);
      wrap.parentNode && wrap.parentNode.replaceChild(t, wrap);
    });
    document.querySelectorAll(".slip-badge-inline").forEach((b) => b.remove());
    document.querySelectorAll("[data-slip-done]").forEach((a) => {
      a.removeAttribute("data-slip-done");
      a.classList.remove("slip-anchor");
    });
    scan(document.body);
  }

  /* ---------- floating HUD ---------- */
  let hud = null;
  function ensureHud() {
    if (hud) return hud;
    hud = document.createElement("div");
    hud.className = "slip-hud";
    hud.innerHTML =
      '<div class="slip-hud-logo"></div>' +
      '<div class="slip-hud-body"><div class="slip-hud-title">Slipstream</div>' +
      '<div class="slip-hud-sub" id="slip-hud-sub">scanning…</div></div>' +
      '<button class="slip-hud-toggle" id="slip-hud-toggle"></button>';
    document.body.appendChild(hud);
    hud.querySelector("#slip-hud-toggle").addEventListener("click", () => {
      settings.enabled = !settings.enabled;
      if (hasChrome) chrome.storage.local.set({ slip_settings: settings });
      else localStorage.setItem("slip_settings", JSON.stringify(settings));
      apply();
    });
    return hud;
  }
  function updateHud() {
    const h = ensureHud();
    const wraps = document.querySelectorAll(".slip-addr-wrap, .slip-badge-inline");
    const smart = document.querySelectorAll(".slip-t-smart, .slip-t-kol").length;
    const danger = document.querySelectorAll(".slip-t-danger").length;
    const sub = h.querySelector("#slip-hud-sub");
    if (!settings.enabled) {
      sub.textContent = "overlay paused";
    } else {
      sub.innerHTML = wraps.length + " labeled · <b>" + smart + "</b> smart" +
        (danger ? ' · <b class="slip-bad">' + danger + " risky</b>" : "");
    }
    h.querySelector("#slip-hud-toggle").textContent = settings.enabled ? "Pause" : "Resume";
    h.classList.toggle("slip-hud-off", !settings.enabled);
  }

  function apply() {
    if (settings.enabled) {
      rescanAll();
    } else {
      document.querySelectorAll(".slip-addr-wrap").forEach((wrap) => {
        const t = document.createTextNode(wrap.querySelector(".slip-addr").textContent);
        wrap.parentNode && wrap.parentNode.replaceChild(t, wrap);
      });
      document.querySelectorAll(".slip-badge-inline").forEach((b) => b.remove());
      document.querySelectorAll("[data-slip-done]").forEach((a) => a.removeAttribute("data-slip-done"));
    }
    updateHud();
  }

  /* ---------- observe dynamic content ---------- */
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; if (settings.enabled) scan(document.body); }, 350);
  }
  function observe() {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.hasAttribute("data-slip") || node.closest("[data-slip]")) continue;
          if (/\bslip-/.test(node.className || "")) continue;
          schedule();
          return;
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- boot ---------- */
  loadState().then(() => {
    ensureHud();
    if (settings.enabled) scan(document.body);
    updateHud();
    observe();
    window.addEventListener("scroll", () => { if (card && card.style.display === "block") hideCard(); }, { passive: true });
  });
})();
