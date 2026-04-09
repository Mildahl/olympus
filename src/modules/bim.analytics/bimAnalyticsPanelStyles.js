const chartHostBaseStyles = {
  width: "100%",
  position: "relative",
};

export const analyticsContentRootStyles = {
  width: "100%",
};

export const analyticsSectionTitleStyles = {
  fontSize: "0.85rem",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.72))",
};

export const analyticsSubtitleStyles = {
  fontSize: "0.8rem",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.65))",
  marginTop: "var(--phi-0-5)",
};

export const analyticsSubtitleScheduleSummaryStyles = {
  fontSize: "0.8rem",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.65))",
  marginTop: "0",
};

export const analyticsChartCaptionStyles = {
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.55))",
  margin: "0",
  padding: "0 2px",
};

export const analyticsCompositionRowStyles = {
  flexWrap: "wrap",
  width: "100%",
  alignItems: "stretch",
};

export const analyticsChartHalfHostStyles = {
  ...chartHostBaseStyles,
  flex: "1 1 14rem",
  minWidth: "12rem",
  minHeight: "220px",
};

export const analyticsInsightRadarBandStyles = {
  flexWrap: "wrap",
  alignItems: "flex-start",
  width: "100%",
};

export const analyticsRadarCellHostStyles = {
  ...chartHostBaseStyles,
  flex: "0 0 auto",
  width: "100%",
  maxWidth: "20rem",
  minHeight: "180px",
};

export const analyticsInsightPairRowStyles = {
  flexWrap: "wrap",
  width: "100%",
  alignItems: "stretch",
};

export const analyticsInsightHalfHostStyles = {
  ...chartHostBaseStyles,
  flex: "1 1 min(100%, 18rem)",
  minWidth: "0",
  minHeight: "0",
  display: "flex",
  flexDirection: "column",
  gap: "var(--phi-0-25)",
};

export const analyticsInsightTypesBandStyles = {
  width: "100%",
};

export const analyticsTypesChartHostStyles = {
  ...chartHostBaseStyles,
  minHeight: "200px",
};

export const analyticsQuantityRowStyles = {
  flexWrap: "wrap",
  alignItems: "stretch",
  width: "100%",
};

export const analyticsQuantityStatsColumnStyles = {
  flex: "0 0 auto",
  minWidth: "7.5rem",
};

export const analyticsQuantityDoughnutHostStyles = {
  ...chartHostBaseStyles,
  flex: "0 0 auto",
  width: "11rem",
  maxWidth: "100%",
  minHeight: "150px",
};

export const analyticsQtoBarHostStyles = {
  ...chartHostBaseStyles,
  flex: "1 1 14rem",
  minWidth: "10rem",
  minHeight: "160px",
  display: "flex",
  flexDirection: "column",
  gap: "var(--phi-0-25)",
};

export const analyticsScheduleChartHostStyles = {
  ...chartHostBaseStyles,
  minHeight: "160px",
  display: "flex",
  flexDirection: "column",
  gap: "var(--phi-0-25)",
};

export const analyticsCostChartHostStyles = {
  ...chartHostBaseStyles,
  minHeight: "160px",
  display: "flex",
  flexDirection: "column",
  gap: "var(--phi-0-25)",
};

export const analyticsScrollListStyles = {
  maxHeight: "11rem",
  overflowY: "auto",
  overflowX: "hidden",
  border: "1px solid var(--theme-border, rgba(255, 255, 255, 0.1))",
  borderRadius: "4px",
  padding: "var(--phi-0-25)",
};

export const analyticsDenseListItemStyles = {
  minHeight: "1.5rem",
  padding: "0.15rem 0.35rem",
  fontSize: "0.78rem",
};

export const analyticsDenseRowStyles = {
  gap: "var(--phi-0-5)",
};

export const analyticsDenseListRowItemStyles = {
  ...analyticsDenseListItemStyles,
  ...analyticsDenseRowStyles,
};

export const analyticsStatBlockStyles = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  padding: "var(--phi-0-5)",
  border: "1px solid var(--theme-border, rgba(255, 255, 255, 0.12))",
  borderRadius: "4px",
  flex: "1",
  minWidth: "0",
};

export const analyticsFilterToolbarStyles = {
  width: "100%",
  padding: "var(--phi-0-5)",
  border: "1px solid var(--theme-border, rgba(255, 255, 255, 0.12))",
  borderRadius: "6px",
};

export const analyticsFilterLabelStyles = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.55))",
};

export const analyticsFilterActionsRowStyles = {
  flexWrap: "wrap",
  alignItems: "center",
};

export const analyticsSelectFullWidthStyles = {
  width: "100%",
  maxWidth: "100%",
};

export const analyticsKpiMetaRowStyles = {
  flexWrap: "wrap",
  alignItems: "center",
};

export const analyticsFilterChipsRowStyles = {
  flexWrap: "wrap",
  alignItems: "center",
};

export const analyticsInsightNarrativeStyles = {
  fontSize: "0.78rem",
  lineHeight: "1.35",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.62))",
  padding: "0 var(--phi-0-25)",
};

export const analyticsProjectTitleStyles = {
  fontSize: "1rem",
  fontWeight: "600",
  letterSpacing: "0.02em",
};

export const analyticsKpiCellStyles = {
  minHeight: "4.25rem",
};

export const analyticsFilterHintStyles = {
  fontSize: "0.75rem",
  color: "var(--theme-text-light, rgba(255, 255, 255, 0.55))",
};

export const analyticsChipStyles = {
  display: "inline-block",
  padding: "0.2rem 0.5rem",
  borderRadius: "999px",
  fontSize: "0.75rem",
  background: "rgba(0, 230, 118, 0.12)",
  border: "1px solid rgba(0, 230, 118, 0.35)",
};

export const analyticsSpatialCellStyles = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  padding: "var(--phi-0-5)",
  border: "1px solid var(--theme-border, rgba(255, 255, 255, 0.12))",
  borderRadius: "4px",
};

export const analyticsBottomFooterStyles = {
  marginTop: "var(--phi-0-5)",
};

export const analyticsBottomKpiCellStyles = {
  minHeight: "3.5rem",
  padding: "var(--phi-0-35)",
  fontSize: "0.72rem",
};
