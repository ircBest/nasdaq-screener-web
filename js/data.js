/* =========================================================
   data.js
   JSON 로딩 / 데이터 정규화
   ========================================================= */


/* =========================================================
   FETCH JSON
   ========================================================= */

async function fetchJSON(filename) {

  const url =
    `./${filename}?_=${Date.now()}`;

  console.log(
    `[JSON LOAD] ${url}`
  );

  const response =
    await fetch(
      url,
      {
        cache: "no-store"
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
