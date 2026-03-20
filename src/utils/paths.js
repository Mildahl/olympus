const defaults = {
  vendorBaseUrl: "/external/vendor",
  dataBaseUrl: "/external/data",
  pythonToolsBaseUrl: "/external/pytools",
  ifcSamplesBaseUrl: "/external/ifc",
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

function pythonTools(subPath = "") {
  const base = get("pythonToolsBaseUrl");
  return subPath ? `${base}/${subPath}` : base;
}

function ifcSamples(subPath = "") {
  const base = get("ifcSamplesBaseUrl");
  return subPath ? `${base}/${subPath}` : base;
}

const Paths = {
  configure,
  get,
  vendor,
  data,
  pythonTools,
  ifcSamples,
};

export default Paths;
