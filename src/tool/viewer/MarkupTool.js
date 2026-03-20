/**
 * MarkupTool - Stateless markup/annotation utilities
 * 
 * Tasks 2.7-2.10: Shape creation, measurement, serialization, rendering
 * 
 * Provides primitives for:
 * - Shape creation (line, rectangle, circle, arrow, cloud)
 * - Text annotations
 * - Measurement tools (dimension, area)
 * - Serialization to/from JSON
 * - Rendering to canvas and SVG
 * 
 * This is a stateless utility class - all state is managed by markup-core.js
 */
const MARKUP_TYPES = {
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ELLIPSE: 'ellipse',
  ARROW: 'arrow',
  CLOUD: 'cloud',
  TEXT: 'text',
  DIMENSION: 'dimension',
  AREA: 'area',
  POLYLINE: 'polyline',
  POLYGON: 'polygon',
};
class MarkupTool {

  /**
   * Create a line markup.
   * @param {Object} start - { x, y }
   * @param {Object} end - { x, y }
   * @param {Object} style - Style overrides
   * @returns {Object} Line markup data
   */
  static createLine(start, end, style = {}) {
    return {
      type: MARKUP_TYPES.LINE,
      data: { start: { ...start }, end: { ...end } },
      style,
    };
  }

  /**
   * Create a rectangle markup.
   * @param {Object} bounds - { x, y, width, height } or { start, end }
   * @param {Object} style - Style overrides
   * @returns {Object} Rectangle markup data
   */
  static createRectangle(bounds, style = {}) {
    let data;

    if (bounds.start && bounds.end) {
      
      const x = Math.min(bounds.start.x, bounds.end.x);

      const y = Math.min(bounds.start.y, bounds.end.y);

      const width = Math.abs(bounds.end.x - bounds.start.x);

      const height = Math.abs(bounds.end.y - bounds.start.y);

      data = { x, y, width, height };
    } else {
      data = { ...bounds };
    }

    return {
      type: MARKUP_TYPES.RECTANGLE,
      data,
      style,
    };
  }

  /**
   * Create a circle markup.
   * @param {Object} center - { x, y }
   * @param {number} radius - Circle radius
   * @param {Object} style - Style overrides
   * @returns {Object} Circle markup data
   */
  static createCircle(center, radius, style = {}) {
    return {
      type: MARKUP_TYPES.CIRCLE,
      data: { center: { ...center }, radius },
      style,
    };
  }

  /**
   * Create an ellipse markup.
   * @param {Object} center - { x, y }
   * @param {number} radiusX - Horizontal radius
   * @param {number} radiusY - Vertical radius
   * @param {Object} style - Style overrides
   * @returns {Object} Ellipse markup data
   */
  static createEllipse(center, radiusX, radiusY, style = {}) {
    return {
      type: MARKUP_TYPES.ELLIPSE,
      data: { center: { ...center }, radiusX, radiusY },
      style,
    };
  }

  /**
   * Create an arrow markup.
   * @param {Object} start - { x, y }
   * @param {Object} end - { x, y }
   * @param {Object} style - Style overrides (headSize, etc.)
   * @returns {Object} Arrow markup data
   */
  static createArrow(start, end, style = {}) {
    return {
      type: MARKUP_TYPES.ARROW,
      data: { start: { ...start }, end: { ...end } },
      style: { headSize: 10, ...style },
    };
  }

  /**
   * Create a cloud/revision markup.
   * @param {Object[]} points - Array of { x, y } points
   * @param {Object} style - Style overrides (arcRadius, etc.)
   * @returns {Object} Cloud markup data
   */
  static createCloud(points, style = {}) {
    return {
      type: MARKUP_TYPES.CLOUD,
      data: { points: points.map(p => ({ ...p })) },
      style: { arcRadius: 8, ...style },
    };
  }

  /**
   * Create a text annotation.
   * @param {Object} position - { x, y }
   * @param {string} text - Text content
   * @param {Object} style - Style overrides (fontSize, fontFamily, etc.)
   * @returns {Object} Text markup data
   */
  static createText(position, text, style = {}) {
    return {
      type: MARKUP_TYPES.TEXT,
      data: { x: position.x, y: position.y, text },
      style: { fontSize: 14, fontFamily: 'Arial, sans-serif', ...style },
    };
  }

  /**
   * Create a polyline markup.
   * @param {Object[]} points - Array of { x, y } points
   * @param {Object} style - Style overrides
   * @returns {Object} Polyline markup data
   */
  static createPolyline(points, style = {}) {
    return {
      type: MARKUP_TYPES.POLYLINE,
      data: { points: points.map(p => ({ ...p })) },
      style,
    };
  }

  /**
   * Create a polygon markup.
   * @param {Object[]} points - Array of { x, y } points
   * @param {Object} style - Style overrides
   * @returns {Object} Polygon markup data
   */
  static createPolygon(points, style = {}) {
    return {
      type: MARKUP_TYPES.POLYGON,
      data: { points: points.map(p => ({ ...p })) },
      style,
    };
  }
  /**
   * Create a dimension/measurement markup.
   * @param {Object} start - { x, y }
   * @param {Object} end - { x, y }
   * @param {Object} options - { offset, precision, unit, scale }
   * @returns {Object} Dimension markup data
   */
  static createDimension(start, end, options = {}) {
    const {
      offset = 20,
      precision = 2,
      unit = 'm',
      scale = 1,
    } = options;
    const dx = end.x - start.x;

    const dy = end.y - start.y;

    const pixelDistance = Math.sqrt(dx * dx + dy * dy);

    const value = pixelDistance * scale;

    return {
      type: MARKUP_TYPES.DIMENSION,
      data: {
        start: { ...start },
        end: { ...end },
        value,
        offset,
      },
      style: {
        precision,
        unit,
        strokeColor: '#0066cc',
        fillColor: '#0066cc',
        fontSize: 12,
      },
    };
  }

  /**
   * Create an area measurement markup.
   * @param {Object[]} polygon - Array of { x, y } points forming closed polygon
   * @param {Object} options - { precision, unit, scale }
   * @returns {Object} Area markup data
   */
  static createAreaMeasure(polygon, options = {}) {
    const {
      precision = 2,
      unit = 'm²',
      scale = 1,
    } = options;
    let area = 0;

    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;

      area += polygon[i].x * polygon[j].y;

      area -= polygon[j].x * polygon[i].y;
    }

    area = Math.abs(area) / 2;

    const scaledArea = area * scale * scale;
    let cx = 0, cy = 0;

    polygon.forEach(p => { cx += p.x;

 cy += p.y; });

    cx /= n;

    cy /= n;

    return {
      type: MARKUP_TYPES.AREA,
      data: {
        points: polygon.map(p => ({ ...p })),
        value: scaledArea,
        centroid: { x: cx, y: cy },
      },
      style: {
        precision,
        unit,
        strokeColor: '#00cc66',
        fillColor: 'rgba(0, 204, 102, 0.2)',
        fontSize: 12,
      },
    };
  }
  /**
   * Serialize markups to JSON string.
   * @param {Object[]} markups - Array of markup objects
   * @returns {string} JSON string
   */
  static serializeMarkups(markups) {
    return JSON.stringify({
      version: '1.0',
      markups: markups.map(m => ({
        id: m.id,
        type: m.type,
        data: m.data,
        style: m.style,
        metadata: m.metadata,
      })),
    }, null, 2);
  }

  /**
   * Deserialize markups from JSON string.
   * @param {string} json - JSON string
   * @returns {Object[]} Array of markup objects
   */
  static deserializeMarkups(json) {
    try {
      const data = JSON.parse(json);

      return data.markups || [];
    } catch (e) {
      console.warn('Failed to deserialize markups:', e);

      return [];
    }
  }
  /**
   * Render markups to canvas context.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Object[]} markups - Array of markup objects
   * @param {Object} transform - { scale, offsetX, offsetY }
   * @param {Object} options - { selectedId, showHandles }
   */
  static renderMarkupsToCanvas(ctx, markups, transform = {}, options = {}) {
    const {
      scale = 1,
      offsetX = 0,
      offsetY = 0,
    } = transform;

    const {
      selectedId = null,
      showHandles = true,
    } = options;

    ctx.save();

    ctx.translate(offsetX, offsetY);

    ctx.scale(scale, scale);

    markups.forEach(markup => {
      MarkupTool._renderMarkup(ctx, markup);
      if (showHandles && markup.id === selectedId) {
        MarkupTool._renderSelectionHandles(ctx, markup);
      }
    });

    ctx.restore();
  }

  /**
   * Render a single markup to canvas.
   * @private
   */
  static _renderMarkup(ctx, markup) {
    const { type, data, style } = markup;

    ctx.save();
    ctx.strokeStyle = style.strokeColor || '#ff0000';

    ctx.lineWidth = style.strokeWidth || 2;

    ctx.globalAlpha = style.strokeOpacity || 1;

    ctx.fillStyle = style.fillColor || 'transparent';

    if (style.lineDash) {
      ctx.setLineDash(style.lineDash);
    }

    switch (type) {
      case MARKUP_TYPES.LINE:
        ctx.beginPath();

        ctx.moveTo(data.start.x, data.start.y);

        ctx.lineTo(data.end.x, data.end.y);

        ctx.stroke();

        break;

      case MARKUP_TYPES.RECTANGLE:
        ctx.beginPath();

        ctx.rect(data.x, data.y, data.width, data.height);

        if (style.fillOpacity > 0) {
          ctx.globalAlpha = style.fillOpacity;

          ctx.fill();

          ctx.globalAlpha = style.strokeOpacity || 1;
        }

        ctx.stroke();

        break;

      case MARKUP_TYPES.CIRCLE:
        ctx.beginPath();

        ctx.arc(data.center.x, data.center.y, data.radius, 0, Math.PI * 2);

        if (style.fillOpacity > 0) {
          ctx.globalAlpha = style.fillOpacity;

          ctx.fill();

          ctx.globalAlpha = style.strokeOpacity || 1;
        }

        ctx.stroke();

        break;

      case MARKUP_TYPES.ELLIPSE:
        ctx.beginPath();

        ctx.ellipse(data.center.x, data.center.y, data.radiusX, data.radiusY, 0, 0, Math.PI * 2);

        if (style.fillOpacity > 0) {
          ctx.globalAlpha = style.fillOpacity;

          ctx.fill();

          ctx.globalAlpha = style.strokeOpacity || 1;
        }

        ctx.stroke();

        break;

      case MARKUP_TYPES.ARROW:
        MarkupTool._renderArrow(ctx, data.start, data.end, style);

        break;

      case MARKUP_TYPES.TEXT:
        ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || 14}px ${style.fontFamily || 'Arial'}`;

        ctx.fillStyle = style.fillColor || '#ff0000';

        ctx.globalAlpha = style.fillOpacity || 1;

        ctx.fillText(data.text, data.x, data.y);

        break;

      case MARKUP_TYPES.CLOUD:
        MarkupTool._renderCloud(ctx, data.points, style);

        break;

      case MARKUP_TYPES.POLYLINE:
        if (data.points.length > 1) {
          ctx.beginPath();

          ctx.moveTo(data.points[0].x, data.points[0].y);

          data.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));

          ctx.stroke();
        }

        break;

      case MARKUP_TYPES.POLYGON:

      case MARKUP_TYPES.AREA:
        if (data.points.length > 2) {
          ctx.beginPath();

          ctx.moveTo(data.points[0].x, data.points[0].y);

          data.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));

          ctx.closePath();

          if (style.fillOpacity > 0) {
            ctx.globalAlpha = style.fillOpacity;

            ctx.fill();

            ctx.globalAlpha = style.strokeOpacity || 1;
          }

          ctx.stroke();
          if (type === MARKUP_TYPES.AREA && data.value !== undefined) {
            const label = `${data.value.toFixed(style.precision || 2)} ${style.unit || 'm²'}`;

            ctx.font = `${style.fontSize || 12}px Arial`;

            ctx.fillStyle = style.strokeColor;

            ctx.globalAlpha = 1;

            ctx.textAlign = 'center';

            ctx.fillText(label, data.centroid.x, data.centroid.y);
          }
        }

        break;

      case MARKUP_TYPES.DIMENSION:
        MarkupTool._renderDimension(ctx, data, style);

        break;
    }

    ctx.restore();
  }

  /**
   * Render an arrow.
   * @private
   */
  static _renderArrow(ctx, start, end, style) {
    const headSize = style.headSize || 10;

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.beginPath();

    ctx.moveTo(start.x, start.y);

    ctx.lineTo(end.x, end.y);

    ctx.stroke();
    ctx.beginPath();

    ctx.moveTo(end.x, end.y);

    ctx.lineTo(
      end.x - headSize * Math.cos(angle - Math.PI / 6),
      end.y - headSize * Math.sin(angle - Math.PI / 6)
    );

    ctx.lineTo(
      end.x - headSize * Math.cos(angle + Math.PI / 6),
      end.y - headSize * Math.sin(angle + Math.PI / 6)
    );

    ctx.closePath();

    ctx.fill();
  }

  /**
   * Render a cloud/revision shape.
   * @private
   */
  static _renderCloud(ctx, points, style) {
    if (points.length < 3) return;

    const arcRadius = style.arcRadius || 8;

    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];

      const p2 = points[(i + 1) % points.length];

      const dx = p2.x - p1.x;

      const dy = p2.y - p1.y;

      const dist = Math.sqrt(dx * dx + dy * dy);

      const numArcs = Math.max(1, Math.floor(dist / (arcRadius * 2)));

      for (let j = 0; j < numArcs; j++) {
        const t1 = j / numArcs;

        const t2 = (j + 1) / numArcs;

        const x1 = p1.x + dx * t1;

        const y1 = p1.y + dy * t1;

        const x2 = p1.x + dx * t2;

        const y2 = p1.y + dy * t2;

        const mx = (x1 + x2) / 2;

        const my = (y1 + y2) / 2;
        const perpX = -dy / dist * arcRadius;

        const perpY = dx / dist * arcRadius;

        if (i === 0 && j === 0) {
          ctx.moveTo(x1, y1);
        }

        ctx.quadraticCurveTo(mx + perpX, my + perpY, x2, y2);
      }
    }

    ctx.closePath();

    if (style.fillOpacity > 0) {
      ctx.globalAlpha = style.fillOpacity;

      ctx.fill();

      ctx.globalAlpha = style.strokeOpacity || 1;
    }

    ctx.stroke();
  }

  /**
   * Render a dimension annotation.
   * @private
   */
  static _renderDimension(ctx, data, style) {
    const { start, end, value, offset = 20 } = data;

    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    const perpAngle = angle + Math.PI / 2;
    const s = {
      x: start.x + offset * Math.cos(perpAngle),
      y: start.y + offset * Math.sin(perpAngle),
    };

    const e = {
      x: end.x + offset * Math.cos(perpAngle),
      y: end.y + offset * Math.sin(perpAngle),
    };
    ctx.beginPath();

    ctx.moveTo(start.x, start.y);

    ctx.lineTo(s.x, s.y);

    ctx.moveTo(end.x, end.y);

    ctx.lineTo(e.x, e.y);

    ctx.stroke();
    ctx.beginPath();

    ctx.moveTo(s.x, s.y);

    ctx.lineTo(e.x, e.y);

    ctx.stroke();
    const tickSize = 6;

    const tickAngle = angle + Math.PI / 4;

    ctx.beginPath();

    ctx.moveTo(s.x - tickSize * Math.cos(tickAngle), s.y - tickSize * Math.sin(tickAngle));

    ctx.lineTo(s.x + tickSize * Math.cos(tickAngle), s.y + tickSize * Math.sin(tickAngle));

    ctx.moveTo(e.x - tickSize * Math.cos(tickAngle), e.y - tickSize * Math.sin(tickAngle));

    ctx.lineTo(e.x + tickSize * Math.cos(tickAngle), e.y + tickSize * Math.sin(tickAngle));

    ctx.stroke();
    const textPos = {
      x: (s.x + e.x) / 2,
      y: (s.y + e.y) / 2 - 5,
    };

    const label = value !== undefined ? `${value.toFixed(style.precision || 2)} ${style.unit || ''}` : '?';

    ctx.font = `${style.fontSize || 12}px Arial`;

    ctx.fillStyle = style.fillColor || style.strokeColor;

    ctx.textAlign = 'center';

    ctx.textBaseline = 'bottom';
    const textWidth = ctx.measureText(label).width;

    ctx.fillStyle = 'white';

    ctx.fillRect(textPos.x - textWidth / 2 - 2, textPos.y - (style.fontSize || 12), textWidth + 4, (style.fontSize || 12) + 2);

    ctx.fillStyle = style.fillColor || style.strokeColor;

    ctx.fillText(label, textPos.x, textPos.y);
  }

  /**
   * Render selection handles for a markup.
   * @private
   */
  static _renderSelectionHandles(ctx, markup) {
    const handles = MarkupTool._getHandlePositions(markup);

    const handleSize = 6;

    ctx.fillStyle = '#ffffff';

    ctx.strokeStyle = '#0066cc';

    ctx.lineWidth = 1;

    handles.forEach(h => {
      ctx.beginPath();

      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);

      ctx.fill();

      ctx.stroke();
    });
  }

  /**
   * Get handle positions for a markup.
   * @private
   */
  static _getHandlePositions(markup) {
    const { type, data } = markup;

    switch (type) {
      case MARKUP_TYPES.LINE:

      case MARKUP_TYPES.ARROW:

      case MARKUP_TYPES.DIMENSION:
        return [data.start, data.end];

      case MARKUP_TYPES.RECTANGLE:
        return [
          { x: data.x, y: data.y },
          { x: data.x + data.width, y: data.y },
          { x: data.x + data.width, y: data.y + data.height },
          { x: data.x, y: data.y + data.height },
        ];

      case MARKUP_TYPES.CIRCLE:
        return [
          { x: data.center.x, y: data.center.y - data.radius },
          { x: data.center.x + data.radius, y: data.center.y },
          { x: data.center.x, y: data.center.y + data.radius },
          { x: data.center.x - data.radius, y: data.center.y },
        ];

      case MARKUP_TYPES.ELLIPSE:
        return [
          { x: data.center.x, y: data.center.y - data.radiusY },
          { x: data.center.x + data.radiusX, y: data.center.y },
          { x: data.center.x, y: data.center.y + data.radiusY },
          { x: data.center.x - data.radiusX, y: data.center.y },
        ];

      case MARKUP_TYPES.POLYLINE:

      case MARKUP_TYPES.POLYGON:

      case MARKUP_TYPES.CLOUD:

      case MARKUP_TYPES.AREA:
        return data.points || [];

      case MARKUP_TYPES.TEXT:
        return [{ x: data.x, y: data.y }];

      default:
        return [];
    }
  }

  /**
   * Render markups to SVG string.
   * @param {Object[]} markups - Array of markup objects
   * @param {Object} viewBox - { x, y, width, height }
   * @returns {string} SVG markup string (just the elements, no wrapper)
   */
  static renderMarkupsToSVG(markups, viewBox = null) {
    const elements = markups.map(markup => {
      const { type, data, style } = markup;

      const strokeStyle = `stroke="${style.strokeColor || 'none'}" stroke-width="${style.strokeWidth || 1}" stroke-opacity="${style.strokeOpacity || 1}"`;

      const fillStyle = `fill="${style.fillColor || 'none'}" fill-opacity="${style.fillOpacity || 0}"`;

      switch (type) {
        case MARKUP_TYPES.LINE:
          return `<line x1="${data.start.x}" y1="${data.start.y}" x2="${data.end.x}" y2="${data.end.y}" ${strokeStyle} />`;

        case MARKUP_TYPES.RECTANGLE:
          return `<rect x="${data.x}" y="${data.y}" width="${data.width}" height="${data.height}" ${strokeStyle} ${fillStyle} />`;

        case MARKUP_TYPES.CIRCLE:
          return `<circle cx="${data.center.x}" cy="${data.center.y}" r="${data.radius}" ${strokeStyle} ${fillStyle} />`;

        case MARKUP_TYPES.ELLIPSE:
          return `<ellipse cx="${data.center.x}" cy="${data.center.y}" rx="${data.radiusX}" ry="${data.radiusY}" ${strokeStyle} ${fillStyle} />`;

        case MARKUP_TYPES.TEXT:
          return `<text x="${data.x}" y="${data.y}" fill="${style.fillColor}" font-size="${style.fontSize}">${data.text}</text>`;

        case MARKUP_TYPES.POLYLINE:
          const polylinePoints = data.points.map(p => `${p.x},${p.y}`).join(' ');

          return `<polyline points="${polylinePoints}" ${strokeStyle} fill="none" />`;

        case MARKUP_TYPES.POLYGON:

        case MARKUP_TYPES.AREA:
          const polygonPoints = data.points.map(p => `${p.x},${p.y}`).join(' ');

          return `<polygon points="${polygonPoints}" ${strokeStyle} ${fillStyle} />`;

        default:
          return '';
      }
    });

    return elements.filter(e => e).join('\n    ');
  }
}

export default MarkupTool;
