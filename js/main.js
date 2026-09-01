/* =========================================================
   main.js
   애플리케이션 진입점 / 이벤트 / 필터 / 전체 로딩
   ========================================================= */


/* =========================================================
   DOM
   ========================================================= */

const settingsToggle =
  document.getElementById(
    "settingsToggle"
  );

const settingsPanel =
  document.getElementById(
    "settingsPanel"
  );

const settingsCaret =
  document.getElementById(
    "settingsCaret"
  );

const rsiRange =
  document.getElementById(
    "rsiRange"
  );

const rsiVal =
  document.getElementById(
    "rsiVal"
  );

const reqProfit =
  document.getElementById(
    "reqProfit"
  );

const tickerSearch =
  document.getElementById(
    "tickerSearch"
  );

const sortSelect =
  document.getElementById(
    "sortSelect"
  );

const researchToggle =
  document.getElementById(
    "researchToggle"
  );

const researchPanel =
  document.getElementById(
    "researchPanel"
  );

const researchCaret =
  document.getElementById(
    "researchCaret"
  );

const researchSort =
  document.getElementById(
    "researchSort"
  );


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let allResults = [];

let bsiData = null;

let statisticsData = null;

let researchRows = [];

let researchLoaded = false;

// 현재 표시 중인 행 수 (더 보기로 늘어난다)
let researchLimit = RESEARCH_PAGE_SIZE;


/* =========================================================
   데이터 신선도

   마지막 스캔이 이 시간을 넘으면 안내를 띄운다.
   워크플로가 조용히 실패했을 때 화면만 보고 알 수 있게 한다.
   ========================================================= */

const STALE_HOURS = 48;


function checkFreshness(generatedAt) {

  const warning =
    document.getElementById(
      "staleWarning"
    );

  if (
    !warning ||
    !generatedAt
  ) {
    return;
  }

  const generated =
    new Date(generatedAt);

  if (
    Number.isNaN(
      generated.getTime()
    )
  ) {
    return;
  }

  const hours =
    (Date.now() - generated.getTime()) /
    (1000 * 60 * 60);

  if (hours <= STALE_HOURS) {

    warning.hidden = true;

    return;
  }

  warning.textContent =
    `마지막 스캔이 ${Math.floor(hours / 24)}일 전입니다. ` +
    `자동 갱신이 멈췄을 수 있습니다.`;

  warning.hidden = false;

}


/* =========================================================
   패널 토글
   ========================================================= */

function bindToggle(
  button,
  panel,
  caret,
  onOpen
) {

  if (
    !button ||
    !panel
  ) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      const open =
        panel.classList.toggle(
          "open"
        );

      button.setAttribute(
        "aria-expanded",
        open
          ? "true"
          : "false"
      );

      if (caret) {

        caret.textContent =
          open
            ? "▴"
            : "▾";

      }

      if (
        open &&
        typeof onOpen === "function"
      ) {
        onOpen();
      }

    }
  );

}


bindToggle(
  settingsToggle,
  settingsPanel,
  settingsCaret
);


/* =========================================================
   FILTER EVENTS
   ========================================================= */

rsiRange.addEventListener(
  "input",
  () => {

    rsiVal.textContent =
      rsiRange.value;

    applyFilters();

  }
);

reqProfit.addEventListener(
  "change",
  applyFilters
);

if (tickerSearch) {

  tickerSearch.addEventListener(
    "input",
    applyFilters
  );

}

if (sortSelect) {

  sortSelect.addEventListener(
    "change",
    applyFilters
  );

}


/* =========================================================
   SORT
   ========================================================= */

function numberOr(value, fallback) {

  return isValidNumber(value)
    ? Number(value)
    : fallback;

}


function sortResults(rows, key) {

  const sorted = rows.slice();

  if (key === "change") {

    sorted.sort(
      (a, b) =>
        numberOr(b.day_change_pct, -Infinity) -
        numberOr(a.day_change_pct, -Infinity)
    );

  } else if (key === "cap") {

    sorted.sort(
      (a, b) =>
        numberOr(b.market_cap_b, -Infinity) -
        numberOr(a.market_cap_b, -Infinity)
    );

  } else if (key === "rr") {

    sorted.sort(
      (a, b) =>
        numberOr(b.risk_reward, -Infinity) -
        numberOr(a.risk_reward, -Infinity)
    );

  } else if (key === "volume") {

    sorted.sort(
      (a, b) =>
        numberOr(b.volume_ratio, -Infinity) -
        numberOr(a.volume_ratio, -Infinity)
    );

  } else {

    // 기본: RSI 낮은 순
    sorted.sort(
      (a, b) =>
        numberOr(a.rsi, Infinity) -
        numberOr(b.rsi, Infinity)
    );

  }

  return sorted;

}


/* =========================================================
   FILTER
   ========================================================= */

function applyFilters() {

  const rsiMax =
    Number(
      rsiRange.value
    );

  const onlyProfit =
    reqProfit.checked;

  const query =
    tickerSearch
      ? tickerSearch.value
          .trim()
          .toLowerCase()
      : "";

  let filtered =
    allResults.filter(
      row => {

        if (
          !isValidNumber(row.rsi)
        ) {
          return false;
        }

        return (
          Number(row.rsi) <= rsiMax
        );

      }
    );

  if (onlyProfit) {

    filtered =
      filtered.filter(
        row =>
          row.profitable === true
      );

  }

  /*
     검색

     티커와 종목명을 모두 본다.

     다만 종목명까지 부분일치시키면
     "VI"를 쳤을 때 Analog De(vi)ces가 걸려
     ADI가 함께 나온다. 사용자 눈에는 검색이
     고장난 것처럼 보인다.

     그래서 결과를 버리지는 않되 순위를 나눈다.

       1. 티커가 검색어로 시작
       2. 티커에 검색어 포함
       3. 종목명에 검색어 포함

     티커 일치가 하나라도 있으면 그것만 보여준다.
     (티커를 친 사람은 그 종목을 찾는 것이다)
  */

  if (query) {

    const tickerPrefix = [];

    const tickerMatch = [];

    const nameMatch = [];

    filtered.forEach(row => {

      const ticker =
        String(row.ticker)
          .toLowerCase();

      const name =
        String(row.name)
          .toLowerCase();

      if (ticker.startsWith(query)) {

        tickerPrefix.push(row);

      } else if (ticker.includes(query)) {

        tickerMatch.push(row);

      } else if (name.includes(query)) {

        nameMatch.push(row);

      }

    });

    const tickerHits =
      tickerPrefix.concat(tickerMatch);

    filtered =
      tickerHits.length
        ? tickerHits
        : nameMatch;

  }

  renderResults(
    sortResults(
      filtered,
      sortSelect
        ? sortSelect.value
        : "rsi"
    )
  );

}


/* =========================================================
   APPLY LATEST STATUS
   ========================================================= */

function updateLatestStatus(data) {

  document.getElementById(
    "foundCount"
  ).textContent =
    data.total_signals ??
    data.signal_count ??
    allResults.length;

  if (data.generated_at) {

    document.getElementById(
      "lastUpdated"
    ).textContent =
      "마지막 스캔: " +
      formatDate(
        data.generated_at
      );

    checkFreshness(
      data.generated_at
    );

  } else if (data.observation_date) {

    document.getElementById(
      "lastUpdated"
    ).textContent =
      "관측일: " +
      data.observation_date;

  }

}


/* =========================================================
   UPDATE SCAN STATS
   (전체 스캔 종목 / Observation)

   중요:
   이 두 카운터는 latest_signals.json에는
   애초에 존재하지 않는 필드다.
   (latest_signals.json은 Signal 목록만 담당)

   Observation 값 주의:

   data.json의 total_observations는 공개용으로
   RSI <= 40을 이미 적용한 뒤의 개수라
   Signal 수와 거의 같아진다. (예: 70 vs 69)

   실제로 관측한 종목 수는 breakdown.observation에 있다.
   (예: 318) 이쪽을 우선 사용한다.
   ========================================================= */

function updateScanStats(data) {

  const scanned =
    document.getElementById(
      "scannedCount"
    );

  const observation =
    document.getElementById(
      "observationCount"
    );

  if (!data) {

    scanned.textContent = "-";

    observation.textContent = "-";

    return;
  }

  scanned.textContent =
    data.total_scanned ??
    data.scanned ??
    "-";

  const breakdown =
    data.breakdown &&
    typeof data.breakdown === "object"
      ? data.breakdown
      : {};

  observation.textContent =
    breakdown.observation ??
    data.total_observations ??
    data.observations ??
    data.observation_count ??
    "-";

}


/* =========================================================
   APPLY CONFIG
   ========================================================= */

function applyConfig(
  data,
  results
) {

  const config =
    data.config &&
    typeof data.config === "object"
      ? data.config
      : null;

  const threshold =
    config?.RSI_THRESHOLD ??
    config?.rsi_threshold ??
    data.rsi_threshold ??
    results
      .map(
        row =>
          row.rsi_threshold
      )
      .find(
        value =>
          isValidNumber(value)
      );

  if (
    isValidNumber(threshold)
  ) {

    const value =
      Number(threshold);

    const safeValue =
      Math.max(
        10,
        Math.min(
          40,
          value
        )
      );

    rsiRange.value = safeValue;

    rsiVal.textContent = safeValue;

  }

}


/* =========================================================
   APPLY LEGACY
   ========================================================= */

function applyLegacyData(
  legacy,
  container
) {

  allResults =
    normalizeSignalList(
      legacy
    );

  document.getElementById(
    "foundCount"
  ).textContent =
    legacy.total_signals ??
    legacy.signal_count ??
    allResults.length;

  if (legacy.generated_at) {

    document.getElementById(
      "lastUpdated"
    ).textContent =
      "마지막 스캔: " +
      formatDate(
        legacy.generated_at
      );

    checkFreshness(
      legacy.generated_at
    );

  }

  if (allResults.length) {

    applyFilters();

  } else {

    container.innerHTML = `
      <div class="empty-state">
        현재 Signal 조건을 만족하는
        종목이 없습니다.
      </div>
    `;

  }

}


/* =========================================================
   RESEARCH 상세 (지연 로딩)

   performance.json은 230KB라 첫 화면에서 받지 않는다.
   사용자가 섹션을 펼칠 때 한 번만 받는다.
   ========================================================= */

async function ensureResearchLoaded() {

  if (researchLoaded) {

    renderResearchTable(
      researchRows,
      researchSort
        ? researchSort.value
        : "return",
      researchLimit
    );

    return;
  }

  const body =
    document.getElementById(
      "researchBody"
    );

  body.innerHTML = `
    <tr>
      <td colspan="10" class="loading-state">
        Research 상세를 불러오는 중...
      </td>
    </tr>
  `;

  try {

    const data =
      await loadPerformance();

    researchRows =
      normalizeResearchList(
        data
      );

    researchLoaded = true;

    renderResearchTable(
      researchRows,
      researchSort
        ? researchSort.value
        : "return",
      researchLimit
    );

  } catch (error) {

    console.warn(
      "[WARN] performance.json 로딩 실패:",
      error
    );

    body.innerHTML = `
      <tr>
        <td colspan="10" class="error-state">
          performance.json을 불러오지 못했습니다.
        </td>
      </tr>
    `;

  }

}


bindToggle(
  researchToggle,
  researchPanel,
  researchCaret,
  ensureResearchLoaded
);


if (researchSort) {

  researchSort.addEventListener(
    "change",
    () => {

      if (researchLoaded) {

        // 정렬을 바꾸면 처음부터 다시 본다
        researchLimit = RESEARCH_PAGE_SIZE;

        renderResearchTable(
          researchRows,
          researchSort.value,
          researchLimit
        );

      }

    }
  );

}


const researchMore =
  document.getElementById(
    "researchMore"
  );

if (researchMore) {

  researchMore.addEventListener(
    "click",
    () => {

      researchLimit =
        researchRows.length;

      renderResearchTable(
        researchRows,
        researchSort
          ? researchSort.value
          : "return",
        researchLimit
      );

    }
  );

}


/* =========================================================
   MAIN LOAD

   첫 화면에 필요한 것만 받는다.

     latest_signals.json  Signal 카드
     data.json            전체 스캔 / Observation 카운터
     bsi.json             BSI
     statistics.json      집계 성과

   performance.json(230KB)은 Research 상세를 펼칠 때만 받는다.
   ========================================================= */

async function load() {

  const container =
    document.getElementById(
      "resultsContainer"
    );

  console.log(
    "========================================"
  );

  console.log(
    "NASDAQ SCREENER DATA LOAD START"
  );

  console.log(
    "PRIMARY SOURCE: latest_signals.json"
  );

  console.log(
    "========================================"
  );

  const [
    latestResult,
    dataJsonResult,
    bsiResult,
    statisticsResult
  ] =
    await Promise.allSettled([
      loadLatestSignals(),
      fetchJSON("data.json"),
      fetchJSON("bsi.json"),
      fetchJSON("statistics.json")
    ]);


  /* =====================================================
     LATEST SIGNALS
     ===================================================== */

  if (
    latestResult.status === "fulfilled"
  ) {

    const latest =
      latestResult.value;

    allResults = latest.results;

    updateLatestStatus(
      latest.data
    );

    applyConfig(
      latest.data,
      allResults
    );

    if (allResults.length) {

      applyFilters();

    } else {

      container.innerHTML = `
        <div class="empty-state">
          latest_signals.json은 정상적으로
          불러왔지만 Signal 결과가 없습니다.
        </div>
      `;

    }

  } else {

    console.error(
      "[FAIL] latest_signals.json",
      latestResult.reason
    );

    /* ===================================================
       LEGACY FALLBACK
       =================================================== */

    const legacy =
      dataJsonResult.status === "fulfilled"
        ? dataJsonResult.value
        : await loadLegacyData();

    if (legacy) {

      applyLegacyData(
        legacy,
        container
      );

    } else {

      container.innerHTML = `
        <div
          class="
            empty-state
            error-state
          "
        >
          <strong>
            latest_signals.json을 불러오지 못했습니다.
          </strong>
          <br><br>
          GitHub 저장소 루트에
          <span class="mono">
            latest_signals.json
          </span>
          파일이 존재하는지 확인하십시오.
          <br><br>
          브라우저 콘솔에서
          자세한 오류를 확인할 수 있습니다.
        </div>
      `;

      document.getElementById(
        "lastUpdated"
      ).textContent =
        "마지막 스캔: latest_signals.json 로딩 실패";

    }

  }


  /* =====================================================
     SCAN STATS
     ===================================================== */

  if (
    dataJsonResult.status === "fulfilled"
  ) {

    console.log(
      "[OK] data.json",
      dataJsonResult.value
    );

    updateScanStats(
      dataJsonResult.value
    );

  } else {

    console.warn(
      "[WARN] data.json 로딩 실패:",
      dataJsonResult.reason
    );

    updateScanStats(null);

  }


  /* =====================================================
     BSI
     ===================================================== */

  if (
    bsiResult.status === "fulfilled"
  ) {

    bsiData = bsiResult.value;

    console.log(
      "[OK] bsi.json",
      bsiData
    );

    renderBSI(bsiData);

  } else {

    console.warn(
      "[WARN] bsi.json 로딩 실패:",
      bsiResult.reason
    );

    document.getElementById(
      "bsiGrid"
    ).innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1;"
      >
        BSI 데이터 대기 중
        <br>
        bsi.json이 아직 웹 저장소에 없습니다.
      </div>
    `;

  }


  /* =====================================================
     STATISTICS + PERFORMANCE 집계

     둘 다 statistics.json 하나에서 나온다.
     ===================================================== */

  if (
    statisticsResult.status === "fulfilled"
  ) {

    statisticsData =
      statisticsResult.value;

    console.log(
      "[OK] statistics.json",
      statisticsData
    );

    renderStatistics(
      statisticsData
    );

    renderPerformance(
      statisticsData
    );

    document.getElementById(
      "researchCompleted"
    ).textContent =
      statisticsData.completed ?? 0;

    document.getElementById(
      "researchPending"
    ).textContent =
      statisticsData.pending ?? 0;

  } else {

    console.warn(
      "[WARN] statistics.json 로딩 실패:",
      statisticsResult.reason
    );

    document.getElementById(
      "statisticsGrid"
    ).innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1;"
      >
        Statistics 데이터 대기 중
      </div>
    `;

    document.getElementById(
      "performanceStatus"
    ).textContent =
      "데이터 대기 중";

    document.getElementById(
      "researchCompleted"
    ).textContent = "-";

    document.getElementById(
      "researchPending"
    ).textContent = "-";

  }

  console.log(
    "========================================"
  );

  console.log(
    "NASDAQ SCREENER DATA LOAD COMPLETE"
  );

  console.log(
    `SIGNALS: ${allResults.length}`
  );

  console.log(
    "========================================"
  );

}


/* =========================================================
   RESIZE

   BSI Curve는 캔버스에 직접 그리므로
   폭이 바뀌면 다시 그려야 한다.
   ========================================================= */

let resizeTimer = null;

window.addEventListener(
  "resize",
  () => {

    if (!bsiData) {
      return;
    }

    window.clearTimeout(
      resizeTimer
    );

    resizeTimer =
      window.setTimeout(
        () => {

          renderBSICurve(
            bsiData.curve || []
          );

        },
        150
      );

  }
);


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

window.addEventListener(
  "error",
  event => {

    console.error(
      "[GLOBAL ERROR]",
      event.error ||
      event.message
    );

  }
);

window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "[PROMISE ERROR]",
      event.reason
    );

  }
);


/* =========================================================
   START
   ========================================================= */

load();
