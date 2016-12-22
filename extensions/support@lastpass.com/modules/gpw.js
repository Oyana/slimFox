/**
 * @file sso/firefox/modules/gpw.js
*/

var EXPORTED_SYMBOLS = [ "GPW" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


Cu.import('resource://lastpass/rng.js');

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/gpw.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/gpwc.js");

