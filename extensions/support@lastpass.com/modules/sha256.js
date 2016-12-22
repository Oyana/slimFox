/**
 * @file sso/firefox/modules/sha256.js
 */

/*****************************************************************/
//
//Sadly, we cannot load this code as a module because it then becomes
//unable to call into lpxpcom (the binary) to do fast PBKDF2 calculations.
//
//Without the binary speedup, pbkdf2 is dog slow using js in firefox.
//
/*****************************************************************/



/*
var EXPORTED_SYMBOLS= [ "lp_sha2lib", "LPSHA256", "SHA256lib", "lp_pbkdf2" ];



var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

//debug
//loader.loadSubScript("resource://lastpass/shared/sha256.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/sha256c.js");
*/
