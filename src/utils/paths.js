const defaults = {
  vendorBaseUrl: "/vendor",
  dataBaseUrl: "/data",
  ifcSamplesBaseUrl: "/data/ifc",
  pythonToolsBaseUrl: "/dist/pytools",
};

let _settings = null;

function configure(settings) {
  _settings = settings;
}

function get(key) {
  return _settings?.[key] ?? defaults[key];
}

function vendor(subPath = "") {
  const base = get("vendorBaseUrl");
  return subPath ? `${base}/${subPath}` : base;
}

function data(subPath = "") {
  const base = get("dataBaseUrl");
  return subPath ? `${base}/${subPath}` : base;
}

function ifcSamples(subPath = "") {
  const base = get("ifcSamplesBaseUrl");
  return subPath ? `${base}/${subPath}` : base;
}

function pythonTools(subPath = "") {
  const raw = get("pythonToolsBaseUrl");
  const trimmed = String(raw || defaults.pythonToolsBaseUrl).replace(/\/+$/, "");
  const base = `${trimmed}/`;
  return subPath ? `${base}${String(subPath).replace(/^\//, "")}` : base;
}

const Paths = {
  configure,
  get,
  vendor,
  data,
  ifcSamples,
  pythonTools,
};

export default Paths;
