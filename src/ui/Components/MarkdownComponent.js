import { UIDiv } from "./../../../drawUI/ui.js";

import Paths from "../../utils/paths.js";

import { suspendAmdForUmdScript } from "../../utils/vendorUmdLoaderBypass.js";

const SHOWDOWN_OPTIONS = {
  tables: true,
  tasklists: true,
  strikethrough: true,
  ghCodeBlocks: true,
  simplifiedAutoLink: true,
  openLinksInNewWindow: true,
  emoji: true,
  underline: true,
  ghCompatibleHeaderId: true,
  parseImgDimensions: true,
  headerLevelStart: 1,
};

let _converter = null;
let _vendorLoaded = false;

function loadShowdown() {
  if (_vendorLoaded) return;

  const src = Paths.vendor('showdown/showdown.min.js');
  const resumeAmd = suspendAmdForUmdScript();

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', src, false);
    xhr.send();

    if (xhr.status === 200) {
      // Indirect eval runs in global scope so the UMD factory receives `window`
      // as its root and correctly sets window.showdown (direct eval would have
      // `this === undefined` inside a webpack module in strict mode).
      // eslint-disable-next-line no-eval
      (0, eval)(xhr.responseText);
    } else {
      console.error('[MarkdownComponent] Failed to load showdown from vendor:', src, xhr.status);
    }
  } finally {
    resumeAmd();
  }

  _vendorLoaded = true;
}

function getConverter() {
  if (_converter) return _converter;

  // If the user already loaded showdown via a script tag, use it directly.
  if (typeof showdown !== 'undefined') {
    _converter = new showdown.Converter(SHOWDOWN_OPTIONS);
    return _converter;
  }

  // Otherwise load from vendor bundle.
  loadShowdown();

  if (typeof showdown !== 'undefined') {
    _converter = new showdown.Converter(SHOWDOWN_OPTIONS);
    return _converter;
  }

  return null;
}

/**
 * Convert markdown to HTML using Showdown, auto-loading it from vendor if needed.
 * @param {string} markdown - The markdown text to convert.
 * @returns {{ html: string, codes: [] }}
 */
export function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return { html: '', codes: [] };

  const converter = getConverter();

  if (!converter) {
    console.warn('[MarkdownComponent] Showdown unavailable; returning raw text.');
    return { html: `<pre>${markdown}</pre>`, codes: [] };
  }

  return { html: converter.makeHtml(markdown), codes: [] };
}

/**
 * A UIDiv subclass that renders Markdown content via Showdown.
 * Showdown is loaded from the configured vendor base URL on first use.
 *
 * @example
 * const md = new MarkdownComponent('# Hello\n**world**');
 * container.appendChild(md.dom);
 */
export class MarkdownComponent extends UIDiv {
  constructor(text = '', options = {}) {
    super();

    this._options = options;

    this.addClass('Markdown');

    if (text) {
      this.setMarkdown(text);
    }
  }

  /**
   * Render new markdown text into this component.
   * @param {string} text - Markdown string.
   */
  setMarkdown(text) {
    const { html } = markdownToHtml(text);

    this.setInnerHTML(html);

    if (typeof hljs !== 'undefined') {
      this.dom.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }
}
