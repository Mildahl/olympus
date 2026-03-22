const DIRECTOR_CHART_PALETTE = [
  "rgba(0, 230, 118, 0.75)",
  "rgba(0, 188, 212, 0.75)",
  "rgba(156, 39, 176, 0.75)",
  "rgba(255, 193, 7, 0.85)",
  "rgba(244, 67, 54, 0.75)",
  "rgba(103, 58, 183, 0.75)",
  "rgba(255, 152, 0, 0.8)",
  "rgba(233, 30, 99, 0.75)",
  "rgba(63, 81, 181, 0.75)",
  "rgba(139, 195, 74, 0.8)",
  "rgba(0, 150, 136, 0.75)",
  "rgba(121, 85, 72, 0.75)",
];

function directorChartBackgrounds(count) {
  const out = [];

  for (let index = 0; index < count; index++) {
    out.push(DIRECTOR_CHART_PALETTE[index % DIRECTOR_CHART_PALETTE.length]);
  }

  return out;
}

function directorChartBorders(count) {
  const out = [];

  for (let index = 0; index < count; index++) {
    const base = DIRECTOR_CHART_PALETTE[index % DIRECTOR_CHART_PALETTE.length];

    out.push(base.replace("0.75", "1").replace("0.8", "1").replace("0.85", "1"));
  }

  return out;
}

export { DIRECTOR_CHART_PALETTE, directorChartBackgrounds, directorChartBorders };
