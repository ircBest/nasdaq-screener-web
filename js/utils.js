/* =========================================================
   utils.js
   공통 유틸리티
   ========================================================= */
/* =========================================================
   SAFE TEXT
   ========================================================= */
function escapeHTML(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
/* =========================================================
   NUMBER
   ========================================================= */
function isValidNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }
  return Number.isFinite(
    Number(value)
  );
}
/* =========================================================
   PERCENT
   ========================================================= */
function fmtPct(value) {
  if (!isValidNumber(value)) {
    return "N/A";
  }
  const number =
    Number(value);
  const sign =
    number >= 0
      ? "+"
      : "";
  return (
    sign +
    number.toFixed(2) +
    "%"
  );
}
/* =========================================================
   SHORT PERCENT
   ========================================================= */
function fmtPctShort(value) {
  if (!isValidNumber(value)) {
    return "N/A";
  }
  const number =
    Number(value);
  const sign =
    number >= 0
      ? "+"
      : "";
  return (
    sign +
    number.toFixed(1) +
    "%"
  );
}
/* =========================================================
   PRICE
   ========================================================= */
function fmtPrice(value) {
  if (!isValidNumber(value)) {
    return "N/A";
  }
  return (
    "$" +
    Number(value).toFixed(2)
  );
}
/* =========================================================
   MONEY M
   ========================================================= */
function fmtM(value) {
  if (!isValidNumber(value)) {
    return "N/A";
  }
  return (
    "$" +
    Number(value).toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 1
      }
    ) +
    "M"
  );
}
/* =========================================================
   VOLUME
   ========================================================= */
function fmtVolume(value) {
  if (!isValidNumber(value)) {
    return "N/A";
  }
  return Number(value)
    .toLocaleString("en-US");
}
/* =========================================================
   CHANGE CLASS
   ========================================================= */
function changeClass(value) {
  if (!isValidNumber(value)) {
    return "flat";
  }
  const number =
    Number(value);
  if (number > 0) {
    return "up";
  }
  if (number < 0) {
    return "down";
  }
  return "flat";
}
/* =========================================================
   BSI CLASS
   ========================================================= */
function bsiClass(value) {
  if (!isValidNumber(value)) {
    return "bsi-neutral";
  }
  const number =
    Number(value);
  if (number > 0) {
    return "bsi-positive";
  }
  if (number < 0) {
    return "bsi-negative";
  }
  return "bsi-neutral";
}
/* =========================================================
   DATE
   ========================================================= */
function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date =
    new Date(value);
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }
  return date.toLocaleString(
    "ko-KR",
    {
      timeZone:
        "Asia/Seoul"
    }
  );
}
