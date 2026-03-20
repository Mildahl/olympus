/*! CodeMirror Addon: python-hint.js (v5.x) */
/* This is a placeholder for the actual python-hint.js file.
   Download the real file from https://codemirror.net/5/addon/hint/python-hint.js
   and replace this content for production use. */
(function(mod){
  if(typeof exports=="object"&&typeof module=="object") mod(require("../../lib/codemirror"));
  else if(typeof define=="function"&&define.amd) define(["../../lib/codemirror"],mod);
  else mod(CodeMirror);
})(function(CodeMirror){
  "use strict";
  // List of Python keywords and built-ins for basic completion
  var PYTHON_KEYWORDS = [
    "and", "as", "assert", "break", "class", "continue", "def", "del", "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while", "with", "yield"
  ];
  var PYTHON_BUILTINS = [
    "abs", "all", "any", "bin", "bool", "bytearray", "bytes", "callable", "chr", "classmethod", "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "filter", "float", "format", "frozenset", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "int", "isinstance", "issubclass", "iter", "len", "list", "locals", "map", "max", "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print", "property", "range", "repr", "reversed", "round", "set", "setattr", "slice", "sorted", "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip"
  ];
  var WORDS = PYTHON_KEYWORDS.concat(PYTHON_BUILTINS);

  function getToken(editor, cur) {
    return editor.getTokenAt(cur);
  }

  CodeMirror.registerHelper("hint", "python", function(editor) {
    var cur = editor.getCursor();
    var token = getToken(editor, cur);
    var start = token.start, end = cur.ch, word = token.string;
    var list = [];
    if (word.trim().length > 0) {
      var seen = {};
      for (var i = 0; i < WORDS.length; i++) {
        if (WORDS[i].lastIndexOf(word, 0) === 0 && !seen[WORDS[i]]) {
          list.push(WORDS[i]);
          seen[WORDS[i]] = true;
        }
      }
      // Also suggest words from the current document
      var docWords = editor.getValue().match(/\b\w+\b/g);
      if (docWords) {
        docWords.forEach(function(w) {
          if (w.lastIndexOf(word, 0) === 0 && !seen[w]) {
            list.push(w);
            seen[w] = true;
          }
        });
      }
    } else {
      list = WORDS.slice();
    }
    return {
      list: list.sort(),
      from: CodeMirror.Pos(cur.line, start),
      to: CodeMirror.Pos(cur.line, end)
    };
  });
});
