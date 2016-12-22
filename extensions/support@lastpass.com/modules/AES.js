/**
 * @file sso/firefox/modules/aes.js
 */

var EXPORTED_SYMBOLS= [ "LPAES" , "atob", "btoa" ];

// defines atob and btoa if not defined already
//
// relies on LP object



var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/AES.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/AESc.js");

