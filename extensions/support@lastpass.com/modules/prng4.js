/**
 * @file sso/js/prng4.js
 *
 * prng4.js - uses Arcfour as a PRNG
*/

var EXPORTED_SYMBOLS = [ "rng_psize", "Arcfour", "ARC4init", "ARC4next", "prng_newstate" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/prng4.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/prng4c.js");

