/**
 * @file sso/firefox/modules/jsbn.js
*/

var EXPORTED_SYMBOLS = [ "BigInteger",
  "nbi", "am1", "am2", "am3", "int2char", "intAt", "bnpCopyTo", "bnpFromInt",
  "nbv", "bnpFromString", "bnpClamp", "bnToString", "bnNegate", "bnAbs",
  "bnCompareTo", "nbits", "bnBitLength", "bnpDLShiftTo", "bnpDRShiftTo",
  "bnpLShiftTo", "bnpRShiftTo", "bnpSubTo", "bnpMultiplyTo", "bnpSquareTo",
  "bnpDivRemTo", "bnMod", "Classic", "cConvert", "cRevert", "cReduce",
  "cMulTo", "cSqrTo", "bnpInvDigit", "Montgomery", "montConvert",
  "montRevert", "montReduce", "montSqrTo", "montMulTo", "bnpIsEven",
  "bnpExp", "bnModPowInt" ];


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/jsbn.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/jsbnc.js");

