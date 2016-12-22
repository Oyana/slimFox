/**
 * @file sso/firefox/modules/detect_timezone.js
 *
*/
var EXPORTED_SYMBOLS = [ "convert", "calculate_time_zone" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/detect_timezone.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/detect_timezonec.js");


