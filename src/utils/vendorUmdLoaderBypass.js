export function suspendAmdForUmdScript() {
  const defineFunction = typeof define === "function" ? define : null;
  const previousAmdProperty = defineFunction ? defineFunction.amd : undefined;

  if (defineFunction && previousAmdProperty) {
    defineFunction.amd = undefined;
  }

  return function resumeAmdForUmdScript() {
    if (defineFunction && previousAmdProperty !== undefined) {
      defineFunction.amd = previousAmdProperty;
    }
  };
}
