import { Components as UIComponents } from "../../ui/Components/Components.js";

function attachViewportLoadStatusStrip(context, viewportContainer) {
  if (!viewportContainer || !viewportContainer.dom) {
    return;
  }

  const viewportDom = viewportContainer.dom;

  const progressSignal =
    context.signals && context.signals.bimGeometryLoadProgress;

  if (!progressSignal) {
    return;
  }

  const strip = UIComponents.div().addClass("ViewportLoadStatusStrip");

  const headerRow = UIComponents.row().setStyles({
    width: "100%",
  });

  headerRow.setStyle("align-items", ["center"]);

  headerRow.setStyle("justify-content", ["space-between"]);

  const label = UIComponents
    .text("")
    .addClass("ViewportLoadStatusStrip-label");

  const percentLabel = UIComponents
    .text("0%")
    .addClass("ViewportLoadStatusStrip-percent");

  const track = UIComponents.div().addClass("ViewportLoadStatusStrip-track");

  const fill = UIComponents.div().addClass("ViewportLoadStatusStrip-fill");

  fill.setStyle("transition", ["width 0.2s ease"]);

  track.add(fill);

  headerRow.add(label, percentLabel);

  strip.add(headerRow, track);

  strip.setStyle("display", ["none"]);

  viewportDom.appendChild(strip.dom);

  let hideAfterCompleteTimer = null;

  function clearCompleteTimer() {
    if (hideAfterCompleteTimer !== null) {
      window.clearTimeout(hideAfterCompleteTimer);

      hideAfterCompleteTimer = null;
    }
  }

  function normalizeProgress(value) {
    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      return 0;
    }

    if (parsed < 0) {
      return 0;
    }

    if (parsed > 100) {
      return 100;
    }

    return parsed;
  }

  function showBar(text, percentage) {
    clearCompleteTimer();

    strip.setStyle("display", ["flex"]);

    label.setTextContent(text || "");

    const nextPercentage = normalizeProgress(percentage);

    percentLabel.setTextContent(`${Math.round(nextPercentage)}%`);

    fill.setStyle("width", [`${nextPercentage}%`]);
  }

  function updateBar(text, percentage) {
    label.setTextContent(text || "");

    const nextPercentage = normalizeProgress(percentage);

    percentLabel.setTextContent(`${Math.round(nextPercentage)}%`);

    fill.setStyle("width", [`${nextPercentage}%`]);
  }

  function hideBar() {
    clearCompleteTimer();

    strip.setStyle("display", ["none"]);

    percentLabel.setTextContent("0%");

    fill.setStyle("width", ["0%"]);
  }

  progressSignal.add((payload) => {
    if (!payload) {
      return;
    }

    const phase = payload.phase;

    if (phase === "start") {
      showBar(payload.message, payload.percent);

      return;
    }

    if (phase === "update") {
      updateBar(payload.message, payload.percent);

      return;
    }

    if (phase === "complete") {
      updateBar(payload.message, payload.percent);

      clearCompleteTimer();

      hideAfterCompleteTimer = window.setTimeout(() => {
        hideAfterCompleteTimer = null;

        hideBar();
      }, 600);

      return;
    }

    if (phase === "error") {
      clearCompleteTimer();

      hideBar();
    }
  });
}

export { attachViewportLoadStatusStrip };
