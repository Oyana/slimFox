/**
 *@file sso/firefox/modules/asn1.js
 */

var EXPORTED_SYMBOLS = [ "Stream", "ASN1" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// shrunk version
loader.loadSubScript("resource://lastpass/shared/asn1c.js");

// debug version
//loader.loadSubScript("resource://lastpass/shared/asn1.js");

