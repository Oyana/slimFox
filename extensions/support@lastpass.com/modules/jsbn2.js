/**
 * @file sso/firefox/modules/jsbn2.js
*/



var EXPORTED_SYMBOLS = [ "bnClone", "bnIntValue", "bnByteValue",
   "bnShortValue", "bnpChunkSize" , "bnSigNum" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import('resource://lastpass/jsbn.js');

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

//debug
//loader.loadSubScript("resource://lastpass/shared/jsbn2.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/jsbn2c.js");

