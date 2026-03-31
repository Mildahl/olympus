/**
 * Planar projection orchestration: operators call these with `{ projectionTool, context }`.
 * Geometry, indicators, preview WebGL, and axis metadata live on ProjectionTool.
 */

function setCutPlane(axis, position, { projectionTool, context }) {

  projectionTool.syncPlanarSectionPreviewSize();

  axis = projectionTool.normalizePlanarAxisKey(axis);

  projectionTool.axis = axis;

  projectionTool.position = position;

  if (projectionTool.viewportPlaneGroup) {
    projectionTool.removeCutPlane(context.editor, projectionTool.viewportPlaneGroup);

    projectionTool.disposeCutPlaneGroup(projectionTool.viewportPlaneGroup);

    projectionTool.viewportPlaneGroup = null;
  }

  const group = projectionTool.buildViewportCutPlaneIndicatorGroup(
    context,
    projectionTool.axis,
    projectionTool.position
  );

  if (group) {
    projectionTool.addCutPlane(context.editor, group);

    projectionTool.viewportPlaneGroup = group;
  }

  context.signals.projectionCutPlaneChanged.dispatch({
    axis: projectionTool.axis,
    position: projectionTool.position,
  });


}


function generateCutPlaneSection(axis, position, { projectionTool, context }) {
  setCutPlane(axis, position, { projectionTool, context });

  const { lineGeometry, bounds, vertexCount } = projectionTool.computePlanarSectionGeometry(
    axis,
    position,
    context
  );

  context.signals.projectionCutPlaneChanged.dispatch({
    axis: projectionTool.axis,
    position: projectionTool.position,
  });

  const sectionPayload = {
    axis: projectionTool.axis,
    position: projectionTool.position,
    lineGeometry,
    bounds,
    vertexCount,
  };

  projectionTool.applyPlanarSectionPreviewFromRegeneratedPayload(sectionPayload);

  context.signals.projectionSectionRegenerated.dispatch(sectionPayload);
  projectionTool.renderPlanarSectionPreviewFrame();
}


export { generateCutPlaneSection, setCutPlane };
