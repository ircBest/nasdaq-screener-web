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
/* =========================================================
   APPLICATION STATE
   ========================================================= */
let allResults = [];
let bsiData = null;
let performanceData = null;
let statisticsData = null;
/* =========================================================
   SETTINGS
   ========================================================= */
settingsToggle.addEventListener(
  "click",
  () => {
    settingsPanel.classList.toggle(
      "open"
    );
    settingsCaret.textContent =
      settingsPanel.classList.contains(
        "open"
      )
        ? "▴"
        : "▾";
  }
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
  let filtered =
    allResults.filter(
      row => {
        if (
          !isValidNumber(
            row.rsi
          )
        ) {
          return false;
        }
        return (
          Number(row.rsi) <=
          rsiMax
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
  filtered.sort(
    (a, b) =>
      Number(a.rsi) -
      Number(b.rsi)
  );
  renderResults(
    filtered
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
  if (
    data.generated_at
  ) {
    document.getElementById(
      "lastUpdated"
    ).textContent =
      "마지막 스캔: " +
      formatDate(
        data.generated_at
      );
  } else if (
    data.observation_date
  ) {
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

   total_scanned / total_observations는
   docs/data.json(공개 스캔 요약)에만 존재하므로
   반드시 data.json을 기준으로 채운다.

   bsi.json / performance.json / statistics.json과
   동일하게, latest_signals.json 로딩 성공 여부와
   무관하게 독립적으로 항상 시도한다.
   ========================================================= */
function updateScanStats(data) {
  if (!data) {
    document.getElementById(
      "scannedCount"
    ).textContent = "-";
    document.getElementById(
      "observationCount"
    ).textContent = "-";
    return;
  }
  document.getElementById(
    "scannedCount"
  ).textContent =
    data.total_scanned ??
    data.scanned ??
    "-";
  document.getElementById(
    "observationCount"
  ).textContent =
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
    rsiRange.value =
      safeValue;
    rsiVal.textContent =
      safeValue;
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
  if (
    legacy.generated_at
  ) {
    document.getElementById(
      "lastUpdated"
    ).textContent =
      "마지막 스캔: " +
      formatDate(
        legacy.generated_at
      );
  }
  if (
    allResults.length
  ) {
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
   MAIN LOAD
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
    performanceResult,
    statisticsResult
  ] =
    await Promise.allSettled([
      loadLatestSignals(),
      fetchJSON(
        "data.json"
      ),
      fetchJSON(
        "bsi.json"
      ),
      fetchJSON(
        "performance.json"
      ),
      fetchJSON(
        "statistics.json"
      )
    ]);
  /* =====================================================
     LATEST SIGNALS
     ===================================================== */
  if (
    latestResult.status ===
    "fulfilled"
  ) {
    const latest =
      latestResult.value;
    allResults =
      latest.results;
    updateLatestStatus(
      latest.data
    );
    applyConfig(
      latest.data,
      allResults
    );
    if (
      allResults.length
    ) {
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
      dataJsonResult.status ===
      "fulfilled"
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
          예상 경로:
          <br>
          <span class="mono">
            ./latest_signals.json
          </span>
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
     SCAN STATS (전체 스캔 종목 / Observation)

     data.json을 기준으로 독립적으로 채운다.
     latest_signals.json의 성공/실패와 무관하게 항상 시도.
     ===================================================== */
  if (
    dataJsonResult.status ===
    "fulfilled"
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
    bsiResult.status ===
    "fulfilled"
  ) {
    bsiData =
      bsiResult.value;
    console.log(
      "[OK] bsi.json",
      bsiData
    );
    renderBSI(
      bsiData
    );
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
     PERFORMANCE
     ===================================================== */
  if (
    performanceResult.status ===
    "fulfilled"
  ) {
    performanceData =
      performanceResult.value;
    console.log(
      "[OK] performance.json",
      performanceData
    );
    renderPerformance(
      performanceData
    );
    document.getElementById(
      "researchCompleted"
    ).textContent =
      performanceData.completed ??
      performanceData.completed_signals ??
      0;
    document.getElementById(
      "researchPending"
    ).textContent =
      performanceData.pending ??
      performanceData.pending_signals ??
      0;
  } else {
    console.warn(
      "[WARN] performance.json 로딩 실패:",
      performanceResult.reason
    );
    document.getElementById(
      "performanceStatus"
    ).textContent =
      "데이터 대기 중";
    document.getElementById(
      "researchCompleted"
    ).textContent =
      "-";
    document.getElementById(
      "researchPending"
    ).textContent =
      "-";
  }
  /* =====================================================
     STATISTICS
     ===================================================== */
  if (
    statisticsResult.status ===
    "fulfilled"
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
