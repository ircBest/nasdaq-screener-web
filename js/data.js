/* =========================================================
   data.js
   JSON 로딩 / 데이터 정규화
   ========================================================= */


/* =========================================================
   FETCH JSON
   ========================================================= */

/*
   캐시 정책

   예전에는 URL에 ?_=타임스탬프를 붙이고 no-store를 썼다.
   매 요청이 새 URL이라 캐시가 절대 걸리지 않았고,
   페이지를 열 때마다 전체 JSON을 다시 받았다.

   no-cache는 "캐시를 쓰되 항상 서버에 확인"이다.
   GitHub Pages가 ETag를 주므로 데이터가 그대로면
   304 Not Modified만 오고 본문은 오지 않는다.

   갱신 즉시성은 그대로 유지하면서 재방문 전송량만 사라진다.
*/

async function fetchJSON(filename) {

  const url =
    `./${filename}`;

  console.log(
    `[JSON LOAD] ${url}`
  );

  const response =
    await fetch(
      url,
      {
        cache: "no-cache"
      }
    );

  if (!response.ok) {

    throw new Error(
      `${filename} HTTP ${response.status}`
    );

  }

  const text =
    await response.text();

  if (!text.trim()) {

    throw new Error(
      `${filename} 파일이 비어 있습니다.`
    );

  }

  try {

    return JSON.parse(text);

  } catch (error) {

    console.error(
      `${filename} JSON 파싱 실패`,
      text.substring(0, 500)
    );

    throw new Error(
      `${filename} JSON 형식이 올바르지 않습니다.`
    );

  }

}


/* =========================================================
   EXTRACT RESULTS
   ========================================================= */

function extractResults(data) {

  if (
    !data ||
    typeof data !== "object"
  ) {
    return [];
  }

  if (
    Array.isArray(data.results)
  ) {
    return data.results;
  }

  if (
    Array.isArray(data.signals)
  ) {
    return data.signals;
  }

  if (
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  return [];

}


/* =========================================================
   NORMALIZE LATEST SIGNAL
   ========================================================= */

function normalizeSignal(item) {

  if (
    !item ||
    typeof item !== "object"
  ) {
    return {};
  }

  const technical =
    item.technical &&
    typeof item.technical === "object"
      ? item.technical
      : {};

  const fundamental =
    item.fundamental &&
    typeof item.fundamental === "object"
      ? item.fundamental
      : {};

  const signal =
    item.signal &&
    typeof item.signal === "object"
      ? item.signal
      : {};

  const risk =
    item.risk &&
    typeof item.risk === "object"
      ? item.risk
      : {};


  /* =======================================================
     VOLUME
     ======================================================= */

  const volumeAvg =
    technical.volume_avg_20d ??
    technical.volume_avg ??
    technical.avg_volume_20d ??
    technical.volume_average_20d ??
    null;


  const volumeRatio =
    technical.volume_ratio ??
    (
      isValidNumber(item.volume) &&
      isValidNumber(volumeAvg) &&
      Number(volumeAvg) !== 0
        ? Number(item.volume) /
          Number(volumeAvg)
        : null
    );


  /* =======================================================
     NORMALIZED
     ======================================================= */

  return {

    schema_version:
      item.schema_version ?? "2.0",

    observation_date:
      item.observation_date ?? null,

    generated_at:
      item.generated_at ?? null,

    ticker:
      item.ticker ??
      item.symbol ??
      "",

    name:
      item.name ??
      item.company_name ??
      "",

    sector:
      item.sector ?? "",

    industry:
      item.industry ?? "",

    market_cap_b:
      item.market_cap_b ??
      item.market_cap ??
      null,

    price:
      item.price ??
      item.current_price ??
      technical.price ??
      null,

    day_change_pct:
      item.day_change_pct ??
      item.change_pct ??
      item.daily_change_pct ??
      null,


    /* =========================
       TECHNICAL
       ========================= */

    rsi:
      technical.rsi ??
      item.rsi ??
      null,

    rsi_period:
      technical.rsi_period ??
      item.rsi_period ??
      null,

    rsi_threshold:
      technical.rsi_threshold ??
      item.rsi_threshold ??
      null,

    rsi_pass:
      technical.rsi_pass ??
      item.rsi_pass ??
      null,

    atr:
      technical.atr ??
      item.atr ??
      null,

    atr_period:
      technical.atr_period ??
      item.atr_period ??
      null,

    atr_pct:
      technical.atr_pct ??
      item.atr_pct ??
      null,

    volume:
      technical.volume ??
      item.volume ??
      null,

    volume_avg_20d:
      volumeAvg,

    volume_avg_period:
      technical.volume_avg_period ??
      technical.volume_period ??
      20,

    volume_ratio:
      volumeRatio,

    volume_spike:
      technical.volume_spike ??
      item.volume_spike ??
      false,

    volume_spike_threshold:
      technical.volume_spike_threshold ??
      item.volume_spike_threshold ??
      null,

    volume_direction:
      technical.volume_direction ??
      item.volume_direction ??
      null,


    /* =========================
       FUNDAMENTAL
       ========================= */

    profitable:
      fundamental.profitable ??
      fundamental.recent_profitable ??
      item.profitable ??
      null,

    profitable_pass:
      fundamental.profitable_pass ??
      item.profitable_pass ??
      null,

    net_income:
      fundamental.net_income ??
      item.net_income ??
      null,

    revenue_latest_m:
      fundamental.revenue_latest_m ??
      fundamental.revenue_latest ??
      item.revenue_latest_m ??
      null,

    revenue_previous_m:
      fundamental.revenue_previous_m ??
      fundamental.revenue_previous ??
      item.revenue_previous_m ??
      null,

    revenue_growth_pct:
      fundamental.revenue_growth_pct ??
      fundamental.revenue_change_pct ??
      item.revenue_growth_pct ??
      null,

    ebitda_latest_m:
      fundamental.ebitda_latest_m ??
      fundamental.ebitda_latest ??
      item.ebitda_latest_m ??
      null,

    ebitda_previous_m:
      fundamental.ebitda_previous_m ??
      fundamental.ebitda_previous ??
      item.ebitda_previous_m ??
      null,

    ebitda_growth_pct:
      fundamental.ebitda_growth_pct ??
      fundamental.ebitda_change_pct ??
      item.ebitda_growth_pct ??
      null,

    operating_cash_flow_latest_m:
      fundamental.operating_cash_flow_latest_m ??
      fundamental.operating_cash_flow_latest ??
      fundamental.ocf_latest_m ??
      item.operating_cash_flow_latest_m ??
      null,

    operating_cash_flow_previous_m:
      fundamental.operating_cash_flow_previous_m ??
      fundamental.operating_cash_flow_previous ??
      fundamental.ocf_previous_m ??
      item.operating_cash_flow_previous_m ??
      null,

    operating_cash_flow_change_pct:
      fundamental.operating_cash_flow_change_pct ??
      fundamental.operating_cash_flow_growth_pct ??
      item.operating_cash_flow_change_pct ??
      null,

    financial_latest_period:
      fundamental.financial_latest_period ??
      item.financial_latest_period ??
      null,

    financial_previous_period:
      fundamental.financial_previous_period ??
      item.financial_previous_period ??
      null,


    /* =========================
       SIGNAL
       ========================= */

    signal_pass:
      signal.pass ??
      signal.signal_pass ??
      item.signal_pass ??
      true,

    signal_status:
      signal.status ??
      item.signal_status ??
      null,

    signal_rsi_pass:
      signal.rsi_pass ??
      item.signal_rsi_pass ??
      null,

    signal_profitable_pass:
      signal.profitable_pass ??
      item.signal_profitable_pass ??
      null,

    require_profitable:
      signal.require_profitable ??
      item.require_profitable ??
      false,


    /* =========================
       RISK
       ========================= */

    target_price:
      risk.target_price ??
      risk.target ??
      item.target_price ??
      null,

    stop_loss:
      risk.stop_loss ??
      risk.stop ??
      item.stop_loss ??
      null,

    expected_gain_pct:
      risk.expected_gain_pct ??
      risk.expected_return_pct ??
      item.expected_gain_pct ??
      null,

    expected_loss_pct:
      risk.expected_loss_pct ??
      risk.expected_risk_pct ??
      item.expected_loss_pct ??
      null,

    risk_reward:
      risk.risk_reward ??
      risk.risk_reward_ratio ??
      item.risk_reward ??
      null

  };

}


/* =========================================================
   NORMALIZE SIGNAL LIST
   ========================================================= */

function normalizeSignalList(data) {

  const raw =
    extractResults(data);

  return raw
    .map(normalizeSignal)
    .filter(
      row =>
        row &&
        row.ticker
    );

}


/* =========================================================
   LOAD LATEST SIGNALS
   ========================================================= */

async function loadLatestSignals() {

  const data =
    await fetchJSON(
      "latest_signals.json"
    );

  console.log(
    "[OK] latest_signals.json",
    data
  );

  const results =
    normalizeSignalList(
      data
    );

  console.log(
    "[OK] latest_signals normalized:",
    results.length
  );


  return {

    data,

    results

  };

}


/* =========================================================
   LOAD PERFORMANCE (지연 로딩)

   performance.json은 230KB 규모이고
   Signal 하나하나의 기간별 수익률까지 담고 있다.

   첫 화면에 필요한 집계값(승률 / 평균 / 완료·대기 수)은
   statistics.json(0.3KB)에 이미 들어 있으므로
   이 파일은 사용자가 "Research 상세"를 열 때만 받는다.

   한 번 받으면 캐시해서 다시 받지 않는다.
   ========================================================= */

let performanceCache = null;

let performancePromise = null;


async function loadPerformance() {

  if (performanceCache) {
    return performanceCache;
  }

  if (performancePromise) {
    return performancePromise;
  }

  performancePromise =
    fetchJSON("performance.json")
      .then(data => {

        performanceCache = data;

        performancePromise = null;

        console.log(
          "[OK] performance.json (지연 로딩)",
          data
        );

        return data;

      })
      .catch(error => {

        performancePromise = null;

        throw error;

      });

  return performancePromise;

}


/* =========================================================
   NORMALIZE RESEARCH ROW

   performance.json의 한 행을 화면용으로 정규화한다.
   ========================================================= */

const RESEARCH_HORIZONS = [
  ["5d", "return_5d_pct"],
  ["10d", "return_10d_pct"],
  ["30d", "return_30d_pct"],
  ["60d", "return_60d_pct"],
  ["90d", "return_90d_pct"],
  ["1y", "return_1y_pct"],
  ["5y", "return_5y_pct"]
];


function normalizeResearchRow(item) {

  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const returns = {};

  const alphas = {};

  RESEARCH_HORIZONS.forEach(
    ([key, field]) => {

      returns[key] =
        item[field] ?? null;

      // 같은 기간의 시장 대비 초과수익
      alphas[key] =
        item[`alpha_${key}_pct`] ?? null;

    }
  );

  return {

    signal_id:
      item.signal_id ?? "",

    ticker:
      item.ticker ?? "",

    observation_date:
      item.observation_date ?? null,

    completion_date:
      item.completion_date ?? null,

    entry_price:
      item.entry_price ?? null,

    target_price:
      item.target_price ?? null,

    stop_price:
      item.stop_price ?? null,

    rsi:
      item.rsi ?? null,

    profitable:
      item.profitable ?? null,

    risk_reward:
      item.risk_reward ?? null,

    returns,

    alphas,

    benchmark_5d_pct:
      item.benchmark_5d_pct ?? null,

    max_return_pct:
      item.max_return_pct ?? null,

    max_return_date:
      item.max_return_date ?? null,

    target_hit:
      item.target_hit === true,

    target_hit_date:
      item.target_hit_date ?? null,

    stop_hit:
      item.stop_hit === true,

    stop_hit_date:
      item.stop_hit_date ?? null,

    mfe_pct:
      item.mfe_pct ?? null,

    mae_pct:
      item.mae_pct ?? null,

    status:
      item.status ?? null

  };

}


function normalizeResearchList(data) {

  const rows =
    data &&
    Array.isArray(data.performance)
      ? data.performance
      : [];

  return rows
    .map(normalizeResearchRow)
    .filter(
      row =>
        row &&
        row.ticker
    );

}


/* =========================================================
   전략 데이터

   기술 저장소가 같은 Observation에 여러 조건을 나란히
   적용해 결과를 남긴다.

     strategies/index.json          전략별 요약 (비교표용)
     strategies/<id>/statistics.json
     strategies/<id>/bsi.json

   비교표는 index.json 하나로 그릴 수 있다.
   전략별 statistics / bsi는 사용자가 그 전략을 골랐을 때만 받는다.

   전략 기능이 아직 배포되지 않은 저장소에서는
   index.json이 없으므로 404가 난다. 이 경우 조용히 넘어가고
   기존 화면 그대로 동작한다.
   ========================================================= */

async function loadStrategyIndex() {

  try {

    const data =
      await fetchJSON(
        "strategies/index.json"
      );

    console.log(
      "[OK] strategies/index.json",
      data
    );

    return data;

  } catch (error) {

    console.log(
      "[INFO] 전략 비교 데이터 없음:",
      error.message
    );

    return null;

  }

}


const strategyDetailCache = {};


async function loadStrategyDetail(id) {

  if (strategyDetailCache[id]) {
    return strategyDetailCache[id];
  }

  const [
    statisticsResult,
    bsiResult
  ] =
    await Promise.allSettled([
      fetchJSON(
        `strategies/${id}/statistics.json`
      ),
      fetchJSON(
        `strategies/${id}/bsi.json`
      )
    ]);

  const detail = {

    statistics:
      statisticsResult.status === "fulfilled"
        ? statisticsResult.value
        : null,

    bsi:
      bsiResult.status === "fulfilled"
        ? bsiResult.value
        : null

  };

  if (
    detail.statistics ||
    detail.bsi
  ) {

    strategyDetailCache[id] = detail;

  }

  return detail;

}


/* =========================================================
   LOAD LEGACY DATA
   ========================================================= */

async function loadLegacyData() {

  try {

    const data =
      await fetchJSON(
        "data.json"
      );

    console.log(
      "[OK] legacy data.json",
      data
    );

    return data;

  } catch (error) {

    console.warn(
      "[WARN] data.json 로딩 실패:",
      error
    );

    return null;

  }

}
