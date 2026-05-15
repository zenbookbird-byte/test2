/* Slipstream popup logic. */
(function () {
  const DATA = window.SLIP_DATA || { wallets: [], index: {} };
  const $ = (id) => document.getElementById(id);

  let settings = { enabled: true, highlightSmart: true };
  let labels = {};

  const TYPE_COLOR = {
    "smart-money": "#34d399", "kol": "#22d3ee", "sniper": "#818cf8",
    "contrarian": "#94a3b8", "fresh": "#fbbf24", "danger": "#f87171", "custom": "#a78bfa",
  };

  function usd(n, sign) {
    if (n == null) return "";
    const s = sign && n > 0 ? "+" : "";
    const a = Math.abs(n);
    if (a >= 1e6) return s + "$" + (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return s + "$" + (n / 1e3).toFixed(1) + "k";
    return s + "$" + n;
  }
  const short = (a) => a.slice(0, 5) + "…" + a.slice(-4);
  const norm = (a) => a.trim().toLowerCase();

  function load() {
    chrome.storage.local.get(["slip_settings", "slip_labels"], (r) => {
      if (r.slip_settings) settings = Object.assign(settings, r.slip_settings);
      labels = r.slip_labels || {};
      render();
    });
  }

  function render() {
    $("enabled").checked = settings.enabled;
    $("stat-db").textContent = DATA.wallets.length;
    $("stat-mine").textContent = Object.keys(labels).length;
    renderMine();
    renderDb();
  }

  function renderMine() {
    const keys = Object.keys(labels);
    $("mine-count").textContent = keys.length;
    const list = $("mine-list");
    list.innerHTML = "";
    if (!keys.length) {
      list.innerHTML = '<div class="pop-empty">No personal labels yet. Add one above, or click any badge on a page.</div>';
      return;
    }
    keys.forEach((k) => {
      const l = labels[k];
      const row = document.createElement("div");
      row.className = "pop-row";
      row.innerHTML =
        '<span class="pop-dot" style="background:#a78bfa"></span>' +
        '<div class="pop-row-main"><div class="pop-row-name">' + escapeHtml(l.label) + "</div>" +
        '<div class="pop-row-meta">' + escapeHtml(short(k)) +
        (l.note ? " · " + escapeHtml(l.note) : "") + "</div></div>" +
        '<button class="pop-del" title="Remove">&times;</button>';
      row.querySelector(".pop-del").addEventListener("click", () => {
        delete labels[k];
        chrome.storage.local.set({ slip_labels: labels }, render);
      });
      list.appendChild(row);
    });
  }

  function renderDb() {
    const list = $("db-list");
    list.innerHTML = "";
    DATA.wallets.forEach((w) => {
      const color = TYPE_COLOR[w.type] || "#a78bfa";
      const row = document.createElement("div");
      row.className = "pop-row";
      const pnlCls = (w.pnl30d || 0) >= 0 ? "c-good" : "c-bad";
      row.innerHTML =
        '<span class="pop-dot" style="background:' + color + '"></span>' +
        '<div class="pop-row-main"><div class="pop-row-name">' + escapeHtml(w.display) +
        (w.handle ? ' <span style="color:#7a869a;font-weight:400">' + escapeHtml(w.handle) + "</span>" : "") +
        "</div><div class=\"pop-row-meta\">" + escapeHtml(short(w.address)) + " · " + w.chain + "</div></div>" +
        '<span class="pop-row-pnl ' + pnlCls + '">' + (w.pnl30d != null ? usd(w.pnl30d, true) : "") + "</span>";
      list.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function validAddr(a) {
    return /^0x[a-fA-F0-9]{40}$/.test(a) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
  }

  /* events */
  $("enabled").addEventListener("change", (e) => {
    settings.enabled = e.target.checked;
    chrome.storage.local.set({ slip_settings: settings });
  });

  $("lbl-save").addEventListener("click", () => {
    const addr = $("lbl-addr").value.trim();
    const name = $("lbl-name").value.trim();
    const note = $("lbl-note").value.trim();
    const msg = $("lbl-msg");
    if (!validAddr(addr)) { msg.style.color = "#f87171"; msg.textContent = "That doesn't look like a valid address."; return; }
    if (!name) { msg.style.color = "#f87171"; msg.textContent = "Give the label a name."; return; }
    labels[norm(addr)] = { label: name, note: note };
    chrome.storage.local.set({ slip_labels: labels }, () => {
      msg.style.color = "#34d399";
      msg.textContent = "Saved — it'll show on every page.";
      $("lbl-addr").value = $("lbl-name").value = $("lbl-note").value = "";
      render();
      setTimeout(() => { msg.textContent = ""; }, 2500);
    });
  });

  $("open-demo").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("../demo/holders.html") });
  });

  load();
})();
