import { Q as Wn, b as jn, C as Xn, G as Yn } from "./QuantizedMeshLoaderBase-Cn33qyYc.js";
import { PlaneGeometry as nn, Mesh as Se, MeshBasicMaterial as _e, Vector2 as X, MathUtils as _, Vector3 as L, Sphere as pe, Texture as $n, SRGBColorSpace as jt, TextureUtils as Qn, DefaultLoadingManager as Zn, BufferGeometry as Ve, MeshStandardMaterial as rn, BufferAttribute as $, DataTexture as Xt, RGFormat as on, UnsignedByteType as an, LinearMipMapLinearFilter as Jn, LinearFilter as ln, Triangle as Yt, Vector4 as ke, Matrix4 as K, Matrix3 as Kn, Matrix2 as ei, WebGLRenderer as ti, WebGLRenderTarget as ns, ShaderMaterial as si, OneFactor as ni, ZeroFactor as ii, CustomBlending as ri, Box2 as oi, FileLoader as ai, Quaternion as cn, BatchedMesh as li, Source as ci, Box3 as pt, REVISION as ui, WebGLArrayRenderTarget as is, Raycaster as hi, DoubleSide as rt, CanvasTexture as $t, Color as un, Ray as di, LineSegments as hn, LineBasicMaterial as pi, EdgesGeometry as fi, BoxGeometry as dn, Group as We, Box3Helper as mi, SphereGeometry as gi, PointsMaterial as yi } from "three";
import { a as pn, c as xi, W as Ti, g as bi, O as _i, b as fn } from "./MemoryUtils-C4SM4ZNH.js";
import { GLTFLoader as Si } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FullScreenQuad as mn } from "three/examples/jsm/postprocessing/Pass.js";
import { b as Mi, c as Ci, d as Ai, f as gn } from "./constants-D7SEibTb.js";
import { c as Ii, L as yn } from "./LoaderBase-ATuDWTDB.js";
const me = /* @__PURE__ */ new X(), Te = Symbol("TILE_X"), be = Symbol("TILE_Y"), le = Symbol("TILE_LEVEL");
class xn {
  get tiling() {
    return this.imageSource.tiling;
  }
  constructor(e = {}) {
    const {
      pixelSize: t = null,
      center: s = !1,
      useRecommendedSettings: n = !0,
      imageSource: i = null
    } = e;
    this.priority = -10, this.tiles = null, this.imageSource = i, this.pixelSize = t, this.center = s, this.useRecommendedSettings = n, t !== null && console.warn('ImageFormatPlugin: "pixelSize" has been deprecated in favor of scaling the tiles root.');
  }
  // Plugin functions
  init(e) {
    this.useRecommendedSettings && (e.errorTarget = 1), this.tiles = e, this.imageSource.fetchOptions = e.fetchOptions, this.imageSource.fetchData = (t, s) => (e.invokeAllPlugins((n) => t = n.preprocessURL ? n.preprocessURL(t, null) : t), e.invokeOnePlugin((n) => n !== this && n.fetchData && n.fetchData(t, s)));
  }
  async loadRootTileset() {
    const { tiles: e, imageSource: t } = this;
    return t.url = t.url || e.rootURL, e.invokeAllPlugins((s) => t.url = s.preprocessURL ? s.preprocessURL(t.url, null) : t.url), await t.init(), e.rootURL = t.url, this.getTileset(t.url);
  }
  async parseToMesh(e, t, s, n, i) {
    if (i.aborted)
      return null;
    const { imageSource: r } = this, o = t[Te], l = t[be], c = t[le], u = await r.processBufferToTexture(e);
    if (i.aborted)
      return u.dispose(), u.image.close(), null;
    r.setData(o, l, c, u);
    let h = 1, d = 1, m = 0, f = 0, p = 0;
    const g = t.boundingVolume.box;
    g && ([m, f, p] = g, h = g[3], d = g[7]);
    const y = new nn(2 * h, 2 * d), x = new Se(y, new _e({ map: u, transparent: !0 }));
    x.position.set(m, f, p);
    const T = r.tiling.getTileContentUVBounds(o, l, c), { uv: M } = y.attributes;
    for (let S = 0; S < M.count; S++)
      me.fromBufferAttribute(M, S), me.x = _.mapLinear(me.x, 0, 1, T[0], T[2]), me.y = _.mapLinear(me.y, 0, 1, T[1], T[3]), M.setXY(S, me.x, me.y);
    return x;
  }
  preprocessNode(e) {
    const { tiling: t } = this, s = t.maxLevel;
    e[le] < s && e.parent !== null && this.expandChildren(e);
  }
  disposeTile(e) {
    const t = e[Te], s = e[be], n = e[le], { imageSource: i } = this;
    i.has(t, s, n) && i.release(t, s, n);
  }
  // Local functions
  getTileset(e) {
    const { tiling: t, tiles: s } = this, n = t.minLevel, { tileCountX: i, tileCountY: r } = t.getLevel(n), o = [];
    for (let c = 0; c < i; c++)
      for (let u = 0; u < r; u++) {
        const h = this.createChild(c, u, n);
        h !== null && o.push(h);
      }
    const l = {
      asset: {
        version: "1.1"
      },
      geometricError: 1e5,
      root: {
        refine: "REPLACE",
        geometricError: 1e5,
        boundingVolume: this.createBoundingVolume(0, 0, -1),
        children: o,
        [le]: -1,
        [Te]: 0,
        [be]: 0
      }
    };
    return s.preprocessTileset(l, e), l;
  }
  getUrl(e, t, s) {
    return this.imageSource.getUrl(e, t, s);
  }
  createBoundingVolume(e, t, s) {
    const { center: n, pixelSize: i, tiling: r } = this, { pixelWidth: o, pixelHeight: l } = r.getLevel(r.maxLevel), [c, u, h, d] = s === -1 ? r.getContentBounds(!0) : r.getTileBounds(e, t, s, !0);
    let m = (h - c) / 2, f = (d - u) / 2, p = c + m, g = u + f;
    return n && (p -= 0.5, g -= 0.5), i ? (p *= o * i, m *= o * i, g *= l * i, f *= l * i) : (p *= r.aspectRatio, m *= r.aspectRatio), {
      box: [
        // center
        p,
        g,
        0,
        // x, y, z half vectors
        m,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0
      ]
    };
  }
  createChild(e, t, s) {
    const { pixelSize: n, tiling: i } = this;
    if (!i.getTileExists(e, t, s))
      return null;
    const { pixelWidth: r, pixelHeight: o } = i.getLevel(s);
    let l = Math.max(i.aspectRatio / r, 1 / o);
    if (n) {
      const c = i.getLevel(i.maxLevel);
      l *= n * Math.max(c.pixelWidth, c.pixelHeight);
    }
    return {
      refine: "REPLACE",
      geometricError: l,
      boundingVolume: this.createBoundingVolume(e, t, s),
      content: {
        uri: this.getUrl(e, t, s)
      },
      children: [],
      // save the tile params so we can expand later
      [Te]: e,
      [be]: t,
      [le]: s
    };
  }
  expandChildren(e) {
    const t = e[le], s = e[Te], n = e[be], { tileSplitX: i, tileSplitY: r } = this.tiling.getLevel(t);
    for (let o = 0; o < i; o++)
      for (let l = 0; l < r; l++) {
        const c = this.createChild(i * s + o, r * n + l, t + 1);
        c && e.children.push(c);
      }
  }
}
const xt = /* @__PURE__ */ new L(), je = /* @__PURE__ */ new L();
function vi(a, e, t) {
  const n = t + 1e-5;
  let i = e + 1e-5;
  Math.abs(i) > Math.PI / 2 && (i = i - 1e-5), a.getCartographicToPosition(e, t, 0, xt), a.getCartographicToPosition(i, t, 0, je);
  const r = xt.distanceTo(je) / 1e-5;
  return a.getCartographicToPosition(e, n, 0, je), [xt.distanceTo(je) / 1e-5, r];
}
const Li = 30, Ei = 15, Tt = /* @__PURE__ */ new L(), rs = /* @__PURE__ */ new L(), ie = /* @__PURE__ */ new X(), bt = /* @__PURE__ */ new pe();
class ft extends xn {
  get projection() {
    return this.tiling.projection;
  }
  constructor(e = {}) {
    const {
      shape: t = "planar",
      endCaps: s = !0,
      ...n
    } = e;
    super(n), this.shape = t, this.endCaps = s;
  }
  // override the parse to mesh logic to support a region mesh
  async parseToMesh(e, t, ...s) {
    const n = await super.parseToMesh(e, t, ...s), { shape: i, projection: r, tiles: o, tiling: l } = this;
    if (i === "ellipsoid") {
      const c = o.ellipsoid, u = t[le], h = t[Te], d = t[be], [m, f, p, g] = t.boundingVolume.region, y = Math.ceil((g - f) * _.RAD2DEG * 0.25), x = Math.ceil((p - m) * _.RAD2DEG * 0.25), b = Math.max(Ei, y), T = Math.max(Li, x), M = new nn(1, 1, T, b), [S, C, v, P] = l.getTileBounds(h, d, u, !0, !0), R = l.getTileContentUVBounds(h, d, u), { position: V, normal: k, uv: W } = M.attributes, Q = V.count;
      t.engineData.boundingVolume.getSphere(bt);
      for (let H = 0; H < Q; H++) {
        Tt.fromBufferAttribute(V, H), ie.fromBufferAttribute(W, H);
        const I = r.convertNormalizedToLongitude(_.mapLinear(ie.x, 0, 1, S, v));
        let A = r.convertNormalizedToLatitude(_.mapLinear(ie.y, 0, 1, C, P));
        if (r.isMercator && this.endCaps && (P === 1 && ie.y === 1 && (A = Math.PI / 2), C === 0 && ie.y === 0 && (A = -Math.PI / 2)), r.isMercator && ie.y !== 0 && ie.y !== 1) {
          const E = r.convertNormalizedToLatitude(1), N = 1 / b, Z = _.mapLinear(ie.y - N, 0, 1, f, g), F = _.mapLinear(ie.y + N, 0, 1, f, g);
          A > E && Z < E && (A = E), A < -E && F > -E && (A = -E);
        }
        c.getCartographicToPosition(A, I, 0, Tt).sub(bt.center), c.getCartographicToNormal(A, I, rs);
        const D = _.mapLinear(r.convertLongitudeToNormalized(I), S, v, R[0], R[2]), O = _.mapLinear(r.convertLatitudeToNormalized(A), C, P, R[1], R[3]);
        W.setXY(H, D, O), V.setXYZ(H, ...Tt), k.setXYZ(H, ...rs);
      }
      n.geometry = M, n.position.copy(bt.center);
    }
    return n;
  }
  createBoundingVolume(e, t, s) {
    if (this.shape === "ellipsoid") {
      const { tiling: n, endCaps: i } = this, r = s === -1, o = r ? n.getContentBounds(!0) : n.getTileBounds(e, t, s, !0, !0), l = r ? n.getContentBounds() : n.getTileBounds(e, t, s, !1, !0);
      return i && (o[3] === 1 && (l[3] = Math.PI / 2), o[1] === 0 && (l[1] = -Math.PI / 2)), {
        region: [...l, -1, 1]
      };
    } else
      return super.createBoundingVolume(e, t, s);
  }
  createChild(...e) {
    const t = super.createChild(...e), { shape: s, projection: n, tiling: i } = this;
    if (t && s === "ellipsoid") {
      const r = t[le], o = t[Te], l = t[be];
      if (r === -1)
        return t.geometricError = 1e50, parent;
      const [c, u, h, d] = i.getTileBounds(o, l, r, !0), { tilePixelWidth: m, tilePixelHeight: f } = i.getLevel(r), p = (h - c) / m, g = (d - u) / f, [
        /* west */
        ,
        y,
        x,
        b
      ] = i.getTileBounds(o, l, r), T = y > 0 != b > 0 ? 0 : Math.min(Math.abs(y), Math.abs(b)), M = n.convertLatitudeToNormalized(T), S = n.getLongitudeDerivativeAtNormalized(c), C = n.getLatitudeDerivativeAtNormalized(M), [v, P] = vi(this.tiles.ellipsoid, T, x), R = Math.max(p * S * v, g * C * P);
      t.geometricError = R;
    }
    return t;
  }
}
class re {
  get isMercator() {
    return this.scheme === "EPSG:3857";
  }
  constructor(e = "EPSG:4326") {
    this.scheme = e, this.tileCountX = 1, this.tileCountY = 1, this.setScheme(e);
  }
  setScheme(e) {
    switch (this.scheme = e, e) {
      // equirect
      case "CRS:84":
      case "EPSG:4326":
        this.tileCountX = 2, this.tileCountY = 1;
        break;
      // mercator
      case "EPSG:3857":
        this.tileCountX = 1, this.tileCountY = 1;
        break;
      case "none":
        this.tileCountX = 1, this.tileCountY = 1;
        break;
      default:
        throw new Error(`ProjectionScheme: Unknown projection scheme "${e}"`);
    }
  }
  convertNormalizedToLatitude(e) {
    if (this.scheme === "none")
      return e;
    if (this.isMercator) {
      const t = _.mapLinear(e, 0, 1, -1, 1);
      return 2 * Math.atan(Math.exp(t * Math.PI)) - Math.PI / 2;
    } else
      return _.mapLinear(e, 0, 1, -Math.PI / 2, Math.PI / 2);
  }
  convertNormalizedToLongitude(e) {
    return this.scheme === "none" ? e : _.mapLinear(e, 0, 1, -Math.PI, Math.PI);
  }
  convertLatitudeToNormalized(e) {
    if (this.scheme === "none")
      return e;
    if (this.isMercator) {
      const t = Math.log(Math.tan(Math.PI / 4 + e / 2));
      return 1 / 2 + 1 * t / (2 * Math.PI);
    } else
      return _.mapLinear(e, -Math.PI / 2, Math.PI / 2, 0, 1);
  }
  convertLongitudeToNormalized(e) {
    return this.scheme === "none" ? e : (e + Math.PI) / (2 * Math.PI);
  }
  getLongitudeDerivativeAtNormalized(e) {
    return this.scheme === "none" ? 1 : 2 * Math.PI;
  }
  getLatitudeDerivativeAtNormalized(e) {
    if (this.scheme === "none")
      return 1;
    {
      let s = e - 1e-5;
      return s < 0 && (s = e + 1e-5), this.isMercator ? Math.abs(this.convertNormalizedToLatitude(e) - this.convertNormalizedToLatitude(s)) / 1e-5 : Math.PI;
    }
  }
  getBounds() {
    return this.scheme === "none" ? [0, 0, 1, 1] : [
      this.convertNormalizedToLongitude(0),
      this.convertNormalizedToLatitude(0),
      this.convertNormalizedToLongitude(1),
      this.convertNormalizedToLatitude(1)
    ];
  }
  toNormalizedPoint(e, t) {
    const s = [e, t];
    return s[0] = this.convertLongitudeToNormalized(s[0]), s[1] = this.convertLatitudeToNormalized(s[1]), s;
  }
  toNormalizedRange(e) {
    return [
      ...this.toNormalizedPoint(e[0], e[1]),
      ...this.toNormalizedPoint(e[2], e[3])
    ];
  }
  toCartographicPoint(e, t) {
    const s = [e, t];
    return s[0] = this.convertNormalizedToLongitude(s[0]), s[1] = this.convertNormalizedToLatitude(s[1]), s;
  }
  toCartographicRange(e) {
    return [
      ...this.toCartographicPoint(e[0], e[1]),
      ...this.toCartographicPoint(e[2], e[3])
    ];
  }
  clampToBounds(e, t = !1) {
    const s = [...e];
    let n;
    t ? n = [0, 0, 1, 1] : n = this.getBounds();
    const [i, r, o, l] = n;
    return s[0] = _.clamp(s[0], i, o), s[1] = _.clamp(s[1], r, l), s[2] = _.clamp(s[2], i, o), s[3] = _.clamp(s[3], r, l), s;
  }
}
function Ee(...a) {
  return a.join("_");
}
class Tn {
  constructor() {
    this.cache = {}, this.count = 0, this.cachedBytes = 0, this.active = 0;
  }
  // overridable
  fetchItem() {
  }
  disposeItem() {
  }
  getMemoryUsage(e) {
    return 0;
  }
  // sets the data in the cache explicitly without need to load
  setData(...e) {
    const { cache: t } = this, s = e.pop(), n = Ee(...e);
    if (n in t)
      throw new Error(`DataCache: "${n}" is already present.`);
    return this.cache[n] = {
      abortController: new AbortController(),
      result: s,
      count: 1,
      bytes: this.getMemoryUsage(s)
    }, this.count++, this.cachedBytes += this.cache[n].bytes, s;
  }
  // fetches the associated data if it doesn't exist and increments the lock counter
  lock(...e) {
    const { cache: t } = this, s = Ee(...e);
    if (s in t)
      t[s].count++;
    else {
      const n = new AbortController(), i = {
        abortController: n,
        result: null,
        count: 1,
        bytes: 0,
        args: e
      };
      this.active++, i.result = this.fetchItem(e, n.signal), i.result instanceof Promise ? i.result.then((r) => (i.result = r, i.bytes = this.getMemoryUsage(r), this.cachedBytes += i.bytes, r)).finally(() => {
        this.active--;
      }).catch((r) => {
      }) : (this.active--, i.bytes = this.getMemoryUsage(i.result), this.cachedBytes += i.bytes), this.cache[s] = i, this.count++;
    }
    return t[s].result;
  }
  // decrements the lock counter for the item and deletes the item if it has reached zero
  release(...e) {
    const t = Ee(...e);
    this.releaseViaFullKey(t);
  }
  // get the loaded item
  get(...e) {
    const { cache: t } = this, s = Ee(...e);
    return s in t && t[s].count > 0 ? t[s].result : null;
  }
  has(...e) {
    const { cache: t } = this;
    return Ee(...e) in t;
  }
  forEachItem(e) {
    const { cache: t } = this;
    for (const s in t) {
      const n = t[s];
      n.result instanceof Promise || e(n.result, n.args);
    }
  }
  // dispose all items
  dispose() {
    const { cache: e } = this;
    for (const t in e) {
      const { abortController: s } = e[t];
      s.abort(), this.releaseViaFullKey(t, !0);
    }
    this.cache = {};
  }
  // releases an item with an optional force flag
  releaseViaFullKey(e, t = !1) {
    const { cache: s } = this;
    if (e in s && s[e].count > 0) {
      const n = s[e];
      if (n.count--, n.count === 0 || t) {
        const i = () => {
          if (s[e] !== n)
            return;
          const { result: r, abortController: o } = n;
          o.abort(), r instanceof Promise ? r.then((l) => {
            this.disposeItem(l), this.count--, this.cachedBytes -= n.bytes;
          }).catch(() => {
          }) : (this.disposeItem(r), this.count--, this.cachedBytes -= n.bytes), delete s[e];
        };
        t ? i() : queueMicrotask(() => {
          n.count === 0 && i();
        });
      }
      return !0;
    }
    throw new Error("DataCache: Attempting to release key that does not exist");
  }
}
function os(a, e) {
  const [t, s, n, i] = a, [r, o, l, c] = e;
  return !(t >= l || n <= r || s >= c || i <= o);
}
class bn {
  get levelCount() {
    return this._levels.length;
  }
  get maxLevel() {
    return this.levelCount - 1;
  }
  get minLevel() {
    const e = this._levels;
    for (let t = 0; t < e.length; t++)
      if (e[t] !== null)
        return t;
    return -1;
  }
  // prioritize user-set bounds over projection bounds if present
  get contentBounds() {
    return this._contentBounds ?? this.projection.getBounds();
  }
  get aspectRatio() {
    const { pixelWidth: e, pixelHeight: t } = this.getLevel(this.maxLevel);
    return e / t;
  }
  constructor() {
    this.flipY = !1, this.pixelOverlap = 0, this._contentBounds = null, this.projection = new re("none"), this._levels = [];
  }
  // build the zoom levels
  setLevel(e, t = {}) {
    const s = this._levels;
    for (; s.length < e; )
      s.push(null);
    const {
      tileSplitX: n = 2,
      tileSplitY: i = 2
    } = t, {
      tilePixelWidth: r = 256,
      tilePixelHeight: o = 256,
      tileCountX: l = n ** e,
      tileCountY: c = i ** e,
      tileBounds: u = null
    } = t, {
      pixelWidth: h = r * l,
      pixelHeight: d = o * c
    } = t;
    s[e] = {
      // The pixel resolution of each tile.
      tilePixelWidth: r,
      tilePixelHeight: o,
      // The total pixel resolution of the final image at this level. These numbers
      // may not be a round multiple of the tile width.
      pixelWidth: h,
      pixelHeight: d,
      // Or the total number of tiles that can be loaded at this level.
      tileCountX: l,
      tileCountY: c,
      // The number of tiles that the tiles at this layer split in to
      tileSplitX: n,
      tileSplitY: i,
      // The bounds covered by the extent of the tiles at this loaded. The actual content covered by the overall tileset
      // may be a subset of this range (eg there may be unused space).
      tileBounds: u
    };
  }
  generateLevels(e, t, s, n = {}) {
    const {
      minLevel: i = 0,
      tilePixelWidth: r = 256,
      tilePixelHeight: o = 256
    } = n, l = e - 1, {
      pixelWidth: c = r * t * 2 ** l,
      pixelHeight: u = o * s * 2 ** l
    } = n;
    for (let h = i; h < e; h++) {
      const d = e - h - 1, m = Math.ceil(c * 2 ** -d), f = Math.ceil(u * 2 ** -d), p = Math.ceil(m / r), g = Math.ceil(f / o);
      this.setLevel(h, {
        tilePixelWidth: r,
        tilePixelHeight: o,
        pixelWidth: m,
        pixelHeight: f,
        tileCountX: p,
        tileCountY: g
      });
    }
  }
  getLevel(e) {
    return this._levels[e];
  }
  // bounds representing the contentful region of the image
  setContentBounds(e, t, s, n) {
    this._contentBounds = [e, t, s, n];
  }
  setProjection(e) {
    this.projection = e;
  }
  // query functions
  getTileAtPoint(e, t, s, n = !1) {
    const { flipY: i } = this, { tileCountX: r, tileCountY: o, tileBounds: l } = this.getLevel(s), c = 1 / r, u = 1 / o;
    if (n || ([e, t] = this.toNormalizedPoint(e, t)), l) {
      const m = this.toNormalizedRange(l);
      e = _.mapLinear(e, m[0], m[2], 0, 1), t = _.mapLinear(t, m[1], m[3], 0, 1);
    }
    const h = Math.floor(e / c);
    let d = Math.floor(t / u);
    return i && (d = o - 1 - d), [h, d];
  }
  getTilesInRange(e, t, s, n, i, r = !1) {
    const o = [e, t, s, n], l = this.getContentBounds(r);
    let c = this.getLevel(i).tileBounds;
    if (!os(o, l))
      return [0, 0, -1, -1];
    if (c && (r && (c = this.toNormalizedRange(c)), !os(o, l)))
      return [0, 0, -1, -1];
    const [u, h, d, m] = this.clampToContentBounds(o, r), f = this.getTileAtPoint(u, h, i, r), p = this.getTileAtPoint(d, m, i, r);
    this.flipY && ([f[1], p[1]] = [p[1], f[1]]);
    const { tileCountX: g, tileCountY: y } = this.getLevel(i), [x, b] = f, [T, M] = p;
    return T < 0 || M < 0 || x >= g || b >= y ? [0, 0, -1, -1] : [
      _.clamp(x, 0, g - 1),
      _.clamp(b, 0, y - 1),
      _.clamp(T, 0, g - 1),
      _.clamp(M, 0, y - 1)
    ];
  }
  getTileExists(e, t, s) {
    const [n, i, r, o] = this.contentBounds, [l, c, u, h] = this.getTileBounds(e, t, s);
    return !(l >= u || c >= h) && l <= r && c <= o && u >= n && h >= i;
  }
  getContentBounds(e = !1) {
    const { projection: t } = this, s = [...this.contentBounds];
    return e && (s[0] = t.convertLongitudeToNormalized(s[0]), s[1] = t.convertLatitudeToNormalized(s[1]), s[2] = t.convertLongitudeToNormalized(s[2]), s[3] = t.convertLatitudeToNormalized(s[3])), s;
  }
  // returns the UV range associated with the content in the given tile
  getTileContentUVBounds(e, t, s) {
    const [n, i, r, o] = this.getTileBounds(e, t, s, !0, !0), [l, c, u, h] = this.getTileBounds(e, t, s, !0, !1);
    return [
      _.mapLinear(n, l, u, 0, 1),
      _.mapLinear(i, c, h, 0, 1),
      _.mapLinear(r, l, u, 0, 1),
      _.mapLinear(o, c, h, 0, 1)
    ];
  }
  getTileBounds(e, t, s, n = !1, i = !0) {
    const { flipY: r, pixelOverlap: o, projection: l } = this, { tilePixelWidth: c, tilePixelHeight: u, pixelWidth: h, pixelHeight: d, tileBounds: m } = this.getLevel(s);
    let f = c * e - o, p = u * t - o, g = f + c + o * 2, y = p + u + o * 2;
    if (f = Math.max(f, 0), p = Math.max(p, 0), g = Math.min(g, h), y = Math.min(y, d), f = f / h, g = g / h, p = p / d, y = y / d, r) {
      const b = (y - p) / 2, M = 1 - (p + y) / 2;
      p = M - b, y = M + b;
    }
    let x = [f, p, g, y];
    if (m) {
      const b = this.toNormalizedRange(m);
      x[0] = _.mapLinear(x[0], 0, 1, b[0], b[2]), x[2] = _.mapLinear(x[2], 0, 1, b[0], b[2]), x[1] = _.mapLinear(x[1], 0, 1, b[1], b[3]), x[3] = _.mapLinear(x[3], 0, 1, b[1], b[3]);
    }
    return i && (x = this.clampToBounds(x, !0)), n || (x[0] = l.convertNormalizedToLongitude(x[0]), x[1] = l.convertNormalizedToLatitude(x[1]), x[2] = l.convertNormalizedToLongitude(x[2]), x[3] = l.convertNormalizedToLatitude(x[3])), x;
  }
  toNormalizedPoint(e, t) {
    return this.projection.toNormalizedPoint(e, t);
  }
  toNormalizedRange(e) {
    return this.projection.toNormalizedRange(e);
  }
  toCartographicPoint(e, t) {
    return this.projection.toCartographicPoint(e, t);
  }
  toCartographicRange(e) {
    return this.projection.toCartographicRange(e);
  }
  clampToContentBounds(e, t = !1) {
    const s = [...e], [n, i, r, o] = this.getContentBounds(t);
    return s[0] = _.clamp(s[0], n, r), s[1] = _.clamp(s[1], i, o), s[2] = _.clamp(s[2], n, r), s[3] = _.clamp(s[3], i, o), s;
  }
  clampToBounds(e, t = !1) {
    return this.projection.clampToBounds(e, t);
  }
}
class Ge extends Tn {
  constructor(e = {}) {
    super();
    const {
      fetchOptions: t = {}
    } = e;
    this.tiling = new bn(), this.fetchOptions = t, this.fetchData = (...s) => fetch(...s);
  }
  // async function for initializing the tiled image set
  init() {
  }
  // helper for processing the buffer into a texture
  async processBufferToTexture(e) {
    const t = new Blob([e]), s = await createImageBitmap(t, {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
      imageOrientation: "flipY"
    }), n = new $n(s);
    return n.generateMipmaps = !1, n.colorSpace = jt, n.needsUpdate = !0, n;
  }
  getMemoryUsage(e) {
    const { format: t, type: s, image: n, generateMipmaps: i } = e, { width: r, height: o } = n, l = Qn.getByteLength(r, o, t, s);
    return i ? l * 4 / 3 : l;
  }
  // fetch the item with the given key fields
  fetchItem(e, t) {
    const s = {
      ...this.fetchOptions,
      signal: t
    }, n = this.getUrl(...e);
    return this.fetchData(n, s).then((i) => i.arrayBuffer()).then((i) => this.processBufferToTexture(i));
  }
  // dispose of the item that was fetched
  disposeItem(e) {
    e.dispose(), e.image instanceof ImageBitmap && e.image.close();
  }
  getUrl(...e) {
  }
}
class ze extends Ge {
  constructor(e = {}) {
    const {
      levels: t = 20,
      tileDimension: s = 256,
      projection: n = "EPSG:3857",
      url: i = null,
      ...r
    } = e;
    super(r), this.tileDimension = s, this.levels = t, this.projection = n, this.url = i;
  }
  getUrl(e, t, s) {
    return this.url.replace(/{\s*z\s*}/gi, s).replace(/{\s*x\s*}/gi, e).replace(/{\s*(y|reverseY|-\s*y)\s*}/gi, t);
  }
  init() {
    const { tiling: e, tileDimension: t, levels: s, url: n, projection: i } = this;
    return e.flipY = !/{\s*reverseY|-\s*y\s*}/g.test(n), e.setProjection(new re(i)), e.setContentBounds(...e.projection.getBounds()), Array.isArray(s) ? s.forEach((r, o) => {
      r !== null && e.setLevel(o, {
        tilePixelWidth: t,
        tilePixelHeight: t,
        ...r
      });
    }) : e.generateLevels(s, e.projection.tileCountX, e.projection.tileCountY, {
      tilePixelWidth: t,
      tilePixelHeight: t
    }), this.url = n, Promise.resolve();
  }
}
class Qt extends Ge {
  constructor(e = {}) {
    const {
      url: t = null,
      ...s
    } = e;
    super(s), this.tileSets = null, this.extension = null, this.url = t;
  }
  getUrl(e, t, s) {
    const { url: n, extension: i, tileSets: r, tiling: o } = this;
    return new URL(`${parseInt(r[s - o.minLevel].href)}/${e}/${t}.${i}`, n).toString();
  }
  init() {
    const { url: e } = this;
    return this.fetchData(new URL("tilemapresource.xml", e), this.fetchOptions).then((t) => t.text()).then((t) => {
      const { tiling: s } = this, n = new DOMParser().parseFromString(t, "text/xml"), i = n.querySelector("BoundingBox"), r = n.querySelector("TileFormat"), l = [...n.querySelector("TileSets").querySelectorAll("TileSet")].map((y) => ({
        href: parseInt(y.getAttribute("href")),
        unitsPerPixel: parseFloat(y.getAttribute("units-per-pixel")),
        order: parseInt(y.getAttribute("order"))
      })).sort((y, x) => y.order - x.order), c = parseFloat(i.getAttribute("minx")) * _.DEG2RAD, u = parseFloat(i.getAttribute("maxx")) * _.DEG2RAD, h = parseFloat(i.getAttribute("miny")) * _.DEG2RAD, d = parseFloat(i.getAttribute("maxy")) * _.DEG2RAD, m = parseInt(r.getAttribute("width")), f = parseInt(r.getAttribute("height")), p = r.getAttribute("extension"), g = n.querySelector("SRS").textContent;
      this.extension = p, this.url = e, this.tileSets = l, s.setProjection(new re(g)), s.setContentBounds(c, h, u, d), l.forEach(({ order: y }) => {
        s.setLevel(y, {
          tileCountX: s.projection.tileCountX * 2 ** y,
          tilePixelWidth: m,
          tilePixelHeight: f
        });
      });
    });
  }
}
function wi(a) {
  return /(:84|:crs84)$/i.test(a);
}
class _n extends Ge {
  /**
   * Creates a new WMTSImageSource instance.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.capabilities=null] - Parsed WMTS capabilities object from WMTSCapabilitiesLoader
   * @param {string|Object} [options.layer=null] - Layer identifier string or layer object. If null, uses first available layer.
   * @param {string|Object} [options.tileMatrixSet=null] - TileMatrixSet identifier or object. If null, uses first available.
   * @param {string} [options.style=null] - Style identifier. If null, uses the default style.
   * @param {string} [options.url=null] - Custom URL template. If null, extracted from capabilities.
   * @param {Object} [options.dimensions={}] - Dimension values (e.g., { Time: '2023-01-01' })
   */
  constructor(e = {}) {
    const {
      capabilities: t = null,
      layer: s = null,
      tileMatrixSet: n = null,
      style: i = null,
      url: r = null,
      dimensions: o = {},
      ...l
    } = e;
    super(l), this.capabilities = t, this.layer = s, this.tileMatrixSet = n, this.style = i, this.dimensions = o, this.url = r;
  }
  /**
   * Generates the URL for a specific tile.
   *
   * @param {number} x - Tile column index
   * @param {number} y - Tile row index
   * @param {number} level - Zoom level (TileMatrix)
   * @returns {string} The complete URL for the requested tile
   */
  getUrl(e, t, s) {
    return this.url.replace(/{\s*TileMatrix\s*}/gi, s).replace(/{\s*TileCol\s*}/gi, e).replace(/{\s*TileRow\s*}/gi, t);
  }
  /**
   * Initializes the image source by parsing capabilities and setting up the tiling scheme.
   *
   * This method:
   * - Resolves layer, tileMatrixSet, and style from capabilities
   * - Determines the projection (EPSG:4326 or EPSG:3857)
   * - Configures the tiling scheme with proper bounds and tile sizes
   * - Constructs the final URL template
   *
   * @returns {Promise<void>} Resolves when initialization is complete
   */
  init() {
    const { tiling: e, dimensions: t, capabilities: s } = this;
    let { layer: n, tileMatrixSet: i, style: r, url: o } = this;
    n ? typeof n == "string" && (n = s.layers.find((u) => u.identifier === n)) : n = s.layers[0], i ? typeof i == "string" && (i = n.tileMatrixSets.find((u) => u.identifier === i)) : i = n.tileMatrixSets[0], r || (r = n.styles.find((u) => u.isDefault).identifier), o || (o = n.resourceUrls[0].template);
    const l = i.supportedCRS, c = l.includes("4326") || wi(l) ? "EPSG:4326" : "EPSG:3857";
    e.flipY = !0, e.setProjection(new re(c)), n.boundingBox !== null ? e.setContentBounds(...n.boundingBox.bounds) : e.setContentBounds(...e.projection.getBounds()), i.tileMatrices.forEach((u, h) => {
      const { tileWidth: d, tileHeight: m, matrixWidth: f, matrixHeight: p } = u;
      e.setLevel(h, {
        tilePixelWidth: d,
        tilePixelHeight: m,
        tileCountX: f || e.projection.tileCountX * 2 ** h,
        tileCountY: p || e.projection.tileCountY * 2 ** h,
        tileBounds: u.bounds
      });
    }), o = o.replace(/{\s*TileMatrixSet\s*}/g, i.identifier).replace(/{\s*Style\s*}/g, r);
    for (const u in t)
      o = o.replace(new RegExp(`{\\s*${u}\\s*}`), t[u]);
    return n.dimensions.forEach((u) => {
      o = o.replace(new RegExp(`{\\s*${u.identifier}\\s*}`), u.defaultValue);
    }), this.url = o, Promise.resolve();
  }
}
class Sn extends Ge {
  // TODO: layer and styles can be arrays, comma separated lists
  constructor(e = {}) {
    const {
      url: t = null,
      layer: s = null,
      styles: n = null,
      contentBoundingBox: i = null,
      version: r = "1.3.0",
      crs: o = "EPSG:4326",
      format: l = "image/png",
      transparent: c = !1,
      levels: u = 18,
      tileDimension: h = 256,
      ...d
    } = e;
    super(d), this.url = t, this.layer = s, this.crs = o, this.format = l, this.tileDimension = h, this.styles = n, this.version = r, this.levels = u, this.transparent = c, this.contentBoundingBox = i;
  }
  init() {
    const { tiling: e, levels: t, tileDimension: s, contentBoundingBox: n } = this;
    return e.setProjection(new re(this.crs)), e.flipY = !0, e.generateLevels(t, e.projection.tileCountX, e.projection.tileCountY, {
      tilePixelWidth: s,
      tilePixelHeight: s
    }), n !== null ? e.setContentBounds(...n) : e.setContentBounds(...e.projection.getBounds()), Promise.resolve();
  }
  // TODO: handle this in ProjectionScheme or TilingScheme? Or Loader?
  normalizedToMercatorX(e) {
    return _.mapLinear(e, 0, 1, -20037508342789244e-9, 20037508342789244e-9);
  }
  normalizedToMercatorY(e) {
    return _.mapLinear(e, 0, 1, -20037508342789244e-9, 20037508342789244e-9);
  }
  getUrl(e, t, s) {
    const {
      tiling: n,
      layer: i,
      crs: r,
      format: o,
      tileDimension: l,
      styles: c,
      version: u,
      transparent: h
    } = this, d = u === "1.1.1" ? "SRS" : "CRS";
    let m;
    if (r === "EPSG:3857") {
      const p = n.getTileBounds(e, t, s, !0, !1), g = this.normalizedToMercatorX(p[0]), y = this.normalizedToMercatorY(p[1]), x = this.normalizedToMercatorX(p[2]), b = this.normalizedToMercatorY(p[3]);
      m = [g, y, x, b];
    } else {
      const [p, g, y, x] = n.getTileBounds(e, t, s, !1, !1).map((b) => b * _.RAD2DEG);
      r === "EPSG:4326" ? u === "1.1.1" ? m = [p, g, y, x] : m = [g, p, x, y] : m = [p, g, y, x];
    }
    const f = new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: u,
      LAYERS: i,
      [d]: r,
      BBOX: m.join(","),
      WIDTH: l,
      HEIGHT: l,
      FORMAT: o,
      TRANSPARENT: h ? "TRUE" : "FALSE"
    });
    return c != null && f.set("STYLES", c), new URL("?" + f.toString(), this.url).toString();
  }
}
class lo extends ft {
  constructor(e = {}) {
    const {
      levels: t,
      tileDimension: s,
      projection: n,
      url: i,
      ...r
    } = e;
    super(r), this.name = "XYZ_TILES_PLUGIN", this.imageSource = new ze({ url: i, levels: t, tileDimension: s, projection: n });
  }
}
class Pi extends ft {
  constructor(e = {}) {
    const { url: t, ...s } = e;
    super(s), this.name = "TMS_TILES_PLUGIN", this.imageSource = new Qt({ url: t });
  }
}
class co extends ft {
  constructor(e = {}) {
    const {
      capabilities: t,
      layer: s,
      tileMatrixSet: n,
      style: i,
      dimensions: r,
      ...o
    } = e;
    super(o), this.name = "WTMS_TILES_PLUGIN", this.imageSource = new _n({
      capabilities: t,
      layer: s,
      tileMatrixSet: n,
      style: i,
      dimensions: r
    });
  }
}
class uo extends ft {
  constructor(e = {}) {
    const {
      url: t,
      layer: s,
      crs: n,
      format: i,
      tileDimension: r,
      styles: o,
      version: l,
      ...c
    } = e;
    super(c), this.name = "WMS_TILES_PLUGIN", this.imageSource = new Sn({
      url: t,
      layer: s,
      crs: n,
      format: i,
      tileDimension: r,
      styles: o,
      version: l
    });
  }
}
const as = /* @__PURE__ */ new L(), Xe = /* @__PURE__ */ new Yt(), U = /* @__PURE__ */ new L(), oe = /* @__PURE__ */ new L();
class Ri extends Wn {
  constructor(e = Zn) {
    super(), this.manager = e, this.ellipsoid = new pn(), this.skirtLength = 1e3, this.smoothSkirtNormals = !0, this.generateNormals = !0, this.solid = !1, this.minLat = -Math.PI / 2, this.maxLat = Math.PI / 2, this.minLon = -Math.PI, this.maxLon = Math.PI;
  }
  parse(e) {
    const {
      ellipsoid: t,
      solid: s,
      skirtLength: n,
      smoothSkirtNormals: i,
      generateNormals: r,
      minLat: o,
      maxLat: l,
      minLon: c,
      maxLon: u
    } = this, {
      header: h,
      indices: d,
      vertexData: m,
      edgeIndices: f,
      extensions: p
    } = super.parse(e), g = new Ve(), y = new rn(), x = new Se(g, y);
    x.position.set(...h.center);
    const b = "octvertexnormals" in p, T = b || r, M = m.u.length, S = [], C = [], v = [], P = [];
    let R = 0, V = 0;
    for (let I = 0; I < M; I++)
      W(I, U), Q(U.x, U.y, U.z, oe), C.push(U.x, U.y), S.push(...oe);
    for (let I = 0, A = d.length; I < A; I++)
      v.push(d[I]);
    if (T)
      if (b) {
        const I = p.octvertexnormals.normals;
        for (let A = 0, D = I.length; A < D; A++)
          P.push(I[A]);
      } else {
        const I = new Ve(), A = d.length > 21845 ? new Uint32Array(d) : new Uint16Array(d);
        I.setIndex(new $(A, 1, !1)), I.setAttribute("position", new $(new Float32Array(S), 3, !1)), I.computeVertexNormals();
        const O = I.getAttribute("normal").array;
        p.octvertexnormals = { normals: O };
        for (let E = 0, N = O.length; E < N; E++)
          P.push(O[E]);
      }
    if (g.addGroup(R, d.length, V), R += d.length, V++, s) {
      const I = S.length / 3;
      for (let A = 0; A < M; A++)
        W(A, U), Q(U.x, U.y, U.z, oe, -n), C.push(U.x, U.y), S.push(...oe);
      for (let A = d.length - 1; A >= 0; A--)
        v.push(d[A] + I);
      if (T) {
        const A = p.octvertexnormals.normals;
        for (let D = 0, O = A.length; D < O; D++)
          P.push(-A[D]);
      }
      g.addGroup(R, d.length, V), R += d.length, V++;
    }
    if (n > 0) {
      const {
        westIndices: I,
        eastIndices: A,
        southIndices: D,
        northIndices: O
      } = f;
      let E;
      const N = H(I);
      E = S.length / 3, C.push(...N.uv), S.push(...N.positions);
      for (let B = 0, J = N.indices.length; B < J; B++)
        v.push(N.indices[B] + E);
      const Z = H(A);
      E = S.length / 3, C.push(...Z.uv), S.push(...Z.positions);
      for (let B = 0, J = Z.indices.length; B < J; B++)
        v.push(Z.indices[B] + E);
      const F = H(D);
      E = S.length / 3, C.push(...F.uv), S.push(...F.positions);
      for (let B = 0, J = F.indices.length; B < J; B++)
        v.push(F.indices[B] + E);
      const G = H(O);
      E = S.length / 3, C.push(...G.uv), S.push(...G.positions);
      for (let B = 0, J = G.indices.length; B < J; B++)
        v.push(G.indices[B] + E);
      T && (P.push(...N.normals), P.push(...Z.normals), P.push(...F.normals), P.push(...G.normals)), g.addGroup(R, d.length, V), R += d.length, V++;
    }
    for (let I = 0, A = S.length; I < A; I += 3)
      S[I + 0] -= h.center[0], S[I + 1] -= h.center[1], S[I + 2] -= h.center[2];
    const k = S.length / 3 > 65535 ? new Uint32Array(v) : new Uint16Array(v);
    if (g.setIndex(new $(k, 1, !1)), g.setAttribute("position", new $(new Float32Array(S), 3, !1)), g.setAttribute("uv", new $(new Float32Array(C), 2, !1)), T && g.setAttribute("normal", new $(new Float32Array(P), 3, !1)), "watermask" in p) {
      const { mask: I, size: A } = p.watermask, D = new Uint8Array(2 * A * A);
      for (let E = 0, N = I.length; E < N; E++) {
        const Z = I[E] === 255 ? 0 : 255;
        D[2 * E + 0] = Z, D[2 * E + 1] = Z;
      }
      const O = new Xt(D, A, A, on, an);
      O.flipY = !0, O.minFilter = Jn, O.magFilter = ln, O.needsUpdate = !0, y.roughnessMap = O;
    }
    return x.userData.minHeight = h.minHeight, x.userData.maxHeight = h.maxHeight, "metadata" in p && (x.userData.metadata = p.metadata.json), x;
    function W(I, A) {
      return A.x = m.u[I], A.y = m.v[I], A.z = m.height[I], A;
    }
    function Q(I, A, D, O, E = 0) {
      const N = _.lerp(h.minHeight, h.maxHeight, D), Z = _.lerp(c, u, I), F = _.lerp(o, l, A);
      return t.getCartographicToPosition(F, Z, N + E, O), O;
    }
    function H(I) {
      const A = [], D = [], O = [], E = [], N = [];
      for (let G = 0, B = I.length; G < B; G++)
        W(I[G], U), A.push(U.x, U.y), O.push(U.x, U.y), Q(U.x, U.y, U.z, oe), D.push(...oe), Q(U.x, U.y, U.z, oe, -n), E.push(...oe);
      const Z = I.length - 1;
      for (let G = 0; G < Z; G++) {
        const B = G, J = G + 1, fe = G + I.length, gt = G + I.length + 1;
        N.push(B, fe, J), N.push(J, fe, gt);
      }
      let F = null;
      if (T) {
        const G = (D.length + E.length) / 3;
        if (i) {
          F = new Array(G * 3);
          const B = p.octvertexnormals.normals, J = F.length / 2;
          for (let fe = 0, gt = G / 2; fe < gt; fe++) {
            const yt = I[fe], Me = 3 * fe, es = B[3 * yt + 0], ts = B[3 * yt + 1], ss = B[3 * yt + 2];
            F[Me + 0] = es, F[Me + 1] = ts, F[Me + 2] = ss, F[J + Me + 0] = es, F[J + Me + 1] = ts, F[J + Me + 2] = ss;
          }
        } else {
          F = [], Xe.a.fromArray(D, 0), Xe.b.fromArray(E, 0), Xe.c.fromArray(D, 3), Xe.getNormal(as);
          for (let B = 0; B < G; B++)
            F.push(...as);
        }
      }
      return {
        uv: [...A, ...O],
        positions: [...D, ...E],
        indices: N,
        normals: F
      };
    }
  }
}
const z = 0, ue = ["a", "b", "c"], w = /* @__PURE__ */ new ke(), ls = /* @__PURE__ */ new ke(), cs = /* @__PURE__ */ new ke(), us = /* @__PURE__ */ new ke();
class Mn {
  constructor() {
    this.attributeList = null, this.splitOperations = [], this.trianglePool = new Di();
  }
  forEachSplitPermutation(e) {
    const { splitOperations: t } = this, s = (n = 0) => {
      if (n >= t.length) {
        e();
        return;
      }
      t[n].keepPositive = !0, s(n + 1), t[n].keepPositive = !1, s(n + 1);
    };
    s();
  }
  // Takes an operation that returns a value for the given vertex passed to the callback. Triangles
  // are clipped along edges where the interpolated value is equal to 0. The polygons on the positive
  // side of the operation are kept if "keepPositive" is true.
  // callback( geometry, i0, i1, i2, barycoord );
  addSplitOperation(e, t = !0) {
    this.splitOperations.push({
      callback: e,
      keepPositive: t
    });
  }
  // Removes all split operations
  clearSplitOperations() {
    this.splitOperations.length = 0;
  }
  // clips an object hierarchy
  clipObject(e) {
    const t = e.clone(), s = [];
    return t.traverse((n) => {
      n.isMesh && (n.geometry = this.clip(n).geometry, (n.geometry.index ? n.geometry.index.count / 3 : n.attributes.position.count / 3) === 0 && s.push(n));
    }), s.forEach((n) => {
      n.removeFromParent();
    }), t;
  }
  // Returns a new mesh that has been clipped by the split operations. Range indicates the range of
  // elements to include when clipping.
  clip(e, t = null) {
    const s = this.getClippedData(e, t);
    return this.constructMesh(s.attributes, s.index, e);
  }
  // Appends the clip operation data to the given "target" object so multiple ranges can be appended.
  // The "target" object is returned with an "index" field, "vertexIsClipped" field, and series of arrays
  // in "attributes".
  // attributes - set of attribute arrays
  // index - triangle indices referencing vertices in attributes
  // vertexIsClipped - array indicating whether a vertex is on a clipped edge
  getClippedData(e, t = null, s = {}) {
    const { trianglePool: n, splitOperations: i, attributeList: r } = this, o = e.geometry, l = o.attributes.position, c = o.index;
    let u = 0;
    const h = {};
    s.index = s.index || [], s.vertexIsClipped = s.vertexIsClipped || [], s.attributes = s.attributes || {};
    for (const p in o.attributes) {
      if (r !== null) {
        if (r instanceof Function && !r(p))
          continue;
        if (Array.isArray(r) && !r.includes(p))
          continue;
      }
      s.attributes[p] = [];
    }
    let d = 0, m = c ? c.count : l.count;
    t !== null && (d = t.start, m = t.count);
    for (let p = d, g = d + m; p < g; p += 3) {
      let y = p + 0, x = p + 1, b = p + 2;
      c && (y = c.getX(y), x = c.getX(x), b = c.getX(b));
      const T = n.get();
      T.initFromIndices(y, x, b);
      let M = [T];
      for (let S = 0; S < i.length; S++) {
        const { keepPositive: C, callback: v } = i[S], P = [];
        for (let R = 0; R < M.length; R++) {
          const V = M[R], { indices: k, barycoord: W } = V;
          V.clipValues.a = v(o, k.a, k.b, k.c, W.a, e.matrixWorld), V.clipValues.b = v(o, k.a, k.b, k.c, W.b, e.matrixWorld), V.clipValues.c = v(o, k.a, k.b, k.c, W.c, e.matrixWorld), this.splitTriangle(V, !C, P);
        }
        M = P;
      }
      for (let S = 0, C = M.length; S < C; S++) {
        const v = M[S];
        f(v, o);
      }
      n.reset();
    }
    return s;
    function f(p, g) {
      for (let y = 0; y < 3; y++) {
        const x = p.getVertexHash(y, g);
        x in h || (h[x] = u, u++, p.getVertexData(y, g, s.attributes), s.vertexIsClipped.push(p.clipValues[ue[y]] === z));
        const b = h[x];
        s.index.push(b);
      }
    }
  }
  // Takes the set of resultant data and constructs a mesh
  constructMesh(e, t, s) {
    const n = s.geometry, i = new Ve(), r = e.position.length / 3 > 65535 ? new Uint32Array(t) : new Uint16Array(t);
    i.setIndex(new $(r, 1, !1));
    for (const l in e) {
      const c = n.getAttribute(l), u = new c.array.constructor(e[l]), h = new $(u, c.itemSize, c.normalized);
      h.gpuType = c.gpuType, i.setAttribute(l, h);
    }
    const o = new Se(i, s.material.clone());
    return o.position.copy(s.position), o.quaternion.copy(s.quaternion), o.scale.copy(s.scale), o;
  }
  // Splits the given triangle
  splitTriangle(e, t, s) {
    const { trianglePool: n } = this, i = [], r = [], o = [];
    for (let l = 0; l < 3; l++) {
      const c = ue[l], u = ue[(l + 1) % 3], h = e.clipValues[c], d = e.clipValues[u];
      (h < z != d < z || h === z) && (i.push(l), r.push([c, u]), h === d ? o.push(0) : o.push(_.mapLinear(z, h, d, 0, 1)));
    }
    if (i.length !== 2)
      Math.min(
        e.clipValues.a,
        e.clipValues.b,
        e.clipValues.c
      ) < z === t && s.push(e);
    else if (i.length === 2) {
      const l = n.get().initFromTriangle(e), c = n.get().initFromTriangle(e), u = n.get().initFromTriangle(e);
      (i[0] + 1) % 3 === i[1] ? (l.lerpVertexFromEdge(e, r[0][0], r[0][1], o[0], "a"), l.copyVertex(e, r[0][1], "b"), l.lerpVertexFromEdge(e, r[1][0], r[1][1], o[1], "c"), l.clipValues.a = z, l.clipValues.c = z, c.lerpVertexFromEdge(e, r[0][0], r[0][1], o[0], "a"), c.copyVertex(e, r[1][1], "b"), c.copyVertex(e, r[0][0], "c"), c.clipValues.a = z, u.lerpVertexFromEdge(e, r[0][0], r[0][1], o[0], "a"), u.lerpVertexFromEdge(e, r[1][0], r[1][1], o[1], "b"), u.copyVertex(e, r[1][1], "c"), u.clipValues.a = z, u.clipValues.b = z) : (l.lerpVertexFromEdge(e, r[0][0], r[0][1], o[0], "a"), l.lerpVertexFromEdge(e, r[1][0], r[1][1], o[1], "b"), l.copyVertex(e, r[0][0], "c"), l.clipValues.a = z, l.clipValues.b = z, c.lerpVertexFromEdge(e, r[0][0], r[0][1], o[0], "a"), c.copyVertex(e, r[0][1], "b"), c.lerpVertexFromEdge(e, r[1][0], r[1][1], o[1], "c"), c.clipValues.a = z, c.clipValues.c = z, u.copyVertex(e, r[0][1], "a"), u.copyVertex(e, r[1][0], "b"), u.lerpVertexFromEdge(e, r[1][0], r[1][1], o[1], "c"), u.clipValues.c = z);
      let d, m;
      d = Math.min(l.clipValues.a, l.clipValues.b, l.clipValues.c), m = d < z, m === t && s.push(l), d = Math.min(c.clipValues.a, c.clipValues.b, c.clipValues.c), m = d < z, m === t && s.push(c), d = Math.min(u.clipValues.a, u.clipValues.b, u.clipValues.c), m = d < z, m === t && s.push(u);
    }
  }
}
class Di {
  constructor() {
    this.pool = [], this.index = 0;
  }
  get() {
    if (this.index >= this.pool.length) {
      const t = new Bi();
      this.pool.push(t);
    }
    const e = this.pool[this.index];
    return this.index++, e;
  }
  reset() {
    this.index = 0;
  }
}
class Bi {
  constructor() {
    this.indices = {
      a: -1,
      b: -1,
      c: -1
    }, this.clipValues = {
      a: -1,
      b: -1,
      c: -1
    }, this.barycoord = new Yt();
  }
  // returns a hash for the given [0, 2] index based on attributes of the referenced geometry
  getVertexHash(e, t) {
    const { barycoord: s, indices: n } = this, i = ue[e], r = s[i];
    if (r.x === 1)
      return n[ue[0]];
    if (r.y === 1)
      return n[ue[1]];
    if (r.z === 1)
      return n[ue[2]];
    {
      const { attributes: o } = t;
      let l = "";
      for (const c in o) {
        const u = o[c];
        switch (hs(u, n.a, n.b, n.c, r, w), (c === "normal" || c === "tangent" || c === "bitangent") && w.normalize(), u.itemSize) {
          case 4:
            l += Be(w.x, w.y, w.z, w.w);
            break;
          case 3:
            l += Be(w.x, w.y, w.z);
            break;
          case 2:
            l += Be(w.x, w.y);
            break;
          case 1:
            l += Be(w.x);
            break;
        }
        l += "|";
      }
      return l;
    }
  }
  // Accumulate the vertex data in the given attribute arrays
  getVertexData(e, t, s) {
    const { barycoord: n, indices: i } = this, r = ue[e], o = n[r], { attributes: l } = t;
    for (const c in l) {
      if (!s[c])
        continue;
      const u = l[c], h = s[c];
      switch (hs(u, i.a, i.b, i.c, o, w), (c === "normal" || c === "tangent" || c === "bitangent") && w.normalize(), u.itemSize) {
        case 4:
          h.push(w.x, w.y, w.z, w.w);
          break;
        case 3:
          h.push(w.x, w.y, w.z);
          break;
        case 2:
          h.push(w.x, w.y);
          break;
        case 1:
          h.push(w.x);
          break;
      }
    }
  }
  // Copy the indices from a target triangle
  initFromTriangle(e) {
    return this.initFromIndices(
      e.indices.a,
      e.indices.b,
      e.indices.c
    );
  }
  // Set the indices for the given
  initFromIndices(e, t, s) {
    return this.indices.a = e, this.indices.b = t, this.indices.c = s, this.clipValues.a = -1, this.clipValues.b = -1, this.clipValues.c = -1, this.barycoord.a.set(1, 0, 0), this.barycoord.b.set(0, 1, 0), this.barycoord.c.set(0, 0, 1), this;
  }
  // Lerp the given vertex along to the provided edge of the provided triangle
  lerpVertexFromEdge(e, t, s, n, i) {
    this.clipValues[i] = _.lerp(e.clipValues[t], e.clipValues[s], n), this.barycoord[i].lerpVectors(e.barycoord[t], e.barycoord[s], n);
  }
  // Copy a vertex from the provided triangle
  copyVertex(e, t, s) {
    this.clipValues[s] = e.clipValues[t], this.barycoord[s].copy(e.barycoord[t]);
  }
}
function hs(a, e, t, s, n, i) {
  switch (ls.fromBufferAttribute(a, e), cs.fromBufferAttribute(a, t), us.fromBufferAttribute(a, s), i.set(0, 0, 0, 0).addScaledVector(ls, n.x).addScaledVector(cs, n.y).addScaledVector(us, n.z), a.itemSize) {
    case 3:
      w.w = 0;
      break;
    case 2:
      w.w = 0, w.z = 0;
      break;
    case 1:
      w.w = 0, w.z = 0, w.y = 0;
      break;
  }
  return i;
}
function Be(...a) {
  let s = "";
  for (let n = 0, i = a.length; n < i; n++)
    s += ~~(a[n] * 1e5 + 0.5), n !== i - 1 && (s += "_");
  return s;
}
const ds = {}, Oi = /* @__PURE__ */ new L(), _t = /* @__PURE__ */ new L(), St = /* @__PURE__ */ new L(), Ui = /* @__PURE__ */ new L(), Ni = /* @__PURE__ */ new L(), Y = /* @__PURE__ */ new L(), Ce = /* @__PURE__ */ new L(), j = /* @__PURE__ */ new X(), ce = /* @__PURE__ */ new X(), ps = /* @__PURE__ */ new X();
class Vi extends Mn {
  constructor() {
    super(), this.ellipsoid = new pn(), this.skirtLength = 1e3, this.smoothSkirtNormals = !0, this.solid = !1, this.minLat = -Math.PI / 2, this.maxLat = Math.PI / 2, this.minLon = -Math.PI, this.maxLon = Math.PI, this.attributeList = ["position", "normal", "uv"];
  }
  clipToQuadrant(e, t, s) {
    const { solid: n, skirtLength: i, ellipsoid: r, smoothSkirtNormals: o } = this;
    this.clearSplitOperations(), this.addSplitOperation(fs("x"), !t), this.addSplitOperation(fs("y"), !s);
    let l, c;
    const u = e.geometry.groups[0], h = this.getClippedData(e, u);
    if (this.adjustVertices(h, e.position, 0), n) {
      l = {
        index: h.index.slice().reverse(),
        attributes: {}
      };
      for (const M in h.attributes)
        l.attributes[M] = h.attributes[M].slice();
      const T = l.attributes.normal;
      if (T)
        for (let M = 0; M < T.length; M += 3)
          T[M + 0] *= -1, T[M + 1] *= -1, T[M + 2] *= -1;
      this.adjustVertices(l, e.position, -i);
    }
    if (i > 0) {
      c = {
        index: [],
        attributes: {
          position: [],
          normal: [],
          uv: []
        }
      };
      let T = 0;
      const M = {}, S = (k, W, Q) => {
        const H = Be(...k, ...Q, ...W);
        H in M || (M[H] = T, T++, c.attributes.position.push(...k), c.attributes.normal.push(...Q), c.attributes.uv.push(...W)), c.index.push(M[H]);
      }, C = h.index, v = h.attributes.uv, P = h.attributes.position, R = h.attributes.normal, V = h.index.length / 3;
      for (let k = 0; k < V; k++) {
        const W = 3 * k;
        for (let Q = 0; Q < 3; Q++) {
          const H = (Q + 1) % 3, I = C[W + Q], A = C[W + H];
          if (j.fromArray(v, I * 2), ce.fromArray(v, A * 2), j.x === ce.x && (j.x === 0 || j.x === 0.5 || j.x === 1) || j.y === ce.y && (j.y === 0 || j.y === 0.5 || j.y === 1)) {
            _t.fromArray(P, I * 3), St.fromArray(P, A * 3);
            const D = _t, O = St, E = Ui.copy(_t), N = Ni.copy(St);
            Y.copy(E).add(e.position), r.getPositionToNormal(Y, Y), E.addScaledVector(Y, -i), Y.copy(N).add(e.position), r.getPositionToNormal(Y, Y), N.addScaledVector(Y, -i), o && R ? (Y.fromArray(R, I * 3), Ce.fromArray(R, A * 3)) : (Y.subVectors(D, O), Ce.subVectors(D, E).cross(Y).normalize(), Y.copy(Ce)), S(O, ce, Ce), S(D, j, Y), S(E, j, Y), S(O, ce, Ce), S(E, j, Y), S(N, ce, Ce);
          }
        }
      }
    }
    const d = h.index.length, m = h;
    if (l) {
      const { index: T, attributes: M } = l, S = m.attributes.position.length / 3;
      for (let C = 0, v = T.length; C < v; C++)
        m.index.push(T[C] + S);
      for (const C in h.attributes)
        m.attributes[C].push(...M[C]);
    }
    if (c) {
      const { index: T, attributes: M } = c, S = m.attributes.position.length / 3;
      for (let C = 0, v = T.length; C < v; C++)
        m.index.push(T[C] + S);
      for (const C in h.attributes)
        m.attributes[C].push(...M[C]);
    }
    const f = t ? 0 : -0.5, p = s ? 0 : -0.5, g = m.attributes.uv;
    for (let T = 0, M = g.length; T < M; T += 2)
      g[T] = (g[T] + f) * 2, g[T + 1] = (g[T + 1] + p) * 2;
    const y = this.constructMesh(m.attributes, m.index, e);
    y.userData.minHeight = e.userData.minHeight, y.userData.maxHeight = e.userData.maxHeight;
    let x = 0, b = 0;
    return y.geometry.addGroup(b, d, x), b += d, x++, l && (y.geometry.addGroup(b, l.index.length, x), b += l.index.length, x++), c && (y.geometry.addGroup(b, c.index.length, x), b += c.index.length, x++), y;
  }
  adjustVertices(e, t, s) {
    const { ellipsoid: n, minLat: i, maxLat: r, minLon: o, maxLon: l } = this, { attributes: c, vertexIsClipped: u } = e, h = c.position, d = c.uv, m = h.length / 3;
    for (let f = 0; f < m; f++) {
      const p = j.fromArray(d, f * 2);
      u && u[f] && (Math.abs(p.x - 0.5) < 1e-10 && (p.x = 0.5), Math.abs(p.y - 0.5) < 1e-10 && (p.y = 0.5), j.toArray(d, f * 2));
      const g = _.lerp(i, r, p.y), y = _.lerp(o, l, p.x), x = Oi.fromArray(h, f * 3).add(t);
      n.getPositionToCartographic(x, ds), n.getCartographicToPosition(g, y, ds.height + s, x), x.sub(t), x.toArray(h, f * 3);
    }
  }
}
function fs(a) {
  return (e, t, s, n, i) => {
    const r = e.attributes.uv;
    return j.fromBufferAttribute(r, t), ce.fromBufferAttribute(r, s), ps.fromBufferAttribute(r, n), j[a] * i.x + ce[a] * i.y + ps[a] * i.z - 0.5;
  };
}
const ms = Symbol("TILE_X"), gs = Symbol("TILE_Y"), Oe = Symbol("TILE_LEVEL"), ge = Symbol("TILE_AVAILABLE"), Mt = Symbol("TILE_SPLIT_SOURCE_SCENE"), Ye = 1e4, ys = /* @__PURE__ */ new L();
function Fi(a, e, t, s) {
  if (a && e < a.length) {
    const n = a[e];
    for (let i = 0, r = n.length; i < r; i++) {
      const { startX: o, startY: l, endX: c, endY: u } = n[i];
      if (t >= o && t <= c && s >= l && s <= u)
        return !0;
    }
  }
  return !1;
}
function Cn(a) {
  const { available: e = null, maxzoom: t = null } = a;
  return t === null ? e.length - 1 : t;
}
function ki(a) {
  const { metadataAvailability: e = -1 } = a;
  return e;
}
function Ct(a, e) {
  const t = a[Oe], s = ki(e), n = Cn(e);
  return t < n && s !== -1 && t % s === 0;
}
function Gi(a, e, t, s, n) {
  return n.tiles[0].replace(/{\s*z\s*}/g, t).replace(/{\s*x\s*}/g, a).replace(/{\s*y\s*}/g, e).replace(/{\s*version\s*}/g, s);
}
class zi {
  constructor(e = {}) {
    const {
      useRecommendedSettings: t = !0,
      skirtLength: s = null,
      smoothSkirtNormals: n = !0,
      generateNormals: i = !0,
      solid: r = !1
    } = e;
    this.name = "QUANTIZED_MESH_PLUGIN", this.priority = -1e3, this.tiles = null, this.layer = null, this.useRecommendedSettings = t, this.skirtLength = s, this.smoothSkirtNormals = n, this.solid = r, this.generateNormals = i, this.attribution = null, this.tiling = new bn(), this.projection = new re();
  }
  // Plugin function
  init(e) {
    e.fetchOptions.headers = e.fetchOptions.headers || {}, e.fetchOptions.headers.Accept = "application/vnd.quantized-mesh,application/octet-stream;q=0.9", this.useRecommendedSettings && (e.errorTarget = 2), this.tiles = e;
  }
  loadRootTileset() {
    const { tiles: e } = this;
    let t = new URL("layer.json", new URL(e.rootURL, location.href));
    return e.invokeAllPlugins((s) => t = s.preprocessURL ? s.preprocessURL(t, null) : t), e.invokeOnePlugin((s) => s.fetchData && s.fetchData(t, this.tiles.fetchOptions)).then((s) => s.json()).then((s) => {
      this.layer = s;
      const {
        projection: n = "EPSG:4326",
        extensions: i = [],
        attribution: r = "",
        available: o = null
      } = s, {
        tiling: l,
        tiles: c,
        projection: u
      } = this;
      r && (this.attribution = {
        value: r,
        type: "string",
        collapsible: !0
      }), i.length > 0 && (c.fetchOptions.headers.Accept += `;extensions=${i.join("-")}`), u.setScheme(n);
      const { tileCountX: h, tileCountY: d } = u;
      l.setProjection(u), l.generateLevels(Cn(s) + 1, h, d);
      const m = [];
      for (let g = 0; g < h; g++) {
        const y = this.createChild(0, g, 0, o);
        y && m.push(y);
      }
      const f = {
        asset: {
          version: "1.1"
        },
        geometricError: 1 / 0,
        root: {
          refine: "REPLACE",
          geometricError: 1 / 0,
          boundingVolume: {
            region: [...this.tiling.getContentBounds(), -Ye, Ye]
          },
          children: m,
          [ge]: o,
          [Oe]: -1
        }
      };
      let p = c.rootURL;
      return c.invokeAllPlugins((g) => p = g.preprocessURL ? g.preprocessURL(p, null) : p), c.preprocessTileset(f, p), f;
    });
  }
  parseToMesh(e, t, s, n) {
    const {
      skirtLength: i,
      solid: r,
      smoothSkirtNormals: o,
      generateNormals: l,
      tiles: c
    } = this, u = c.ellipsoid;
    let h;
    if (s === "quantized_tile_split") {
      const p = new URL(n).searchParams, g = p.get("left") === "true", y = p.get("bottom") === "true", x = new Vi();
      x.ellipsoid.copy(u), x.solid = r, x.smoothSkirtNormals = o, x.skirtLength = i === null ? t.geometricError : i;
      const [b, T, M, S] = t.parent.boundingVolume.region;
      x.minLat = T, x.maxLat = S, x.minLon = b, x.maxLon = M;
      const C = t.parent.engineData.scene || t.parent[Mt];
      h = x.clipToQuadrant(C, g, y);
    } else if (s === "terrain") {
      const p = new Ri(c.manager);
      p.ellipsoid.copy(u), p.solid = r, p.smoothSkirtNormals = o, p.generateNormals = l, p.skirtLength = i === null ? t.geometricError : i;
      const [g, y, x, b] = t.boundingVolume.region;
      p.minLat = y, p.maxLat = b, p.minLon = g, p.maxLon = x, h = p.parse(e);
    } else
      return;
    const { minHeight: d, maxHeight: m, metadata: f } = h.userData;
    return t.boundingVolume.region[4] = d, t.boundingVolume.region[5] = m, t.engineData.boundingVolume.setRegionData(u, ...t.boundingVolume.region), f && ("geometricerror" in f && (t.geometricError = f.geometricerror), Ct(t, this.layer) && "available" in f && t.children.length === 0 && (t[ge] = [
      ...new Array(t[Oe] + 1).fill(null),
      ...f.available
    ])), t[Mt] = h, this.expandChildren(t), h;
  }
  getAttributions(e) {
    this.attribution && e.push(this.attribution);
  }
  // Local functions
  createChild(e, t, s, n) {
    const { tiles: i, layer: r, tiling: o, projection: l } = this, c = i.ellipsoid, u = n === null && e === 0 || Fi(n, e, t, s), h = Gi(t, s, e, 1, r), d = [...o.getTileBounds(t, s, e), -Ye, Ye], [
      /* west */
      ,
      m,
      /* east */
      ,
      f,
      /* minHeight */
      ,
      p
    ] = d, g = m > 0 != f > 0 ? 0 : Math.min(Math.abs(m), Math.abs(f));
    c.getCartographicToPosition(g, 0, p, ys), ys.z = 0;
    const y = l.tileCountX, T = Math.max(...c.radius) * 2 * Math.PI * 0.25 / (65 * y) / 2 ** e, M = {
      [ge]: null,
      [Oe]: e,
      [ms]: t,
      [gs]: s,
      refine: "REPLACE",
      geometricError: T,
      boundingVolume: { region: d },
      content: u ? { uri: h } : null,
      children: []
    };
    return Ct(M, r) || (M[ge] = n), M;
  }
  expandChildren(e) {
    const t = e[Oe], s = e[ms], n = e[gs], i = e[ge];
    if (t >= this.tiling.maxLevel)
      return;
    let r = !1;
    for (let o = 0; o < 2; o++)
      for (let l = 0; l < 2; l++) {
        const c = this.createChild(t + 1, 2 * s + o, 2 * n + l, i);
        c.content !== null ? (e.children.push(c), r = !0) : (c.content = { uri: `tile.quantized_tile_split?bottom=${l === 0}&left=${o === 0}` }, c.internal = { isVirtual: !0 }, e.internal.virtualChildCount++, e.children.push(c));
      }
    r || (e.children.length -= e.internal.virtualChildCount, e.internal.virtualChildCount = 0);
  }
  fetchData(e, t) {
    if (/quantized_tile_split/.test(e))
      return new ArrayBuffer();
  }
  disposeTile(e) {
    const { tiles: t, layer: s } = this;
    if (delete e[Mt], Ct(e, s) && (e[ge] = null), ge in e) {
      const { virtualChildCount: n } = e.internal, i = e.children.length, r = i - n;
      for (let o = r; o < i; o++)
        t.processNodeQueue.remove(e.children[o]);
      e.children.length = 0, e.internal.virtualChildCount = 0;
    }
  }
}
let ho = class extends jn {
  constructor(e = {}) {
    super({
      assetTypeHandler: (t, s, n) => {
        t === "TERRAIN" && s.getPluginByName("QUANTIZED_MESH_PLUGIN") === null ? (console.warn(
          'CesiumIonAuthPlugin: CesiumIonAuthPlugin plugin auto-registration has been deprecated. Please implement a custom "assetTypeHandler" for "TERRAIN" using "QuantizedMeshPlugin", instead.'
        ), s.registerPlugin(new zi({
          useRecommendedSettings: this.useRecommendedSettings
        }))) : t === "IMAGERY" && s.getPluginByName("TMS_TILES_PLUGIN") === null ? (console.warn(
          'CesiumIonAuthPlugin: CesiumIonAuthPlugin plugin auto-registration has been deprecated. Please implement a custom "assetTypeHandler" for "IMAGERY" using "TMSTilesPlugin", instead.'
        ), s.registerPlugin(new Pi({
          useRecommendedSettings: this.useRecommendedSettings,
          shape: "ellipsoid"
        }))) : console.warn(`CesiumIonAuthPlugin: Cesium Ion asset type "${t}" unhandled.`);
      },
      ...e
    }), e.__suppress_warning__ && console.warn(
      'CesiumIonAuthPlugin: Plugin has been moved to "3d-tiles-renderer/core/plugins".'
    );
  }
};
const At = /* @__PURE__ */ new K();
class fo {
  constructor() {
    this.name = "UPDATE_ON_CHANGE_PLUGIN", this.tiles = null, this.needsUpdate = !1, this.cameraMatrices = /* @__PURE__ */ new Map();
  }
  init(e) {
    this.tiles = e, this._needsUpdateCallback = () => {
      this.needsUpdate = !0;
    }, this._onCameraAdd = ({ camera: t }) => {
      this.needsUpdate = !0, this.cameraMatrices.set(t, new K());
    }, this._onCameraDelete = ({ camera: t }) => {
      this.needsUpdate = !0, this.cameraMatrices.delete(t);
    }, e.addEventListener("needs-update", this._needsUpdateCallback), e.addEventListener("add-camera", this._onCameraAdd), e.addEventListener("delete-camera", this._onCameraDelete), e.addEventListener("camera-resolution-change", this._needsUpdateCallback), e.cameras.forEach((t) => {
      this._onCameraAdd({ camera: t });
    });
  }
  doTilesNeedUpdate() {
    const e = this.tiles;
    let t = !1;
    this.cameraMatrices.forEach((n, i) => {
      At.copy(e.group.matrixWorld).premultiply(i.matrixWorldInverse).premultiply(i.projectionMatrixInverse), t = t || !At.equals(n), n.copy(At);
    });
    const s = this.needsUpdate;
    return this.needsUpdate = !1, s || t;
  }
  preprocessNode() {
    this.needsUpdate = !0;
  }
  dispose() {
    const e = this.tiles;
    e.removeEventListener("camera-resolution-change", this._needsUpdateCallback), e.removeEventListener("needs-update", this._needsUpdateCallback), e.removeEventListener("add-camera", this._onCameraAdd), e.removeEventListener("delete-camera", this._onCameraDelete);
  }
}
const xs = /* @__PURE__ */ new L();
function we(a, e) {
  if (a.isInterleavedBufferAttribute || a.array instanceof e)
    return a;
  const s = e === Int8Array || e === Int16Array || e === Int32Array ? -1 : 0, n = new e(a.count * a.itemSize), i = new $(n, a.itemSize, !0), r = a.itemSize, o = a.count;
  for (let l = 0; l < o; l++)
    for (let c = 0; c < r; c++) {
      const u = _.clamp(a.getComponent(l, c), s, 1);
      i.setComponent(l, c, u);
    }
  return i;
}
function Hi(a, e = Int16Array) {
  const t = a.geometry, s = t.attributes, n = s.position;
  if (n.isInterleavedBufferAttribute || n.array instanceof e)
    return n;
  const i = new e(n.count * n.itemSize), r = new $(i, n.itemSize, !1), o = n.itemSize, l = n.count;
  t.computeBoundingBox();
  const c = t.boundingBox, { min: u, max: h } = c, d = 2 ** (8 * e.BYTES_PER_ELEMENT - 1) - 1, m = -d;
  for (let f = 0; f < l; f++)
    for (let p = 0; p < o; p++) {
      const g = p === 0 ? "x" : p === 1 ? "y" : "z", y = u[g], x = h[g], b = _.mapLinear(
        n.getComponent(f, p),
        y,
        x,
        m,
        d
      );
      r.setComponent(f, p, b);
    }
  c.getCenter(xs).multiply(a.scale).applyQuaternion(a.quaternion), a.position.add(xs), a.scale.x *= 0.5 * (h.x - u.x) / d, a.scale.y *= 0.5 * (h.y - u.y) / d, a.scale.z *= 0.5 * (h.z - u.z) / d, s.position = r, a.geometry.boundingBox = null, a.geometry.boundingSphere = null, a.updateMatrixWorld();
}
class mo {
  constructor(e) {
    this._options = {
      // whether to generate normals if they don't already exist.
      generateNormals: !1,
      // whether to disable use of mipmaps since they are typically not necessary
      // with something like 3d tiles.
      disableMipmaps: !0,
      // whether to compress certain attributes
      compressIndex: !0,
      compressNormals: !1,
      compressUvs: !1,
      compressPosition: !1,
      // the TypedArray type to use when compressing the attributes
      uvType: Int8Array,
      normalType: Int8Array,
      positionType: Int16Array,
      ...e
    }, this.name = "TILES_COMPRESSION_PLUGIN", this.priority = -100;
  }
  processTileModel(e, t) {
    const {
      generateNormals: s,
      disableMipmaps: n,
      compressIndex: i,
      compressUvs: r,
      compressNormals: o,
      compressPosition: l,
      uvType: c,
      normalType: u,
      positionType: h
    } = this._options;
    e.traverse((d) => {
      if (d.material && n) {
        const m = d.material;
        for (const f in m) {
          const p = m[f];
          p && p.isTexture && p.generateMipmaps && (p.generateMipmaps = !1, p.minFilter = ln);
        }
      }
      if (d.geometry) {
        const m = d.geometry, f = m.attributes;
        if (r) {
          const { uv: p, uv1: g, uv2: y, uv3: x } = f;
          p && (f.uv = we(p, c)), g && (f.uv1 = we(g, c)), y && (f.uv2 = we(y, c)), x && (f.uv3 = we(x, c));
        }
        if (s && !f.normals && m.computeVertexNormals(), o && f.normals && (f.normals = we(f.normals, u)), l && Hi(d, h), i && m.index) {
          const p = f.position.count, g = m.index, y = p > 65535 ? Uint32Array : p > 255 ? Uint16Array : Uint8Array;
          if (!(g.array instanceof y)) {
            const x = new y(m.index.count);
            x.set(g.array);
            const b = new $(x, 1);
            m.setIndex(b);
          }
        }
      }
    });
  }
}
function q(a, e, t) {
  return a && e in a ? a[e] : t;
}
function An(a) {
  return a !== "BOOLEAN" && a !== "STRING" && a !== "ENUM";
}
function qi(a) {
  return /^FLOAT/.test(a);
}
function He(a) {
  return /^VEC/.test(a);
}
function qe(a) {
  return /^MAT/.test(a);
}
function In(a, e, t, s = null) {
  return qe(t) || He(t) ? s.fromArray(a, e) : a[e];
}
function Gt(a) {
  const { type: e, componentType: t } = a;
  switch (e) {
    case "SCALAR":
      return t === "INT64" ? 0n : 0;
    case "VEC2":
      return new X();
    case "VEC3":
      return new L();
    case "VEC4":
      return new ke();
    case "MAT2":
      return new ei();
    case "MAT3":
      return new Kn();
    case "MAT4":
      return new K();
    case "BOOLEAN":
      return !1;
    case "STRING":
      return "";
    // the final value for enums is a string but are represented as integers
    // during intermediate steps
    case "ENUM":
      return 0;
  }
}
function Ts(a, e) {
  if (e == null)
    return !1;
  switch (a) {
    case "SCALAR":
      return typeof e == "number" || typeof e == "bigint";
    case "VEC2":
      return e.isVector2;
    case "VEC3":
      return e.isVector3;
    case "VEC4":
      return e.isVector4;
    case "MAT2":
      return e.isMatrix2;
    case "MAT3":
      return e.isMatrix3;
    case "MAT4":
      return e.isMatrix4;
    case "BOOLEAN":
      return typeof e == "boolean";
    case "STRING":
      return typeof e == "string";
    case "ENUM":
      return typeof e == "number" || typeof e == "bigint";
  }
  throw new Error("ClassProperty: invalid type.");
}
function Fe(a, e = null) {
  switch (a) {
    case "INT8":
      return Int8Array;
    case "INT16":
      return Int16Array;
    case "INT32":
      return Int32Array;
    case "INT64":
      return BigInt64Array;
    case "UINT8":
      return Uint8Array;
    case "UINT16":
      return Uint16Array;
    case "UINT32":
      return Uint32Array;
    case "UINT64":
      return BigUint64Array;
    case "FLOAT32":
      return Float32Array;
    case "FLOAT64":
      return Float64Array;
  }
  switch (e) {
    case "BOOLEAN":
      return Uint8Array;
    case "STRING":
      return Uint8Array;
  }
  throw new Error("ClassProperty: invalid type.");
}
function Wi(a, e = null) {
  if (a.array) {
    e = e && Array.isArray(e) ? e : [], e.length = a.count;
    for (let s = 0, n = e.length; s < n; s++)
      e[s] = at(a, e[s]);
  } else
    e = at(a, e);
  return e;
}
function at(a, e = null) {
  const t = a.default, s = a.type;
  if (e = e || Gt(a), t === null) {
    switch (s) {
      case "SCALAR":
        return 0;
      case "VEC2":
        return e.set(0, 0);
      case "VEC3":
        return e.set(0, 0, 0);
      case "VEC4":
        return e.set(0, 0, 0, 0);
      case "MAT2":
        return e.identity();
      case "MAT3":
        return e.identity();
      case "MAT4":
        return e.identity();
      case "BOOLEAN":
        return !1;
      case "STRING":
        return "";
      case "ENUM":
        return "";
    }
    throw new Error("ClassProperty: invalid type.");
  } else if (qe(s))
    e.fromArray(t);
  else if (He(s))
    e.fromArray(t);
  else
    return t;
}
function ji(a, e) {
  if (a.noData === null)
    return e;
  const t = a.noData, s = a.type;
  if (Array.isArray(e))
    for (let r = 0, o = e.length; r < o; r++)
      e[r] = n(e[r]);
  else
    e = n(e);
  return e;
  function n(r) {
    return i(r) && (r = at(a, r)), r;
  }
  function i(r) {
    if (qe(s)) {
      const o = r.elements;
      for (let l = 0, c = t.length; l < c; l++)
        if (t[l] !== o[l])
          return !1;
      return !0;
    } else if (He(s)) {
      for (let o = 0, l = t.length; o < l; o++)
        if (t[o] !== r.getComponent(o))
          return !1;
      return !0;
    } else
      return t === r;
  }
}
function Xi(a, e) {
  switch (a) {
    case "INT8":
      return Math.max(e / 127, -1);
    case "INT16":
      return Math.max(e, 32767, -1);
    case "INT32":
      return Math.max(e / 2147483647, -1);
    case "INT64":
      return Math.max(Number(e) / 9223372036854776e3, -1);
    // eslint-disable-line no-loss-of-precision
    case "UINT8":
      return e / 255;
    case "UINT16":
      return e / 65535;
    case "UINT32":
      return e / 4294967295;
    case "UINT64":
      return Number(e) / 18446744073709552e3;
  }
}
function Yi(a, e) {
  const {
    type: t,
    componentType: s,
    scale: n,
    offset: i,
    normalized: r
  } = a;
  if (Array.isArray(e))
    for (let h = 0, d = e.length; h < d; h++)
      e[h] = o(e[h]);
  else
    e = o(e);
  return e;
  function o(h) {
    return qe(t) ? h = c(h) : He(t) ? h = l(h) : h = u(h), h;
  }
  function l(h) {
    return h.x = u(h.x), h.y = u(h.y), "z" in h && (h.z = u(h.z)), "w" in h && (h.w = u(h.w)), h;
  }
  function c(h) {
    const d = h.elements;
    for (let m = 0, f = d.length; m < f; m++)
      d[m] = u(d[m]);
    return h;
  }
  function u(h) {
    return r && (h = Xi(s, h)), (r || qi(s)) && (h = h * n + i), h;
  }
}
function Zt(a, e, t = null) {
  if (a.array) {
    Array.isArray(e) || (e = new Array(a.count || 0)), e.length = t !== null ? t : a.count;
    for (let s = 0, n = e.length; s < n; s++)
      Ts(a.type, e[s]) || (e[s] = Gt(a));
  } else
    Ts(a.type, e) || (e = Gt(a));
  return e;
}
function lt(a, e) {
  for (const t in e)
    t in a || delete e[t];
  for (const t in a) {
    const s = a[t];
    e[t] = Zt(s, e[t]);
  }
}
function $i(a) {
  switch (a) {
    case "ENUM":
      return 1;
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
    // unused
    case "BOOLEAN":
      return -1;
    case "STRING":
      return -1;
    default:
      return -1;
  }
}
class mt {
  constructor(e, t, s = null) {
    this.name = t.name || null, this.description = t.description || null, this.type = t.type, this.componentType = t.componentType || null, this.enumType = t.enumType || null, this.array = t.array || !1, this.count = t.count || 0, this.normalized = t.normalized || !1, this.offset = t.offset || 0, this.scale = q(t, "scale", 1), this.max = q(t, "max", 1 / 0), this.min = q(t, "min", -1 / 0), this.required = t.required || !1, this.noData = q(t, "noData", null), this.default = q(t, "default", null), this.semantic = q(t, "semantic", null), this.enumSet = null, this.accessorProperty = s, s && (this.offset = q(s, "offset", this.offset), this.scale = q(s, "scale", this.scale), this.max = q(s, "max", this.max), this.min = q(s, "min", this.min)), t.type === "ENUM" && (this.enumSet = e[this.enumType], this.componentType === null && (this.componentType = q(this.enumSet, "valueType", "UINT16")));
  }
  // shape the given target to match the data type of the property
  // enums are set to their integer value
  shapeToProperty(e, t = null) {
    return Zt(this, e, t);
  }
  // resolve the given object to the default value for the property for a single element
  // enums are set to a default string
  resolveDefaultElement(e) {
    return at(this, e);
  }
  // resolve the target to the default value for the property for every element if it's an array
  // enums are set to a default string
  resolveDefault(e) {
    return Wi(this, e);
  }
  // converts any instances of no data to the default value
  resolveNoData(e) {
    return ji(this, e);
  }
  // converts enums integers in the given target to strings
  resolveEnumsToStrings(e) {
    const t = this.enumSet;
    if (this.type === "ENUM")
      if (Array.isArray(e))
        for (let n = 0, i = e.length; n < i; n++)
          e[n] = s(e[n]);
      else
        e = s(e);
    return e;
    function s(n) {
      const i = t.values.find((r) => r.value === n);
      return i === null ? "" : i.name;
    }
  }
  // apply scales
  adjustValueScaleOffset(e) {
    return An(this.type) ? Yi(this, e) : e;
  }
}
class Jt {
  constructor(e, t = {}, s = {}, n = null) {
    this.definition = e, this.class = t[e.class], this.className = e.class, this.enums = s, this.data = n, this.name = "name" in e ? e.name : null, this.properties = null;
  }
  getPropertyNames() {
    return Object.keys(this.class.properties);
  }
  includesData(e) {
    return !!this.definition.properties[e];
  }
  dispose() {
  }
  _initProperties(e = mt) {
    const t = {};
    for (const s in this.class.properties)
      t[s] = new e(this.enums, this.class.properties[s], this.definition.properties[s]);
    this.properties = t;
  }
}
class Qi extends mt {
  constructor(e, t, s = null) {
    super(e, t, s), this.attribute = (s == null ? void 0 : s.attribute) ?? null;
  }
}
class Zi extends Jt {
  constructor(...e) {
    super(...e), this.isPropertyAttributeAccessor = !0, this._initProperties(Qi);
  }
  getData(e, t, s = {}) {
    const n = this.properties;
    lt(n, s);
    for (const i in n)
      s[i] = this.getPropertyValue(i, e, t, s[i]);
    return s;
  }
  getPropertyValue(e, t, s, n = null) {
    if (t >= this.count)
      throw new Error("PropertyAttributeAccessor: Requested index is outside the range of the buffer.");
    const i = this.properties[e], r = i.type;
    if (i) {
      if (!this.definition.properties[e])
        return i.resolveDefault(n);
    } else throw new Error("PropertyAttributeAccessor: Requested class property does not exist.");
    n = i.shapeToProperty(n);
    const o = s.getAttribute(i.attribute.toLowerCase());
    if (qe(r)) {
      const l = n.elements;
      for (let c = 0, u = l.length; c < u; c < u)
        l[c] = o.getComponent(t, c);
    } else if (He(r))
      n.fromBufferAttribute(o, t);
    else if (r === "SCALAR" || r === "ENUM")
      n = o.getX(t);
    else
      throw new Error("StructuredMetadata.PropertyAttributeAccessor: BOOLEAN and STRING types are not supported by property attributes.");
    return n = i.adjustValueScaleOffset(n), n = i.resolveEnumsToStrings(n), n = i.resolveNoData(n), n;
  }
}
class Ji extends mt {
  constructor(e, t, s = null) {
    super(e, t, s), this.values = (s == null ? void 0 : s.values) ?? null, this.valueLength = $i(this.type), this.arrayOffsets = q(s, "arrayOffsets", null), this.stringOffsets = q(s, "stringOffsets", null), this.arrayOffsetType = q(s, "arrayOffsetType", "UINT32"), this.stringOffsetType = q(s, "stringOffsetType", "UINT32");
  }
  // returns the necessary array length based on the array offsets if present
  getArrayLengthFromId(e, t) {
    let s = this.count;
    if (this.arrayOffsets !== null) {
      const { arrayOffsets: n, arrayOffsetType: i } = this, r = Fe(i), o = new r(e[n]);
      s = o[t + 1] - o[t];
    }
    return s;
  }
  // returns the index offset into the data buffer for the given id based on the
  // the array offsets if present
  getIndexOffsetFromId(e, t) {
    let s = t;
    if (this.arrayOffsets) {
      const { arrayOffsets: n, arrayOffsetType: i } = this, r = Fe(i);
      s = new r(e[n])[s];
    } else this.array && (s *= this.count);
    return s;
  }
}
class Ki extends Jt {
  constructor(...e) {
    super(...e), this.isPropertyTableAccessor = !0, this.count = this.definition.count, this._initProperties(Ji);
  }
  getData(e, t = {}) {
    const s = this.properties;
    lt(s, t);
    for (const n in s)
      t[n] = this.getPropertyValue(n, e, t[n]);
    return t;
  }
  // reads an individual element
  _readValueAtIndex(e, t, s, n = null) {
    const i = this.properties[e], { componentType: r, type: o } = i, l = this.data, c = l[i.values], u = Fe(r, o), h = new u(c), d = i.getIndexOffsetFromId(l, t);
    if (An(o) || o === "ENUM")
      return In(h, (d + s) * i.valueLength, o, n);
    if (o === "STRING") {
      let m = d + s, f = 0;
      if (i.stringOffsets !== null) {
        const { stringOffsets: g, stringOffsetType: y } = i, x = Fe(y), b = new x(l[g]);
        f = b[m + 1] - b[m], m = b[m];
      }
      const p = new Uint8Array(h.buffer, m, f);
      n = new TextDecoder().decode(p);
    } else if (o === "BOOLEAN") {
      const m = d + s, f = Math.floor(m / 8), p = m % 8;
      n = (h[f] >> p & 1) === 1;
    }
    return n;
  }
  // Reads the data for the given table index
  getPropertyValue(e, t, s = null) {
    if (t >= this.count)
      throw new Error("PropertyTableAccessor: Requested index is outside the range of the table.");
    const n = this.properties[e];
    if (n) {
      if (!this.definition.properties[e])
        return n.resolveDefault(s);
    } else throw new Error("PropertyTableAccessor: Requested property does not exist.");
    const i = n.array, r = this.data, o = n.getArrayLengthFromId(r, t);
    if (s = n.shapeToProperty(s, o), i)
      for (let l = 0, c = s.length; l < c; l++)
        s[l] = this._readValueAtIndex(e, t, l, s[l]);
    else
      s = this._readValueAtIndex(e, t, 0, s);
    return s = n.adjustValueScaleOffset(s), s = n.resolveEnumsToStrings(s), s = n.resolveNoData(s), s;
  }
}
const Pe = /* @__PURE__ */ new oi();
class bs {
  constructor() {
    this._renderer = new ti(), this._target = new ns(1, 1), this._texTarget = new ns(), this._quad = new mn(new si({
      blending: ri,
      blendDst: ii,
      blendSrc: ni,
      uniforms: {
        map: { value: null },
        pixel: { value: new X() }
      },
      vertexShader: (
        /* glsl */
        `
				void main() {

					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}
			`
      ),
      fragmentShader: (
        /* glsl */
        `
				uniform sampler2D map;
				uniform ivec2 pixel;

				void main() {

					gl_FragColor = texelFetch( map, pixel, 0 );

				}
			`
      )
    }));
  }
  // increases the width of the target render target to support more data
  increaseSizeTo(e) {
    this._target.setSize(Math.max(this._target.width, e), 1);
  }
  // read data from the rendered texture asynchronously
  readDataAsync(e) {
    const { _renderer: t, _target: s } = this;
    return t.readRenderTargetPixelsAsync(s, 0, 0, e.length / 4, 1, e);
  }
  // read data from the rendered texture
  readData(e) {
    const { _renderer: t, _target: s } = this;
    t.readRenderTargetPixels(s, 0, 0, e.length / 4, 1, e);
  }
  // render a single pixel from the source at the destination point on the render target
  // takes the texture, pixel to read from, and pixel to render in to
  renderPixelToTarget(e, t, s) {
    const { _renderer: n, _target: i } = this;
    Pe.min.copy(t), Pe.max.copy(t), Pe.max.x += 1, Pe.max.y += 1, n.initRenderTarget(i), n.copyTextureToTexture(e, i.texture, Pe, s, 0);
  }
}
const de = /* @__PURE__ */ new class {
  constructor() {
    let a = null;
    Object.getOwnPropertyNames(bs.prototype).forEach((e) => {
      e !== "constructor" && (this[e] = (...t) => (a = a || new bs(), a[e](...t)));
    });
  }
}(), _s = /* @__PURE__ */ new X(), Ss = /* @__PURE__ */ new X(), Ms = /* @__PURE__ */ new X();
function er(a, e) {
  return e === 0 ? a.getAttribute("uv") : a.getAttribute(`uv${e}`);
}
function vn(a, e, t = new Array(3)) {
  let s = 3 * e, n = 3 * e + 1, i = 3 * e + 2;
  return a.index && (s = a.index.getX(s), n = a.index.getX(n), i = a.index.getX(i)), t[0] = s, t[1] = n, t[2] = i, t;
}
function Ln(a, e, t, s, n) {
  const [i, r, o] = s, l = er(a, e);
  _s.fromBufferAttribute(l, i), Ss.fromBufferAttribute(l, r), Ms.fromBufferAttribute(l, o), n.set(0, 0, 0).addScaledVector(_s, t.x).addScaledVector(Ss, t.y).addScaledVector(Ms, t.z);
}
function En(a, e, t, s) {
  const n = a.x - Math.floor(a.x), i = a.y - Math.floor(a.y), r = Math.floor(n * e % e), o = Math.floor(i * t % t);
  return s.set(r, o), s;
}
const Cs = /* @__PURE__ */ new X(), As = /* @__PURE__ */ new X(), Is = /* @__PURE__ */ new X();
class tr extends mt {
  constructor(e, t, s = null) {
    super(e, t, s), this.channels = q(s, "channels", [0]), this.index = q(s, "index", null), this.texCoord = q(s, "texCoord", null), this.valueLength = parseInt(this.type.replace(/[^0-9]/g, "")) || 1;
  }
  // takes the buffer to read from and the value index to read
  readDataFromBuffer(e, t, s = null) {
    const n = this.type;
    if (n === "BOOLEAN" || n === "STRING")
      throw new Error("PropertyTextureAccessor: BOOLEAN and STRING types not supported.");
    return In(e, t * this.valueLength, n, s);
  }
}
class sr extends Jt {
  constructor(...e) {
    super(...e), this.isPropertyTextureAccessor = !0, this._asyncRead = !1, this._initProperties(tr);
  }
  // Reads the full set of property data
  getData(e, t, s, n = {}) {
    const i = this.properties;
    lt(i, n);
    const r = Object.keys(i), o = r.map((l) => n[l]);
    return this.getPropertyValuesAtTexel(r, e, t, s, o), r.forEach((l, c) => n[l] = o[c]), n;
  }
  // Reads the full set of property data asynchronously
  async getDataAsync(e, t, s, n = {}) {
    const i = this.properties;
    lt(i, n);
    const r = Object.keys(i), o = r.map((l) => n[l]);
    return await this.getPropertyValuesAtTexelAsync(r, e, t, s, o), r.forEach((l, c) => n[l] = o[c]), n;
  }
  // Reads values asynchronously
  getPropertyValuesAtTexelAsync(...e) {
    this._asyncRead = !0;
    const t = this.getPropertyValuesAtTexel(...e);
    return this._asyncRead = !1, t;
  }
  // Reads values from the textures synchronously
  getPropertyValuesAtTexel(e, t, s, n, i = []) {
    for (; i.length < e.length; ) i.push(null);
    i.length = e.length, de.increaseSizeTo(i.length);
    const r = this.data, o = this.definition.properties, l = this.properties, c = vn(n, t);
    for (let d = 0, m = e.length; d < m; d++) {
      const f = e[d];
      if (!o[f])
        continue;
      const p = l[f], g = r[p.index];
      Ln(n, p.texCoord, s, c, Cs), En(Cs, g.image.width, g.image.height, As), Is.set(d, 0), de.renderPixelToTarget(g, As, Is);
    }
    const u = new Uint8Array(e.length * 4);
    if (this._asyncRead)
      return de.readDataAsync(u).then(() => (h.call(this), i));
    return de.readData(u), h.call(this), i;
    function h() {
      for (let d = 0, m = e.length; d < m; d++) {
        const f = e[d], p = l[f], g = p.type;
        if (i[d] = Zt(p, i[d]), p) {
          if (!o[f]) {
            i[d] = p.resolveDefault(i);
            continue;
          }
        } else throw new Error("PropertyTextureAccessor: Requested property does not exist.");
        const y = p.valueLength * (p.count || 1), x = p.channels.map((S) => u[4 * d + S]), b = p.componentType, T = Fe(b, g), M = new T(y);
        if (new Uint8Array(M.buffer).set(x), p.array) {
          const S = i[d];
          for (let C = 0, v = S.length; C < v; C++)
            S[C] = p.readDataFromBuffer(M, C, S[C]);
        } else
          i[d] = p.readDataFromBuffer(M, 0, i[d]);
        i[d] = p.adjustValueScaleOffset(i[d]), i[d] = p.resolveEnumsToStrings(i[d]), i[d] = p.resolveNoData(i[d]);
      }
    }
  }
  // dispose all of the texture data used
  dispose() {
    this.data.forEach((e) => {
      e && (e.dispose(), e.image instanceof ImageBitmap && e.image.close());
    });
  }
}
class vs {
  constructor(e, t, s, n = null, i = null) {
    const {
      schema: r,
      propertyTables: o = [],
      propertyTextures: l = [],
      propertyAttributes: c = []
    } = e, { enums: u, classes: h } = r, d = o.map((p) => new Ki(p, h, u, s));
    let m = [], f = [];
    n && (n.propertyTextures && (m = n.propertyTextures.map((p) => new sr(l[p], h, u, t))), n.propertyAttributes && (f = n.propertyAttributes.map((p) => new Zi(c[p], h, u)))), this.schema = r, this.tableAccessors = d, this.textureAccessors = m, this.attributeAccessors = f, this.object = i, this.textures = t, this.nodeMetadata = n;
  }
  // Property Tables
  /**
   * Returns data from one or more property tables. Pass a single table index and row ID to
   * get one object, or parallel arrays of table indices and row IDs to get an array of
   * results. Each returned object conforms to the structure class referenced in the schema.
   * @param {number|Array<number>} tableIndices Table index or array of table indices.
   * @param {number|Array<number>} ids Row ID or array of row IDs.
   * @param {Object|Array|null} [target=null] Optional target object or array to write into.
   * @returns {Object|Array}
   */
  getPropertyTableData(e, t, s = null) {
    if (!Array.isArray(e) || !Array.isArray(t))
      s = s || {}, s = this.tableAccessors[e].getData(t, s);
    else {
      s = s || [];
      const n = Math.min(e.length, t.length);
      s.length = n;
      for (let i = 0; i < n; i++) {
        const r = this.tableAccessors[e[i]];
        s[i] = r.getData(t[i], s[i]);
      }
    }
    return s;
  }
  /**
   * Returns name and class information for one or more property tables. Defaults to all
   * tables when `tableIndices` is `null`.
   * @param {Array<number>|null} [tableIndices=null]
   * @returns {Array<{name: string, className: string}>|{name: string, className: string}}
   */
  getPropertyTableInfo(e = null) {
    if (e === null && (e = this.tableAccessors.map((t, s) => s)), Array.isArray(e))
      return e.map((t) => {
        const s = this.tableAccessors[t];
        return {
          name: s.name,
          className: s.definition.class
        };
      });
    {
      const t = this.tableAccessors[e];
      return {
        name: t.name,
        className: t.definition.class
      };
    }
  }
  // Property Textures
  /**
   * Returns data from property textures at the given point on the mesh. Takes the triangle
   * index and barycentric coordinate from a raycast result. See `MeshFeatures.getFeatures`
   * for how to obtain these values.
   * @param {number} triangle Triangle index from a raycast hit.
   * @param {Vector3} barycoord Barycentric coordinate of the hit point.
   * @param {Array} [target=[]] Optional target array to write into.
   * @returns {Array}
   */
  getPropertyTextureData(e, t, s = []) {
    const n = this.textureAccessors;
    s.length = n.length;
    for (let i = 0; i < n.length; i++) {
      const r = n[i];
      s[i] = r.getData(e, t, this.object.geometry, s[i]);
    }
    return s;
  }
  /**
   * Returns the same data as `getPropertyTextureData` but performs texture reads
   * asynchronously.
   * @param {number} triangle Triangle index from a raycast hit.
   * @param {Vector3} barycoord Barycentric coordinate of the hit point.
   * @param {Array} [target=[]] Optional target array to write into.
   * @returns {Promise<Array>}
   */
  async getPropertyTextureDataAsync(e, t, s = []) {
    const n = this.textureAccessors;
    s.length = n.length;
    const i = [];
    for (let r = 0; r < n.length; r++) {
      const l = n[r].getDataAsync(e, t, this.object.geometry, s[r]).then((c) => {
        s[r] = c;
      });
      i.push(l);
    }
    return await Promise.all(i), s;
  }
  /**
   * Returns information about the property texture accessors, including their class names
   * and per-property channel/texcoord mappings.
   * @returns {Array<{name: string, className: string, properties: Object}>}
   */
  getPropertyTextureInfo() {
    return this.textureAccessors;
  }
  // Property Attributes
  /**
   * Returns data stored as property attributes for the given vertex index.
   * @param {number} attributeIndex Vertex index.
   * @param {Array} [target=[]] Optional target array to write into.
   * @returns {Array}
   */
  getPropertyAttributeData(e, t = []) {
    const s = this.attributeAccessors;
    t.length = s.length;
    for (let n = 0; n < s.length; n++) {
      const i = s[n];
      t[n] = i.getData(e, this.object.geometry, t[n]);
    }
    return t;
  }
  /**
   * Returns name and class information for all property attribute accessors.
   * @returns {Array<{name: string, className: string}>}
   */
  getPropertyAttributeInfo() {
    return this.attributeAccessors.map((e) => ({
      name: e.name,
      className: e.definition.class
    }));
  }
  /**
   * Disposes all texture, table, and attribute accessors.
   */
  dispose() {
    this.textureAccessors.forEach((e) => e.dispose()), this.tableAccessors.forEach((e) => e.dispose()), this.attributeAccessors.forEach((e) => e.dispose());
  }
}
const Re = "EXT_structural_metadata";
function nr(a, e = []) {
  var n;
  const t = ((n = a.json.textures) == null ? void 0 : n.length) || 0, s = new Array(t).fill(null);
  return e.forEach(({ properties: i }) => {
    for (const r in i) {
      const { index: o } = i[r];
      s[o] === null && (s[o] = a.loadTexture(o));
    }
  }), Promise.all(s);
}
function ir(a, e = []) {
  var n;
  const t = ((n = a.json.bufferViews) == null ? void 0 : n.length) || 0, s = new Array(t).fill(null);
  return e.forEach(({ properties: i }) => {
    for (const r in i) {
      const { values: o, arrayOffsets: l, stringOffsets: c } = i[r];
      s[o] === null && (s[o] = a.loadBufferView(o)), s[l] === null && (s[l] = a.loadBufferView(l)), s[c] === null && (s[c] = a.loadBufferView(c));
    }
  }), Promise.all(s);
}
class rr {
  constructor(e) {
    this.parser = e, this.name = Re;
  }
  async afterRoot({ scene: e, parser: t }) {
    const s = t.json.extensionsUsed;
    if (!s || !s.includes(Re))
      return;
    let n = null, i = t.json.extensions[Re];
    if (i.schemaUri) {
      const { manager: c, path: u, requestHeader: h, crossOrigin: d } = t.options, m = new URL(i.schemaUri, u).toString(), f = new ai(c);
      f.setCrossOrigin(d), f.setResponseType("json"), f.setRequestHeader(h), n = f.loadAsync(m).then((p) => {
        i = { ...i, schema: p };
      });
    }
    const [r, o] = await Promise.all([
      nr(t, i.propertyTextures),
      ir(t, i.propertyTables),
      n
    ]), l = new vs(i, r, o);
    e.userData.structuralMetadata = l, e.traverse((c) => {
      var u;
      if (t.associations.has(c)) {
        const { meshes: h, primitives: d } = t.associations.get(c), m = (u = t.json.meshes[h]) == null ? void 0 : u.primitives[d];
        if (m && m.extensions && m.extensions[Re]) {
          const f = m.extensions[Re];
          c.userData.structuralMetadata = new vs(i, r, o, f, c);
        } else
          c.userData.structuralMetadata = l;
      }
    });
  }
}
const Ls = /* @__PURE__ */ new X(), Es = /* @__PURE__ */ new X(), ws = /* @__PURE__ */ new X();
function or(a) {
  return a.x > a.y && a.x > a.z ? 0 : a.y > a.z ? 1 : 2;
}
class ar {
  constructor(e, t, s) {
    this.geometry = e, this.textures = t, this.data = s, this._asyncRead = !1, this.featureIds = s.featureIds.map((n) => {
      const { texture: i, ...r } = n, o = {
        label: null,
        propertyTable: null,
        nullFeatureId: null,
        ...r
      };
      return i && (o.texture = {
        texCoord: 0,
        channels: [0],
        ...i
      }), o;
    });
  }
  /**
   * Returns an indexed list of all textures used by features in the extension.
   * @returns {Array<Texture>}
   */
  getTextures() {
    return this.textures;
  }
  /**
   * Returns the feature ID info for each feature set defined on this primitive.
   * @returns {Array<FeatureInfo>}
   */
  getFeatureInfo() {
    return this.featureIds;
  }
  /**
   * Performs the same function as `getFeatures` but reads texture data asynchronously.
   * @param {number} triangle Triangle index from a raycast hit.
   * @param {Vector3} barycoord Barycentric coordinate of the hit point.
   * @returns {Promise<Array<number|null>>}
   */
  getFeaturesAsync(...e) {
    this._asyncRead = !0;
    const t = this.getFeatures(...e);
    return this._asyncRead = !1, t;
  }
  /**
   * Returns the list of feature IDs at the given point on the mesh. Takes the triangle
   * index from a raycast result and a barycentric coordinate. Results are indexed in the
   * same order as the feature info returned by `getFeatureInfo()`.
   * @param {number} triangle Triangle index from a raycast hit.
   * @param {Vector3} barycoord Barycentric coordinate of the hit point.
   * @returns {Array<number|null>}
   */
  getFeatures(e, t) {
    const { geometry: s, textures: n, featureIds: i } = this, r = new Array(i.length).fill(null), o = i.length;
    de.increaseSizeTo(o);
    const l = vn(s, e), c = l[or(t)];
    for (let d = 0, m = i.length; d < m; d++) {
      const f = i[d], p = "nullFeatureId" in f ? f.nullFeatureId : null;
      if ("texture" in f) {
        const g = n[f.texture.index];
        Ln(s, f.texture.texCoord, t, l, Ls), En(Ls, g.image.width, g.image.height, Es), ws.set(d, 0), de.renderPixelToTarget(n[f.texture.index], Es, ws);
      } else if ("attribute" in f) {
        const y = s.getAttribute(`_feature_id_${f.attribute}`).getX(c);
        y !== p && (r[d] = y);
      } else {
        const g = c;
        g !== p && (r[d] = g);
      }
    }
    const u = new Uint8Array(o * 4);
    if (this._asyncRead)
      return de.readDataAsync(u).then(() => (h(), r));
    return de.readData(u), h(), r;
    function h() {
      const d = new Uint32Array(1);
      for (let m = 0, f = i.length; m < f; m++) {
        const p = i[m], g = "nullFeatureId" in p ? p.nullFeatureId : null;
        if ("texture" in p) {
          const { channels: y } = p.texture, x = y.map((T) => u[4 * m + T]);
          new Uint8Array(d.buffer).set(x);
          const b = d[0];
          b !== g && (r[m] = b);
        }
      }
    }
  }
  /**
   * Disposes all textures used by this instance.
   */
  dispose() {
    this.textures.forEach((e) => {
      e && (e.dispose(), e.image instanceof ImageBitmap && e.image.close());
    });
  }
}
const ct = "EXT_mesh_features";
function Ps(a, e, t) {
  a.traverse((s) => {
    var n;
    if (e.associations.has(s)) {
      const { meshes: i, primitives: r } = e.associations.get(s), o = (n = e.json.meshes[i]) == null ? void 0 : n.primitives[r];
      o && o.extensions && o.extensions[ct] && t(s, o.extensions[ct]);
    }
  });
}
class lr {
  constructor(e) {
    this.parser = e, this.name = ct;
  }
  async afterRoot({ scene: e, parser: t }) {
    var o;
    const s = t.json.extensionsUsed;
    if (!s || !s.includes(ct))
      return;
    const n = ((o = t.json.textures) == null ? void 0 : o.length) || 0, i = new Array(n).fill(null);
    Ps(e, t, (l, { featureIds: c }) => {
      c.forEach((u) => {
        if (u.texture && i[u.texture.index] === null) {
          const h = u.texture.index;
          i[h] = t.loadTexture(h);
        }
      });
    });
    const r = await Promise.all(i);
    Ps(e, t, (l, c) => {
      l.userData.meshFeatures = new ar(l.geometry, r, c);
    });
  }
}
class cr {
  constructor() {
    this.name = "CESIUM_RTC";
  }
  afterRoot(e) {
    if (e.parser.json.extensions && e.parser.json.extensions.CESIUM_RTC) {
      const { center: t } = e.parser.json.extensions.CESIUM_RTC;
      t && (e.scene.position.x += t[0], e.scene.position.y += t[1], e.scene.position.z += t[2]);
    }
  }
}
class go {
  constructor(e) {
    e = {
      metadata: !0,
      rtc: !0,
      plugins: [],
      dracoLoader: null,
      ktxLoader: null,
      meshoptDecoder: null,
      autoDispose: !0,
      ...e
    }, this.tiles = null, this.metadata = e.metadata, this.rtc = e.rtc, this.plugins = e.plugins, this.dracoLoader = e.dracoLoader, this.ktxLoader = e.ktxLoader, this.meshoptDecoder = e.meshoptDecoder, this._gltfRegex = /\.(gltf|glb)$/g, this._dracoRegex = /\.drc$/g, this._loader = null;
  }
  init(e) {
    const t = new Si(e.manager);
    this.dracoLoader && (t.setDRACOLoader(this.dracoLoader), e.manager.addHandler(this._dracoRegex, this.dracoLoader)), this.ktxLoader && t.setKTX2Loader(this.ktxLoader), this.meshoptDecoder && t.setMeshoptDecoder(this.meshoptDecoder), this.rtc && t.register(() => new cr()), this.metadata && (t.register(() => new rr()), t.register(() => new lr())), this.plugins.forEach((s) => t.register(s)), e.manager.addHandler(this._gltfRegex, t), this.tiles = e, this._loader = t;
  }
  dispose() {
    this.tiles.manager.removeHandler(this._gltfRegex), this.tiles.manager.removeHandler(this._dracoRegex), this.autoDispose && (this.ktxLoader.dispose(), this.dracoLoader.dispose());
  }
}
const $e = /* @__PURE__ */ new pe();
class yo {
  constructor(e) {
    e = {
      up: "+z",
      recenter: !0,
      lat: null,
      lon: null,
      height: 0,
      azimuth: 0,
      elevation: 0,
      roll: 0,
      ...e
    }, this.tiles = null, this.up = e.up.toLowerCase().replace(/\s+/, ""), this.lat = e.lat, this.lon = e.lon, this.height = e.height, this.azimuth = e.azimuth, this.elevation = e.elevation, this.roll = e.roll, this.recenter = e.recenter, this._callback = null;
  }
  init(e) {
    this.tiles = e, this._callback = () => {
      const { up: t, lat: s, lon: n, height: i, azimuth: r, elevation: o, roll: l, recenter: c } = this;
      if (s !== null && n !== null)
        this.transformLatLonHeightToOrigin(s, n, i, r, o, l);
      else {
        const { ellipsoid: u } = e, h = Math.min(...u.radius);
        if (e.getBoundingSphere($e), $e.center.length() > h * 0.5) {
          const d = {};
          u.getPositionToCartographic($e.center, d), this.transformLatLonHeightToOrigin(d.lat, d.lon, d.height);
        } else {
          const d = e.group;
          switch (d.rotation.set(0, 0, 0), t) {
            case "x":
            case "+x":
              d.rotation.z = Math.PI / 2;
              break;
            case "-x":
              d.rotation.z = -Math.PI / 2;
              break;
            case "y":
            case "+y":
              break;
            case "-y":
              d.rotation.z = Math.PI;
              break;
            case "z":
            case "+z":
              d.rotation.x = -Math.PI / 2;
              break;
            case "-z":
              d.rotation.x = Math.PI / 2;
              break;
          }
          e.group.position.copy($e.center).applyEuler(d.rotation).multiplyScalar(-1);
        }
      }
      c || e.group.position.setScalar(0), e.removeEventListener("load-root-tileset", this._callback);
    }, e.addEventListener("load-root-tileset", this._callback), e.root && this._callback();
  }
  /**
   * Centers the tileset such that the given coordinates are positioned at the origin
   * with X facing west and Z facing north.
   * @param {number} lat Latitude in radians.
   * @param {number} lon Longitude in radians.
   * @param {number} [height=0] Height in metres above the ellipsoid surface.
   * @param {number} [azimuth=0] Azimuth rotation in radians.
   * @param {number} [elevation=0] Elevation rotation in radians.
   * @param {number} [roll=0] Roll rotation in radians.
   */
  transformLatLonHeightToOrigin(e, t, s = 0, n = 0, i = 0, r = 0) {
    const { group: o, ellipsoid: l } = this.tiles;
    l.getObjectFrame(e, t, s, n, i, r, o.matrix, xi), o.matrix.invert().decompose(o.position, o.quaternion, o.scale), o.updateMatrixWorld();
  }
  dispose() {
    const { group: e } = this.tiles;
    e.position.setScalar(0), e.quaternion.identity(), e.scale.set(1, 1, 1), this.tiles.removeEventListener("load-root-tileset", this._callback);
  }
}
class xo {
  set delay(e) {
    this.deferCallbacks.delay = e;
  }
  get delay() {
    return this.deferCallbacks.delay;
  }
  set bytesTarget(e) {
    this.lruCache.minBytesSize = e;
  }
  get bytesTarget() {
    return this.lruCache.minBytesSize;
  }
  /**
   * The number of bytes currently uploaded to the GPU for rendering. Compare to
   * `lruCache.cachedBytes` which reports all downloaded bytes including those not
   * yet on the GPU.
   * @type {number}
   */
  get estimatedGpuBytes() {
    return this.lruCache.cachedBytes;
  }
  constructor(e = {}) {
    const {
      delay: t = 0,
      bytesTarget: s = 0
    } = e;
    this.name = "UNLOAD_TILES_PLUGIN", this.tiles = null, this.lruCache = new Mi(), this.deferCallbacks = new ur(), this.delay = t, this.bytesTarget = s;
  }
  init(e) {
    this.tiles = e;
    const { lruCache: t, deferCallbacks: s } = this, n = (i) => {
      const r = i.engineData.scene;
      e.visibleTiles.has(i) || e.invokeOnePlugin((l) => l.unloadTileFromGPU && l.unloadTileFromGPU(r, i));
    };
    this._onUpdateBefore = () => {
      t.unloadPriorityCallback = e.lruCache.unloadPriorityCallback, t.minSize = 1 / 0, t.maxSize = 1 / 0, t.maxBytesSize = 1 / 0, t.unloadPercent = 1, t.autoMarkUnused = !1;
    }, this._onVisibilityChangeCallback = ({ tile: i, scene: r, visible: o }) => {
      o ? (t.add(i, n), t.setMemoryUsage(i, e.calculateBytesUsed(i, r) || 1), e.markTileUsed(i), s.cancel(i)) : s.run(i);
    }, this._onDisposeModel = ({ tile: i }) => {
      t.remove(i), s.cancel(i);
    }, s.callback = (i) => {
      t.markUnused(i), t.scheduleUnload();
    }, e.forEachLoadedModel((i, r) => {
      const o = e.visibleTiles.has(r);
      this._onVisibilityChangeCallback({ tile: r, visible: o });
    }), e.addEventListener("tile-visibility-change", this._onVisibilityChangeCallback), e.addEventListener("update-before", this._onUpdateBefore), e.addEventListener("dispose-model", this._onDisposeModel);
  }
  unloadTileFromGPU(e, t) {
    e && e.traverse((s) => {
      if (s.material) {
        const n = s.material;
        n.dispose();
        for (const i in n) {
          const r = n[i];
          r && r.isTexture && r.dispose();
        }
      }
      s.geometry && s.geometry.dispose();
    });
  }
  dispose() {
    const { lruCache: e, tiles: t, deferCallbacks: s } = this;
    t.removeEventListener("tile-visibility-change", this._onVisibilityChangeCallback), t.removeEventListener("update-before", this._onUpdateBefore), t.removeEventListener("dispose-model", this._onDisposeModel), s.cancelAll(), e.minBytesSize = 0, e.minSize = 0, e.maxSize = 0, e.markAllUnused(), e.scheduleUnload();
  }
}
class ur {
  constructor(e = () => {
  }) {
    this.map = /* @__PURE__ */ new Map(), this.callback = e, this.delay = 0;
  }
  run(e) {
    const { map: t, delay: s } = this;
    if (t.has(e))
      throw new Error("DeferCallbackManager: Callback already initialized.");
    s === 0 ? this.callback(e) : t.set(e, setTimeout(() => {
      this.callback(e), t.delete(e);
    }, s));
  }
  cancel(e) {
    const { map: t } = this;
    t.has(e) && (clearTimeout(t.get(e)), t.delete(e));
  }
  cancelAll() {
    this.map.forEach((e, t) => {
      this.cancel(t);
    });
  }
}
const { clamp: It } = _;
class hr {
  constructor() {
    this.duration = 250, this.fadeCount = 0, this._lastTick = -1, this._fadeState = /* @__PURE__ */ new Map(), this.onFadeComplete = null, this.onFadeStart = null, this.onFadeSetComplete = null, this.onFadeSetStart = null;
  }
  // delete the object from the fade, reset the material data
  deleteObject(e) {
    e && this.completeFade(e);
  }
  // Ensure we're storing a fade timer for the provided object
  // Returns whether a new state had to be added
  guaranteeState(e) {
    const t = this._fadeState;
    if (t.has(e))
      return !1;
    const s = {
      fadeInTarget: 0,
      fadeOutTarget: 0,
      fadeIn: 0,
      fadeOut: 0
    };
    return t.set(e, s), !0;
  }
  // Force the fade to complete in the direction it is already trending
  completeFade(e) {
    const t = this._fadeState;
    if (!t.has(e))
      return;
    const s = t.get(e).fadeOutTarget === 0;
    t.delete(e), this.fadeCount--, this.onFadeComplete && this.onFadeComplete(e, s), this.fadeCount === 0 && this.onFadeSetComplete && this.onFadeSetComplete();
  }
  completeAllFades() {
    this._fadeState.forEach((e, t) => {
      this.completeFade(t);
    });
  }
  forEachObject(e) {
    this._fadeState.forEach((t, s) => {
      e(s, t);
    });
  }
  // Fade the object in
  fadeIn(e) {
    const t = this.guaranteeState(e), s = this._fadeState.get(e);
    s.fadeInTarget = 1, s.fadeOutTarget = 0, s.fadeOut = 0, t && (this.fadeCount++, this.fadeCount === 1 && this.onFadeSetStart && this.onFadeSetStart(), this.onFadeStart && this.onFadeStart(e));
  }
  // Fade the object out
  fadeOut(e) {
    const t = this.guaranteeState(e), s = this._fadeState.get(e);
    s.fadeOutTarget = 1, t && (s.fadeInTarget = 1, s.fadeIn = 1, this.fadeCount++, this.fadeCount === 1 && this.onFadeSetStart && this.onFadeSetStart(), this.onFadeStart && this.onFadeStart(e));
  }
  isFading(e) {
    return this._fadeState.has(e);
  }
  isFadingOut(e) {
    const t = this._fadeState.get(e);
    return t && t.fadeOutTarget === 1;
  }
  // Tick the fade timer for each actively fading object
  update() {
    const e = window.performance.now();
    this._lastTick === -1 && (this._lastTick = e);
    const t = It((e - this._lastTick) / this.duration, 0, 1);
    this._lastTick = e, this._fadeState.forEach((n, i) => {
      const {
        fadeOutTarget: r,
        fadeInTarget: o
      } = n;
      let {
        fadeOut: l,
        fadeIn: c
      } = n;
      const u = Math.sign(o - c);
      c = It(c + u * t, 0, 1);
      const h = Math.sign(r - l);
      l = It(l + h * t, 0, 1), n.fadeIn = c, n.fadeOut = l, ((l === 1 || l === 0) && (c === 1 || c === 0) || l >= c) && this.completeFade(i);
    });
  }
}
const vt = Symbol("FADE_PARAMS");
function wn(a, e) {
  if (a[vt])
    return a[vt];
  const t = {
    fadeIn: { value: 0 },
    fadeOut: { value: 0 },
    fadeTexture: { value: null }
  };
  return a[vt] = t, a.defines = {
    ...a.defines || {},
    FEATURE_FADE: 0
  }, a.onBeforeCompile = (s) => {
    e && e(s), s.uniforms = {
      ...s.uniforms,
      ...t
    }, s.vertexShader = s.vertexShader.replace(
      /void\s+main\(\)\s+{/,
      (n) => (
        /* glsl */
        `
					#ifdef USE_BATCHING_FRAG

					varying float vBatchId;

					#endif

					${n}

						#ifdef USE_BATCHING_FRAG

						// add 0.5 to the value to avoid floating error that may cause flickering
						vBatchId = getIndirectIndex( gl_DrawID ) + 0.5;

						#endif
				`
      )
    ), s.fragmentShader = s.fragmentShader.replace(/void main\(/, (n) => (
      /* glsl */
      `
				#if FEATURE_FADE

				// adapted from https://www.shadertoy.com/view/Mlt3z8
				float bayerDither2x2( vec2 v ) {

					return mod( 3.0 * v.y + 2.0 * v.x, 4.0 );

				}

				float bayerDither4x4( vec2 v ) {

					vec2 P1 = mod( v, 2.0 );
					vec2 P2 = floor( 0.5 * mod( v, 4.0 ) );
					return 4.0 * bayerDither2x2( P1 ) + bayerDither2x2( P2 );

				}

				// the USE_BATCHING define is not available in fragment shaders
				#ifdef USE_BATCHING_FRAG

				// functions for reading the fade state of a given batch id
				uniform sampler2D fadeTexture;
				varying float vBatchId;
				vec2 getFadeValues( const in float i ) {

					int size = textureSize( fadeTexture, 0 ).x;
					int j = int( i );
					int x = j % size;
					int y = j / size;
					return texelFetch( fadeTexture, ivec2( x, y ), 0 ).rg;

				}

				#else

				uniform float fadeIn;
				uniform float fadeOut;

				#endif

				#endif

				${n}
			`
    )).replace(/#include <dithering_fragment>/, (n) => (
      /* glsl */
      `

				${n}

				#if FEATURE_FADE

				#ifdef USE_BATCHING_FRAG

				vec2 fadeValues = getFadeValues( vBatchId );
				float fadeIn = fadeValues.r;
				float fadeOut = fadeValues.g;

				#endif

				float bayerValue = bayerDither4x4( floor( mod( gl_FragCoord.xy, 4.0 ) ) );
				float bayerBins = 16.0;
				float dither = ( 0.5 + bayerValue ) / bayerBins;
				if ( dither >= fadeIn ) {

					discard;

				}

				if ( dither < fadeOut ) {

					discard;

				}

				#endif

			`
    ));
  }, t;
}
class dr {
  constructor() {
    this._fadeParams = /* @__PURE__ */ new WeakMap(), this.fading = 0;
  }
  // Set the fade parameters for the given scene
  setFade(e, t, s) {
    if (!e)
      return;
    const n = this._fadeParams;
    e.traverse((i) => {
      const r = i.material;
      if (r && n.has(r)) {
        const o = n.get(r);
        o.fadeIn.value = t, o.fadeOut.value = s;
        const u = +(!(t === 0 || t === 1) || !(s === 0 || s === 1));
        r.defines.FEATURE_FADE !== u && (this.fading += u === 1 ? 1 : -1, r.defines.FEATURE_FADE = u, r.needsUpdate = !0);
      }
    });
  }
  // initialize materials in the object
  prepareScene(e) {
    e.traverse((t) => {
      t.material && this.prepareMaterial(t.material);
    });
  }
  // delete the object from the fade, reset the material data
  deleteScene(e) {
    if (!e)
      return;
    this.setFade(e, 1, 0);
    const t = this._fadeParams;
    e.traverse((s) => {
      const n = s.material;
      n && t.delete(n);
    });
  }
  // initialize the material
  prepareMaterial(e) {
    const t = this._fadeParams;
    t.has(e) || t.set(e, wn(e, e.onBeforeCompile));
  }
}
class pr {
  constructor(e, t = new _e()) {
    this.other = e, this.material = t, this.visible = !0, this.parent = null, this._instanceInfo = [], this._visibilityChanged = !0;
    const s = new Proxy(this, {
      get(n, i) {
        if (i in n)
          return n[i];
        {
          const r = e[i];
          return r instanceof Function ? (...o) => (n.syncInstances(), r.call(s, ...o)) : e[i];
        }
      },
      set(n, i, r) {
        return i in n ? n[i] = r : e[i] = r, !0;
      },
      deleteProperty(n, i) {
        return i in n ? delete n[i] : delete e[i];
      }
      // ownKeys() {},
      // has(target, key) {},
      // defineProperty(target, key, descriptor) {},
      // getOwnPropertyDescriptor(target, key) {},
    });
    return s;
  }
  syncInstances() {
    const e = this._instanceInfo, t = this.other._instanceInfo;
    for (; t.length > e.length; ) {
      const s = e.length;
      e.push(new Proxy({ visible: !1 }, {
        get(n, i) {
          return i in n ? n[i] : t[s][i];
        },
        set(n, i, r) {
          return i in n ? n[i] = r : t[s][i] = r, !0;
        }
      }));
    }
  }
}
class fr extends pr {
  constructor(...e) {
    super(...e);
    const t = this.material, s = wn(t, t.onBeforeCompile);
    t.defines.FEATURE_FADE = 1, t.defines.USE_BATCHING_FRAG = 1, t.needsUpdate = !0, this.fadeTexture = null, this._fadeParams = s;
  }
  // Set the fade state
  setFadeAt(e, t, s) {
    this._initFadeTexture(), this.fadeTexture.setValueAt(e, t * 255, s * 255);
  }
  // initialize the texture and resize it if needed
  _initFadeTexture() {
    let e = Math.sqrt(this._maxInstanceCount);
    e = Math.ceil(e);
    const t = e * e * 2, s = this.fadeTexture;
    if (!s || s.image.data.length !== t) {
      const n = new Uint8Array(t), i = new mr(n, e, e, on, an);
      if (s) {
        s.dispose();
        const r = s.image.data, o = this.fadeTexture.image.data, l = Math.min(r.length, o.length);
        o.set(new r.constructor(r.buffer, 0, l));
      }
      this.fadeTexture = i, this._fadeParams.fadeTexture.value = i, i.needsUpdate = !0;
    }
  }
  // dispose the fade texture. Super cannot be used here due to proxy
  dispose() {
    this.fadeTexture && this.fadeTexture.dispose();
  }
}
class mr extends Xt {
  setValueAt(e, ...t) {
    const { data: s, width: n, height: i } = this.image, r = Math.floor(s.length / (n * i));
    let o = !1;
    for (let l = 0; l < r; l++) {
      const c = e * r + l, u = s[c], h = t[l] || 0;
      u !== h && (s[c] = h, o = !0);
    }
    o && (this.needsUpdate = !0);
  }
}
const Rs = Symbol("HAS_POPPED_IN"), Ds = /* @__PURE__ */ new L(), Bs = /* @__PURE__ */ new L(), Os = /* @__PURE__ */ new cn(), Us = /* @__PURE__ */ new cn(), Ns = /* @__PURE__ */ new L();
function gr() {
  const a = this._fadeManager, e = this.tiles;
  this._fadingBefore = a.fadeCount, this._displayActiveTiles = e.displayActiveTiles, e.displayActiveTiles = !0;
}
function yr() {
  const a = this._fadeManager, e = this._fadeMaterialManager, t = this._displayActiveTiles, s = this._fadingBefore, n = this._prevCameraTransforms, { tiles: i, maximumFadeOutTiles: r, batchedMesh: o } = this, { cameras: l } = i;
  i.displayActiveTiles = t, a.update();
  const c = a.fadeCount;
  if (s !== 0 && c !== 0 && (i.dispatchEvent({ type: "fade-change" }), i.dispatchEvent({ type: "needs-render" })), t || i.visibleTiles.forEach((u) => {
    const h = u.engineData.scene;
    h && (h.visible = u.traversal.inFrustum), this.forEachBatchIds(u, (d, m, f) => {
      m.setVisibleAt(d, u.traversal.inFrustum), f.batchedMesh.setVisibleAt(d, u.traversal.inFrustum);
    });
  }), r < this._fadingOutCount) {
    let u = !0;
    l.forEach((h) => {
      if (!n.has(h))
        return;
      const d = h.matrixWorld, m = n.get(h);
      d.decompose(Bs, Us, Ns), m.decompose(Ds, Os, Ns);
      const f = Us.angleTo(Os), p = Bs.distanceTo(Ds);
      u = u && (f > 0.25 || p > 0.1);
    }), u && a.completeAllFades();
  }
  if (l.forEach((u) => {
    n.get(u).copy(u.matrixWorld);
  }), a.forEachObject((u, { fadeIn: h, fadeOut: d }) => {
    const m = u.engineData.scene, f = a.isFadingOut(u);
    i.markTileUsed(u), m && (e.setFade(m, h, d), f && (m.visible = !0)), this.forEachBatchIds(u, (p, g, y) => {
      g.setFadeAt(p, h, d), g.setVisibleAt(p, !0), y.batchedMesh.setVisibleAt(p, !1);
    });
  }), o) {
    const u = i.getPluginByName("BATCHED_TILES_PLUGIN").batchedMesh.material;
    o.material.map = u.map;
  }
}
class To {
  get fadeDuration() {
    return this._fadeManager.duration;
  }
  set fadeDuration(e) {
    this._fadeManager.duration = Number(e);
  }
  get fadingTiles() {
    return this._fadeManager.fadeCount;
  }
  constructor(e) {
    e = {
      maximumFadeOutTiles: 50,
      fadeRootTiles: !1,
      fadeDuration: 250,
      ...e
    }, this.name = "FADE_TILES_PLUGIN", this.priority = -2, this.tiles = null, this.batchedMesh = null, this._quickFadeTiles = /* @__PURE__ */ new Set(), this._fadeManager = new hr(), this._fadeMaterialManager = new dr(), this._prevCameraTransforms = null, this._fadingOutCount = 0, this.maximumFadeOutTiles = e.maximumFadeOutTiles, this.fadeRootTiles = e.fadeRootTiles, this.fadeDuration = e.fadeDuration;
  }
  init(e) {
    this._onLoadModel = ({ scene: n }) => {
      this._fadeMaterialManager.prepareScene(n);
    }, this._onDisposeModel = ({ tile: n, scene: i }) => {
      this.tiles.visibleTiles.has(n) && this._quickFadeTiles.add(n.parent), this._fadeManager.deleteObject(n), this._fadeMaterialManager.deleteScene(i);
    }, this._onAddCamera = ({ camera: n }) => {
      this._prevCameraTransforms.set(n, new K());
    }, this._onDeleteCamera = ({ camera: n }) => {
      this._prevCameraTransforms.delete(n);
    }, this._onTileVisibilityChange = ({ tile: n, visible: i }) => {
      const r = n.engineData.scene;
      r && (r.visible = !0), this.forEachBatchIds(n, (o, l, c) => {
        l.setFadeAt(o, 0, 0), l.setVisibleAt(o, !1), c.batchedMesh.setVisibleAt(o, !1);
      });
    }, this._onUpdateBefore = () => {
      gr.call(this);
    }, this._onUpdateAfter = () => {
      yr.call(this);
    }, e.addEventListener("load-model", this._onLoadModel), e.addEventListener("dispose-model", this._onDisposeModel), e.addEventListener("add-camera", this._onAddCamera), e.addEventListener("delete-camera", this._onDeleteCamera), e.addEventListener("update-before", this._onUpdateBefore), e.addEventListener("update-after", this._onUpdateAfter), e.addEventListener("tile-visibility-change", this._onTileVisibilityChange);
    const t = this._fadeManager;
    t.onFadeSetStart = () => {
      e.dispatchEvent({ type: "fade-start" }), e.dispatchEvent({ type: "needs-render" });
    }, t.onFadeSetComplete = () => {
      e.dispatchEvent({ type: "fade-end" }), e.dispatchEvent({ type: "needs-render" });
    }, t.onFadeComplete = (n, i) => {
      this._fadeMaterialManager.setFade(n.engineData.scene, 0, 0), this.forEachBatchIds(n, (r, o, l) => {
        o.setFadeAt(r, 0, 0), o.setVisibleAt(r, !1), l.batchedMesh.setVisibleAt(r, i);
      }), i || (e.invokeOnePlugin((r) => r !== this && r.setTileVisible && r.setTileVisible(n, !1)), this._fadingOutCount--);
    };
    const s = /* @__PURE__ */ new Map();
    e.cameras.forEach((n) => {
      s.set(n, new K());
    }), e.forEachLoadedModel((n, i) => {
      this._onLoadModel({ scene: n });
    }), this.tiles = e, this._fadeManager = t, this._prevCameraTransforms = s;
  }
  // initializes the batched mesh if it needs to be, dispose if it it's no longer needed
  initBatchedMesh() {
    var t;
    const e = (t = this.tiles.getPluginByName("BATCHED_TILES_PLUGIN")) == null ? void 0 : t.batchedMesh;
    if (e) {
      if (this.batchedMesh === null) {
        this._onBatchedMeshDispose = () => {
          this.batchedMesh.dispose(), this.batchedMesh.removeFromParent(), this.batchedMesh = null, e.removeEventListener("dispose", this._onBatchedMeshDispose);
        };
        const s = e.material.clone();
        s.onBeforeCompile = e.material.onBeforeCompile, this.batchedMesh = new fr(e, s), this.tiles.group.add(this.batchedMesh);
      }
    } else
      this.batchedMesh !== null && (this._onBatchedMeshDispose(), this._onBatchedMeshDispose = null);
  }
  // callback for fading to prevent tiles from being removed until the fade effect has completed
  setTileVisible(e, t) {
    const s = this._fadeManager, n = s.isFading(e);
    if (s.isFadingOut(e) && this._fadingOutCount--, t ? e.internal.depthFromRenderedParent === 1 ? ((e[Rs] || this.fadeRootTiles) && this._fadeManager.fadeIn(e), e[Rs] = !0) : this._fadeManager.fadeIn(e) : (this._fadingOutCount++, s.fadeOut(e)), this._quickFadeTiles.has(e) && (this._fadeManager.completeFade(e), this._quickFadeTiles.delete(e)), n)
      return !0;
    const i = this._fadeManager.isFading(e);
    return !!(!t && i);
  }
  dispose() {
    const e = this.tiles;
    this._fadeManager.completeAllFades(), this.batchedMesh !== null && this._onBatchedMeshDispose(), e.removeEventListener("load-model", this._onLoadModel), e.removeEventListener("dispose-model", this._onDisposeModel), e.removeEventListener("add-camera", this._onAddCamera), e.removeEventListener("delete-camera", this._onDeleteCamera), e.removeEventListener("update-before", this._onUpdateBefore), e.removeEventListener("update-after", this._onUpdateAfter), e.removeEventListener("tile-visibility-change", this._onTileVisibilityChange), e.forEachLoadedModel((t, s) => {
      this._fadeManager.deleteObject(s), t && (t.visible = !0);
    });
  }
  // helper for iterating over the batch ids for a given tile
  forEachBatchIds(e, t) {
    if (this.initBatchedMesh(), this.batchedMesh) {
      const s = this.tiles.getPluginByName("BATCHED_TILES_PLUGIN"), n = s.getTileBatchIds(e);
      n && n.forEach((i) => {
        t(i, this.batchedMesh, s);
      });
    }
  }
}
const Lt = /* @__PURE__ */ new K(), Vs = /* @__PURE__ */ new L(), Fs = /* @__PURE__ */ new L();
class xr extends li {
  constructor(...e) {
    super(...e), this.resetDistance = 1e4, this._matricesTextureHandle = null, this._lastCameraPos = new K(), this._forceUpdate = !0, this._matrices = [];
  }
  setMatrixAt(e, t) {
    super.setMatrixAt(e, t), this._forceUpdate = !0;
    const s = this._matrices;
    for (; s.length <= e; )
      s.push(new K());
    s[e].copy(t);
  }
  setInstanceCount(...e) {
    super.setInstanceCount(...e);
    const t = this._matrices;
    for (; t.length > this.instanceCount; )
      t.pop();
  }
  onBeforeRender(e, t, s, n, i, r) {
    super.onBeforeRender(e, t, s, n, i, r), Vs.setFromMatrixPosition(s.matrixWorld), Fs.setFromMatrixPosition(this._lastCameraPos);
    const o = this._matricesTexture;
    let l = this._modelViewMatricesTexture;
    if ((!l || l.image.width !== o.image.width || l.image.height !== o.image.height) && (l && l.dispose(), l = o.clone(), l.source = new ci({
      ...l.image,
      data: l.image.data.slice()
    }), this._modelViewMatricesTexture = l), this._forceUpdate || Vs.distanceTo(Fs) > this.resetDistance) {
      const c = this._matrices, u = l.image.data;
      for (let h = 0; h < this.maxInstanceCount; h++) {
        const d = c[h];
        d ? Lt.copy(d) : Lt.identity(), Lt.premultiply(this.matrixWorld).premultiply(s.matrixWorldInverse).toArray(u, h * 16);
      }
      l.needsUpdate = !0, this._lastCameraPos.copy(s.matrixWorld), this._forceUpdate = !1;
    }
    this._matricesTextureHandle = this._matricesTexture, this._matricesTexture = this._modelViewMatricesTexture, this.matrixWorld.copy(this._lastCameraPos);
  }
  onAfterRender() {
    this.updateMatrixWorld(), this._matricesTexture = this._matricesTextureHandle, this._matricesTextureHandle = null;
  }
  onAfterShadow(e, t, s, n, i, r) {
    this.onAfterRender(e, null, n, i, r);
  }
  dispose() {
    super.dispose(), this._modelViewMatricesTexture && this._modelViewMatricesTexture.dispose();
  }
}
const ee = /* @__PURE__ */ new Se(), Qe = [];
class Tr extends xr {
  constructor(...e) {
    super(...e), this.expandPercent = 0.25, this.maxInstanceExpansionSize = 1 / 0, this._freeGeometryIds = [];
  }
  // Finds a free id that can fit the geometry with the requested ranges. Returns -1 if it could not be found.
  findFreeId(e, t, s) {
    const n = !!this.geometry.index, i = Math.max(n ? e.index.count : -1, s), r = Math.max(e.attributes.position.count, t);
    let o = -1, l = 1 / 0;
    const c = this._freeGeometryIds;
    if (c.forEach((u, h) => {
      const d = this.getGeometryRangeAt(u), { reservedIndexCount: m, reservedVertexCount: f } = d;
      if (m >= i && f >= r) {
        const p = i - m + (r - f);
        p < l && (o = h, l = p);
      }
    }), o !== -1) {
      const u = c[o];
      return c.splice(o, 1), u;
    } else
      return -1;
  }
  // Overrides addGeometry to find an option geometry slot, expand, or optimized if needed
  addGeometry(e, t, s) {
    const n = !!this.geometry.index;
    s = Math.max(n ? e.index.count : -1, s), t = Math.max(e.attributes.position.count, t);
    const { expandPercent: i, _freeGeometryIds: r } = this;
    let o = this.findFreeId(e, t, s);
    if (o !== -1)
      this.setGeometryAt(o, e);
    else {
      const l = () => {
        const h = this.unusedVertexCount < t, d = this.unusedIndexCount < s;
        return h || d;
      }, c = e.index, u = e.attributes.position;
      if (t = Math.max(t, u.count), s = Math.max(s, c ? c.count : 0), l() && (r.forEach((h) => this.deleteGeometry(h)), r.length = 0, this.optimize(), l())) {
        const h = this.geometry.index, d = this.geometry.attributes.position;
        let m, f;
        if (h) {
          const p = Math.ceil(i * h.count);
          m = Math.max(p, s, c.count) + h.count;
        } else
          m = Math.max(this.unusedIndexCount, s);
        if (d) {
          const p = Math.ceil(i * d.count);
          f = Math.max(p, t, u.count) + d.count;
        } else
          f = Math.max(this.unusedVertexCount, t);
        this.setGeometrySize(f, m);
      }
      o = super.addGeometry(e, t, s);
    }
    return o;
  }
  // add an instance and automatically expand the number of instances if necessary
  addInstance(e) {
    if (this.maxInstanceCount === this.instanceCount) {
      const t = Math.ceil(this.maxInstanceCount * (1 + this.expandPercent));
      this.setInstanceCount(Math.min(t, this.maxInstanceExpansionSize));
    }
    return super.addInstance(e);
  }
  // delete an instance, keeping note that the geometry id is now unused
  deleteInstance(e) {
    const t = this.getGeometryIdAt(e);
    return t !== -1 && this._freeGeometryIds.push(t), super.deleteInstance(e);
  }
  // add a function for raycasting per tile
  raycastInstance(e, t, s) {
    const n = this.geometry, i = this.getGeometryIdAt(e);
    ee.material = this.material, ee.geometry.index = n.index, ee.geometry.attributes = n.attributes;
    const r = this.getGeometryRangeAt(i);
    ee.geometry.setDrawRange(r.start, r.count), ee.geometry.boundingBox === null && (ee.geometry.boundingBox = new pt()), ee.geometry.boundingSphere === null && (ee.geometry.boundingSphere = new pe()), this.getMatrixAt(e, ee.matrixWorld).premultiply(this.matrixWorld), this.getBoundingBoxAt(i, ee.geometry.boundingBox), this.getBoundingSphereAt(i, ee.geometry.boundingSphere), ee.raycast(t, Qe);
    for (let o = 0, l = Qe.length; o < l; o++) {
      const c = Qe[o];
      c.object = this, c.batchId = e, s.push(c);
    }
    Qe.length = 0;
  }
}
function br(a) {
  return a.r === 1 && a.g === 1 && a.b === 1;
}
function _r(a) {
  a.needsUpdate = !0, a.onBeforeCompile = (e) => {
    e.vertexShader = e.vertexShader.replace(
      "#include <common>",
      /* glsl */
      `
				#include <common>
				varying float texture_index;
				`
    ).replace(
      "#include <uv_vertex>",
      /* glsl */
      `
				#include <uv_vertex>
				texture_index = getIndirectIndex( gl_DrawID );
				`
    ), e.fragmentShader = e.fragmentShader.replace(
      "#include <map_pars_fragment>",
      /* glsl */
      `
				#ifdef USE_MAP
				precision highp sampler2DArray;
				uniform sampler2DArray map;
				varying float texture_index;
				#endif
				`
    ).replace(
      "#include <map_fragment>",
      /* glsl */
      `
				#ifdef USE_MAP
					diffuseColor *= texture( map, vec3( vMapUv, texture_index ) );
				#endif
				`
    );
  };
}
const Et = new mn(new _e()), zt = new Xt(new Uint8Array([255, 255, 255, 255]), 1, 1);
zt.needsUpdate = !0;
class bo {
  constructor(e = {}) {
    if (parseInt(ui) < 170)
      throw new Error("BatchedTilesPlugin: Three.js revision 170 or higher required.");
    e = {
      instanceCount: 500,
      vertexCount: 750,
      indexCount: 2e3,
      expandPercent: 0.25,
      maxInstanceCount: 1 / 0,
      discardOriginalContent: !0,
      textureSize: null,
      material: null,
      renderer: null,
      ...e
    }, this.name = "BATCHED_TILES_PLUGIN", this.priority = -1;
    const t = e.renderer.getContext();
    this.instanceCount = e.instanceCount, this.vertexCount = e.vertexCount, this.indexCount = e.indexCount, this.material = e.material ? e.material.clone() : null, this.expandPercent = e.expandPercent, this.maxInstanceCount = Math.min(e.maxInstanceCount, t.getParameter(t.MAX_3D_TEXTURE_SIZE)), this.renderer = e.renderer, this.discardOriginalContent = e.discardOriginalContent, this.textureSize = e.textureSize, this.batchedMesh = null, this.arrayTarget = null, this.tiles = null, this._tileToInstanceId = /* @__PURE__ */ new Map();
  }
  init(e) {
    this.tiles = e;
  }
  initTextureArray(e) {
    if (this.arrayTarget !== null || e.material.map === null)
      return;
    const { instanceCount: t, renderer: s, textureSize: n, batchedMesh: i } = this, r = e.material.map, o = {
      colorSpace: r.colorSpace,
      wrapS: r.wrapS,
      wrapT: r.wrapT,
      wrapR: r.wrapS,
      // TODO: Generating mipmaps for the volume every time a new texture is added is extremely slow
      // generateMipmaps: map.generateMipmaps,
      // minFilter: map.minFilter,
      magFilter: r.magFilter
    }, l = new is(n || r.image.width, n || r.image.height, t);
    Object.assign(l.texture, o), s.initRenderTarget(l), i.material.map = l.texture, this.arrayTarget = l, this._tileToInstanceId.forEach((c) => {
      c.forEach((u) => {
        this.assignTextureToLayer(zt, u);
      });
    });
  }
  // init the batched mesh if it's not ready
  initBatchedMesh(e) {
    if (this.batchedMesh !== null)
      return;
    const { instanceCount: t, vertexCount: s, indexCount: n, tiles: i } = this, r = this.material ? this.material : new e.material.constructor(), o = new Tr(t, t * s, t * n, r);
    o.name = "BatchTilesPlugin", o.frustumCulled = !1, i.group.add(o), o.updateMatrixWorld(), _r(o.material), this.batchedMesh = o;
  }
  setTileVisible(e, t) {
    const s = e.engineData.scene;
    if (t && this.addSceneToBatchedMesh(s, e), this._tileToInstanceId.has(e)) {
      this._tileToInstanceId.get(e).forEach((r) => {
        this.batchedMesh.setVisibleAt(r, t);
      });
      const i = this.tiles;
      return t ? i.visibleTiles.add(e) : i.visibleTiles.delete(e), i.dispatchEvent({
        type: "tile-visibility-change",
        scene: s,
        tile: e,
        visible: t
      }), !0;
    }
    return !1;
  }
  disposeTile(e) {
    this.removeSceneFromBatchedMesh(e);
  }
  unloadTileFromGPU(e, t) {
    return !this.discardOriginalContent && this._tileToInstanceId.has(t) ? (this.removeSceneFromBatchedMesh(t), !0) : !1;
  }
  // render the given into the given layer
  assignTextureToLayer(e, t) {
    if (!this.arrayTarget)
      return;
    this.expandArrayTargetIfNeeded();
    const { renderer: s } = this, n = s.getRenderTarget();
    s.setRenderTarget(this.arrayTarget, t), Et.material.map = e, Et.render(s), s.setRenderTarget(n), Et.material.map = null, e.dispose();
  }
  // check if the array texture target needs to be expanded
  expandArrayTargetIfNeeded() {
    const { batchedMesh: e, arrayTarget: t, renderer: s } = this, n = Math.min(e.maxInstanceCount, this.maxInstanceCount);
    if (n > t.depth) {
      const i = {
        colorSpace: t.texture.colorSpace,
        wrapS: t.texture.wrapS,
        wrapT: t.texture.wrapT,
        generateMipmaps: t.texture.generateMipmaps,
        minFilter: t.texture.minFilter,
        magFilter: t.texture.magFilter
      }, r = new is(t.width, t.height, n);
      Object.assign(r.texture, i), s.initRenderTarget(r), s.copyTextureToTexture(t.texture, r.texture), t.dispose(), e.material.map = r.texture, this.arrayTarget = r;
    }
  }
  removeSceneFromBatchedMesh(e) {
    if (this._tileToInstanceId.has(e)) {
      const t = this._tileToInstanceId.get(e);
      this._tileToInstanceId.delete(e), t.forEach((s) => {
        this.batchedMesh.deleteInstance(s);
      });
    }
  }
  addSceneToBatchedMesh(e, t) {
    if (this._tileToInstanceId.has(t))
      return;
    const s = [];
    e.traverse((r) => {
      r.isMesh && s.push(r);
    });
    let n = !0;
    s.forEach((r) => {
      if (this.batchedMesh && n) {
        const o = r.geometry.attributes, l = this.batchedMesh.geometry.attributes;
        for (const c in l)
          if (!(c in o)) {
            n = !1;
            return;
          }
      }
    });
    const i = !this.batchedMesh || this.batchedMesh.instanceCount + s.length <= this.maxInstanceCount;
    if (n && i) {
      e.updateMatrixWorld();
      const r = [];
      this._tileToInstanceId.set(t, r), s.forEach((o) => {
        this.initBatchedMesh(o), this.initTextureArray(o);
        const { geometry: l, material: c } = o, { batchedMesh: u, expandPercent: h } = this;
        u.expandPercent = h;
        const d = u.addGeometry(l, this.vertexCount, this.indexCount), m = u.addInstance(d);
        r.push(m), u.setMatrixAt(m, o.matrixWorld), u.setVisibleAt(m, !1), br(c.color) || (c.color.setHSL(Math.random(), 0.5, 0.5), u.setColorAt(m, c.color));
        const f = c.map;
        f ? this.assignTextureToLayer(f, m) : this.assignTextureToLayer(zt, m);
      }), this.discardOriginalContent && (t.engineData.textures.forEach((o) => {
        o.image instanceof ImageBitmap && o.image.close();
      }), t.engineData.scene = null, t.engineData.materials = [], t.engineData.geometries = [], t.engineData.textures = []);
    }
  }
  // Override raycasting per tile to defer to the batched mesh
  raycastTile(e, t, s, n) {
    return this._tileToInstanceId.has(e) ? (this._tileToInstanceId.get(e).forEach((r) => {
      this.batchedMesh.raycastInstance(r, s, n);
    }), !0) : !1;
  }
  dispose() {
    const { arrayTarget: e, batchedMesh: t } = this;
    e && e.dispose(), t && (t.material.dispose(), t.geometry.dispose(), t.dispose(), t.removeFromParent());
  }
  getTileBatchIds(e) {
    return this._tileToInstanceId.get(e);
  }
}
const wt = /* @__PURE__ */ new pe(), Ze = /* @__PURE__ */ new L(), De = /* @__PURE__ */ new K(), ks = /* @__PURE__ */ new K(), Pt = /* @__PURE__ */ new hi(), Sr = /* @__PURE__ */ new _e({ side: rt }), Gs = /* @__PURE__ */ new pt(), Rt = 1e5;
function zs(a, e) {
  return a.isBufferGeometry ? (a.boundingSphere === null && a.computeBoundingSphere(), e.copy(a.boundingSphere)) : (Gs.setFromObject(a), Gs.getBoundingSphere(e), e);
}
class _o {
  constructor() {
    this.name = "TILE_FLATTENING_PLUGIN", this.priority = -100, this.tiles = null, this.shapes = /* @__PURE__ */ new Map(), this.positionsMap = /* @__PURE__ */ new Map(), this.positionsUpdated = /* @__PURE__ */ new Set(), this.needsUpdate = !1;
  }
  init(e) {
    this.tiles = e, this.needsUpdate = !0, this._updateBeforeCallback = () => {
      this.needsUpdate && (this._updateTiles(), this.needsUpdate = !1);
    }, this._disposeModelCallback = ({ tile: t }) => {
      this.positionsMap.delete(t), this.positionsUpdated.delete(t);
    }, e.addEventListener("update-before", this._updateBeforeCallback), e.addEventListener("dispose-model", this._disposeModelCallback);
  }
  // update tile flattening state if it has not been made visible, yet
  setTileActive(e, t) {
    t && !this.positionsUpdated.has(e) && this._updateTile(e);
  }
  _updateTile(e) {
    const { positionsUpdated: t, positionsMap: s, shapes: n, tiles: i } = this;
    t.add(e);
    const r = e.engineData.scene;
    if (s.has(e)) {
      const o = s.get(e);
      r.traverse((l) => {
        if (l.geometry) {
          const c = o.get(l.geometry);
          c && (l.geometry.attributes.position.array.set(c), l.geometry.attributes.position.needsUpdate = !0);
        }
      });
    } else {
      const o = /* @__PURE__ */ new Map();
      s.set(e, o), r.traverse((l) => {
        l.geometry && o.set(l.geometry, l.geometry.attributes.position.array.slice());
      });
    }
    r.updateMatrixWorld(!0), r.traverse((o) => {
      const { geometry: l } = o;
      l && (De.copy(o.matrixWorld), r.parent !== null && De.premultiply(i.group.matrixWorldInverse), ks.copy(De).invert(), zs(l, wt).applyMatrix4(De), n.forEach(({
        shape: c,
        direction: u,
        sphere: h,
        thresholdMode: d,
        threshold: m,
        flattenRange: f
      }) => {
        Ze.subVectors(wt.center, h.center), Ze.addScaledVector(u, -u.dot(Ze));
        const p = (wt.radius + h.radius) ** 2;
        if (Ze.lengthSq() > p)
          return;
        const { position: g } = l.attributes, { ray: y } = Pt;
        y.direction.copy(u).multiplyScalar(-1);
        for (let x = 0, b = g.count; x < b; x++) {
          y.origin.fromBufferAttribute(g, x).applyMatrix4(De).addScaledVector(u, Rt), Pt.far = Rt;
          const T = Pt.intersectObject(c)[0];
          if (T) {
            let M = (Rt - T.distance) / m;
            const S = M >= 1;
            (!S || S && d === "flatten") && (M = Math.min(M, 1), T.point.addScaledVector(y.direction, _.mapLinear(M, 0, 1, -f, 0)), T.point.applyMatrix4(ks), g.setXYZ(x, ...T.point));
          }
        }
      }));
    }), this.tiles.dispatchEvent({ type: "needs-render" });
  }
  _updateTiles() {
    this.positionsUpdated.clear(), this.tiles.activeTiles.forEach((e) => this._updateTile(e));
  }
  /**
   * Returns whether the given object has already been added as a shape.
   * @param {Object3D} mesh
   * @returns {boolean}
   */
  hasShape(e) {
    return this.shapes.has(e);
  }
  /**
   * Adds the given mesh as a flattening shape. All coordinates must be in the tileset's local
   * frame. Throws if the shape has already been added.
   * @param {Object3D} mesh The shape mesh to flatten tile vertices onto.
   * @param {Vector3} [direction] Direction to cast rays when flattening (default downward along -Z).
   * @param {Object} [options]
   * @param {number} [options.threshold=Infinity] Maximum distance from the shape surface within which vertices are flattened. `Infinity` always flattens; `0` never flattens.
   */
  addShape(e, t = new L(0, 0, -1), s = {}) {
    if (this.hasShape(e))
      throw new Error("TileFlatteningPlugin: Shape is already used.");
    typeof s == "number" && (console.warn('TileFlatteningPlugin: "addShape" function signature has changed. Please use an options object, instead.'), s = {
      threshold: s
    }), this.needsUpdate = !0;
    const n = e.clone();
    n.updateMatrixWorld(!0), n.traverse((r) => {
      r.material && (r.material = Sr);
    });
    const i = zs(n, new pe());
    this.shapes.set(e, {
      shape: n,
      direction: t.clone(),
      sphere: i,
      // "flatten": Flattens the vertices above the shape
      // "none": leaves the vertices above the shape as they are
      thresholdMode: "none",
      // only flatten within this range above the object
      threshold: 1 / 0,
      // the range to flatten vertices in to. 0 is completely flat
      // while 0.1 means a 10cm range.
      flattenRange: 0,
      ...s
    });
  }
  /**
   * Notifies the plugin that a shape's geometry or transform has changed and tile
   * flattening needs to be regenerated.
   * @param {Object3D} mesh
   */
  updateShape(e) {
    if (!this.hasShape(e))
      throw new Error("TileFlatteningPlugin: Shape is not present.");
    const { direction: t, threshold: s, thresholdMode: n, flattenRange: i } = this.shapes.get(e);
    this.deleteShape(e), this.addShape(e, t, {
      threshold: s,
      thresholdMode: n,
      flattenRange: i
    });
  }
  /**
   * Removes the given shape and triggers tile regeneration.
   * @param {Object3D} mesh
   * @returns {boolean} `true` if the shape was found and removed.
   */
  deleteShape(e) {
    return this.needsUpdate = !0, this.shapes.delete(e);
  }
  /**
   * Removes all shapes and resets flattened tiles to their original positions.
   */
  clearShapes() {
    this.shapes.size !== 0 && (this.needsUpdate = !0, this.shapes.clear());
  }
  // reset the vertex positions and remove the update callback
  dispose() {
    this.tiles.removeEventListener("before-update", this._updateBeforeCallback), this.tiles.removeEventListener("dispose-model", this._disposeModelCallback), this.positionsMap.forEach((e) => {
      e.forEach((t, s) => {
        const { position: n } = s.attributes;
        n.array.set(t), n.needsUpdate = !0;
      });
    });
  }
}
class Mr extends ze {
  constructor(e = {}) {
    const {
      subdomains: t = ["t0"],
      ...s
    } = e;
    super(s), this.subdomains = t, this.subDomainIndex = 0;
  }
  getUrl(e, t, s) {
    return this.url.replace(/{\s*subdomain\s*}/gi, this._getSubdomain()).replace(/{\s*quadkey\s*}/gi, this._tileToQuadKey(e, t, s));
  }
  _tileToQuadKey(e, t, s) {
    let n = "";
    for (let i = s; i > 0; i--) {
      let r = 0;
      const o = 1 << i - 1;
      (e & o) !== 0 && (r += 1), (t & o) !== 0 && (r += 2), n += r.toString();
    }
    return n;
  }
  _getSubdomain() {
    return this.subDomainIndex = (this.subDomainIndex + 1) % this.subdomains.length, this.subdomains[this.subDomainIndex];
  }
}
function Dt(a, e, t, s) {
  let [n, i, r, o] = a;
  i += 1e-8, n += 1e-8, o -= 1e-8, r -= 1e-8;
  const l = Math.max(Math.min(e, t.maxLevel), t.minLevel), [c, u, h, d] = t.getTilesInRange(n, i, r, o, l, !0);
  for (let m = c; m <= h; m++)
    for (let f = u; f <= d; f++)
      s(m, f, l);
}
function Cr(a, e, t) {
  const s = new L(), n = {}, i = [], r = a.getAttribute("position");
  a.computeBoundingBox(), a.boundingBox.getCenter(s).applyMatrix4(e), t.getPositionToCartographic(s, n);
  const o = n.lat, l = n.lon;
  let c = 1 / 0, u = 1 / 0, h = 1 / 0, d = -1 / 0, m = -1 / 0, f = -1 / 0;
  for (let y = 0; y < r.count; y++)
    s.fromBufferAttribute(r, y).applyMatrix4(e), t.getPositionToCartographic(s, n), Math.abs(Math.abs(n.lat) - Math.PI / 2) < 1e-5 && (n.lon = l), Math.abs(l - n.lon) > Math.PI && (n.lon += Math.sign(l - n.lon) * Math.PI * 2), Math.abs(o - n.lat) > Math.PI && (n.lat += Math.sign(o - n.lat) * Math.PI * 2), i.push(n.lon, n.lat, n.height), c = Math.min(c, n.lat), d = Math.max(d, n.lat), u = Math.min(u, n.lon), m = Math.max(m, n.lon), h = Math.min(h, n.height), f = Math.max(f, n.height);
  const p = [u, c, m, d], g = [...p, h, f];
  return {
    uv: i,
    range: p,
    region: g
  };
}
function Hs(a, e, t = null, s = null) {
  let n = 1 / 0, i = 1 / 0, r = 1 / 0, o = -1 / 0, l = -1 / 0, c = -1 / 0;
  const u = [], h = new K();
  a.forEach((m) => {
    h.copy(m.matrixWorld), t && h.premultiply(t);
    const { uv: f, region: p } = Cr(m.geometry, h, e);
    u.push(f), n = Math.min(n, p[1]), o = Math.max(o, p[3]), i = Math.min(i, p[0]), l = Math.max(l, p[2]), r = Math.min(r, p[4]), c = Math.max(c, p[5]);
  });
  let d = [i, n, l, o];
  if (s !== null) {
    d = s.clampToBounds([i, n, l, o]);
    const [m, f, p, g] = s.toNormalizedRange(d);
    u.forEach((y) => {
      for (let x = 0, b = y.length; x < b; x += 3) {
        const T = y[x + 0], M = y[x + 1], S = y[x + 2], [C, v] = s.toNormalizedPoint(T, M);
        y[x + 0] = _.mapLinear(C, m, p, 0, 1), y[x + 1] = _.mapLinear(v, f, g, 0, 1), y[x + 2] = _.mapLinear(S, r, c, 0, 1);
      }
    });
  }
  return {
    uvs: u,
    range: d,
    region: [i, n, l, o, r, c]
  };
}
function Ar(a, e) {
  const t = new L(), s = [], n = a.getAttribute("position");
  let i = 1 / 0, r = 1 / 0, o = 1 / 0, l = -1 / 0, c = -1 / 0, u = -1 / 0;
  for (let d = 0; d < n.count; d++)
    t.fromBufferAttribute(n, d).applyMatrix4(e), s.push(t.x, t.y, t.z), i = Math.min(i, t.x), l = Math.max(l, t.x), r = Math.min(r, t.y), c = Math.max(c, t.y), o = Math.min(o, t.z), u = Math.max(u, t.z);
  return {
    uv: s,
    range: [i, r, l, c],
    heightRange: [o, u]
  };
}
function Ir(a, e) {
  let t = 1 / 0, s = 1 / 0, n = 1 / 0, i = -1 / 0, r = -1 / 0, o = -1 / 0;
  const l = [], c = new K();
  return a.forEach((u) => {
    c.copy(u.matrixWorld), e && c.premultiply(e);
    const { uv: h, range: d, heightRange: m } = Ar(u.geometry, c);
    l.push(h), t = Math.min(t, d[0]), i = Math.max(i, d[2]), s = Math.min(s, d[1]), r = Math.max(r, d[3]), n = Math.min(n, m[0]), o = Math.max(o, m[1]);
  }), l.forEach((u) => {
    for (let h = 0, d = u.length; h < d; h += 3) {
      const m = u[h + 0], f = u[h + 1];
      u[h + 0] = _.mapLinear(m, t, i, 0, 1), u[h + 1] = _.mapLinear(f, s, r, 0, 1);
    }
  }), {
    uvs: l,
    range: [t, s, i, r],
    heightRange: [n, o]
  };
}
const Bt = Symbol("OVERLAY_PARAMS");
function vr(a, e) {
  if (a[Bt])
    return a[Bt];
  const t = {
    layerMaps: { value: [] },
    layerInfo: { value: [] }
  };
  return a[Bt] = t, a.defines = {
    ...a.defines || {},
    LAYER_COUNT: 0
  }, a.onBeforeCompile = (s) => {
    e && e(s), s.uniforms = {
      ...s.uniforms,
      ...t
    }, s.vertexShader = s.vertexShader.replace(/void main\(\s*\)\s*{/, (n) => (
      /* glsl */
      `

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							attribute vec3 layer_uv_UNROLLED_LOOP_INDEX;
							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif


					}
				#pragma unroll_loop_end

				${n}

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							v_layer_uv_UNROLLED_LOOP_INDEX = layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

			`
    )), s.fragmentShader = s.fragmentShader.replace(/void main\(/, (n) => (
      /* glsl */
      `

				#if LAYER_COUNT != 0
					struct LayerInfo {
						vec3 color;
						float opacity;

						int alphaMask;
						int alphaInvert;
					};

					uniform sampler2D layerMaps[ LAYER_COUNT ];
					uniform LayerInfo layerInfo[ LAYER_COUNT ];
				#endif

				#pragma unroll_loop_start
					for ( int i = 0; i < 10; i ++ ) {

						#if UNROLLED_LOOP_INDEX < LAYER_COUNT

							varying vec3 v_layer_uv_UNROLLED_LOOP_INDEX;

						#endif

					}
				#pragma unroll_loop_end

				${n}

			`
    )).replace(/#include <color_fragment>/, (n) => (
      /* glsl */
      `

				${n}

				#if LAYER_COUNT != 0
				{
					vec4 tint;
					vec3 layerUV;
					float layerOpacity;
					float wOpacity;
					float wDelta;
					#pragma unroll_loop_start
						for ( int i = 0; i < 10; i ++ ) {

							#if UNROLLED_LOOP_INDEX < LAYER_COUNT

								layerUV = v_layer_uv_UNROLLED_LOOP_INDEX;
								tint = texture( layerMaps[ i ], layerUV.xy );

								// discard texture outside 0, 1 on w - offset the stepped value by an epsilon to avoid cases
								// where wDelta is near 0 (eg a flat surface) at the w boundary, resulting in artifacts on some
								// hardware.
								wDelta = max( fwidth( layerUV.z ), 1e-7 );
								wOpacity =
									smoothstep( - wDelta, 0.0, layerUV.z ) *
									smoothstep( 1.0 + wDelta, 1.0, layerUV.z );

								// apply tint & opacity
								tint.rgb *= layerInfo[ i ].color;
								tint.rgba *= layerInfo[ i ].opacity * wOpacity;

								// invert the alpha
								if ( layerInfo[ i ].alphaInvert > 0 ) {

									tint.a = 1.0 - tint.a;

								}

								// apply the alpha across all existing layers if alpha mask is true
								if ( layerInfo[ i ].alphaMask > 0 ) {

									diffuseColor.a *= tint.a;

								} else {

									tint.rgb *= tint.a;
									diffuseColor = tint + diffuseColor * ( 1.0 - tint.a );

								}

							#endif

						}
					#pragma unroll_loop_end
				}
				#endif
			`
    ));
  }, t;
}
class Pn {
  constructor() {
    this.canvas = null, this.context = null, this.range = [0, 0, 1, 1];
  }
  // set the target render texture and the range that represents the full span
  setTarget(e, t) {
    this.canvas = e.image, this.context = e.image.getContext("2d"), this.range = [...t];
  }
  // draw the given texture at the given span with the provided projection
  draw(e, t) {
    const { canvas: s, range: n, context: i } = this, { width: r, height: o } = s, { image: l } = e, c = Math.round(_.mapLinear(t[0], n[0], n[2], 0, r)), u = Math.round(_.mapLinear(t[1], n[1], n[3], 0, o)), h = Math.round(_.mapLinear(t[2], n[0], n[2], 0, r)), d = Math.round(_.mapLinear(t[3], n[1], n[3], 0, o)), m = h - c, f = d - u;
    l instanceof ImageBitmap ? (i.save(), i.translate(c, o - u), i.scale(1, -1), i.drawImage(l, 0, 0, m, f), i.restore()) : i.drawImage(l, c, o - u, m, -f);
  }
  // clear the set target
  clear() {
    const { context: e, canvas: t } = this;
    e.clearRect(0, 0, t.width, t.height);
  }
}
class Rn extends Tn {
  hasContent(...e) {
    return !0;
  }
}
class Lr extends Rn {
  constructor(e) {
    super(), this.tiledImageSource = e, this.tileComposer = new Pn(), this.resolution = 256;
  }
  hasContent(e, t, s, n, i) {
    const r = this.tiledImageSource.tiling;
    let o = 0;
    return Dt([e, t, s, n], i, r, () => {
      o++;
    }), o !== 0;
  }
  async fetchItem([e, t, s, n, i], r) {
    const o = [e, t, s, n], l = this.tiledImageSource, c = this.tileComposer, u = l.tiling, h = document.createElement("canvas");
    h.width = this.resolution, h.height = this.resolution;
    const d = new $t(h);
    return d.colorSpace = jt, d.generateMipmaps = !1, d.tokens = [...o, i], await this._markImages(o, i, !1), c.setTarget(d, o), c.clear(16777215, 0), Dt(o, i, u, (m, f, p) => {
      const g = u.getTileBounds(m, f, p, !0, !1), y = l.get(m, f, p);
      c.draw(y, g);
    }), d;
  }
  disposeItem(e) {
    e.dispose();
    const [t, s, n, i, r] = e.tokens;
    this._markImages([t, s, n, i], r, !0);
  }
  dispose() {
    super.dispose(), this.tiledImageSource.dispose();
  }
  _markImages(e, t, s = !1) {
    const n = this.tiledImageSource, i = n.tiling, r = [];
    Dt(e, t, i, (l, c, u) => {
      s ? n.release(l, c, u) : r.push(n.lock(l, c, u));
    });
    const o = r.filter((l) => l instanceof Promise);
    return o.length !== 0 ? Promise.all(o) : null;
  }
}
const Ot = /* @__PURE__ */ new L(), Je = /* @__PURE__ */ new L();
function Er(a, e, t) {
  a.getCartographicToPosition(e, t, 0, Ot), a.getCartographicToPosition(e + 0.01, t, 0, Je);
  const n = Ot.distanceTo(Je);
  return a.getCartographicToPosition(e, t + 0.01, 0, Je), Ot.distanceTo(Je) / n;
}
class wr extends Rn {
  constructor({
    geojson: e = null,
    url: t = null,
    // URL or GeoJson object can be provided
    resolution: s = 256,
    pointRadius: n = 6,
    strokeStyle: i = "white",
    strokeWidth: r = 2,
    fillStyle: o = "rgba( 255, 255, 255, 0.5 )",
    ...l
  } = {}) {
    super(l), this.geojson = e, this.url = t, this.resolution = s, this.pointRadius = n, this.strokeStyle = i, this.strokeWidth = r, this.fillStyle = o, this.features = null, this.featureBounds = /* @__PURE__ */ new Map(), this.contentBounds = null, this.projection = new re(), this.fetchData = (...c) => fetch(...c);
  }
  async init() {
    const { geojson: e, url: t } = this;
    if (!e && t) {
      const s = await this.fetchData(t);
      this.geojson = await s.json();
    }
    this._updateCache(!0);
  }
  hasContent(e, t, s, n) {
    const i = [e, t, s, n].map((r) => r * Math.RAD2DEG);
    return this._boundsIntersectBounds(i, this.contentBounds);
  }
  // main fetch per region -> returns CanvasTexture
  async fetchItem(e, t) {
    const s = document.createElement("canvas"), n = new $t(s);
    return n.colorSpace = jt, n.generateMipmaps = !1, this._drawToCanvas(s, e), n.needsUpdate = !0, n;
  }
  disposeItem(e) {
    e.dispose();
  }
  redraw() {
    this._updateCache(!0), this.forEachItem((e, t) => {
      this._drawToCanvas(e.image, t), e.needsUpdate = !0;
    });
  }
  _updateCache(e = !1) {
    const { geojson: t, featureBounds: s } = this;
    if (!t || this.features && !e)
      return;
    s.clear();
    let n = 1 / 0, i = 1 / 0, r = -1 / 0, o = -1 / 0;
    this.features = this._featuresFromGeoJSON(t), this.features.forEach((l) => {
      const c = this._getFeatureBounds(l);
      s.set(l, c);
      const [u, h, d, m] = c;
      n = Math.min(n, u), i = Math.min(i, h), r = Math.max(r, d), o = Math.max(o, m);
    }), this.contentBounds = [n, i, r, o];
  }
  _drawToCanvas(e, t) {
    this._updateCache();
    const [s, n, i, r] = t, { projection: o, resolution: l, features: c } = this;
    e.width = l, e.height = l;
    const u = o.convertNormalizedToLongitude(s), h = o.convertNormalizedToLatitude(n), d = o.convertNormalizedToLongitude(i), m = o.convertNormalizedToLatitude(r), f = [
      u * _.RAD2DEG,
      h * _.RAD2DEG,
      d * _.RAD2DEG,
      m * _.RAD2DEG
    ], p = e.getContext("2d");
    for (let g = 0; g < c.length; g++) {
      const y = c[g];
      this._featureIntersectsTile(y, f) && this._drawFeatureOnCanvas(p, y, f, e.width, e.height);
    }
  }
  // bounding box quick test in projected units
  _featureIntersectsTile(e, t) {
    const s = this.featureBounds.get(e);
    return s ? this._boundsIntersectBounds(s, t) : !1;
  }
  _boundsIntersectBounds(e, t) {
    const [s, n, i, r] = e, [o, l, c, u] = t;
    return !(i < o || s > c || r < l || n > u);
  }
  _getFeatureBounds(e) {
    const { geometry: t } = e;
    if (!t)
      return null;
    const { type: s, coordinates: n } = t;
    let i = 1 / 0, r = 1 / 0, o = -1 / 0, l = -1 / 0;
    const c = (u, h) => {
      i = Math.min(i, u), o = Math.max(o, u), r = Math.min(r, h), l = Math.max(l, h);
    };
    return s === "Point" ? c(n[0], n[1]) : s === "MultiPoint" || s === "LineString" ? n.forEach((u) => c(u[0], u[1])) : s === "MultiLineString" || s === "Polygon" ? n.forEach((u) => u.forEach((h) => c(h[0], h[1]))) : s === "MultiPolygon" && n.forEach(
      (u) => u.forEach((h) => h.forEach((d) => c(d[0], d[1])))
    ), [i, r, o, l];
  }
  // Normalize top-level geojson into an array of Feature objects
  _featuresFromGeoJSON(e) {
    const t = e.type, s = /* @__PURE__ */ new Set(["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"]);
    return t === "FeatureCollection" ? e.features : t === "Feature" ? [e] : t === "GeometryCollection" ? e.geometries.map((n) => ({ type: "Feature", geometry: n, properties: {} })) : s.has(t) ? [{ type: "Feature", geometry: e, properties: {} }] : [];
  }
  // draw feature on canvas ( assumes intersects already )
  _drawFeatureOnCanvas(e, t, s, n, i) {
    const { geometry: r = null, properties: o = {} } = t;
    if (!r)
      return;
    const [l, c, u, h] = s, d = o.strokeStyle || this.strokeStyle, m = o.fillStyle || this.fillStyle, f = o.pointRadius || this.pointRadius, p = o.strokeWidth || this.strokeWidth;
    e.save(), e.strokeStyle = d, e.fillStyle = m, e.lineWidth = p;
    const g = new Array(2), y = (T, M, S = g) => {
      const C = _.mapLinear(T, l, u, 0, n), v = i - _.mapLinear(M, c, h, 0, i);
      return S[0] = Math.round(C), S[1] = Math.round(v), S;
    }, x = (T, M) => {
      const S = M * _.DEG2RAD, C = T * _.DEG2RAD, v = (h - c) / i;
      return (u - l) / n / v * Er(Ti, S, C);
    }, b = r.type;
    if (b === "Point") {
      const [T, M] = r.coordinates, [S, C] = y(T, M), v = x(T, M);
      e.beginPath(), e.ellipse(S, C, f / v, f, 0, 0, Math.PI * 2), e.fill(), e.stroke();
    } else b === "MultiPoint" ? r.coordinates.forEach(([T, M]) => {
      const [S, C] = y(T, M), v = x(T, M);
      e.beginPath(), e.ellipse(S, C, f / v, f, 0, 0, Math.PI * 2), e.fill(), e.stroke();
    }) : b === "LineString" ? (e.beginPath(), r.coordinates.forEach(([T, M], S) => {
      const [C, v] = y(T, M);
      S === 0 ? e.moveTo(C, v) : e.lineTo(C, v);
    }), e.stroke()) : b === "MultiLineString" ? (e.beginPath(), r.coordinates.forEach((T) => {
      T.forEach(([M, S], C) => {
        const [v, P] = y(M, S);
        C === 0 ? e.moveTo(v, P) : e.lineTo(v, P);
      });
    }), e.stroke()) : b === "Polygon" ? (e.beginPath(), r.coordinates.forEach((T, M) => {
      T.forEach(([S, C], v) => {
        const [P, R] = y(S, C);
        v === 0 ? e.moveTo(P, R) : e.lineTo(P, R);
      }), e.closePath();
    }), e.fill("evenodd"), e.stroke()) : b === "MultiPolygon" && r.coordinates.forEach((T) => {
      e.beginPath(), T.forEach((M, S) => {
        M.forEach(([C, v], P) => {
          const [R, V] = y(C, v);
          P === 0 ? e.moveTo(R, V) : e.lineTo(R, V);
        }), e.closePath();
      }), e.fill("evenodd"), e.stroke();
    });
    e.restore();
  }
}
const Ae = /* @__PURE__ */ new K(), Ke = /* @__PURE__ */ new L(), Ut = /* @__PURE__ */ new L(), Nt = /* @__PURE__ */ new L(), se = /* @__PURE__ */ new L(), Pr = /* @__PURE__ */ new pt(), qs = Symbol("SPLIT_TILE_DATA"), et = Symbol("SPLIT_HASH"), tt = Symbol("ORIGINAL_REFINE");
class So {
  get enableTileSplitting() {
    return this._enableTileSplitting;
  }
  set enableTileSplitting(e) {
    this._enableTileSplitting !== e && (this._enableTileSplitting = e, this._markNeedsUpdate());
  }
  constructor(e = {}) {
    const {
      overlays: t = [],
      resolution: s = 256,
      enableTileSplitting: n = !0
    } = e;
    this.name = "IMAGE_OVERLAY_PLUGIN", this.priority = -15, this.resolution = s, this._enableTileSplitting = n, this.overlays = [], this.needsUpdate = !1, this.tiles = null, this.tileComposer = null, this.tileControllers = /* @__PURE__ */ new Map(), this.overlayInfo = /* @__PURE__ */ new Map(), this.meshParams = /* @__PURE__ */ new WeakMap(), this.pendingTiles = /* @__PURE__ */ new Map(), this.processedTiles = /* @__PURE__ */ new Set(), this.processQueue = null, this._onUpdateAfter = null, this._onTileDownloadStart = null, this._virtualChildResetId = 0, this._bytesUsed = /* @__PURE__ */ new WeakMap(), t.forEach((i) => {
      this.addOverlay(i);
    });
  }
  // plugin functions
  init(e) {
    const t = new Pn(), s = new Ci();
    s.maxJobs = 10, s.priorityCallback = (n, i) => {
      const r = n.tile, o = i.tile, l = e.visibleTiles.has(r), c = e.visibleTiles.has(o);
      return l !== c ? l ? 1 : -1 : e.downloadQueue.priorityCallback(r, o);
    }, this.tiles = e, this.tileComposer = t, this.processQueue = s, e.forEachLoadedModel((n, i) => {
      this._processTileModel(n, i, !0);
    }), this._onUpdateAfter = async () => {
      let n = !1;
      if (this.overlayInfo.forEach((i, r) => {
        if (!!r.frame != !!i.frame || r.frame && i.frame && !i.frame.equals(r.frame)) {
          const o = i.order;
          this.deleteOverlay(r), this.addOverlay(r, o), n = !0;
        }
      }), n) {
        const i = s.maxJobs;
        let r = 0;
        s.items.forEach((o) => {
          e.visibleTiles.has(o.tile) && r++;
        }), s.maxJobs = r + s.currJobs, s.tryRunJobs(), s.maxJobs = i, this.needsUpdate = !0;
      }
      if (this.needsUpdate) {
        this.needsUpdate = !1;
        const { overlays: i, overlayInfo: r } = this;
        i.sort((o, l) => r.get(o).order - r.get(l).order), this.processedTiles.forEach((o) => {
          this._updateLayers(o);
        }), this.resetVirtualChildren(!this.enableTileSplitting), e.recalculateBytesUsed(), e.dispatchEvent({ type: "needs-rerender" });
      }
    }, this._onTileDownloadStart = ({ tile: n, url: i }) => {
      !/\.json$/i.test(i) && !/\.subtree/i.test(i) && (this.processedTiles.add(n), this._initTileOverlayInfo(n));
    }, e.addEventListener("update-after", this._onUpdateAfter), e.addEventListener("tile-download-start", this._onTileDownloadStart), this.overlays.forEach((n) => {
      this._initOverlay(n);
    });
  }
  _removeVirtualChildren(e) {
    if (!(tt in e))
      return;
    const { tiles: t } = this, { virtualChildCount: s } = e.internal, n = e.children.length, i = n - s;
    for (let r = i; r < n; r++) {
      const o = e.children[r];
      t.processNodeQueue.remove(o), t.lruCache.remove(o), o.parent = null;
    }
    e.children.length -= s, e.internal.virtualChildCount = 0, e.refine = e[tt], delete e[tt], delete e[et];
  }
  disposeTile(e) {
    const { overlayInfo: t, tileControllers: s, processQueue: n, pendingTiles: i, processedTiles: r } = this;
    r.delete(e), this._removeVirtualChildren(e), s.has(e) && (s.get(e).abort(), s.delete(e), i.delete(e)), t.forEach((({ tileInfo: o }, l) => {
      if (o.has(e)) {
        const { meshInfo: c, range: u } = o.get(e);
        u !== null && l.releaseTexture(u, e), o.delete(e), c.clear();
      }
    })), n.removeByFilter((o) => o.tile === e);
  }
  calculateBytesUsed(e) {
    const { overlayInfo: t } = this, s = this._bytesUsed;
    let n = null;
    return t.forEach(({ tileInfo: i }, r) => {
      if (i.has(e)) {
        const { target: o } = i.get(e);
        n = n || 0, n += bi(o);
      }
    }), n !== null ? (s.set(e, n), n) : s.has(e) ? s.get(e) : 0;
  }
  processTileModel(e, t) {
    return this._processTileModel(e, t);
  }
  async _processTileModel(e, t, s = !1) {
    const { tileControllers: n, processedTiles: i, pendingTiles: r } = this;
    n.set(t, new AbortController()), s || r.set(t, e), i.add(t), this._wrapMaterials(e), this._initTileOverlayInfo(t), await this._initTileSceneOverlayInfo(e, t), this.expandVirtualChildren(e, t), this._updateLayers(t), r.delete(t);
  }
  dispose() {
    const { tiles: e } = this;
    [...this.overlays].forEach((s) => {
      this.deleteOverlay(s);
    }), this.processedTiles.forEach((s) => {
      this._updateLayers(s), this.disposeTile(s);
    }), e.removeEventListener("update-after", this._onUpdateAfter), this.resetVirtualChildren(!0);
  }
  getAttributions(e) {
    this.overlays.forEach((t) => {
      t.opacity > 0 && t.getAttributions(e);
    });
  }
  parseToMesh(e, t, s, n) {
    if (s === "image_overlay_tile_split")
      return t[qs];
  }
  async resetVirtualChildren(e = !1) {
    this._virtualChildResetId++;
    const t = this._virtualChildResetId;
    if (await Promise.all(this.overlays.map((i) => i.whenReady())), t !== this._virtualChildResetId)
      return;
    const { tiles: s } = this, n = [];
    this.processedTiles.forEach((i) => {
      et in i && n.push(i);
    }), n.sort((i, r) => r.internal.depth - i.internal.depth), n.forEach((i) => {
      const r = i.engineData.scene.clone();
      r.updateMatrixWorld(), (e || i[et] !== this._getSplitVectors(r, i).hash) && this._removeVirtualChildren(i);
    }), e || s.forEachLoadedModel((i, r) => {
      this.expandVirtualChildren(i, r);
    });
  }
  _getSplitVectors(e, t, s = Ut) {
    const { tiles: n, overlayInfo: i } = this, r = new pt();
    r.setFromObject(e), r.getCenter(s);
    const o = [], l = [];
    i.forEach(({ tileInfo: u }, h) => {
      const d = u.get(t);
      if (d && d.target && h.shouldSplit(d.range, t)) {
        h.frame ? se.set(0, 0, 1).transformDirection(h.frame) : (n.ellipsoid.getPositionToNormal(s, se), se.length() < 1e-6 && se.set(1, 0, 0));
        const m = `${se.x.toFixed(3)},${se.y.toFixed(3)},${se.z.toFixed(3)}_`;
        l.includes(m) || l.push(m);
        const f = Ke.set(0, 0, 1);
        Math.abs(se.dot(f)) > 1 - 1e-4 && f.set(1, 0, 0);
        const p = new L().crossVectors(se, f).normalize(), g = new L().crossVectors(se, p).normalize();
        o.push(p, g);
      }
    });
    const c = [];
    for (; o.length !== 0; ) {
      const u = o.pop().clone(), h = u.clone();
      for (let d = 0; d < o.length; d++) {
        const m = o[d], f = u.dot(m);
        Math.abs(f) > Math.cos(Math.PI / 8) && (h.addScaledVector(m, Math.sign(f)), u.copy(h).normalize(), o.splice(d, 1), d--);
      }
      c.push(h.normalize());
    }
    return { directions: c, hash: l.join("") };
  }
  async expandVirtualChildren(e, t) {
    const { refine: s } = t, n = s === "REPLACE" && t.children.length === 0 || s === "ADD", i = t.internal.virtualChildCount !== 0;
    if (this.enableTileSplitting === !1 || !n || i)
      return;
    const r = e.clone();
    r.updateMatrixWorld();
    const { directions: o, hash: l } = this._getSplitVectors(r, t, Ut);
    if (o.length === 0)
      return;
    t[et] = l;
    const c = new Mn();
    c.attributeList = (h) => !/^layer_uv_\d+/.test(h), o.map((h) => {
      c.addSplitOperation((d, m, f, p, g, y) => (Yt.getInterpolatedAttribute(d.attributes.position, m, f, p, g, Ke), Ke.applyMatrix4(y).sub(Ut).dot(h)));
    });
    const u = [];
    c.forEachSplitPermutation(() => {
      const h = c.clipObject(r);
      h.matrix.premultiply(t.engineData.transformInverse).decompose(h.position, h.quaternion, h.scale);
      const d = [];
      if (h.traverse((f) => {
        if (f.isMesh) {
          const p = f.material.clone();
          f.material = p;
          for (const g in p) {
            const y = p[g];
            if (y && y.isTexture && y.source.data instanceof ImageBitmap) {
              const x = document.createElement("canvas");
              x.width = y.image.width, x.height = y.image.height;
              const b = x.getContext("2d");
              b.scale(1, -1), b.drawImage(y.source.data, 0, 0, x.width, -x.height);
              const T = new $t(x);
              T.mapping = y.mapping, T.wrapS = y.wrapS, T.wrapT = y.wrapT, T.minFilter = y.minFilter, T.magFilter = y.magFilter, T.format = y.format, T.type = y.type, T.anisotropy = y.anisotropy, T.colorSpace = y.colorSpace, T.generateMipmaps = y.generateMipmaps, p[g] = T;
            }
          }
          d.push(f);
        }
      }), d.length === 0)
        return;
      const m = {};
      if (t.boundingVolume.region && (m.region = Hs(d, this.tiles.ellipsoid).region), t.boundingVolume.box || t.boundingVolume.sphere) {
        Pr.setFromObject(h, !0).getCenter(Nt);
        let f = 0;
        h.traverse((p) => {
          const g = p.geometry;
          if (g) {
            const y = g.attributes.position;
            for (let x = 0, b = y.count; x < b; x++) {
              const T = Ke.fromBufferAttribute(y, x).applyMatrix4(p.matrixWorld).distanceToSquared(Nt);
              f = Math.max(f, T);
            }
          }
        }), m.sphere = [...Nt, Math.sqrt(f)];
      }
      u.push({
        internal: { isVirtual: !0 },
        refine: "REPLACE",
        geometricError: t.geometricError * 0.5,
        boundingVolume: m,
        content: { uri: "./child.image_overlay_tile_split" },
        children: [],
        [qs]: h
      });
    }), t[tt] = t.refine, t.refine = "REPLACE", t.children.push(...u), t.internal.virtualChildCount += u.length;
  }
  fetchData(e, t) {
    if (/image_overlay_tile_split/.test(e))
      return new ArrayBuffer();
  }
  /**
   * Adds an image overlay source to the plugin. The `order` parameter controls the draw
   * order among overlays; lower values are drawn first. If omitted, the overlay is appended
   * after all existing overlays.
   * @param {Object} overlay An image source object (e.g. `XYZImageSource`, `WMTSImageSource`).
   * @param {number|null} [order=null] Draw order for this overlay.
   */
  addOverlay(e, t = null) {
    const { tiles: s, overlays: n, overlayInfo: i } = this;
    t === null && (t = n.reduce((o, l) => Math.max(o, l.order + 1), 0));
    const r = new AbortController();
    n.push(e), i.set(e, {
      order: t,
      uniforms: {},
      tileInfo: /* @__PURE__ */ new Map(),
      controller: r,
      frame: e.frame ? e.frame.clone() : null
    }), s !== null && this._initOverlay(e);
  }
  /**
   * Updates the draw order for the given overlay.
   * @param {Object} overlay The overlay to reorder.
   * @param {number} order New draw order value.
   */
  setOverlayOrder(e, t) {
    this.overlays.indexOf(e) !== -1 && (this.overlayInfo.get(e).order = t, this._markNeedsUpdate());
  }
  /**
   * Removes the given overlay from the plugin.
   * @param {Object} overlay The overlay to remove.
   */
  deleteOverlay(e) {
    const { overlays: t, overlayInfo: s, processQueue: n, processedTiles: i } = this, r = t.indexOf(e);
    if (r !== -1) {
      const { tileInfo: o, controller: l } = s.get(e);
      i.forEach((c) => {
        if (!o.has(c))
          return;
        const {
          meshInfo: u,
          range: h
        } = o.get(c);
        h !== null && e.releaseTexture(h, c), o.delete(c), u.clear();
      }), o.clear(), s.delete(e), l.abort(), n.removeByFilter((c) => c.overlay === e), t.splice(r, 1), i.forEach((c) => {
        this._updateLayers(c);
      }), this._markNeedsUpdate();
    }
  }
  // initialize the overlay to use the right fetch options, load all data for existing tiles
  _initOverlay(e) {
    const { tiles: t } = this;
    e.isInitialized || (e.init(), e.whenReady().then(() => {
      e.setResolution(this.resolution);
      const i = e.fetch.bind(e);
      e.fetch = (...r) => t.downloadQueue.add({ priority: -performance.now() }, () => i(...r));
    }));
    const s = [], n = async (i, r) => {
      this._initTileOverlayInfo(r, e);
      const o = this._initTileSceneOverlayInfo(i, r, e);
      s.push(o), await o, this._updateLayers(r);
    };
    t.forEachLoadedModel((i, r) => {
      n(i, r);
    }), this.pendingTiles.forEach((i, r) => {
      n(i, r);
    }), Promise.all(s).then(() => {
      this._markNeedsUpdate();
    });
  }
  // wrap all materials in the given scene wit the overlay material shader
  _wrapMaterials(e) {
    e.traverse((t) => {
      if (t.material) {
        const s = vr(t.material, t.material.onBeforeCompile);
        this.meshParams.set(t, s);
      }
    });
  }
  // Initialize per-tile overlay information. This function triggers an async function but
  // does not need to be awaited for use since it's just locking textures which are awaited later.
  _initTileOverlayInfo(e, t = this.overlays) {
    if (Array.isArray(t)) {
      t.forEach((i) => this._initTileOverlayInfo(e, i));
      return;
    }
    const { overlayInfo: s } = this;
    if (s.get(t).tileInfo.has(e))
      return;
    const n = {
      range: null,
      target: null,
      meshInfo: /* @__PURE__ */ new Map()
    };
    if (s.get(t).tileInfo.set(e, n), t.isReady && !t.isPlanarProjection) {
      if (e.boundingVolume.region) {
        const [i, r, o, l] = e.boundingVolume.region, c = t.projection.toNormalizedRange([i, r, o, l]);
        n.range = c, t.lockTexture(c, e);
      }
    }
  }
  // initialize the scene meshes
  async _initTileSceneOverlayInfo(e, t, s = this.overlays) {
    if (Array.isArray(s))
      return Promise.all(s.map((T) => this._initTileSceneOverlayInfo(e, t, T)));
    const { tiles: n, overlayInfo: i, tileControllers: r, processQueue: o } = this, { ellipsoid: l } = n, { controller: c, tileInfo: u } = i.get(s), h = r.get(t);
    if (s.isReady || await s.whenReady(), c.signal.aborted || h.signal.aborted)
      return;
    const d = [];
    e.updateMatrixWorld(), e.traverse((T) => {
      T.isMesh && d.push(T);
    });
    const { aspectRatio: m, projection: f } = s, p = u.get(t);
    let g, y, x;
    if (s.isPlanarProjection) {
      Ae.makeScale(1 / m, 1, 1).multiply(s.frame), e.parent !== null && Ae.multiply(n.group.matrixWorldInverse);
      let T;
      ({ range: g, uvs: y, heightRange: T } = Ir(d, Ae)), x = !(T[0] > 1 || T[1] < 0);
    } else
      Ae.identity(), e.parent !== null && Ae.copy(n.group.matrixWorldInverse), { range: g, uvs: y } = Hs(d, l, Ae, f), g = f.toNormalizedRange(g), x = !0;
    p.range === null ? (p.range = g, s.lockTexture(g, t)) : g = p.range;
    let b = null;
    x && s.hasContent(g, t) && (b = await o.add({ tile: t, overlay: s }, async () => {
      if (c.signal.aborted || h.signal.aborted)
        return null;
      const T = await s.getTexture(g, t);
      return c.signal.aborted || h.signal.aborted ? null : T;
    }).catch((T) => {
      if (!(T instanceof Ai))
        throw T;
    })), p.target = b, d.forEach((T, M) => {
      const S = new Float32Array(y[M]), C = new $(S, 3);
      p.meshInfo.set(T, { attribute: C });
    });
  }
  _updateLayers(e) {
    const { overlayInfo: t, overlays: s, tileControllers: n, meshParams: i } = this, r = n.get(e);
    if (this.tiles.recalculateBytesUsed(e), !(!r || r.signal.aborted)) {
      if (s.length === 0) {
        const o = e.engineData && e.engineData.scene;
        o && o.traverse((l) => {
          if (l.material && i.has(l)) {
            const c = i.get(l);
            c.layerMaps.length = 0, c.layerInfo.length = 0, l.material.defines.LAYER_COUNT = 0, l.material.needsUpdate = !0;
          }
        });
        return;
      }
      s.forEach((o, l) => {
        const { tileInfo: c } = t.get(o), { meshInfo: u, target: h } = c.get(e);
        u.forEach(({ attribute: d }, m) => {
          const { geometry: f, material: p } = m, g = i.get(m), y = `layer_uv_${l}`;
          f.getAttribute(y) !== d && (f.setAttribute(y, d), f.dispose()), g.layerMaps.length = s.length, g.layerInfo.length = s.length, g.layerMaps.value[l] = h !== null ? h : null, g.layerInfo.value[l] = o, p.defines[`LAYER_${l}_EXISTS`] = +(h !== null), p.defines[`LAYER_${l}_ALPHA_INVERT`] = Number(o.alphaInvert), p.defines[`LAYER_${l}_ALPHA_MASK`] = Number(o.alphaMask), p.defines.LAYER_COUNT = s.length, p.needsUpdate = !0;
        });
      });
    }
  }
  _markNeedsUpdate() {
    this.needsUpdate === !1 && (this.needsUpdate = !0, this.tiles !== null && this.tiles.dispatchEvent({ type: "needs-update" }));
  }
}
class Dn {
  get isPlanarProjection() {
    return !!this.frame;
  }
  constructor(e = {}) {
    const {
      opacity: t = 1,
      color: s = 16777215,
      frame: n = null,
      preprocessURL: i = null,
      alphaMask: r = !1,
      alphaInvert: o = !1
    } = e;
    this.preprocessURL = i, this.opacity = t, this.color = new un(s), this.frame = n !== null ? n.clone() : null, this.alphaMask = r, this.alphaInvert = o, this._whenReady = null, this.isReady = !1, this.isInitialized = !1;
  }
  init() {
    this.isInitialized = !0, this._whenReady = this._init().then(() => this.isReady = !0);
  }
  whenReady() {
    return this._whenReady;
  }
  // overrideable
  _init() {
  }
  fetch(e, t = {}) {
    return this.preprocessURL && (e = this.preprocessURL(e)), fetch(e, t);
  }
  getAttributions(e) {
  }
  hasContent(e, t) {
    return !1;
  }
  async getTexture(e, t) {
    return null;
  }
  async lockTexture(e, t) {
    return null;
  }
  releaseTexture(e, t) {
  }
  setResolution(e) {
  }
  shouldSplit(e, t) {
    return !1;
  }
}
class Le extends Dn {
  get tiling() {
    return this.imageSource.tiling;
  }
  get projection() {
    return this.tiling.projection;
  }
  get aspectRatio() {
    return this.tiling && this.isReady ? this.tiling.aspectRatio : 1;
  }
  get fetchOptions() {
    return this.imageSource.fetchOptions;
  }
  set fetchOptions(e) {
    this.imageSource.fetchOptions = e;
  }
  constructor(e = {}) {
    const { imageSource: t = null, ...s } = e;
    super(s), this.imageSource = t, this.regionImageSource = null;
  }
  _init() {
    return this._initImageSource().then(() => {
      this.imageSource.fetchData = (...e) => this.fetch(...e), this.regionImageSource = new Lr(this.imageSource);
    });
  }
  _initImageSource() {
    return this.imageSource.init();
  }
  // Texture acquisition API implementations
  calculateLevel(e, t) {
    if (this.isPlanarProjection) {
      const [s, n, i, r] = e, o = i - s, l = r - n;
      let c = 0;
      const u = this.regionImageSource.resolution, h = this.tiling.maxLevel;
      for (; c < h; c++) {
        const d = u / o, m = u / l, { pixelWidth: f, pixelHeight: p } = this.tiling.getLevel(c);
        if (f >= d || p >= m)
          break;
      }
      return c;
    } else
      return t.internal.depthFromRenderedParent - 1;
  }
  hasContent(e, t) {
    return this.regionImageSource.hasContent(...e, this.calculateLevel(e, t));
  }
  getTexture(e, t) {
    return this.regionImageSource.get(...e, this.calculateLevel(e, t));
  }
  lockTexture(e, t) {
    return this.regionImageSource.lock(...e, this.calculateLevel(e, t));
  }
  releaseTexture(e, t) {
    this.regionImageSource.release(...e, this.calculateLevel(e, t));
  }
  setResolution(e) {
    this.regionImageSource.resolution = e;
  }
  shouldSplit(e, t) {
    return this.tiling.maxLevel > this.calculateLevel(e, t);
  }
}
class Mo extends Le {
  constructor(e = {}) {
    super(e), this.imageSource = new ze(e);
  }
}
class Co extends Dn {
  get projection() {
    return this.imageSource.projection;
  }
  get aspectRatio() {
    return 2;
  }
  get pointRadius() {
    return this.imageSource.pointRadius;
  }
  set pointRadius(e) {
    this.imageSource.pointRadius = e;
  }
  get strokeStyle() {
    return this.imageSource.strokeStyle;
  }
  set strokeStyle(e) {
    this.imageSource.strokeStyle = e;
  }
  get strokeWidth() {
    return this.imageSource.strokeWidth;
  }
  set strokeWidth(e) {
    this.imageSource.strokeWidth = e;
  }
  get fillStyle() {
    return this.imageSource.fillStyle;
  }
  set fillStyle(e) {
    this.imageSource.fillStyle = e;
  }
  get geojson() {
    return this.imageSource.geojson;
  }
  set geojson(e) {
    this.imageSource.geojson = e;
  }
  constructor(e = {}) {
    super(e), this.imageSource = new wr(e);
  }
  _init() {
    return this.imageSource.init();
  }
  hasContent(e) {
    return this.imageSource.hasContent(...e);
  }
  getTexture(e) {
    return this.imageSource.get(...e);
  }
  lockTexture(e) {
    return this.imageSource.lock(...e);
  }
  releaseTexture(e) {
    this.imageSource.release(...e);
  }
  setResolution(e) {
    this.imageSource.resolution = e;
  }
  shouldSplit(e, t) {
    return !0;
  }
  redraw() {
    this.imageSource.redraw();
  }
}
class Ao extends Le {
  constructor(e = {}) {
    super(e), this.imageSource = new Sn(e);
  }
}
class Io extends Le {
  constructor(e = {}) {
    super(e), this.imageSource = new _n(e);
  }
}
class vo extends Le {
  constructor(e = {}) {
    super(e), this.imageSource = new Qt(e);
  }
}
class Lo extends Le {
  constructor(e = {}) {
    super(e);
    const { apiToken: t, autoRefreshToken: s, assetId: n } = e;
    this.options = e, this.assetId = n, this.auth = new Xn({ apiToken: t, autoRefreshToken: s }), this.auth.authURL = `https://api.cesium.com/v1/assets/${n}/endpoint`, this._attributions = [], this.externalType = !1;
  }
  _initImageSource() {
    return this.auth.refreshToken().then(async (e) => {
      if (this._attributions = e.attributions.map((t) => ({
        value: t.html,
        type: "html",
        collapsible: t.collapsible
      })), e.type !== "IMAGERY")
        throw new Error("CesiumIonOverlay: Only IMAGERY is supported as overlay type.");
      switch (this.externalType = !!e.externalType, e.externalType) {
        case "GOOGLE_2D_MAPS": {
          const { url: t, session: s, key: n, tileWidth: i } = e.options, r = `${t}/v1/2dtiles/{z}/{x}/{y}?session=${s}&key=${n}`;
          this.imageSource = new ze({
            ...this.options,
            url: r,
            tileDimension: i,
            // Google maps tiles have a fixed depth of 22
            // https://developers.google.com/maps/documentation/tile/2d-tiles-overview
            levels: 22
          });
          break;
        }
        case "BING": {
          const { url: t, mapStyle: s, key: n } = e.options, i = `${t}/REST/v1/Imagery/Metadata/${s}?incl=ImageryProviders&key=${n}&uriScheme=https`, o = (await fetch(i).then((l) => l.json())).resourceSets[0].resources[0];
          this.imageSource = new Mr({
            ...this.options,
            url: o.imageUrl,
            subdomains: o.imageUrlSubdomains,
            tileDimension: o.tileWidth,
            levels: o.zoomMax
          });
          break;
        }
        default:
          this.imageSource = new Qt({
            ...this.options,
            url: e.url
          });
      }
      return this.imageSource.fetchData = (...t) => this.fetch(...t), this.imageSource.init();
    });
  }
  fetch(...e) {
    return this.externalType ? super.fetch(...e) : this.auth.fetch(...e);
  }
  getAttributions(e) {
    e.push(...this._attributions);
  }
}
class Eo extends Le {
  constructor(e = {}) {
    super(e);
    const { apiToken: t, sessionOptions: s, autoRefreshToken: n, logoUrl: i } = e;
    this.logoUrl = i, this.auth = new Yn({ apiToken: t, sessionOptions: s, autoRefreshToken: n }), this.imageSource = new ze(), this.imageSource.fetchData = (...r) => this.fetch(...r), this._logoAttribution = {
      value: "",
      type: "image",
      collapsible: !1
    };
  }
  _initImageSource() {
    return this.auth.refreshToken().then((e) => (this.imageSource.tileDimension = e.tileWidth, this.imageSource.url = "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}", this.imageSource.init()));
  }
  fetch(...e) {
    return this.auth.fetch(...e);
  }
  getAttributions(e) {
    this.logoUrl && (this._logoAttribution.value = this.logoUrl, e.push(this._logoAttribution));
  }
}
class wo {
  constructor() {
    this.name = "LOAD_REGION_PLUGIN", this.regions = [], this.tiles = null;
  }
  init(e) {
    this.tiles = e;
  }
  addRegion(e) {
    this.regions.indexOf(e) === -1 && this.regions.push(e);
  }
  removeRegion(e) {
    const t = this.regions.indexOf(e);
    t !== -1 && this.regions.splice(t, 1);
  }
  hasRegion(e) {
    return this.regions.indexOf(e) !== -1;
  }
  clearRegions() {
    this.regions = [];
  }
  // Calculates shape intersections and associated error values to use. If "mask" shapes are present then
  // tiles are only loaded if they are within those shapes.
  calculateTileViewError(e, t) {
    const s = e.engineData.boundingVolume, { regions: n, tiles: i } = this;
    let r = !1, o = null, l = 0, c = 1 / 0;
    for (const u of n) {
      const h = u.intersectsTile(s, e, i);
      r = r || h, h && (l = Math.max(u.calculateError(e, i), l), c = Math.min(u.calculateDistance(s, e, i), c)), u.mask && (o = o || h);
    }
    return t.inView = r && o !== !1, t.error = l, t.distance = c, t.inView || o !== null;
  }
  dispose() {
    this.regions = [];
  }
}
class Kt {
  constructor(e = {}) {
    typeof e == "number" && (console.warn("LoadRegionPlugin: Region constructor has been changed to take options as an object."), e = { errorTarget: e });
    const {
      errorTarget: t = 10,
      mask: s = !1
    } = e;
    this.errorTarget = t, this.mask = s;
  }
  intersectsTile(e, t, s) {
    return !1;
  }
  calculateDistance(e, t, s) {
    return 1 / 0;
  }
  calculateError(e, t) {
    return e.geometricError - this.errorTarget + t.errorTarget;
  }
}
class Po extends Kt {
  constructor(e = {}) {
    typeof e == "number" && (console.warn("SphereRegion: Region constructor has been changed to take options as an object."), e = {
      errorTarget: arguments[0],
      sphere: arguments[1]
    });
    const { sphere: t = new pe() } = e;
    super(e), this.sphere = t.clone();
  }
  intersectsTile(e) {
    return e.intersectsSphere(this.sphere);
  }
}
class Ro extends Kt {
  constructor(e = {}) {
    typeof e == "number" && (console.warn("RayRegion: Region constructor has been changed to take options as an object."), e = {
      errorTarget: arguments[0],
      ray: arguments[1]
    });
    const { ray: t = new di() } = e;
    super(e), this.ray = t.clone();
  }
  intersectsTile(e) {
    return e.intersectsRay(this.ray);
  }
}
class Do extends Kt {
  constructor(e = {}) {
    typeof e == "number" && (console.warn("RayRegion: Region constructor has been changed to take options as an object."), e = {
      errorTarget: arguments[0],
      obb: arguments[1]
    });
    const { obb: t = new _i() } = e;
    super(e), this.obb = t.clone(), this.obb.update();
  }
  intersectsTile(e) {
    return e.intersectsOBB(this.obb);
  }
}
const te = /* @__PURE__ */ new L(), Ws = ["x", "y", "z"];
class Rr extends hn {
  constructor(e, t = 16776960, s = 40) {
    const n = new Ve(), i = [];
    for (let r = 0; r < 3; r++) {
      const o = Ws[r], l = Ws[(r + 1) % 3];
      te.set(0, 0, 0);
      for (let c = 0; c < s; c++) {
        let u;
        u = 2 * Math.PI * c / (s - 1), te[o] = Math.sin(u), te[l] = Math.cos(u), i.push(te.x, te.y, te.z), u = 2 * Math.PI * (c + 1) / (s - 1), te[o] = Math.sin(u), te[l] = Math.cos(u), i.push(te.x, te.y, te.z);
      }
    }
    n.setAttribute("position", new $(new Float32Array(i), 3)), n.computeBoundingSphere(), super(n, new pi({ color: t, toneMapped: !1 })), this.sphere = e, this.type = "SphereHelper";
  }
  updateMatrixWorld(e) {
    const t = this.sphere;
    this.position.copy(t.center), this.scale.setScalar(t.radius), super.updateMatrixWorld(e);
  }
}
const Vt = /* @__PURE__ */ new L(), st = /* @__PURE__ */ new L(), ne = /* @__PURE__ */ new L(), js = /* @__PURE__ */ new L(), Xs = /* @__PURE__ */ new L();
function Dr(a) {
  a = a.toNonIndexed();
  const { groups: e } = a, { position: t, normal: s } = a.attributes, n = [], i = [];
  for (const o of e) {
    const { start: l, count: c } = o;
    for (let u = l, h = l + c; u < h; u++)
      js.fromBufferAttribute(t, u), Xs.fromBufferAttribute(s, u), i.push(...js), n.push(...Xs);
  }
  const r = new Ve();
  return r.setAttribute("position", new $(new Float32Array(i), 3)), r.setAttribute("normal", new $(new Float32Array(n), 3)), r;
}
function Bn(a, { computeNormals: e = !1 } = {}) {
  const {
    latStart: t = -Math.PI / 2,
    latEnd: s = Math.PI / 2,
    lonStart: n = 0,
    lonEnd: i = 2 * Math.PI,
    heightStart: r = 0,
    heightEnd: o = 0
  } = a, l = new dn(1, 1, 1, 32, 32), { normal: c, position: u } = l.attributes, h = u.clone();
  for (let d = 0, m = u.count; d < m; d++) {
    ne.fromBufferAttribute(u, d);
    const f = _.mapLinear(ne.x, -0.5, 0.5, t, s), p = _.mapLinear(ne.y, -0.5, 0.5, n, i);
    let g = r;
    a.getCartographicToNormal(f, p, Vt), ne.z < 0 && (g = o), a.getCartographicToPosition(f, p, g, ne), u.setXYZ(d, ...ne);
  }
  e && l.computeVertexNormals();
  for (let d = 0, m = h.count; d < m; d++) {
    ne.fromBufferAttribute(h, d);
    const f = _.mapLinear(ne.x, -0.5, 0.5, t, s), p = _.mapLinear(ne.y, -0.5, 0.5, n, i);
    Vt.fromBufferAttribute(c, d), a.getCartographicToNormal(f, p, st), Math.abs(Vt.dot(st)) > 0.1 && (ne.z > 0 && st.multiplyScalar(-1), c.setXYZ(d, ...st));
  }
  return l;
}
class Br extends hn {
  constructor(e = new fn(), t = 16776960) {
    super(), this.ellipsoidRegion = e, this.material.color.set(t), this.update();
  }
  update() {
    const e = Bn(this.ellipsoidRegion);
    this.geometry.dispose(), this.geometry = new fi(e, 80);
  }
  dispose() {
    this.geometry.dispose(), this.material.dispose();
  }
}
class Or extends Se {
  constructor(e = new fn(), t = 16776960) {
    super(), this.ellipsoidRegion = e, this.material.color.set(t), this.update();
  }
  update() {
    this.geometry.dispose();
    const e = Bn(this.ellipsoidRegion, { computeNormals: !0 }), { lonStart: t, lonEnd: s } = this;
    s - t >= 2 * Math.PI ? (e.groups.splice(2, 2), this.geometry = Dr(e)) : this.geometry = e;
  }
  dispose() {
    this.geometry.dispose(), this.material.dispose();
  }
}
const Ys = Symbol("ORIGINAL_MATERIAL"), nt = Symbol("HAS_RANDOM_COLOR"), it = Symbol("HAS_RANDOM_NODE_COLOR"), Ft = Symbol("LOAD_TIME"), ye = Symbol("PARENT_BOUND_REF_COUNT"), $s = /* @__PURE__ */ new pe(), Ie = () => {
}, kt = {};
function xe(a) {
  if (!kt[a]) {
    const e = Math.random(), t = 0.5 + Math.random() * 0.5, s = 0.375 + Math.random() * 0.25;
    kt[a] = new un().setHSL(e, t, s);
  }
  return kt[a];
}
const ae = 0, On = 1, Un = 2, Nn = 3, Vn = 4, Fn = 5, kn = 6, Ue = 7, Ne = 8, Gn = 9, ot = 10, Qs = 11, Ur = Object.freeze({
  NONE: ae,
  SCREEN_ERROR: On,
  GEOMETRIC_ERROR: Un,
  DISTANCE: Nn,
  DEPTH: Vn,
  RELATIVE_DEPTH: Fn,
  IS_LEAF: kn,
  RANDOM_COLOR: Ue,
  RANDOM_NODE_COLOR: Ne,
  CUSTOM_COLOR: Gn,
  LOAD_ORDER: ot
});
class Bo {
  static get ColorModes() {
    return Ur;
  }
  get unlit() {
    return this._unlit;
  }
  set unlit(e) {
    e !== this._unlit && (this._unlit = e, this.materialsNeedUpdate = !0);
  }
  get colorMode() {
    return this._colorMode;
  }
  set colorMode(e) {
    e !== this._colorMode && (this._colorMode = e, this.materialsNeedUpdate = !0);
  }
  get boundsColorMode() {
    return this._boundsColorMode;
  }
  set boundsColorMode(e) {
    e !== this._boundsColorMode && (this._boundsColorMode = e, this.materialsNeedUpdate = !0);
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(e) {
    e !== this._enabled && this.tiles !== null && (this._enabled = e, e ? this.init(this.tiles) : this.dispose());
  }
  get displayParentBounds() {
    return this._displayParentBounds;
  }
  set displayParentBounds(e) {
    this._displayParentBounds !== e && (this._displayParentBounds = e, e ? this.tiles.traverse((t) => {
      t.traversal.visible && this._onTileVisibilityChange(t, !0);
    }) : this.tiles.traverse((t) => {
      t[ye] = null, this._onTileVisibilityChange(t, t.traversal.visible);
    }));
  }
  constructor(e) {
    e = {
      displayParentBounds: !1,
      displayBoxBounds: !1,
      displaySphereBounds: !1,
      displayRegionBounds: !1,
      colorMode: ae,
      boundsColorMode: ae,
      maxDebugDepth: -1,
      maxDebugDistance: -1,
      maxDebugError: -1,
      customColorCallback: null,
      unlit: !1,
      enabled: !0,
      ...e
    }, this.name = "DEBUG_TILES_PLUGIN", this.tiles = null, this._colorMode = null, this._boundsColorMode = null, this._unlit = null, this.materialsNeedUpdate = !1, this.extremeDebugDepth = -1, this.extremeDebugError = -1, this.boxGroup = null, this.sphereGroup = null, this.regionGroup = null, this._enabled = e.enabled, this._displayParentBounds = e.displayParentBounds, this.displayBoxBounds = e.displayBoxBounds, this.displaySphereBounds = e.displaySphereBounds, this.displayRegionBounds = e.displayRegionBounds, this.colorMode = e.colorMode, this.boundsColorMode = e.boundsColorMode, this.maxDebugDepth = e.maxDebugDepth, this.maxDebugDistance = e.maxDebugDistance, this.maxDebugError = e.maxDebugError, this.customColorCallback = e.customColorCallback, this.unlit = e.unlit, this.getDebugColor = (t, s) => {
      s.setRGB(t, t, t);
    };
  }
  // initialize the groups for displaying helpers, register events, and initialize existing tiles
  init(e) {
    if (this.tiles = e, !this.enabled)
      return;
    const t = e.group;
    this.boxGroup = new We(), this.boxGroup.name = "DebugTilesRenderer.boxGroup", t.add(this.boxGroup), this.boxGroup.updateMatrixWorld(), this.sphereGroup = new We(), this.sphereGroup.name = "DebugTilesRenderer.sphereGroup", t.add(this.sphereGroup), this.sphereGroup.updateMatrixWorld(), this.regionGroup = new We(), this.regionGroup.name = "DebugTilesRenderer.regionGroup", t.add(this.regionGroup), this.regionGroup.updateMatrixWorld(), this._onLoadTilesetCB = () => {
      this._initExtremes();
    }, this._onLoadModelCB = ({ scene: s, tile: n }) => {
      this._onLoadModel(s, n);
    }, this._onDisposeModelCB = ({ tile: s }) => {
      this._onDisposeModel(s);
    }, this._onUpdateAfterCB = () => {
      this.update();
    }, this._onTileVisibilityChangeCB = ({ scene: s, tile: n, visible: i }) => {
      this._onTileVisibilityChange(n, i);
    }, e.addEventListener("load-tileset", this._onLoadTilesetCB), e.addEventListener("load-model", this._onLoadModelCB), e.addEventListener("dispose-model", this._onDisposeModelCB), e.addEventListener("update-after", this._onUpdateAfterCB), e.addEventListener("tile-visibility-change", this._onTileVisibilityChangeCB), this._initExtremes(), e.traverse((s) => {
      s.engineData.scene && this._onLoadModel(s.engineData.scene, s);
    }), e.visibleTiles.forEach((s) => {
      this._onTileVisibilityChange(s, !0);
    });
  }
  getTileFromObject3D(e) {
    let t = null;
    return this.tiles.activeTiles.forEach((n) => {
      if (t)
        return;
      const i = n.engineData.scene;
      i && i.traverse((r) => {
        r === e && (t = n);
      });
    }), t;
  }
  _initExtremes() {
    if (!(this.tiles && this.tiles.root))
      return;
    let e = -1, t = -1;
    this.tiles.traverse(null, (s, n, i) => {
      e = Math.max(e, i), t = Math.max(t, s.geometricError);
    }, !1), this.extremeDebugDepth = e, this.extremeDebugError = t;
  }
  /**
   * Applies the current plugin field values to all visible tile geometry. Call this
   * after modifying properties such as `colorMode`, `displayBoxBounds`, or
   * `displayParentBounds` when `TilesRenderer.update` is not being called every frame
   * so changes can be reflected.
   */
  update() {
    const { tiles: e, colorMode: t, boundsColorMode: s } = this;
    if (!e.root)
      return;
    this.materialsNeedUpdate && (e.forEachLoadedModel((m) => {
      this._updateMaterial(m);
    }), this.materialsNeedUpdate = !1), this.boxGroup.visible = this.displayBoxBounds, this.sphereGroup.visible = this.displaySphereBounds, this.regionGroup.visible = this.displayRegionBounds;
    let n = -1;
    this.maxDebugDepth === -1 ? n = this.extremeDebugDepth : n = this.maxDebugDepth;
    let i = -1;
    this.maxDebugError === -1 ? i = this.extremeDebugError : i = this.maxDebugError;
    let r = -1;
    this.maxDebugDistance === -1 ? (e.getBoundingSphere($s), r = $s.radius) : r = this.maxDebugDistance;
    const { errorTarget: o, visibleTiles: l } = e;
    let c;
    (t === ot || s === ot) && (c = Array.from(l).sort((m, f) => m[Ft] - f[Ft]));
    const u = (m, f, p, g, y, x) => {
      switch (m !== Ue && delete p.material[nt], m !== Ne && delete p.material[it], m) {
        case Vn: {
          const b = f.internal.depth / n;
          this.getDebugColor(b, p.material.color);
          break;
        }
        case Fn: {
          const b = f.internal.depthFromRenderedParent / n;
          this.getDebugColor(b, p.material.color);
          break;
        }
        case On: {
          const b = f.traversal.error / o;
          b > 1 ? p.material.color.setRGB(1, 0, 0) : this.getDebugColor(b, p.material.color);
          break;
        }
        case Un: {
          const b = Math.min(f.geometricError / i, 1);
          this.getDebugColor(b, p.material.color);
          break;
        }
        case Nn: {
          const b = Math.min(f.traversal.distanceFromCamera / r, 1);
          this.getDebugColor(b, p.material.color);
          break;
        }
        case kn: {
          !f.children || f.children.length === 0 ? this.getDebugColor(1, p.material.color) : this.getDebugColor(0, p.material.color);
          break;
        }
        case Ne: {
          p.material[it] || (p.material.color.setHSL(g, y, x), p.material[it] = !0);
          break;
        }
        case Ue: {
          p.material[nt] || (p.material.color.setHSL(g, y, x), p.material[nt] = !0);
          break;
        }
        case Gn: {
          this.customColorCallback ? this.customColorCallback(f, p) : console.warn("DebugTilesRenderer: customColorCallback not defined");
          break;
        }
        case ot: {
          const b = c.indexOf(f);
          this.getDebugColor(b / (c.length - 1), p.material.color);
          break;
        }
        case Qs: {
          p.material.color.copy(xe(f.internal.depth)), delete p.material[nt], delete p.material[it];
          break;
        }
      }
    };
    l.forEach((m) => {
      const f = m.engineData.scene;
      let p, g, y;
      t === Ue && (p = Math.random(), g = 0.5 + Math.random() * 0.5, y = 0.375 + Math.random() * 0.25), f.traverse((x) => {
        t === Ne && (p = Math.random(), g = 0.5 + Math.random() * 0.5, y = 0.375 + Math.random() * 0.25), x.material && u(t, m, x, p, g, y);
      });
    });
    const h = s === ae ? Qs : s, d = [this.boxGroup, this.sphereGroup, this.regionGroup];
    for (const m of d)
      for (const f of m.children) {
        const p = f.userData.tile;
        let g, y, x;
        h === Ue && (g = Math.random(), y = 0.5 + Math.random() * 0.5, x = 0.375 + Math.random() * 0.25), f.traverse((b) => {
          h === Ne && (g = Math.random(), y = 0.5 + Math.random() * 0.5, x = 0.375 + Math.random() * 0.25), b.material && u(h, p, b, g, y, x);
        });
      }
  }
  _onTileVisibilityChange(e, t) {
    this.displayParentBounds ? Ii(e, (s) => {
      s[ye] == null && (s[ye] = 0), t ? s[ye]++ : s[ye] > 0 && s[ye]--;
      const n = s === e && t || this.displayParentBounds && s[ye] > 0;
      this._updateBoundHelper(s, n);
    }) : this._updateBoundHelper(e, t);
  }
  _createBoundHelper(e) {
    const t = this.tiles, s = e.engineData, { sphere: n, obb: i, region: r } = s.boundingVolume;
    if (i) {
      const o = new We();
      o.name = "DebugTilesRenderer.boxHelperGroup", o.matrix.copy(i.transform), o.matrixAutoUpdate = !1, o.userData.tile = e, s.boxHelperGroup = o;
      const l = new mi(i.box, xe(e.internal.depth));
      l.raycast = Ie, o.add(l);
      const c = new Se(new dn(), new _e({
        color: xe(e.internal.depth),
        transparent: !0,
        depthWrite: !1,
        opacity: 0.05,
        side: rt
      }));
      i.box.getSize(c.scale), c.raycast = Ie, o.add(c), t.visibleTiles.has(e) && this.displayBoxBounds && (this.boxGroup.add(o), o.updateMatrixWorld(!0));
    }
    if (n) {
      const o = new Rr(n, xe(e.internal.depth));
      o.raycast = Ie, o.userData.tile = e;
      const l = new Se(new gi(1), new _e({
        color: xe(e.internal.depth),
        transparent: !0,
        depthWrite: !1,
        opacity: 0.05,
        side: rt
      }));
      l.raycast = Ie, o.add(l), s.sphereHelper = o, t.visibleTiles.has(e) && this.displaySphereBounds && (this.sphereGroup.add(o), o.updateMatrixWorld(!0));
    }
    if (r) {
      const o = new Br(r, xe(e.internal.depth));
      o.raycast = Ie, o.userData.tile = e;
      const l = new Or(r, xe(e.internal.depth));
      l.material.transparent = !0, l.material.depthWrite = !1, l.material.opacity = 0.05, l.material.side = rt, l.raycast = Ie, o.add(l);
      const c = new pe();
      r.getBoundingSphere(c), o.position.copy(c.center), c.center.multiplyScalar(-1), o.geometry.translate(...c.center), l.geometry.translate(...c.center), s.regionHelper = o, t.visibleTiles.has(e) && this.displayRegionBounds && (this.regionGroup.add(o), o.updateMatrixWorld(!0));
    }
  }
  _updateHelperMaterials(e, t) {
    t.traverse((s) => {
      const { material: n } = s;
      if (!n)
        return;
      e.traversal.visible || !this.displayParentBounds ? n.opacity = s.isMesh ? 0.05 : 1 : n.opacity = s.isMesh ? 0.01 : 0.2;
      const i = n.transparent;
      n.transparent = n.opacity < 1, n.transparent !== i && (n.needsUpdate = !0);
    });
  }
  _updateBoundHelper(e, t) {
    const s = e.engineData;
    if (!s)
      return;
    const n = this.sphereGroup, i = this.boxGroup, r = this.regionGroup;
    t && s.boxHelperGroup == null && s.sphereHelper == null && s.regionHelper == null && this._createBoundHelper(e);
    const o = s.boxHelperGroup, l = s.sphereHelper, c = s.regionHelper;
    t ? (o && (i.add(o), o.updateMatrixWorld(!0), this._updateHelperMaterials(e, o)), l && (n.add(l), l.updateMatrixWorld(!0), this._updateHelperMaterials(e, l)), c && (r.add(c), c.updateMatrixWorld(!0), this._updateHelperMaterials(e, c))) : (o && i.remove(o), l && n.remove(l), c && r.remove(c));
  }
  _updateMaterial(e) {
    const { colorMode: t, unlit: s } = this;
    e.traverse((n) => {
      if (!n.material)
        return;
      const i = n.material, r = n[Ys];
      if (i !== r && i.dispose(), t !== ae || s) {
        if (n.isPoints) {
          const o = new yi();
          o.size = r.size, o.sizeAttenuation = r.sizeAttenuation, n.material = o;
        } else s ? n.material = new _e() : (n.material = new rn(), n.material.flatShading = !0);
        t === ae && (n.material.map = r.map, n.material.color.set(r.color));
      } else
        n.material = r;
    });
  }
  _onLoadModel(e, t) {
    t[Ft] = performance.now(), e.traverse((s) => {
      const n = s.material;
      n && (s[Ys] = n);
    }), this._updateMaterial(e);
  }
  _onDisposeModel(e) {
    const t = e.engineData;
    t != null && t.boxHelperGroup && (t.boxHelperGroup.traverse((s) => {
      s.geometry && (s.geometry.dispose(), s.material.dispose());
    }), delete t.boxHelperGroup), t != null && t.sphereHelper && (t.sphereHelper.traverse((s) => {
      s.geometry && (s.geometry.dispose(), s.material.dispose());
    }), delete t.sphereHelper), t != null && t.regionHelper && (t.regionHelper.traverse((s) => {
      s.geometry && (s.geometry.dispose(), s.material.dispose());
    }), delete t.regionHelper);
  }
  dispose() {
    var t, s, n;
    const e = this.tiles;
    e.removeEventListener("load-tileset", this._onLoadTilesetCB), e.removeEventListener("load-model", this._onLoadModelCB), e.removeEventListener("dispose-model", this._onDisposeModelCB), e.removeEventListener("update-after", this._onUpdateAfterCB), e.removeEventListener("tile-visibility-change", this._onTileVisibilityChangeCB), this.colorMode = ae, this.boundsColorMode = ae, this.unlit = !1, e.forEachLoadedModel((i) => {
      this._updateMaterial(i);
    }), e.traverse((i) => {
      this._onDisposeModel(i);
    }, null, !1), (t = this.boxGroup) == null || t.removeFromParent(), (s = this.sphereGroup) == null || s.removeFromParent(), (n = this.regionGroup) == null || n.removeFromParent();
  }
}
class Nr extends Ge {
  constructor(e = {}) {
    const { url: t = null, ...s } = e;
    super(s), this.url = t, this.format = null, this.stem = null;
  }
  getUrl(e, t, s) {
    return `${this.stem}_files/${s}/${e}_${t}.${this.format}`;
  }
  init() {
    const { url: e } = this;
    return this.fetchData(e, this.fetchOptions).then((t) => t.text()).then((t) => {
      const s = new DOMParser().parseFromString(t, "text/xml");
      if (s.querySelector("DisplayRects") || s.querySelector("Collection"))
        throw new Error("DeepZoomImagesPlugin: DisplayRect and Collection DZI files not supported.");
      const n = s.querySelector("Image"), i = n.querySelector("Size"), r = parseInt(i.getAttribute("Width")), o = parseInt(i.getAttribute("Height")), l = parseInt(n.getAttribute("TileSize")), c = parseInt(n.getAttribute("Overlap")), u = n.getAttribute("Format");
      this.format = u, this.stem = e.split(/\.[^.]+$/g)[0];
      const { tiling: h } = this, d = Math.ceil(Math.log2(Math.max(r, o))) + 1;
      h.flipY = !0, h.pixelOverlap = c, h.generateLevels(d, 1, 1, {
        tilePixelWidth: l,
        tilePixelHeight: l,
        pixelWidth: r,
        pixelHeight: o
      });
    });
  }
}
class Oo extends xn {
  constructor(e = {}) {
    const { url: t, ...s } = e;
    super(s), this.name = "DZI_TILES_PLUGIN", this.imageSource = new Nr({ url: t });
  }
}
const ut = gn * Math.PI * 2, Zs = /* @__PURE__ */ new re("EPSG:3857");
function Vr(a) {
  return /:4326$/i.test(a);
}
function zn(a) {
  return /:3857$/i.test(a);
}
function Ht(a) {
  return a.trim().split(/\s+/).map((e) => parseFloat(e));
}
function qt(a, e) {
  Vr(e) && ([a[1], a[0]] = [a[0], a[1]]);
}
function ht(a, e) {
  if (zn(e))
    return a[0] = Zs.convertNormalizedToLongitude(0.5 + a[0] / ut), a[1] = Zs.convertNormalizedToLatitude(0.5 + a[1] / ut), a[0] *= _.RAD2DEG, a[1] *= _.RAD2DEG, a;
}
function dt(a) {
  a[0] *= _.DEG2RAD, a[1] *= _.DEG2RAD;
}
class Uo extends yn {
  parse(e) {
    const t = new TextDecoder("utf-8").decode(new Uint8Array(e)), s = new DOMParser().parseFromString(t, "text/xml"), n = s.querySelector("Contents"), i = he(n, "TileMatrixSet").map((l) => qr(l)), r = he(n, "Layer").map((l) => kr(l)), o = Fr(s.querySelector("ServiceIdentification"));
    return r.forEach((l) => {
      l.tileMatrixSets = l.tileMatrixSetLinks.map((c) => i.find((u) => u.identifier === c));
    }), {
      serviceIdentification: o,
      tileMatrixSets: i,
      layers: r
    };
  }
}
function Fr(a) {
  var i;
  const e = a.querySelector("Title").textContent, t = ((i = a.querySelector("Abstract")) == null ? void 0 : i.textContent) || "", s = a.querySelector("ServiceType").textContent, n = a.querySelector("ServiceTypeVersion").textContent;
  return {
    title: e,
    abstract: t,
    serviceType: s,
    serviceTypeVersion: n
  };
}
function kr(a) {
  const e = a.querySelector("Title").textContent, t = a.querySelector("Identifier").textContent, s = a.querySelector("Format").textContent, n = he(a, "ResourceURL").map((c) => Gr(c)), i = he(a, "TileMatrixSetLink").map((c) => he(c, "TileMatrixSet")[0].textContent), r = he(a, "Style").map((c) => Hr(c)), o = he(a, "Dimension").map((c) => zr(c));
  let l = Js(a.querySelector("WGS84BoundingBox"));
  return l || (l = Js(a.querySelector("BoundingBox"))), {
    title: e,
    identifier: t,
    format: s,
    dimensions: o,
    tileMatrixSetLinks: i,
    styles: r,
    boundingBox: l,
    resourceUrls: n
  };
}
function Gr(a) {
  const e = a.getAttribute("template"), t = a.getAttribute("format"), s = a.getAttribute("resourceType");
  return {
    template: e,
    format: t,
    resourceType: s
  };
}
function zr(a) {
  var r, o;
  const e = a.querySelector("Identifier").textContent, t = ((r = a.querySelector("UOM")) == null ? void 0 : r.textContent) || "", s = a.querySelector("Default").textContent, n = ((o = a.querySelector("Current")) == null ? void 0 : o.textContent) === "true", i = he(a, "Value").map((l) => l.textContent);
  return {
    identifier: e,
    uom: t,
    defaultValue: s,
    current: n,
    values: i
  };
}
function Js(a) {
  if (!a)
    return null;
  const e = a.nodeName.endsWith("WGS84BoundingBox") ? "urn:ogc:def:crs:CRS::84" : a.getAttribute("crs"), t = Ht(a.querySelector("LowerCorner").textContent), s = Ht(a.querySelector("UpperCorner").textContent);
  return qt(t, e), qt(s, e), ht(t, e), ht(s, e), dt(t), dt(s), {
    crs: e,
    lowerCorner: t,
    upperCorner: s,
    bounds: [...t, ...s]
  };
}
function Hr(a) {
  var n;
  const e = ((n = a.querySelector("Title")) == null ? void 0 : n.textContent) || null, t = a.querySelector("Identifier").textContent, s = a.getAttribute("isDefault") === "true";
  return {
    title: e,
    identifier: t,
    isDefault: s
  };
}
function qr(a) {
  var r, o;
  const e = a.querySelector("SupportedCRS").textContent, t = ((r = a.querySelector("Title")) == null ? void 0 : r.textContent) || "", s = a.querySelector("Identifier").textContent, n = ((o = a.querySelector("Abstract")) == null ? void 0 : o.textContent) || "", i = [];
  return a.querySelectorAll("TileMatrix").forEach((l, c) => {
    const u = Wr(l), h = 28e-5 * u.scaleDenominator, d = u.tileWidth * u.matrixWidth * h, m = u.tileHeight * u.matrixHeight * h;
    let f;
    qt(u.topLeftCorner, e), zn(e) ? f = [
      u.topLeftCorner[0] + d,
      u.topLeftCorner[1] - m
    ] : f = [
      u.topLeftCorner[0] + 360 * d / ut,
      u.topLeftCorner[1] - 360 * m / ut
    ], ht(f, e), ht(u.topLeftCorner, e), dt(f), dt(u.topLeftCorner), u.bounds = [...u.topLeftCorner, ...f], [u.bounds[1], u.bounds[3]] = [u.bounds[3], u.bounds[1]], i.push(u);
  }), {
    title: t,
    identifier: s,
    abstract: n,
    supportedCRS: e,
    tileMatrices: i
  };
}
function Wr(a) {
  const e = a.querySelector("Identifier").textContent, t = parseFloat(a.querySelector("TileWidth").textContent), s = parseFloat(a.querySelector("TileHeight").textContent), n = parseFloat(a.querySelector("MatrixWidth").textContent), i = parseFloat(a.querySelector("MatrixHeight").textContent), r = parseFloat(a.querySelector("ScaleDenominator").textContent), o = Ht(a.querySelector("TopLeftCorner").textContent);
  return {
    identifier: e,
    tileWidth: t,
    tileHeight: s,
    matrixWidth: n,
    matrixHeight: i,
    scaleDenominator: r,
    topLeftCorner: o,
    bounds: null
  };
}
function he(a, e) {
  return [...a.children].filter((t) => t.tagName === e);
}
const Ks = gn * Math.PI * 2, en = /* @__PURE__ */ new re("EPSG:3857");
function jr(a) {
  return /:4326$/i.test(a);
}
function Xr(a) {
  return /:3857$/i.test(a);
}
function tn(a, e) {
  return Xr(e) && (a[0] = en.convertNormalizedToLongitude(0.5 + a[0] / (Math.PI * 2 * Ks)), a[1] = en.convertNormalizedToLatitude(0.5 + a[1] / (Math.PI * 2 * Ks)), a[0] *= _.RAD2DEG, a[1] *= _.RAD2DEG), a;
}
function sn(a, e, t) {
  const [s, n] = t.split(".").map((r) => parseInt(r)), i = s === 1 && n < 3 || s < 1;
  jr(e) && i && ([a[0], a[1]] = [a[1], a[0]]);
}
function ve(a) {
  a[0] *= _.DEG2RAD, a[1] *= _.DEG2RAD;
}
function Yr(a, e) {
  if (!a)
    return null;
  const t = a.getAttribute("CRS") || a.getAttribute("crs") || a.getAttribute("SRS") || "", s = parseFloat(a.getAttribute("minx")), n = parseFloat(a.getAttribute("miny")), i = parseFloat(a.getAttribute("maxx")), r = parseFloat(a.getAttribute("maxy")), o = [s, n], l = [i, r];
  return sn(o, t, e), sn(l, t, e), tn(o, t), tn(l, t), ve(o), ve(l), { crs: t, bounds: [...o, ...l] };
}
function $r(a) {
  const e = parseFloat(a.querySelector("westBoundLongitude").textContent), t = parseFloat(a.querySelector("eastBoundLongitude").textContent), s = parseFloat(a.querySelector("southBoundLatitude").textContent), n = parseFloat(a.querySelector("northBoundLatitude").textContent), i = [e, s], r = [t, n];
  return ve(i), ve(r), [...i, ...r];
}
function Qr(a) {
  const e = parseFloat(a.getAttribute("minx").textContent), t = parseFloat(a.getAttribute("maxx").textContent), s = parseFloat(a.getAttribute("miny").textContent), n = parseFloat(a.getAttribute("maxy").textContent), i = [e, s], r = [t, n];
  return ve(i), ve(r), [...i, ...r];
}
function Zr(a) {
  const e = a.querySelector("Name").textContent, t = a.querySelector("Title").textContent, s = [...a.querySelectorAll("LegendURL")].map((n) => {
    const i = parseInt(n.getAttribute("width")), r = parseInt(n.getAttribute("height")), o = n.querySelector("Format").textContent, l = n.querySelector("OnlineResource"), c = Wt(l);
    return {
      width: i,
      height: r,
      format: o,
      url: c
    };
  });
  return {
    name: e,
    title: t,
    legends: s
  };
}
function Hn(a, e, t = {}) {
  var p, g, y;
  let {
    styles: s = [],
    crs: n = [],
    contentBoundingBox: i = null,
    queryable: r = !1,
    opaque: o = !1
  } = t;
  const l = ((p = a.querySelector(":scope > Name")) == null ? void 0 : p.textContent) || null, c = ((g = a.querySelector(":scope > Title")) == null ? void 0 : g.textContent) || "", u = ((y = a.querySelector(":scope > Abstract")) == null ? void 0 : y.textContent) || "", h = [...a.querySelectorAll(":scope > Keyword")].map((x) => x.textContent), m = [...a.querySelectorAll(":scope > BoundingBox")].map((x) => Yr(x, e));
  n = [
    ...n,
    ...Array.from(a.querySelectorAll("CRS")).map((x) => x.textContent)
  ], s = [
    ...s,
    ...Array.from(a.querySelectorAll(":scope > Style")).map((x) => Zr(x))
  ], a.hasAttribute("queryable") && (r = a.getAttribute("queryable") === "1"), a.hasAttribute("opaque") && (o = a.getAttribute("opaque") === "1"), a.querySelector("EX_GeographicBoundingBox") ? i = $r(a.querySelector("EX_GeographicBoundingBox")) : a.querySelector("LatLonBoundingBox") && (i = Qr(a.querySelector("LatLonBoundingBox")));
  const f = Array.from(a.querySelectorAll(":scope > Layer")).map((x) => Hn(x, e, {
    // add
    styles: s,
    crs: n,
    // replace
    contentBoundingBox: i,
    queryable: r,
    opaque: o
  }));
  return {
    name: l,
    title: c,
    abstract: u,
    queryable: r,
    opaque: o,
    keywords: h,
    crs: n,
    boundingBoxes: m,
    contentBoundingBox: i,
    styles: s,
    subLayers: f
  };
}
function Jr(a) {
  var e, t, s;
  return {
    name: ((e = a.querySelector("Name")) == null ? void 0 : e.textContent) || "",
    title: ((t = a.querySelector("Title")) == null ? void 0 : t.textContent) || "",
    abstract: ((s = a.querySelector("Abstract")) == null ? void 0 : s.textContent) || "",
    keywords: Array.from(a.querySelectorAll("Keyword")).map((n) => n.textContent),
    maxWidth: parseFloat(a.querySelector("MaxWidth")) || null,
    maxHeight: parseFloat(a.querySelector("MaxHeight")) || null,
    layerLimit: parseFloat(a.querySelector("LayerLimit")) || null
  };
}
function Wt(a) {
  return a ? (a.getAttribute("xlink:href") || a.getAttributeNS("http://www.w3.org/1999/xlink", "href") || "").trim() : "";
}
function Kr(a) {
  const e = Array.from(a.querySelectorAll("Format")).map((s) => s.textContent.trim()), t = Array.from(a.querySelectorAll("DCPType")).map((s) => {
    const n = s.querySelector("HTTP"), i = n.querySelector("Get OnlineResource") || n.querySelector("Get > OnlineResource") || n.querySelector("Get"), r = n.querySelector("Post OnlineResource") || n.querySelector("Post > OnlineResource") || n.querySelector("Post"), o = Wt(i), l = Wt(r);
    return { type: "HTTP", get: o, post: l };
  });
  return { formats: e, dcp: t, href: t[0].get };
}
function eo(a) {
  const e = {};
  return Array.from(a.querySelectorAll(":scope > *")).forEach((t) => {
    const s = t.localName;
    e[s] = Kr(t);
  }), e;
}
function qn(a, e = []) {
  return a.forEach((t) => {
    t.name !== null && e.push(t), qn(t.subLayers, e);
  }), e;
}
class No extends yn {
  parse(e) {
    const t = new TextDecoder("utf-8").decode(new Uint8Array(e)), s = new DOMParser().parseFromString(t, "text/xml"), i = (s.querySelector("WMS_Capabilities") || s.querySelector("WMT_MS_Capabilities")).getAttribute("version"), r = s.querySelector("Capability"), o = Jr(s.querySelector(":scope > Service")), l = eo(r.querySelector(":scope > Request")), c = Array.from(r.querySelectorAll(":scope > Layer")).map((h) => Hn(h, i)), u = qn(c);
    return { version: i, service: o, layers: u, request: l };
  }
}
export {
  Kt as B,
  ho as C,
  Bo as D,
  cr as G,
  So as I,
  wo as L,
  ar as M,
  Do as O,
  zi as Q,
  Ro as R,
  Po as S,
  vo as T,
  xo as U,
  No as W,
  Mo as X,
  bo as a,
  Lo as b,
  Oo as c,
  go as d,
  lr as e,
  rr as f,
  Co as g,
  Eo as h,
  yo as i,
  vs as j,
  Pi as k,
  mo as l,
  _o as m,
  To as n,
  fo as o,
  Ao as p,
  uo as q,
  Uo as r,
  Io as s,
  co as t,
  lo as u
};
//# sourceMappingURL=WMSCapabilitiesLoader-X7r6Cf4e.js.map
