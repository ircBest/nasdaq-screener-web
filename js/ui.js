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

  grid.innerHTML =
    Object.keys(BSI_LABELS)
      .map(key => {

        const item =
          periods[key] || {};

        const value =
          item.value;

        const samples =
          item.samples ?? 0;

        return `
          <div class="bsi-item">

            <div class="period">
              ${BSI_LABELS[key]}
            </div>

            <div
              class="
                value
                ${bsiClass(value)}
              "
            >
              ${
                isValidNumber(value)
                  ? fmtPctShort(value)
                  : "데이터 부족"
              }
            </div>

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
    data.curve || []
  );

}


/* =========================================================
   BSI CURVE
   ========================================================= */

function renderBSICurve(curve) {

  const canvas =
    document.getElementById(
      "bsiCanvas"
    );

  const ctx =
    canvas.getContext("2d");

  const width =
    canvas.width;

  const height =
    canvas.height;

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

  const minValue =
    Math.min(
      ...values,
      0
    );

  const maxValue =
    Math.max(
      ...values,
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


  /* CURVE */

  ctx.beginPath();

  validPoints.forEach(
    (point, index) => {

      const value =
        Number(
          point.bsi_pct
        );

      const px =
        x(index);

      const py =
        y(value);

      if (index === 0) {

        ctx.moveTo(
          px,
          py
        );

      } else {

        ctx.lineTo(
          px,
          py
        );

      }

    }
  );


  const lastValue =
    values[
      values.length - 1
    ];

  ctx.strokeStyle =
    lastValue >= 0
      ? "#3ECF8E"
      : "#FF5C5C";

  ctx.lineWidth = 2;

  ctx.stroke();


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

  ctx.fillStyle =
    lastValue >= 0
      ? "#3ECF8E"
      : "#FF5C5C";

  ctx.fill();


  document.getElementById(
    "curveLatest"
  ).textContent =
    `Day ${
      lastPoint.day ?? "-"
    } · ${
      fmtPctShort(lastValue)
    }`;

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

function renderPerformance(data) {

  const table =
    document.getElementById(
      "performanceTable"
    );

  if (!data) {

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
    data.completed ??
    data.completed_signals ??
    0;

  const total =
    data.total_signals ??
    data.signals ??
    0;

  const pending =
    data.pending ??
    data.pending_signals ??
    Math.max(
      Number(total) -
      Number(completed),
      0
    );

  document.getElementById(
    "performanceStatus"
  ).textContent =
    `${completed}/${total} 완료`;

  const rows =
    Array.isArray(
      data.performance
    )
      ? data.performance
      : [];

  if (!rows.length) {

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

  const returns =
    rows
      .map(
        row =>
          Number(
            row.return_5d_pct
          )
      )
      .filter(
        value =>
          Number.isFinite(value)
      );

  let avgReturn = null;
  let winRate = null;
  let avgWin = null;
  let avgLoss = null;

  if (returns.length) {

    avgReturn =
      returns.reduce(
        (a, b) =>
          a + b,
        0
      ) /
      returns.length;

    const wins =
      returns.filter(
        value =>
          value > 0
      );

    const losses =
      returns.filter(
        value =>
          value <= 0
      );

    winRate =
      wins.length /
      returns.length *
      100;

    if (wins.length) {

      avgWin =
        wins.reduce(
          (a, b) =>
            a + b,
          0
        ) /
        wins.length;

    }

    if (losses.length) {

      avgLoss =
        losses.reduce(
          (a, b) =>
            a + b,
          0
        ) /
        losses.length;

    }

  }

  table.innerHTML = `

    <tr>

      <td>
        5D 평균 수익률
      </td>

      <td>
        ${performanceValue(avgReturn)}
      </td>

    </tr>

    <tr>

      <td>
        5D 승률
      </td>

      <td>
        ${
          isValidNumber(winRate)
            ? winRate.toFixed(2) + "%"
            : "N/A"
        }
      </td>

    </tr>

    <tr>

      <td>
        평균 승리
      </td>

      <td>
        ${performanceValue(avgWin)}
      </td>

    </tr>

    <tr>

      <td>
        평균 손실
      </td>

      <td>
        ${performanceValue(avgLoss)}
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

  const stats = [

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
