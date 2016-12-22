/**
 * @file sso/firefox/modules/punycode.js
*/

var EXPORTED_SYMBOLS = [ "g_punycodecache", "punycode" ];


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/punycode.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/punycodec.js");

