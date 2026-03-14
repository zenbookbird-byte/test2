const STORAGE_KEYS = {
  watchlist: "polytrack-pro-watchlist",
  notes: "polytrack-pro-notes"
};

const DATA_SOURCES = [
  { label: "embedded published data", type: "embedded" },
  { label: "local published JSON", type: "fetch", url: "./data/war_data.json" },
  { label: "local api", type: "fetch", url: "/api/data" },
  { label: "public published JSON", type: "fetch", url: "https://raw.githubusercontent.com/zenbookbird-byte/test/gh-pages/data/war_data.json" }
];

const state = {
  markets: [],
  wallets: [],
  signals: [],
  topOnly: false,
  selectedMarketId: null,
  watchlist: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.watchlist) || "[]")),
  notes: JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || "{}"),
  sourceLabel: "",
  generatedAt: ""
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function setDataStatus(text) {
  document.getElementById("dataStatus").textContent = text;
}

function setLastUpdated(text) {
  document.getElementById("lastUpdated").textContent = text;
}

function saveWatchlist() {
  localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify([...state.watchlist]));
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
}

function isValidEthAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function marketUrlFromTitle(title) {
  return `https://polymarket.com/search?q=${encodeURIComponent(title || "")}`;
}

function walletUrl(address) {
  return `https://polygonscan.com/address/${address}`;
}

function computeEdge(market) {
  const base = (1 - (market.yesPrice || 0)) * 100;
  const signalBoost = market.wallets * 5;
  const volumeBoost = Math.min(12, Math.log10((market.volume || 1) + 1) * 2);
  return Math.max(0, +(base + signalBoost + volumeBoost).toFixed(1));
}

function marketMapById() {
  return new Map(state.markets.map(market => [market.id, market]));
}

function normalizeData(raw) {
  const signalSource = raw.t50_signals?.length ? raw.t50_signals : (raw.mp_signals || []);
  const marketById = new Map();

  const markets = (raw.markets || []).map(market => {
    const normalized = {
      id: market.id,
      title: market.title,
      slug: market.slug || "",
      url: marketUrlFromTitle(market.title),
      yesPrice: Number(market.yes_price ?? 0),
      volume: Number(market.volume ?? 0),
      open: !market.closed,
      wallets: signalSource.filter(signal => signal.marketTitle === market.title).reduce((max, signal) => Math.max(max, Number(signal.walletCount || 0)), 0),
      thesis: Number(market.yes_price ?? 0) >= 0.5 ? "momentum" : "meanRevert",
      catalyst: "Published market from the repo's generated Polymarket data."
    };
    marketById.set(normalized.id, normalized);
    return normalized;
  });

  const wallets = (raw.wallet_rows || [])
    .filter(wallet => isValidEthAddress(wallet.address))
    .filter(wallet => Number(wallet.net_pnl || 0) > 0)
    .filter(wallet => Number(wallet.profitable_exits || 0) > 0)
    .map(wallet => {
      const latestBet = wallet.latest_bets?.[0];
      const latestMarket = latestBet ? marketById.get(latestBet.market_id) : null;
      return {
        address: wallet.address,
        trades: Number(wallet.trades || 0),
        periodScore: Number(wallet.period_score || 0),
        winRate: Number(wallet.win_rate || 0),
        pnl: Number(wallet.net_pnl || 0),
        profitableExits: Number(wallet.profitable_exits || 0),
        totalExits: Number(wallet.total_exits || 0),
        recentBet: latestBet?.market_title || "No recent bet",
        recentBetUrl: latestMarket?.url || "",
        recentBetDate: latestBet?.date || "",
        grossIn: Number(wallet.gross_in || 0),
        grossOut: Number(wallet.gross_out || 0)
      };
    })
    .sort((a, b) => b.pnl - a.pnl);

  const signals = signalSource.map(signal => {
    const matchedMarket = markets.find(market => market.title === signal.marketTitle);
    return {
      title: signal.marketTitle,
      url: matchedMarket?.url || "",
      yesPrice: Number(signal.yesPrice || 0),
      ev: Number(signal.ev || 0),
      allocation: Number(signal.allocation || 0),
      walletCount: Number(signal.walletCount || 0),
      netProfit: Number(signal.netProfit || 0)
    };
  });

  return { markets, wallets, signals };
}

async function loadPublishedData() {
  setDataStatus("Loading published data...");

  for (const source of DATA_SOURCES) {
    try {
      let raw;

      if (source.type === "embedded") {
        raw = window.POLYTRACK_PUBLISHED_DATA;
        if (!raw) throw new Error("Embedded data missing");
      } else {
        const response = await fetch(source.url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        raw = await response.json();
      }

      const normalized = normalizeData(raw);
      if (!normalized.markets.length) throw new Error("No markets returned");

      state.markets = normalized.markets;
      state.wallets = normalized.wallets;
      state.signals = normalized.signals;
      state.sourceLabel = source.label;
      state.generatedAt = raw.generated_at || "";

      populateSimMarketOptions();
      if (!state.selectedMarketId || !state.markets.some(market => market.id === state.selectedMarketId)) {
        state.selectedMarketId = state.markets.find(market => market.open)?.id || state.markets[0]?.id || null;
      }

      setDataStatus(`Using ${source.label}`);
      setLastUpdated(`Generated: ${state.generatedAt ? new Date(state.generatedAt).toLocaleString() : "unknown"}`);
      refreshView();
      showToast("Published market data loaded.");
      return;
    } catch (error) {
      console.error(`Failed to load ${source.label}:`, error);
    }
  }

  setDataStatus("Published data unavailable");
  setLastUpdated("Last updated: failed to load data");
  state.markets = [];
  state.wallets = [];
  state.signals = [];
  refreshView();
  showToast("Could not load published data.");
}

function getFilteredMarkets() {
  const search = document.getElementById("marketSearch").value.trim().toLowerCase();
  const minVolume = Number(document.getElementById("minVolume").value || 0);
  const status = document.getElementById("marketStatus").value;
  const thesis = document.getElementById("thesisMode").value;
  const sortMode = document.getElementById("sortMode").value;

  const list = state.markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(search);
    const matchesVolume = market.volume >= minVolume;
    const matchesStatus =
      status === "all" ||
      (status === "open" && market.open) ||
      (status === "watched" && state.watchlist.has(market.id));
    const matchesThesis = thesis === "all" || market.thesis === thesis;
    return matchesSearch && matchesVolume && matchesStatus && matchesThesis;
  });

  list.sort((a, b) => {
    if (sortMode === "volume") return b.volume - a.volume;
    if (sortMode === "priceAsc") return a.yesPrice - b.yesPrice;
    if (sortMode === "priceDesc") return b.yesPrice - a.yesPrice;
    return computeEdge(b) - computeEdge(a);
  });

  return list;
}

function getFilteredWallets() {
  const walletSearch = document.getElementById("walletSearch").value.trim().toLowerCase();
  const minWinRate = Number(document.getElementById("minWinRate").value || 0);
  let list = state.wallets.filter(wallet =>
    wallet.winRate >= minWinRate &&
    wallet.address.toLowerCase().includes(walletSearch)
  );

  if (state.topOnly) list = list.slice(0, 5);
  return list;
}

function renderMetrics(filteredMarkets, filteredWallets) {
  const avgWin = filteredWallets.length
    ? filteredWallets.reduce((sum, wallet) => sum + wallet.winRate, 0) / filteredWallets.length
    : 0;
  const bestMarket = filteredMarkets[0];

  document.getElementById("metricOpen").textContent = filteredMarkets.filter(market => market.open).length;
  document.getElementById("metricOpenSub").textContent = bestMarket ? `Best edge: ${bestMarket.title}` : "No matching markets";
  document.getElementById("metricWallets").textContent = filteredWallets.length;
  document.getElementById("metricWalletSub").textContent = filteredWallets.length ? `${filteredWallets[0].address.slice(0, 10)}... leads by PnL` : "No valid wallet rows loaded";
  document.getElementById("metricWatchlist").textContent = state.watchlist.size;
  document.getElementById("metricWinRate").textContent = `${avgWin.toFixed(1)}%`;
  document.getElementById("headlineEdge").textContent = `${bestMarket ? computeEdge(bestMarket).toFixed(1) : "0.0"}%`;
}

function renderMarkets(filteredMarkets) {
  const grid = document.getElementById("marketsGrid");
  if (!filteredMarkets.length) {
    grid.innerHTML = '<div class="empty">No real markets match the current filters.</div>';
    return;
  }

  grid.innerHTML = filteredMarkets.map(market => {
    const edge = computeEdge(market);
    const watched = state.watchlist.has(market.id);
    return `
      <article class="market-card">
        <div class="market-top">
          <div class="chip ${edge >= 45 ? "hot" : edge >= 28 ? "" : "warn"}">${edge >= 45 ? "High Edge" : edge >= 28 ? "Tradeable" : "Watch"}</div>
          <button class="icon-btn" data-watch="${market.id}">${watched ? "Watching" : "Watch"}</button>
        </div>
        <h3>${market.title}</h3>
        <div class="muted tiny">${market.catalyst}</div>
        <div class="bar"><span style="width:${Math.max(2, market.yesPrice * 100)}%"></span></div>
        <div class="market-bottom">
          <div>
            <div class="price">${Math.round(market.yesPrice * 100)}c</div>
            <div class="muted tiny">${formatMoney(market.volume)} volume</div>
          </div>
          <div>
            <div class="score-pill">${market.wallets} signal wallets</div>
            <div class="muted tiny">${market.thesis === "momentum" ? "Momentum" : "Mean reversion"} thesis</div>
          </div>
        </div>
        <div class="hero-actions" style="margin-top:14px">
          <a class="btn" href="${market.url}" target="_blank" rel="noreferrer">Search Market</a>
          <button class="btn" data-select="${market.id}">Open in Notes</button>
          <button class="btn" data-sim="${market.id}">Simulate</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderChart(filteredMarkets) {
  const svg = document.getElementById("marketChart");
  if (!filteredMarkets.length) {
    svg.innerHTML = "";
    return;
  }

  const width = 640;
  const height = 220;
  const padding = 24;
  const points = filteredMarkets.slice(0, 8).map((market, index, list) => {
    const x = padding + (index * ((width - padding * 2) / Math.max(1, list.length - 1)));
    const y = height - padding - (market.yesPrice * (height - padding * 2));
    return { x, y };
  });

  const line = points.map(point => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${points[points.length - 1].x},${height - padding}`;
  const gridLines = [40, 90, 140, 190].map(y => `<line class="chart-grid" x1="18" y1="${y}" x2="622" y2="${y}"></line>`).join("");
  const dots = points.map(point => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join("");

  svg.innerHTML = `
    ${gridLines}
    <polygon class="chart-area" points="${area}"></polygon>
    <polyline class="chart-line" points="${line}"></polyline>
    ${dots}
  `;
}

function renderWallets(filteredWallets) {
  const body = document.getElementById("walletTableBody");
  document.getElementById("walletSummary").textContent = `${filteredWallets.length} verified wallet${filteredWallets.length === 1 ? "" : "s"}`;

  if (!filteredWallets.length) {
    body.innerHTML = '<tr><td colspan="6"><div class="empty">No valid wallet addresses with profitable history are available from the published data.</div></td></tr>';
    return;
  }

  body.innerHTML = filteredWallets.map(wallet => `
    <tr>
      <td><a class="wallet-id" href="${walletUrl(wallet.address)}" target="_blank" rel="noreferrer">${wallet.address}</a></td>
      <td>${wallet.trades}</td>
      <td><span class="score-pill">${"*".repeat(wallet.periodScore)}</span></td>
      <td class="${wallet.winRate >= 75 ? "up" : "muted"}">${wallet.winRate.toFixed(1)}%</td>
      <td class="${wallet.pnl >= 0 ? "up" : "down"}">${formatMoney(wallet.pnl)}</td>
      <td>${wallet.recentBetUrl ? `<a class="muted tiny" href="${wallet.recentBetUrl}" target="_blank" rel="noreferrer">${wallet.recentBet}</a>` : `<span class="muted tiny">${wallet.recentBet}</span>`}</td>
    </tr>
  `).join("");
}

function populateSimMarketOptions() {
  const simMarket = document.getElementById("simMarket");
  simMarket.innerHTML = state.markets.filter(market => market.open).map(market => `<option value="${market.id}">${market.title}</option>`).join("");
  if (!state.selectedMarketId && simMarket.options.length) state.selectedMarketId = simMarket.options[0].value;
  simMarket.value = state.selectedMarketId || simMarket.value;
}

function updateNotesPanel() {
  const market = marketMapById().get(state.selectedMarketId);
  document.getElementById("noteTitle").textContent = market ? market.title : "Select a market to write notes";
  document.getElementById("marketNote").value = market ? (state.notes[market.id] || "") : "";
}

function renderSimulator() {
  const market = marketMapById().get(document.getElementById("simMarket").value);
  const stake = Number(document.getElementById("simStake").value || 0);
  const target = Number(document.getElementById("simTarget").value || 0) / 100;

  if (!market || !stake || !target || !market.yesPrice) {
    document.getElementById("simResults").innerHTML = '<div class="empty">Enter a stake and target probability.</div>';
    return;
  }

  const shares = stake / market.yesPrice;
  const exitValue = shares * target;
  const profit = exitValue - stake;
  const breakEven = market.yesPrice * 100;

  document.getElementById("simResults").innerHTML = `
    <div class="result-box"><div class="muted tiny">Estimated shares</div><strong>${shares.toFixed(1)}</strong></div>
    <div class="result-box"><div class="muted tiny">Value at target</div><strong>${formatMoney(exitValue)}</strong></div>
    <div class="result-box"><div class="muted tiny">Projected PnL</div><strong class="${profit >= 0 ? "up" : "down"}">${formatMoney(profit)}</strong></div>
    <div class="result-box"><div class="muted tiny">Break-even probability</div><strong>${breakEven.toFixed(1)}%</strong></div>
  `;
}

function renderActivity(filteredMarkets, filteredWallets) {
  const list = document.getElementById("activityList");
  const items = [];
  const bestSignal = state.signals[0];

  if (filteredMarkets[0]) items.push(`Top live market: ${filteredMarkets[0].title} at ${Math.round(filteredMarkets[0].yesPrice * 100)}c.`);
  if (filteredWallets[0]) items.push(`Best verified wallet row: ${filteredWallets[0].address.slice(0, 12)}... at ${formatMoney(filteredWallets[0].pnl)} net PnL.`);
  if (bestSignal) items.push(`Top published signal: ${bestSignal.title} with EV ${bestSignal.ev.toFixed(3)} and ${bestSignal.walletCount} wallets.`);
  if (state.sourceLabel) items.push(`Current data source: ${state.sourceLabel}.`);

  list.innerHTML = items.length
    ? items.map(item => `<div class="activity-item"><div class="tiny">${item}</div></div>`).join("")
    : '<div class="empty">Insights appear here once published data is available.</div>';
}

function exportCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function refreshView() {
  const filteredMarkets = getFilteredMarkets();
  const filteredWallets = getFilteredWallets();
  renderMetrics(filteredMarkets, filteredWallets);
  renderMarkets(filteredMarkets);
  renderChart(filteredMarkets);
  renderWallets(filteredWallets);
  renderSimulator();
  renderActivity(filteredMarkets, filteredWallets);
}

function setSelectedMarket(marketId) {
  state.selectedMarketId = marketId;
  document.getElementById("simMarket").value = marketId;
  updateNotesPanel();
  renderSimulator();
}

function bindEvents() {
  document.querySelectorAll("#marketSearch, #walletSearch, #minVolume, #minWinRate, #marketStatus, #sortMode, #thesisMode")
    .forEach(node => node.addEventListener("input", refreshView));
  document.querySelectorAll("#marketStatus, #sortMode, #thesisMode")
    .forEach(node => node.addEventListener("change", refreshView));

  document.getElementById("marketsGrid").addEventListener("click", event => {
    const watchId = event.target.getAttribute("data-watch");
    const selectId = event.target.getAttribute("data-select");
    const simId = event.target.getAttribute("data-sim");

    if (watchId) {
      if (state.watchlist.has(watchId)) state.watchlist.delete(watchId);
      else state.watchlist.add(watchId);
      saveWatchlist();
      refreshView();
      showToast("Watchlist updated.");
    }

    if (selectId || simId) {
      setSelectedMarket(selectId || simId);
      showToast("Market selected.");
    }
  });

  document.getElementById("simMarket").addEventListener("change", event => setSelectedMarket(event.target.value));
  document.getElementById("simStake").addEventListener("input", renderSimulator);
  document.getElementById("simTarget").addEventListener("input", renderSimulator);

  document.getElementById("saveNoteBtn").addEventListener("click", () => {
    if (!state.selectedMarketId) return;
    state.notes[state.selectedMarketId] = document.getElementById("marketNote").value;
    saveNotes();
    document.getElementById("noteStatus").textContent = `Saved at ${new Date().toLocaleTimeString()}.`;
    showToast("Note saved.");
  });

  document.getElementById("clearNoteBtn").addEventListener("click", () => {
    if (!state.selectedMarketId) return;
    delete state.notes[state.selectedMarketId];
    saveNotes();
    updateNotesPanel();
    document.getElementById("noteStatus").textContent = "Note cleared.";
    showToast("Note removed.");
  });

  document.getElementById("exportWalletsBtn").addEventListener("click", () => {
    const rows = [["wallet", "trades", "period_score", "win_rate", "net_pnl", "recent_bet"], ...getFilteredWallets().map(wallet => [wallet.address, wallet.trades, wallet.periodScore, wallet.winRate, wallet.pnl, wallet.recentBet])];
    exportCsv("verified-wallets.csv", rows);
  });

  document.getElementById("exportWatchlistBtn").addEventListener("click", () => {
    const rows = [["market", "market_url", "yes_price", "volume", "edge_score"], ...state.markets.filter(market => state.watchlist.has(market.id)).map(market => [market.title, market.url, market.yesPrice, market.volume, computeEdge(market)])];
    exportCsv("watchlist.csv", rows);
  });

  document.getElementById("topWalletsBtn").addEventListener("click", () => {
    state.topOnly = !state.topOnly;
    document.getElementById("topWalletsBtn").textContent = state.topOnly ? "Show All Wallets" : "Top 5 Only";
    refreshView();
  });

  document.getElementById("focusHotBtn").addEventListener("click", () => {
    document.getElementById("sortMode").value = "edge";
    document.getElementById("minVolume").value = 2000000;
    document.getElementById("thesisMode").value = "all";
    refreshView();
    showToast("Focused on the strongest setups.");
  });

  document.getElementById("refreshBtn").addEventListener("click", () => {
    void loadPublishedData();
  });

  document.getElementById("loadLiveBtn").addEventListener("click", () => {
    void loadPublishedData();
  });
}

function startClock() {
  const clock = document.getElementById("clock");
  const update = () => {
    clock.textContent = `${new Date().toUTCString().slice(17, 25)} UTC`;
  };
  update();
  setInterval(update, 1000);
}

function init() {
  bindEvents();
  startClock();
  void loadPublishedData();
}

init();
