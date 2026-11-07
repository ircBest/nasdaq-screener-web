/* =========================================================
   공통 화면 틀 — 왼쪽 메뉴 · 상단 메뉴 (리뉴얼 1단계 · 2026-11-07)

   <body> 바로 뒤에서 동기로 부른다. 그 자리에서 메뉴를 body
   맨 앞에 끼워 넣으므로 본문이 그려지기 전에 자리가 잡힌다
   (깜빡임 · 밀림 없음). 페이지 본문 구조는 건드리지 않는다.

   1280px 이상   왼쪽 메뉴 (이름까지)
   1024~1279px   줄인 메뉴 (아이콘 + 짧은 이름)
   1024px 미만   상단 바 + 접는 메뉴 (버튼으로 연다)
   ========================================================= */
(function () {
  "use strict";

  var ICON = {
    overview: '<path d="M3 13h4v7H3zM10 9h4v11h-4zM17 4h4v16h-4z"/>',
    screener: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    rankings: '<path d="M4 6h16M4 12h11M4 18h6"/>',
    sectors: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    stock: '<path d="M3 17l5-6 4 4 8-9"/><path d="M15 6h5v5"/>',
    positions: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    learning: '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>'
  };

  var NAV = [
    { key: "overview", href: "index.html", label: "시장 개요", short: "개요" },
    { key: "screener", href: "index.html#screener", label: "종목 스크리너", short: "스크리너" },
    { key: "rankings", href: "rankings.html", label: "오늘의 순위", short: "순위" },
    { key: "sectors", href: "sectors.html", label: "업종 모니터", short: "업종" },
    { key: "stock", href: "stock.html", label: "종목 상세", short: "종목" },
    { key: "positions", href: "positions.html", label: "연구 장부", short: "장부" },
    { key: "learning", href: "learning.html", label: "연구 현황", short: "연구" }
  ];

  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page === "") page = "index.html";

  function current(item) {
    var file = item.href.split("#")[0];
    if (file !== page) return false;
    if (page !== "index.html") return true;
    var wantScreener = location.hash === "#screener";
    return item.key === (wantScreener ? "screener" : "overview");
  }

  function svg(key) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[key] + "</svg>";
  }

  var links = NAV.map(function (item) {
    var on = current(item);
    return '<a class="shell-link" data-key="' + item.key + '" href="' + item.href + '"' +
      (on ? ' aria-current="page"' : "") + ">" + svg(item.key) +
      '<span class="shell-label">' + item.label + "</span>" +
      '<span class="shell-short">' + item.short + "</span></a>";
  }).join("");

  var html =
    '<a class="shell-skip" href="#shell-content">본문으로 건너뛰기</a>' +
    '<div class="shell-top" role="banner">' +
      '<button type="button" class="shell-menu" aria-controls="shell-side" aria-expanded="false" aria-label="메뉴 열기">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      "</button>" +
      '<a class="shell-brand" href="index.html"><span class="shell-mark"></span>NASDAQ RESEARCH</a>' +
    "</div>" +
    '<aside class="shell-side" id="shell-side" aria-label="주 메뉴">' +
      '<a class="shell-brand" href="index.html"><span class="shell-mark"></span><span class="shell-label">NASDAQ RESEARCH</span></a>' +
      '<nav class="shell-nav">' + links + "</nav>" +
      '<div class="shell-foot"><div id="shellDateRow" hidden><span class="dot"></span>데이터 <span id="shellDate"></span></div>' +
        '<a href="https://github.com/ircBest/nasdaq-screener-web" rel="noopener">GitHub</a> · <a href="learning.html">도움말</a></div>' +
    "</aside>" +
    '<div class="shell-scrim" hidden></div>' +
    '<span id="shell-content" tabindex="-1"></span>';

  document.body.insertAdjacentHTML("afterbegin", html);
  document.documentElement.classList.add("has-shell");

  var side = document.getElementById("shell-side");
  var btn = document.querySelector(".shell-menu");
  var scrim = document.querySelector(".shell-scrim");

  function setOpen(open) {
    side.classList.toggle("open", open);
    scrim.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    document.documentElement.classList.toggle("shell-locked", open);
    if (open) {
      var first = side.querySelector(".shell-link");
      if (first) first.focus();
    }
  }

  btn.addEventListener("click", function () { setOpen(!side.classList.contains("open")); });
  scrim.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && side.classList.contains("open")) { setOpen(false); btn.focus(); }
  });
  side.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".shell-link")) setOpen(false);
  });

  /* 같은 페이지 안 이동 (개요 ↔ 스크리너) 때 표시를 맞춘다 */
  window.addEventListener("hashchange", function () {
    var links = side.querySelectorAll(".shell-link");
    for (var i = 0; i < links.length; i++) {
      var item = NAV[i];
      if (current(item)) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  });
})();
