/**
 * @file sso/firefox/modules/hex.js
 */

var EXPORTED_SYMBOLS = ["Hex" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

//compressed
loader.loadSubScript("resource://lastpass/shared/hexc.js");

// debug
//loader.loadSubScript("resource://lastpass/shared/hex.js");

