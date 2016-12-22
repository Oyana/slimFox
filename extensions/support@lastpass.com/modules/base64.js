/**
 * @file sso/firefox/modules/base64.js
 * based on sso/js/base64.js
 *
*/

var EXPORTED_SYMBOLS = [ "b64map", "b64pad", "hex2b64", "b64toBA", "b64tohex" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/base64.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/base64c.js");

