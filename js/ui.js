/* =========================================================
   ui.js
   화면 렌더링
   ========================================================= */


/* =========================================================
   BSI PERIOD LABELS
   ========================================================= */

const BSI_LABELS = {

  "5d": "5D",
  "10d": "10D",
  "30d": "30D",
  "60d": "60D",
  "90d": "90D",
  "1y": "1Y",
  "5y": "5Y",
  "max": "MAX"

};


/*
   기준 표본(day 0) 대비 이 비율보다 적으면
   "표본이 얇은 구간"으로 표시한다.
*/
const BSI_RELIABLE_SAMPLE_RATIO = 0.5;


/* =========================================================
   VOLUME BADGE
   ========================================================= */

function createVolumeBadge(row) {

  if (
    row.volume_spike !== true
  ) {
    return "";
  }

  if (
    row.volume_direction === "up"
  ) {

    return `
      <span class="badge vol">
        거래량 폭증 · 상승동반
      </span>
    `;

  }

  if (
    row.volume_direction === "down"
  ) {

    return `
      <span class="badge vol">
        거래량 폭증 · 하락동반
      </span>
    `;

  }

  return `
    <span class="badge vol">
      거래량 폭증
    </span>
  `;

}


/* =========================================================
   PROFIT BADGE
   ========================================================= */

function createProfitBadge(row) {

  if (
    row.profitable === true
  ) {

    return `
      <span class="badge profit">
        최근분기 흑자
      </span>
    `;

  }

  if (
    row.profitable === false
  ) {

    return `
      <span class="badge loss">
        최근분기 적자
      </span>
    `;

  }

  return `
    <span class="badge">
      손익 N/A
    </span>
  `;

}


/* =========================================================
   RENDER BSI
   ========================================================= */

function renderBSI(data) {

  const grid =
    document.getElementById(
      "bsiGrid"
    );

  if (
    !data ||
    !data.periods
  ) {

    grid.innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1;"
      >
        BSI 데이터가 없습니다.
      </div>
    `;

    return;
  }

  const periods =
    data.periods;

  /*
     벤치마크가 있으면 초과수익(알파)을 주 지표로 보여준다.

     "5D -1.4%"만 보면 좋은지 나쁜지 알 수 없다.
     같은 기간 시장이 -4.9%였다면 +3.5%p 초과수익이고,
     시장이 +2%였다면 -3.4%p 손해다.

     같은 숫자인데 결론이 정반대이므로
     시장 대비 값을 앞에 세운다.

     벤치마크 데이터가 아직 없으면(기술 저장소에서
     아직 계산 전) 기존처럼 BSI를 그대로 보여준다.
  */

  const hasBenchmark =
    data.benchmark_available === true;

  grid.innerHTML =
    Object.keys(BSI_LABELS)
      .map(key => {

        const item =
          periods[key] || {};

        const value =
          item.value;

        const benchmark =
          item.benchmark;

        const alpha =
          item.alpha;

        const samples =
          item.samples ?? 0;

        // 알파를 쓸 수 있는 기간만 알파를 주 지표로
        const useAlpha =
          hasBenchmark &&
          isValidNumber(alpha);

        const primary =
          useAlpha
            ? alpha
            : value;

        return `
          <div class="bsi-item">

            <div class="period">
              ${BSI_LABELS[key]}
              ${
                useAlpha
                  ? '<span class="tag">vs 시장</span>'
                  : ""
              }
            </div>

            <div
              class="
                value
                ${bsiClass(primary)}
              "
            >
              ${
                isValidNumber(primary)
                  ? fmtPctShort(primary)
                  : "데이터 부족"
              }
            </div>

            ${
              useAlpha
                ? `
                    <div class="breakdown">
                      BSI ${fmtPctShort(value)}
                      ·
                      시장 ${
                        isValidNumber(benchmark)
                          ? fmtPctShort(benchmark)
                          : "-"
                      }
                    </div>
                  `
                : ""
            }

            <div class="samples">
              ${escapeHTML(samples)} samples
            </div>

          </div>
        `;

      })
      .join("");

  if (
    data.generated_at
  ) {

    document.getElementById(
      "bsiUpdated"
    ).textContent =
      formatDate(
        data.generated_at
      );

  }

  renderBSICurve(
    data.curve || [],
    hasBenchmark
      ? (data.benchmark_ticker || "시장")
      : null
  );

}


/* =========================================================
   BSI CURVE
   ========================================================= */

function renderBSICurve(
  curve,
  benchmarkLabel
) {

  const canvas =
    document.getElementById(
      "bsiCanvas"
    );

  const ctx =
    canvas.getContext("2d");

  /* =======================================================
     캔버스 해상도

     예전에는 width/height 속성이 600x170으로 고정이고
     CSS가 width:100%로 늘려서 두 가지 문제가 있었다.

     1. 가로만 늘어나 종횡비가 깨졌다.
        마지막 점의 원이 타원이 되고
        선 굵기가 방향마다 달라졌다.

     2. 고해상도 화면에서 흐릿했다.

     실제 표시 크기와 devicePixelRatio에 맞춰
     매번 백킹 스토어를 다시 잡는다.
     ======================================================= */

  const ratio =
    window.devicePixelRatio || 1;

  const rect =
    canvas.getBoundingClientRect();

  const width =
    Math.max(
      Math.round(rect.width),
      1
    );

  const height =
    Math.max(
      Math.round(rect.height),
      1
    );

  canvas.width =
    width * ratio;

  canvas.height =
    height * ratio;

  ctx.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  if (
    !Array.isArray(curve) ||
    curve.length < 2
  ) {

    ctx.fillStyle =
      "#565E6E";

    ctx.font =
      "12px IBM Plex Mono";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "BSI Curve 데이터 축적 중",
      width / 2,
      height / 2
    );

    document.getElementById(
      "curveLatest"
    ).textContent =
      "-";

    return;
  }

  const validPoints =
    curve.filter(
      point =>
        point &&
        isValidNumber(
          point.bsi_pct
        )
    );

  if (
    validPoints.length < 2
  ) {

    ctx.fillStyle =
      "#565E6E";

    ctx.font =
      "12px IBM Plex Mono";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "BSI Curve 데이터 축적 중",
      width / 2,
      height / 2
    );

    return;
  }

  const values =
    validPoints.map(
      point =>
        Number(
          point.bsi_pct
        )
    );

  /*
     벤치마크 곡선

     BSI와 시장을 함께 그리면 두 선 사이의 간격이
     곧 초과수익(알파)이 된다. 숫자로 읽는 것보다
     "시장보다 위에 있나 아래에 있나"가 한눈에 들어온다.

     기술 저장소가 아직 벤치마크를 계산하지 않았다면
     benchmarkLabel이 없고, 기존처럼 BSI 한 줄만 그린다.
  */

  const showBenchmark =
    Boolean(benchmarkLabel) &&
    validPoints.some(
      point =>
        isValidNumber(
          point.benchmark_pct
        )
    );

  const benchmarkValues =
    showBenchmark
      ? validPoints.map(
          point =>
            isValidNumber(
              point.benchmark_pct
            )
              ? Number(
                  point.benchmark_pct
                )
              : null
        )
      : [];

  // 두 곡선이 모두 들어가도록 축을 잡는다
  const scaleValues =
    values.concat(
      benchmarkValues.filter(
        value => value !== null
      )
    );

  const minValue =
    Math.min(
      ...scaleValues,
      0
    );

  const maxValue =
    Math.max(
      ...scaleValues,
      0
    );

  const padding = 20;

  const plotWidth =
    width -
    padding * 2;

  const plotHeight =
    height -
    padding * 2;

  function x(index) {

    return (
      padding +
      (
        index /
        Math.max(
          validPoints.length - 1,
          1
        )
      ) *
      plotWidth
    );

  }

  function y(value) {

    const range =
      Math.max(
        maxValue -
        minValue,
        0.01
      );

    return (
      padding +
      (
        maxValue -
        value
      ) /
      range *
      plotHeight
    );

  }


  /* ZERO LINE */

  ctx.beginPath();

  ctx.moveTo(
    padding,
    y(0)
  );

  ctx.lineTo(
    width - padding,
    y(0)
  );

  ctx.strokeStyle =
    "#232833";

  ctx.lineWidth = 1;

  ctx.stroke();


  /* =======================================================
     시장(벤치마크) 곡선

     BSI보다 먼저, 흐린 회색으로 그려 배경처럼 둔다.
     두 선 사이의 간격이 초과수익이다.
     ======================================================= */

  if (showBenchmark) {

    ctx.beginPath();

    let started = false;

    benchmarkValues.forEach(
      (value, index) => {

        if (value === null) {
          return;
        }

        const px = x(index);

        const py = y(value);

        if (!started) {

          ctx.moveTo(px, py);

          started = true;

        } else {

          ctx.lineTo(px, py);

        }

      }
    );

    ctx.strokeStyle = "#6E7787";

    ctx.lineWidth = 1.5;

    ctx.stroke();

  }


  /* =======================================================
     표본 신뢰도

     Curve의 day N은 "Signal 발생 후 N거래일이 지난"
     Signal들만의 평균이다. 따라서 오른쪽으로 갈수록
     표본이 줄어든다. (예: day 0은 451개, day 7은 38개)

     예전에는 전 구간을 같은 실선으로 그려서
     끝부분이 앞부분과 같은 신뢰도로 보였다.

     기준 표본(day 0) 대비 비율이 낮은 구간은
     점선 + 흐린 색으로 구분해 그린다.
     ======================================================= */

  const baseSamples =
    Number(
      validPoints[0].samples
    ) || 0;

  function isThin(point) {

    if (!baseSamples) {
      return false;
    }

    const samples =
      Number(point.samples) || 0;

    return (
      samples / baseSamples <
      BSI_RELIABLE_SAMPLE_RATIO
    );

  }

  // 표본이 충분한 마지막 지점
  let solidEnd =
    validPoints.length - 1;

  for (
    let i = 0;
    i < validPoints.length;
    i += 1
  ) {

    if (isThin(validPoints[i])) {
      solidEnd = Math.max(i - 1, 0);
      break;
    }

  }

  const lastValue =
    values[
      values.length - 1
    ];

  const lineColor =
    lastValue >= 0
      ? "#3ECF8E"
      : "#FF5C5C";

  function drawSegment(
    fromIndex,
    toIndex,
    dashed
  ) {

    if (toIndex <= fromIndex) {
      return;
    }

    ctx.beginPath();

    for (
      let i = fromIndex;
      i <= toIndex;
      i += 1
    ) {

      const px = x(i);

      const py =
        y(
          Number(
            validPoints[i].bsi_pct
          )
        );

      if (i === fromIndex) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }

    }

    ctx.setLineDash(
      dashed
        ? [4, 3]
        : []
    );

    ctx.strokeStyle = lineColor;

    ctx.globalAlpha =
      dashed
        ? 0.45
        : 1;

    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.setLineDash([]);

  }

  drawSegment(
    0,
    solidEnd,
    false
  );

  drawSegment(
    solidEnd,
    validPoints.length - 1,
    true
  );


  /* LAST POINT */

  const lastPoint =
    validPoints[
      validPoints.length - 1
    ];

  const lastX =
    x(
      validPoints.length - 1
    );

  const lastY =
    y(
      Number(
        lastPoint.bsi_pct
      )
    );

  ctx.beginPath();

  ctx.arc(
    lastX,
    lastY,
    3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = lineColor;

  ctx.globalAlpha =
    isThin(lastPoint)
      ? 0.45
      : 1;

  ctx.fill();

  ctx.globalAlpha = 1;


  /* =======================================================
     Curve 요약

     마지막 점은 표본이 가장 적은 지점이므로
     값만 크게 띄우지 않고 표본 수를 함께 보여준다.
     ======================================================= */

  const lastSamples =
    Number(lastPoint.samples) || 0;

  const summary =
    document.getElementById(
      "curveLatest"
    );

  // 벤치마크가 있으면 초과수익을 앞에 세운다
  const lastAlpha =
    showBenchmark &&
    isValidNumber(
      lastPoint.alpha_pct
    )
      ? Number(lastPoint.alpha_pct)
      : null;

  summary.textContent =
    lastAlpha !== null
      ? `Day ${
          lastPoint.day ?? "-"
        } · 시장 대비 ${
          fmtPctShort(lastAlpha)
        } · ${lastSamples} samples`
      : `Day ${
          lastPoint.day ?? "-"
        } · ${
          fmtPctShort(lastValue)
        } · ${lastSamples} samples`;

  summary.classList.toggle(
    "thin-sample",
    isThin(lastPoint)
  );


  /* 안내 문구 */

  const note =
    document.getElementById(
      "curveNote"
    );

  if (note) {

    const thinFrom =
      validPoints.find(isThin);

    const sampleNote =
      thinFrom
        ? `Day ${thinFrom.day}부터는 표본이 ` +
          `${baseSamples}개 중 ` +
          `${Number(thinFrom.samples) || 0}개로 줄어듭니다 ` +
          `(점선 구간).`
        : `전 구간 표본 ${baseSamples}개 기준입니다.`;

    const benchmarkNote =
      showBenchmark
        ? `회색 선은 같은 기간 ${benchmarkLabel} 수익률입니다. ` +
          `두 선의 간격이 초과수익입니다. `
        : "";

    note.textContent =
      benchmarkNote + sampleNote;

  }

}


/* =========================================================
   PERFORMANCE VALUE
   ========================================================= */

function performanceValue(value) {

  if (
    !isValidNumber(value)
  ) {

    return `
      <span
        style="color:var(--text-faint)"
      >
        N/A
      </span>
    `;

  }

  const number =
    Number(value);

  return `
    <span
      class="${
        number >= 0
          ? "positive"
          : "negative"
      }"
    >
      ${fmtPct(number)}
    </span>
  `;

}


/* =========================================================
   PERFORMANCE
   ========================================================= */

/*
   집계값은 statistics.json(0.3KB)에서 그대로 읽는다.

   예전에는 performance.json(230KB)을 받아
   평균 / 승률을 브라우저에서 다시 계산했다.

   같은 값을 두 곳에서 계산하면
   기술 저장소의 정의가 바뀌었을 때
   웹이 조용히 다른 값을 보여주게 된다.
   계산은 한 곳(research_tracker.py)에서만 한다.
*/

function renderPerformance(stats) {

  const table =
    document.getElementById(
      "performanceTable"
    );

  if (!stats) {

    table.innerHTML = `
      <tr>
        <td colspan="2">
          Performance 데이터가 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  const completed =
    stats.completed ?? 0;

  const total =
    stats.signals ??
    stats.total_signals ??
    0;

  const pending =
    stats.pending ??
    Math.max(
      Number(total) -
      Number(completed),
      0
    );

  document.getElementById(
    "performanceStatus"
  ).textContent =
    `${completed}/${total} 완료`;

  if (!completed) {

    table.innerHTML = `
      <tr>
        <td>
          5D Performance
        </td>

        <td>
          <span
            style="color:var(--text-faint)"
          >
            데이터 축적 중
          </span>
        </td>
      </tr>

      <tr>
        <td>
          완료 Signal
        </td>

        <td>
          ${escapeHTML(completed)}
        </td>
      </tr>

      <tr>
        <td>
          대기 Signal
        </td>

        <td>
          ${escapeHTML(pending)}
        </td>
      </tr>
    `;

    return;
  }

  const rows = [

    [
      "5D 평균 수익률",
      performanceValue(
        stats.avg_return_5d_pct
      )
    ],

    [
      "5D 승률",
      isValidNumber(
        stats.win_rate_5d_pct
      )
        ? Number(
            stats.win_rate_5d_pct
          ).toFixed(2) + "%"
        : "N/A"
    ],

    [
      "평균 승리",
      performanceValue(
        stats.avg_win_5d_pct
      )
    ],

    [
      "평균 손실",
      performanceValue(
        stats.avg_loss_5d_pct
      )
    ],

    [
      "Target 도달",
      escapeHTML(
        stats.target_hit_count ?? 0
      )
    ],

    [
      "Stop 도달",
      escapeHTML(
        stats.stop_hit_count ?? 0
      )
    ],

    [
      "완료 Signal",
      escapeHTML(completed)
    ],

    [
      "대기 Signal",
      escapeHTML(pending)
    ]

  ];

  table.innerHTML =
    rows
      .map(
        ([key, value]) => `
          <tr>
            <td>${escapeHTML(key)}</td>
            <td>${value}</td>
          </tr>
        `
      )
      .join("");

}


/* =========================================================
   STATISTICS
   ========================================================= */

function renderStatistics(data) {

  const grid =
    document.getElementById(
      "statisticsGrid"
    );

  if (!data) {

    grid.innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1;"
      >
        Statistics 데이터가 없습니다.
      </div>
    `;

    return;
  }

  /*
     벤치마크가 있으면 초과수익을 앞쪽에 배치한다.

     "승률 37%"는 그 자체로 좋은지 나쁜지 알 수 없다.
     "시장 대비 +3.5%"가 실제로 읽히는 숫자다.
  */

  const hasBenchmark =
    isValidNumber(
      data.avg_alpha_5d_pct
    );

  const benchmarkStats =
    hasBenchmark
      ? [
          [
            `시장 대비 (${
              data.benchmark_ticker || "벤치마크"
            })`,

            fmtPct(
              data.avg_alpha_5d_pct
            )
          ],

          [
            "시장을 이긴 비율",

            isValidNumber(
              data.alpha_win_rate_5d_pct
            )
              ? Number(
                  data.alpha_win_rate_5d_pct
                ).toFixed(2) + "%"
              : "N/A"
          ],

          [
            "같은 기간 시장",

            fmtPct(
              data.benchmark_avg_return_5d_pct
            )
          ]
        ]
      : [];

  const stats = [

    ...benchmarkStats,

    [
      "5D 승률",

      isValidNumber(
        data.win_rate_5d_pct
      )
        ? Number(
            data.win_rate_5d_pct
          ).toFixed(2) + "%"
        : "N/A"
    ],

    [
      "5D 평균 수익률",

      fmtPct(
        data.avg_return_5d_pct
      )
    ],

    [
      "평균 승리",

      fmtPct(
        data.avg_win_5d_pct
      )
    ],

    [
      "평균 손실",

      fmtPct(
        data.avg_loss_5d_pct
      )
    ],

    [
      "Target Hit",

      data.target_hit_count ?? 0
    ],

    [
      "Stop Hit",

      data.stop_hit_count ?? 0
    ]

  ];

  grid.innerHTML =
    stats
      .map(
        item => `

          <div class="stat-card">

            <div class="k">
              ${escapeHTML(item[0])}
            </div>

            <div class="v">
              ${escapeHTML(item[1])}
            </div>

          </div>

        `
      )
      .join("");

}


/* =========================================================
   RESEARCH 상세

   기술 저장소의 research_tracker.py는 Signal 하나마다

     5D / 10D / 30D / 60D / 90D / 1Y / 5Y 수익률
     MFE / MAE
     Target / Stop 도달 여부와 날짜
     발생 이후 최대 도달 수익률

   까지 계산해 performance.json에 담는다.

   지금까지 화면에는 이 중 아무것도 나오지 않고
   집계값 몇 개만 표시됐다. 여기서 개별 Signal을 보여준다.
   ========================================================= */

function researchCell(value) {

  if (!isValidNumber(value)) {

    return `
      <td class="num faint">-</td>
    `;

  }

  const number = Number(value);

  return `
    <td
      class="num ${
        number >= 0
          ? "positive"
          : "negative"
      }"
    >${fmtPctShort(number)}</td>
  `;

}


function researchOutcome(row) {

  if (row.target_hit) {

    return `
      <span class="badge profit">
        Target
      </span>
    `;

  }

  if (row.stop_hit) {

    return `
      <span class="badge loss">
        Stop
      </span>
    `;

  }

  return `
    <span class="badge">
      보유
    </span>
  `;

}


/*
   한 번에 보여줄 행 수

   완료 Signal은 계속 쌓이기만 한다.
   전부 그리면 페이지가 수만 픽셀이 되므로
   기본은 잘라서 보여주고 "더 보기"로 펼친다.
*/
const RESEARCH_PAGE_SIZE = 50;


function renderResearchTable(
  rows,
  sortKey,
  limit
) {

  const body =
    document.getElementById(
      "researchBody"
    );

  const count =
    document.getElementById(
      "researchCount"
    );

  const more =
    document.getElementById(
      "researchMore"
    );

  if (!body) {
    return;
  }

  if (!rows.length) {

    count.textContent = "0건";

    body.innerHTML = `
      <tr>
        <td colspan="10">
          완료된 Research Signal이 없습니다.
        </td>
      </tr>
    `;

    if (more) {
      more.hidden = true;
    }

    return;
  }

  const sorted =
    rows.slice();

  sorted.sort(
    (a, b) => {

      if (sortKey === "date") {

        return String(
          b.observation_date || ""
        ).localeCompare(
          String(
            a.observation_date || ""
          )
        );

      }

      if (sortKey === "ticker") {

        return String(
          a.ticker
        ).localeCompare(
          String(b.ticker)
        );

      }

      if (sortKey === "mfe") {

        return (
          (Number(b.mfe_pct) || -Infinity) -
          (Number(a.mfe_pct) || -Infinity)
        );

      }

      if (sortKey === "mae") {

        return (
          (Number(a.mae_pct) || Infinity) -
          (Number(b.mae_pct) || Infinity)
        );

      }

      if (sortKey === "alpha") {

        const av =
          Number(a.alphas["5d"]);

        const bv =
          Number(b.alphas["5d"]);

        return (
          (Number.isFinite(bv)
            ? bv
            : -Infinity) -
          (Number.isFinite(av)
            ? av
            : -Infinity)
        );

      }

      // 기본: 5D 수익률 내림차순
      const av =
        Number(a.returns["5d"]);

      const bv =
        Number(b.returns["5d"]);

      return (
        (Number.isFinite(bv)
          ? bv
          : -Infinity) -
        (Number.isFinite(av)
          ? av
          : -Infinity)
      );

    }
  );

  const shown =
    isValidNumber(limit) &&
    Number(limit) > 0
      ? Math.min(
          Number(limit),
          sorted.length
        )
      : sorted.length;

  const visible =
    sorted.slice(0, shown);

  count.textContent =
    shown < sorted.length
      ? `${shown} / ${sorted.length}건`
      : `${sorted.length}건`;

  if (more) {

    if (shown < sorted.length) {

      more.hidden = false;

      more.textContent =
        `나머지 ${sorted.length - shown}건 더 보기`;

    } else {

      more.hidden = true;

    }

  }

  body.innerHTML =
    visible
      .map(
        row => `

          <tr>

            <td class="mono strong">
              ${escapeHTML(row.ticker)}
            </td>

            <td class="mono faint nowrap">
              ${escapeHTML(
                row.observation_date || "-"
              )}
            </td>

            <td class="num">
              ${
                isValidNumber(row.rsi)
                  ? Number(row.rsi).toFixed(1)
                  : "-"
              }
            </td>

            ${researchCell(row.returns["5d"])}
            ${researchCell(row.alphas["5d"])}
            ${researchCell(row.returns["10d"])}
            ${researchCell(row.returns["30d"])}

            ${researchCell(row.mfe_pct)}
            ${researchCell(row.mae_pct)}

            <td class="nowrap">
              ${researchOutcome(row)}
            </td>

          </tr>

        `
      )
      .join("");

}


/* =========================================================
   RESULT RENDER
   ========================================================= */

function renderResults(list) {

  const container =
    document.getElementById(
      "resultsContainer"
    );

  const resultCount =
    document.getElementById(
      "resultCount"
    );

  resultCount.textContent =
    list.length
      ? `${list.length}개 종목`
      : "0개 종목";

  if (!list.length) {

    container.innerHTML = `
      <div class="empty-state">

        조건에 맞는 종목이 없습니다.

        <br>

        필터를 완화해보십시오.

      </div>
    `;

    return;
  }

  container.innerHTML =
    list
      .map(
        row => {

          const dirClass =
            changeClass(
              row.day_change_pct
            );

          const revenueClass =
            changeClass(
              row.revenue_growth_pct
            );

          const ebitdaClass =
            changeClass(
              row.ebitda_growth_pct
            );

          const cashFlowClass =
            changeClass(
              row.operating_cash_flow_change_pct
            );

          return `

            <div
              class="card ${dirClass}"
            >

              <div class="card-top">

                <div>

                  <div class="card-ticker">
                    ${escapeHTML(row.ticker || "N/A")}
                  </div>

                  <div class="card-name">
                    ${escapeHTML(row.name || "N/A")}
                  </div>

                </div>

                <div class="card-price-block">

                  <div class="card-price mono">
                    ${fmtPrice(row.price)}
                  </div>

                  <div
                    class="
                      card-change
                      mono
                      ${dirClass}
                    "
                  >
                    ${fmtPctShort(
                      row.day_change_pct
                    )}
                  </div>

                </div>

              </div>


              <div class="badge-row">

                <span class="badge rsi-low">

                  RSI
                  ${
                    isValidNumber(row.rsi)
                      ? Number(row.rsi).toFixed(1)
                      : "N/A"
                  }

                </span>

                <span class="badge">

                  시총
                  ${
                    isValidNumber(
                      row.market_cap_b
                    )
                      ? Number(
                          row.market_cap_b
                        ).toFixed(2)
                      : "N/A"
                  }B

                </span>

                ${createProfitBadge(row)}

                ${createVolumeBadge(row)}

              </div>


              <div class="metric-grid">

                <div class="metric">

                  <div class="k">
                    매출 최신분기
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.revenue_latest_m
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    매출 이전분기
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.revenue_previous_m
                    )}
                  </div>

                </div>

                <div class="metric full">

                  <div class="k">
                    매출 증감률
                  </div>

                  <div
                    class="
                      v
                      ${revenueClass}
                    "
                  >
                    ${fmtPct(
                      row.revenue_growth_pct
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    EBITDA 최신분기
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.ebitda_latest_m
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    EBITDA 이전분기
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.ebitda_previous_m
                    )}
                  </div>

                </div>

                <div class="metric full">

                  <div class="k">
                    EBITDA 증감률
                  </div>

                  <div
                    class="
                      v
                      ${ebitdaClass}
                    "
                  >
                    ${fmtPct(
                      row.ebitda_growth_pct
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    영업현금흐름 최신
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.operating_cash_flow_latest_m
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    영업현금흐름 이전
                  </div>

                  <div class="v">
                    ${fmtM(
                      row.operating_cash_flow_previous_m
                    )}
                  </div>

                </div>

                <div class="metric full">

                  <div class="k">
                    영업현금흐름 증감률
                  </div>

                  <div
                    class="
                      v
                      ${cashFlowClass}
                    "
                  >
                    ${fmtPct(
                      row.operating_cash_flow_change_pct
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    거래량
                  </div>

                  <div class="v">
                    ${fmtVolume(
                      row.volume
                    )}
                  </div>

                </div>

                <div class="metric">

                  <div class="k">
                    평균 거래량 20일
                  </div>

                  <div class="v">
                    ${fmtVolume(
                      row.volume_avg_20d
                    )}
                  </div>

                </div>

                <div class="metric full">

                  <div class="k">
                    거래량 비율
                  </div>

                  <div class="v">

                    ${
                      isValidNumber(
                        row.volume_ratio
                      )
                        ? Number(
                            row.volume_ratio
                          ).toFixed(2) + "x"
                        : "N/A"
                    }

                  </div>

                </div>

              </div>


              <div class="plan-row">

                <div class="plan-item target">

                  <div class="k">
                    목표가
                  </div>

                  <div class="v">
                    ${fmtPrice(
                      row.target_price
                    )}
                  </div>

                  <div class="k">
                    기대수익
                  </div>

                  <div class="v">
                    ${fmtPct(
                      row.expected_gain_pct
                    )}
                  </div>

                </div>

                <div class="plan-item stop">

                  <div class="k">
                    손절가
                  </div>

                  <div class="v">
                    ${fmtPrice(
                      row.stop_loss
                    )}
                  </div>

                  <div class="k">
                    예상손실
                  </div>

                  <div class="v">

                    ${
                      isValidNumber(
                        row.expected_loss_pct
                      )
                        ? "-" +
                          Number(
                            row.expected_loss_pct
                          ).toFixed(1) +
                          "%"
                        : "N/A"
                    }

                  </div>

                </div>

                <div class="plan-item">

                  <div class="k">
                    Risk / Reward
                  </div>

                  <div class="v">

                    ${
                      isValidNumber(
                        row.risk_reward
                      )
                        ? Number(
                            row.risk_reward
                          ).toFixed(2) + ":1"
                        : "N/A"
                    }

                  </div>

                </div>

              </div>

            </div>

          `;

        }
      )
      .join("");

}
