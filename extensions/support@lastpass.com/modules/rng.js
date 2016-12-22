/**
 * @file rng.js
 *
 * Random number generator - requires a PRNG backend, e.g. prng4.js
*/

var EXPORTED_SYMBOLS = ["rng_state", "rng_pool", "rng_pptr", "rng_seed_int",
  "rng_seed_time", "rng_get_byte", "rng_get_bytes", "SecureRandom", "get_random"];


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import('resource://lastpass/prng4.js');

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

//debug
//loader.loadSubScript("resource://lastpass/shared/rng.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/rngc.js");
