export function deviceAppearsMobileLike() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  let coarsePointer = false;
  if (window.matchMedia) {
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    if (coarseQuery && coarseQuery.matches) {
      coarsePointer = true;
    }
  }

  const touchPoints = navigator.maxTouchPoints;
  const hasTouch = typeof touchPoints === "number" && touchPoints > 0;

  return coarsePointer || hasTouch;
}

export function viewportIsPortrait() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia) {
    const portraitQuery = window.matchMedia("(orientation: portrait)");
    if (portraitQuery && portraitQuery.matches) {
      return true;
    }
  }

  return window.innerHeight > window.innerWidth;
}

export function shouldShowRotateToLandscapePrompt() {
  if (!deviceAppearsMobileLike()) {
    return false;
  }

  if (!viewportIsPortrait()) {
    return false;
  }

  return true;
}

export function installViewportLayoutListener(windowObject, callback) {
  if (
    typeof windowObject === "undefined" ||
    windowObject === null ||
    typeof callback !== "function"
  ) {
    return function noopUnsubscribe() {};
  }

  const run = function () {
    callback();
  };

  windowObject.addEventListener("resize", run);

  windowObject.addEventListener("orientationchange", run);

  let orientationMedia = null;
  if (windowObject.matchMedia) {
    orientationMedia = windowObject.matchMedia("(orientation: portrait)");
    if (orientationMedia && typeof orientationMedia.addEventListener === "function") {
      orientationMedia.addEventListener("change", run);
    } else if (orientationMedia && typeof orientationMedia.addListener === "function") {
      orientationMedia.addListener(run);
    }
  }

  return function unsubscribe() {
    windowObject.removeEventListener("resize", run);
    windowObject.removeEventListener("orientationchange", run);
    if (orientationMedia) {
      if (typeof orientationMedia.removeEventListener === "function") {
        orientationMedia.removeEventListener("change", run);
      } else if (typeof orientationMedia.removeListener === "function") {
        orientationMedia.removeListener(run);
      }
    }
  };
}

export function updateContextMobileViewportHints(context) {
  if (!context || typeof context !== "object") {
    return;
  }

  context.mobileViewportHints = {
    deviceAppearsMobileLike: deviceAppearsMobileLike(),
    viewportIsPortrait: viewportIsPortrait(),
    shouldShowRotateToLandscapePrompt: shouldShowRotateToLandscapePrompt(),
  };
}
