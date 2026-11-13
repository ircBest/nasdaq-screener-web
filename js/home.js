/* =========================================================
   메인 화면 — 시장 개요 · 종목 스크리너 (리뉴얼 2단계 · 2026-11-07)

   읽는 파일 (모두 기존 그대로 · 구조를 바꾸지 않는다)
     latest_signals.json  스크리너 표 (그날 신호 종목)
     data.json            스캔 · 관측 · 신호 수 (breakdown)
     sectors.json         S&P 500 · 기술 · 헬스케어 ETF 흐름 · 우리 범위 반도체 업종
     shake.json           흔들림 단계
     bsi.json             신호 뒤 평균 수익 (사후 기록)
     learning.json        연구 검증 진행 — 채점까지 끝난 판단 수 기준
     vix.json             아래 VIX 카드 (index.html 안의 기존 스크립트가 그린다)

   지키는 것
     · 계산식 · 문턱은 바꾸지 않는다. 화면에서 고르고 줄 세우기만 한다.
     · 값이 없으면 "—" 로 둔다. 재무 자료가 없는 기업을 적자로 치지 않는다.
     · 메모 칸에는 사실만 쓴다 (RSI 30 아래 · 거래량 2배 이상 · 흑자/적자). 예측 문구는 쓰지 않는다.
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const PAGE = 25;
  const TIER = { low: ["낮음", 1], mid: ["보통", 2], high: ["높음", 3], very_high: ["매우 높음", 4] };
  const WATCH_KEY = "nr.watchlist.v1";

  const state = {
    rows: [], ranked: {}, shake: {}, tab: "all", query: "", rsi: 40, profit: "all", cap: "all",
    ind: "all", tier: "all", sort: "rsi", dir: 1, shown: PAGE, watch: loadWatch()
  };

  /* ---------- 작은 도구 ---------- */
  const esc = (v) => (typeof escapeHTML === "function" ? escapeHTML(v) : String(v ?? ""));
  const num = (v) => (v === null || v === undefined || v === "" || !isFinite(Number(v)) ? null : Number(v));
  const dash = "—";
  function pct(v, d = 1, signed = true) {
    v = num(v); if (v === null) return dash;
    return (signed && v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d) + "%";
  }
  const cls = (v) => (num(v) === null ? "" : num(v) > 0 ? "up" : num(v) < 0 ? "down" : "");
  function cap(b) {
    b = num(b); if (b === null) return dash;
    if (b >= 1000) return "$" + (b / 1000).toFixed(2) + "T";
    if (b >= 1) return "$" + b.toFixed(b >= 100 ? 0 : 1) + "B";
    return "$" + Math.round(b * 1000) + "M";
  }
  function price(v) { v = num(v); return v === null ? dash : "$" + v.toFixed(v >= 100 ? 2 : v >= 1 ? 2 : 4); }
  function fmtTime(iso) {
    if (!iso) return dash;
    const d = new Date(iso); if (isNaN(d)) return dash;
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  /* 같은 파일을 두 번 받지 않는다 — 아래 VIX 카드 스크립트도 이것을 쓴다 */
  const cache = {};
  function get(path) {
    if (!cache[path]) cache[path] = fetch(path, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    return cache[path];
  }
  window.NR_JSON = get;
  function loadWatch() {
    try { return new Set(JSON.parse(localStorage.getItem(WATCH_KEY) || "[]")); } catch (e) { return new Set(); }
  }
  function saveWatch() {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify([...state.watch])); } catch (e) { /* 저장 못 해도 화면은 동작 */ }
  }

  /* ---------- 시장 카드 ---------- */
  function bars(r5, r20, r60) {
    const vals = [r5, r20, r60].map(num);
    const m = Math.max(1, ...vals.filter((v) => v !== null).map(Math.abs));
    return '<div class="mk-bars" aria-hidden="true">' + vals.map((v, i) => {
      const h = v === null ? 0 : Math.max(2, Math.round((Math.abs(v) / m) * 18));
      return `<span class="b ${v === null ? "" : v >= 0 ? "pos" : "neg"}" style="height:${h}px" title="${["5일", "20일", "60일"][i]}"></span>`;
    }).join("") + '<span class="mk-bar-lbl">5·20·60일</span></div>';
  }
  function retCard(label, sub, r) {
    if (!r) return "";
    return `<div class="mk"><div class="mk-k">${esc(label)}</div>
      <div class="mk-v ${cls(r.r5)}">${pct(r.r5)}<small>5일</small></div>
      <div class="mk-s">20일 <b class="${cls(r.r20)}">${pct(r.r20)}</b> · 60일 <b class="${cls(r.r60)}">${pct(r.r60)}</b></div>
      ${bars(r.r5, r.r20, r.r60)}<div class="mk-src">${esc(sub)}</div></div>`;
  }
  function spark(hist, w = 120, h = 30) {
    if (!hist || hist.length < 2) return "";
    const v = hist.map((r) => r[1]); const lo = Math.min(...v), hi = Math.max(...v);
    const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - 2 - ((x - lo) / (hi - lo || 1)) * (h - 4)}`).join(" ");
    return `<svg class="mk-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>`;
  }
  function renderMarket(sec, vix) {
    const out = [];
    const m = (t) => (sec && (sec.market || []).find((r) => r.ticker === t)) || null;
    if (sec && sec.reference) out.push(retCard("S&P 500", "SPY · 미국 시장 전체", sec.reference));
    out.push(retCard("기술 업종", "XLK · 미국 기술주 ETF", m("XLK")));
    const semi = sec && (sec.industries || []).find((r) => r.industry === "Semiconductors");
    if (semi) out.push(retCard("반도체 (우리 범위)", `나스닥 반도체 ${semi.count}종목 중간값`, semi));
    if (vix && num(vix.close) !== null) {
      out.push(`<div class="mk"><div class="mk-k">VIX</div>
        <div class="mk-v">${num(vix.close).toFixed(2)}<small class="${cls(vix.chg1_pct)}">${pct(vix.chg1_pct)}</small></div>
        <div class="mk-s">5일 <b>${pct(vix.chg5_pct)}</b> · 20일 <b>${pct(vix.chg20_pct)}</b></div>
        ${spark((vix.history || []).slice(-60))}<div class="mk-src">${esc(vix.date || "")} 종가 · 최근 60거래일</div></div>`);
    }
    const lead = sec && (sec.market || []).slice().sort((a, b) => (num(b.r20) ?? -1e9) - (num(a.r20) ?? -1e9))[0];
    if (lead) out.push(retCard(`가장 강한 업종 · ${lead.name}`, `${lead.ticker} · 미국 업종 ETF 11개 중 20일 1위`, lead));
    $("mkt").innerHTML = out.join("") || '<div class="state">시장 자료를 불러오지 못했습니다.</div>';
    const d = sec && sec.price_date; if (d) $("mktDate").textContent = `${d} 종가 기준`;
  }

  /* ---------- 요약 숫자 ---------- */
  function renderStats(data, latest, learning, bsi) {
    const b = (data && data.breakdown) || {};
    const scanned = num(b.total_candidates) ?? num(data && data.total_scanned);
    const observed = num(b.observation);
    const signals = num(latest && latest.total_signals) ?? state.rows.length;
    const g = (learning && learning["판정까지 남은 것"]) || {};
    const done = num(g["채점까지 끝난 판단"]), need = num(g["필요한 판단"]), sealed = num(g["봉인된 판단"]);
    const ratio = done !== null && need ? Math.min(1, done / need) : null;
    const p30 = bsi && bsi.periods && bsi.periods["30d"];
    const fmtN = (v) => (v === null ? dash : v.toLocaleString("ko-KR"));
    $("stats").innerHTML = `
      <div class="st"><div class="st-k">전체 스캔 종목</div><div class="st-v">${fmtN(scanned)}</div><div class="st-s">나스닥 상장 후보</div></div>
      <div class="st"><div class="st-k">관측 종목</div><div class="st-v">${fmtN(observed)}</div><div class="st-s">IT · 시가총액 조건 통과</div></div>
      <div class="st"><div class="st-k">당일 신호</div><div class="st-v">${fmtN(signals)}</div><div class="st-s">RSI ${state.rsiMax} 이하</div></div>
      <div class="st st-wide"><div class="st-k">연구 검증 (채점 끝난 판단)</div>
        <div class="st-v">${fmtN(done)} <small>/ ${fmtN(need)}</small> <small class="st-pct">${ratio === null ? "" : (ratio * 100).toFixed(1) + "%"}</small></div>
        <div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${need || 0}" aria-valuenow="${done || 0}"
          aria-label="채점 끝난 판단"><span style="width:${ratio === null ? 0 : (ratio * 100).toFixed(1)}%"></span></div>
        <div class="st-s">봉인한 판단 ${fmtN(sealed)}건 · 60거래일이 지나야 채점</div></div>
      <div class="st"><div class="st-k">신호 뒤 30거래일 · 시장 대비</div>
        <div class="st-v ${cls(p30 && p30.alpha)}">${p30 ? pct(p30.alpha, 2) + "p" : dash}</div>
        <div class="st-s">사후 기록 · ${p30 ? fmtN(num(p30.samples)) + "건" : dash}</div></div>`;
  }

  /* ---------- 스크리너 ---------- */
  function tierOf(t) { const s = state.shake[t]; return s && TIER[s.tier] ? s.tier : null; }
  function tags(r) {
    const out = [];
    if (num(r.rsi) !== null && num(r.rsi) < 30) out.push('<span class="tag t-warn">RSI 30 아래</span>');
    if (num(r.volume_ratio) !== null && num(r.volume_ratio) >= 2) out.push('<span class="tag t-brand">거래량 2배 이상</span>');
    if (r.profitable === true) out.push('<span class="tag t-up">흑자</span>');
    else if (r.profitable === false) out.push('<span class="tag t-down">적자</span>');
    else out.push('<span class="tag">재무 자료 없음</span>');
    return out.join("");
  }
  const SORTERS = {
    rsi: (r) => num(r.rsi), change: (r) => num(r.day_change_pct), cap: (r) => num(r.market_cap_b),
    rr: (r) => num(r.risk_reward), volume: (r) => num(r.volume_ratio), price: (r) => num(r.price),
    ticker: (r) => r.ticker, tier: (r) => (tierOf(r.ticker) ? TIER[tierOf(r.ticker)][1] : null)
  };
  const DEFAULT_DIR = { rsi: 1, change: -1, cap: -1, rr: -1, volume: -1, price: -1, ticker: 1, tier: 1 };

  /* 관심 종목 — 스크리너 필터 (RSI 40 이하 · 흑자 · 시총 · 업종 · 흔들림) 를 걸지 않는다. 검색어만.
     오늘 신호 목록 (RSI 40 이하 종목만 든다) 에 없는 종목은 전체 순위 자료 (rankings.json · 약 311종목) 로 채운다.
     전에는 둘 다 안 해서 담은 8종목 중 3종목만 보였다 (사용자 2026-11-13). */
  function fromRanking(x) {
    return { ticker: x.ticker, name: x.name, industry: x.industry, price: x.price, day_change_pct: x.day_change_pct,
      market_cap_b: x.market_cap_b, rsi: null, risk_reward: null, volume_ratio: null,
      profitable: x.profit === true ? true : x.profit === false ? false : null, fromRanking: true };
  }
  function watchRows(q) {
    const have = new Map(state.rows.map((r) => [r.ticker, r]));
    let rows = [...state.watch].map((t) => have.get(t) || (state.ranked[t] ? fromRanking(state.ranked[t]) : null)).filter(Boolean);
    if (q) rows = rows.filter((r) => String(r.ticker).toLowerCase().includes(q) || String(r.name || "").toLowerCase().includes(q));
    const key = SORTERS[state.sort] || SORTERS.rsi, dir = state.dir;
    return rows.sort((x, y) => {
      const p = key(x), q2 = key(y);
      if (p === null && q2 === null) return String(x.ticker).localeCompare(String(y.ticker));
      if (p === null) return 1;
      if (q2 === null) return -1;
      return (p < q2 ? -1 : p > q2 ? 1 : 0) * dir;
    });
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    if (state.tab === "watch") return watchRows(q);
    let rows = state.rows.filter((r) => {
      if (num(r.rsi) === null || num(r.rsi) > state.rsi) return false;
      if (state.profit === "profit" && r.profitable !== true) return false;
      const c = num(r.market_cap_b);
      if (state.cap === "large" && !(c !== null && c >= 10)) return false;
      if (state.cap === "mid" && !(c !== null && c >= 2 && c < 10)) return false;
      if (state.cap === "small" && !(c !== null && c < 2)) return false;
      if (state.ind !== "all" && r.industry !== state.ind) return false;
      const t = tierOf(r.ticker);
      if (state.tier === "calm" && !(t === "low" || t === "mid")) return false;
      if (state.tier === "wild" && !(t === "high" || t === "very_high")) return false;
      return true;
    });
    if (q) {
      // 티커가 맞는 것이 있으면 그것만 (기존 검색과 같은 규칙: 티커 시작 > 티커 포함 > 이름 포함)
      const a = [], b = [], c = [];
      rows.forEach((r) => {
        const t = String(r.ticker).toLowerCase(), n = String(r.name || "").toLowerCase();
        if (t.startsWith(q)) a.push(r); else if (t.includes(q)) b.push(r); else if (n.includes(q)) c.push(r);
      });
      rows = a.length || b.length ? a.concat(b) : c;
    }
    const key = SORTERS[state.sort] || SORTERS.rsi, dir = state.dir;
    return rows.slice().sort((x, y) => {
      const p = key(x), q2 = key(y);
      if (p === null && q2 === null) return 0;
      if (p === null) return 1;
      if (q2 === null) return -1;
      return (p < q2 ? -1 : p > q2 ? 1 : 0) * dir;
    });
  }

  function renderTable() {
    const rows = filtered();
    const shown = rows.slice(0, state.shown);
    $("watchCount").textContent = state.watch.size ? String(state.watch.size) : "";
    $("resultCount").textContent = `${rows.length.toLocaleString("ko-KR")}종목` +
      (rows.length > shown.length ? ` 중 ${shown.length}개 표시` : "");
    if (!rows.length) {
      const msg = state.tab === "watch" && !state.watch.size
        ? "관심 종목이 없습니다. 표에서 ☆ 를 눌러 담으세요."
        : "조건에 맞는 종목이 없습니다. 필터를 넓혀 보세요.";
      $("rows").innerHTML = `<tr><td colspan="12" class="empty">${msg}</td></tr>`;
    } else {
      $("rows").innerHTML = shown.map((r, i) => {
        const t = tierOf(r.ticker), on = state.watch.has(r.ticker);
        const href = "stock.html?ticker=" + encodeURIComponent(r.ticker);
        return `<tr data-href="${href}">
          <td class="c-star"><button type="button" class="star" data-t="${esc(r.ticker)}" aria-pressed="${on}"
            aria-label="${esc(r.ticker)} 관심 종목 ${on ? "빼기" : "담기"}">${on ? "★" : "☆"}</button></td>
          <td class="c-idx num">${i + 1}</td>
          <td class="c-tk"><a href="${href}">${esc(r.ticker)}</a><span class="m-name">${esc(r.name || "")}</span></td>
          <td class="c-name"><span>${esc(r.name || "")}</span><small>${esc(r.industry || "")}</small></td>
          <td class="num">${price(r.price)}</td>
          <td class="num ${cls(r.day_change_pct)}">${pct(r.day_change_pct, 2)}</td>
          <td class="num">${num(r.rsi) === null ? dash : num(r.rsi).toFixed(1)}</td>
          <td class="num c-opt">${cap(r.market_cap_b)}</td>
          <td class="num c-opt">${num(r.risk_reward) === null ? dash : num(r.risk_reward).toFixed(2)}</td>
          <td class="num c-opt">${num(r.volume_ratio) === null ? dash : num(r.volume_ratio).toFixed(2) + "×"}</td>
          <td class="c-opt">${t ? `<span class="tier tier-${t}">${TIER[t][0]}</span>` : dash}</td>
          <td class="c-opt c-tags">${tags(r)}</td></tr>`;
      }).join("");
    }
    if (state.tab === "watch") {
      const have = new Set(rows.map((r) => r.ticker));
      const missing = [...state.watch].filter((t) => !have.has(t)).sort();
      if (missing.length) {
        $("rows").insertAdjacentHTML("beforeend", `<tr><td colspan="12" class="empty" style="height:auto;padding:12px 10px">
          오늘 자료에 없는 관심 종목: ${missing.map((t) => `<a href="stock.html?ticker=${encodeURIComponent(t)}">${esc(t)}</a>`).join(" · ")}</td></tr>`);
      }
      $("resultCount").textContent = `관심 종목 ${state.watch.size}개 · 필터는 적용하지 않습니다` +
        (rows.some((r) => r.fromRanking) ? " · RSI 는 오늘 신호 목록에 든 종목만" : "");
    }
    $("moreBtn").hidden = rows.length <= shown.length;
    $("moreBtn").textContent = `${Math.min(PAGE, rows.length - shown.length)}개 더 보기`;
    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.setAttribute("aria-sort", th.dataset.sort === state.sort ? (state.dir > 0 ? "ascending" : "descending") : "none");
    });
    $("fSort").value = SORT_OPTS.some((o) => o[0] === state.sort + ":" + state.dir) ? state.sort + ":" + state.dir : "";
  }

  const SORT_OPTS = [["rsi:1", "RSI 낮은 순"], ["change:-1", "등락률 높은 순"], ["change:1", "등락률 낮은 순"],
    ["cap:-1", "시가총액 큰 순"], ["rr:-1", "Risk/Reward 높은 순"], ["volume:-1", "거래량 배수 높은 순"],
    ["tier:1", "흔들림 낮은 순"]];

  function setupControls() {
    $("fSort").innerHTML = SORT_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("") +
      '<option value="" hidden>표 머리로 정렬</option>';
    const inds = [...new Set(state.rows.map((r) => r.industry).filter(Boolean))].sort();
    $("fInd").innerHTML = '<option value="all">업종 전체</option>' + inds.map((v) => `<option>${esc(v)}</option>`).join("");
    $("fRsi").innerHTML = [40, 35, 30, 25, 20].filter((v) => v <= state.rsiMax)
      .map((v) => `<option value="${v}">RSI ≤ ${v}</option>`).join("");
    $("fRsi").value = String(state.rsi);

    const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
    on("fRsi", "change", (e) => { state.rsi = Number(e.target.value); reset(); });
    on("fProfit", "change", (e) => { state.profit = e.target.value; reset(); });
    on("fCap", "change", (e) => { state.cap = e.target.value; reset(); });
    on("fInd", "change", (e) => { state.ind = e.target.value; reset(); });
    on("fTier", "change", (e) => { state.tier = e.target.value; reset(); });
    on("fSort", "change", (e) => { if (!e.target.value) return; const [k, d] = e.target.value.split(":"); state.sort = k; state.dir = Number(d); reset(); });
    on("resetFilters", "click", () => {
      Object.assign(state, { rsi: state.rsiMax, profit: "all", cap: "all", ind: "all", tier: "all", sort: "rsi", dir: 1, query: "" });
      ["fProfit", "fCap", "fInd", "fTier"].forEach((id) => { $(id).value = "all"; });
      $("fRsi").value = String(state.rsi); $("q").value = ""; reset();
    });
    on("moreBtn", "click", () => { state.shown += PAGE; renderTable(); });

    document.querySelectorAll("th[data-sort] button").forEach((b) => b.addEventListener("click", () => {
      const k = b.closest("th").dataset.sort;
      if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = DEFAULT_DIR[k] || 1; }
      reset();
    }));

    document.querySelectorAll(".tabs [role=tab]").forEach((b) => b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      document.querySelectorAll(".tabs [role=tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      reset();
    }));

    let timer = null;
    on("q", "input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.query = e.target.value; reset(); }, 150);
    });
    on("q", "keydown", (e) => {
      if (e.key !== "Enter") return;
      const v = e.target.value.trim().toUpperCase();
      const rows = filtered();
      if (rows.length === 1) location.href = "stock.html?ticker=" + encodeURIComponent(rows[0].ticker);
      else if (/^[A-Z][A-Z0-9.\-]{0,6}$/.test(v) && !rows.some((r) => r.ticker === v) && !rows.length)
        location.href = "stock.html?ticker=" + encodeURIComponent(v);
      else if (rows.some((r) => r.ticker === v)) location.href = "stock.html?ticker=" + encodeURIComponent(v);
    });

    $("rows").addEventListener("click", (e) => {
      const star = e.target.closest(".star");
      if (star) {
        const t = star.dataset.t;
        if (state.watch.has(t)) state.watch.delete(t); else state.watch.add(t);
        saveWatch(); renderTable(); return;
      }
      if (e.target.closest("a")) return;
      const tr = e.target.closest("tr[data-href]");
      if (tr && !window.getSelection().toString()) location.href = tr.dataset.href;
    });
  }
  function reset() { state.shown = PAGE; renderTable(); }

  /* ---------- BSI (신호 뒤 평균 수익 · 사후 기록) ---------- */
  function renderBSI(bsi) {
    const box = $("bsiBody");
    if (!bsi || !Array.isArray(bsi.curve) || bsi.curve.length < 2) { box.innerHTML = '<div class="state">자료가 아직 없습니다.</div>'; return; }
    const per = bsi.periods || {};
    const grid = ["5d", "10d", "30d", "60d"].map((k) => {
      const p = per[k] || {};
      return `<div class="bp"><div class="bp-k">${k.replace("d", "")}거래일</div>
        <div class="bp-v ${cls(p.alpha)}">${num(p.alpha) === null ? dash : pct(p.alpha, 2) + "p"}</div>
        <div class="bp-s">신호 ${pct(p.value, 2)} · QQQ ${pct(p.benchmark, 2)}</div></div>`;
    }).join("");
    const c = bsi.curve.filter((r) => num(r.bsi_pct) !== null);
    const W = 520, H = 170, L = 34, R = 8, T = 8, B = 20;
    const vals = c.flatMap((r) => [num(r.bsi_pct), num(r.benchmark_pct)]).filter((v) => v !== null);
    const lo = Math.floor(Math.min(0, ...vals)), hi = Math.ceil(Math.max(0, ...vals));
    const maxDay = c[c.length - 1].day || c.length - 1;
    const x = (d) => L + (d / maxDay) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
    const line = (k) => c.filter((r) => num(r[k]) !== null).map((r) => `${x(r.day).toFixed(1)},${y(num(r[k])).toFixed(1)}`).join(" ");
    const ticks = []; const step = Math.max(1, Math.ceil((hi - lo) / 4));
    for (let v = lo; v <= hi; v += step) ticks.push(v);
    const last = c[c.length - 1];
    box.innerHTML = `<div class="bp-grid">${grid}</div>
      <svg class="bsi-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="신호 뒤 거래일별 평균 수익과 같은 구간 QQQ">
        ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? "zero" : "grid"}"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`).join("")}
        <polyline class="l-bench" points="${line("benchmark_pct")}"/>
        <polyline class="l-bsi" points="${line("bsi_pct")}"/>
        <text x="${L}" y="${H - 4}">신호 날</text><text x="${W - R}" y="${H - 4}" text-anchor="end">${maxDay}거래일 뒤</text>
      </svg>
      <div class="bsi-legend"><span class="k-bsi">신호 종목 평균 ${pct(last.bsi_pct, 2)}</span><span class="k-bench">같은 구간 QQQ ${pct(last.benchmark_pct, 2)}</span></div>`;
  }

  /* ---------- 연구 검증 현황 ---------- */
  function renderResearch(l) {
    const box = $("researchBody");
    if (!l) { box.innerHTML = '<div class="state">자료를 불러오지 못했습니다.</div>'; return; }
    const g = l["판정까지 남은 것"] || {}, m = l["모으고 있는 것"] || {};
    const done = num(g["채점까지 끝난 판단"]), need = num(g["필요한 판단"]);
    const r = done !== null && need ? Math.min(1, done / need) : 0;
    const n = (v) => (num(v) === null ? dash : num(v).toLocaleString("ko-KR"));
    const qs = (l["지금 연구 중인 질문"] || []).length, learned = (l["지금까지 배운 것"] || []).length;
    box.innerHTML = `<div class="rs-top"><div class="rs-v">${(r * 100).toFixed(1)}%</div>
        <div class="rs-s">채점 끝난 판단 ${n(done)} / ${n(need)}</div></div>
      <div class="prog"><span style="width:${(r * 100).toFixed(1)}%"></span></div>
      <dl class="rs-list">
        <div><dt>봉인한 판단</dt><dd>${n(g["봉인된 판단"])}</dd></div>
        <div><dt>결정을 봉인한 날</dt><dd>${n(g["결정을 봉인한 날"])} / ${n(g["필요한 날"])}</dd></div>
        <div><dt>관측일</dt><dd>${n(m["관측일"])}</dd></div>
        <div><dt>연구 중인 질문</dt><dd>${qs}</dd></div>
        <div><dt>지금까지 확인한 사실</dt><dd>${learned}</dd></div>
      </dl>
      <p class="rs-note">${esc(g["설명"] || "")}</p>
      <a class="panel-link" href="learning.html">연구 현황 자세히 →</a>`;
  }

  /* ---------- 시작 ---------- */
  function freshness(iso) {
    const t = Date.parse(iso || ""); if (!t) return;
    const hours = (Date.now() - t) / 3.6e6;
    if (hours > 72) {
      const w = $("staleWarning"); w.hidden = false;
      w.textContent = `자료가 ${Math.floor(hours / 24)}일 전 것입니다. 자동 갱신이 멈췄을 수 있습니다.`;
    }
  }

  async function start() {
    const [latest, data, sec, shake, bsi, learning, vix, ranks] = await Promise.all(
      ["latest_signals.json", "data.json", "sectors.json", "shake.json", "bsi.json", "learning.json", "vix.json", "rankings.json"].map(get));
    state.ranked = {};
    ((ranks && ranks.rows) || []).forEach((x) => { if (x && x.ticker) state.ranked[x.ticker] = x; });
    state.shake = (shake && shake.tickers) || {};
    state.rsiMax = num(latest && latest.config && latest.config.RSI_THRESHOLD) || 40;
    state.rsi = state.rsiMax;
    state.rows = latest && typeof normalizeSignalList === "function" ? normalizeSignalList(latest) : [];
    const asOf = latest && (latest.signals || [])[0];
    $("updated").textContent = latest ? `업데이트 ${fmtTime(latest.generated_at)}` : "자료를 불러오지 못했습니다";
    $("asof").textContent = asOf ? `관측일 ${asOf.observation_date} · 시세 ${asOf.price_date} 종가` : "";
    if ($("shellDate") && asOf) { $("shellDate").textContent = `${asOf.price_date} 종가`; $("shellDateRow").hidden = false; }
    freshness(latest && latest.generated_at);
    renderMarket(sec, vix);
    renderStats(data, latest, learning, bsi);
    if (!latest) {
      $("rows").innerHTML = '<tr><td colspan="12" class="empty">latest_signals.json 을 불러오지 못했습니다.</td></tr>';
    } else {
      setupControls();
      renderTable();
    }
    renderBSI(bsi);
    renderResearch(learning);
    if (location.hash === "#screener") $("screener").scrollIntoView();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
