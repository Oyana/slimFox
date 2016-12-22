/**
 * @file sso/js/rsacat.js
 *
 * have to concat rsa.js, rsa2.js, rsa3.js
 *
*/


var EXPORTED_SYMBOLS = [
  "parseBigInt", "linebrk", "byte2Hex", "pkcs1pad2", "RSAKey", "RSASetPublic", "RSADoPublic", "RSAEncrypt" ,
  "pkcs1unpad2", "RSASetPrivate", "RSASetPrivateEx", "RSAGenerate", "RSADoPrivate", "RSADecrypt" ,
  "parse_public_key", "parse_private_key", "encode_length", "encode_integer",
  "encode_sequence", "encode_octet_string", "encode_bit_string",
  "encode_public_key", "encode_private_key", "oaeppad", "oaepunpad",
  "SHA1", "MGF", "I2OSP", "XOR", "string_to_array", "generate_key",
  "finish_generating_key", "generate_prime", "first_prime", "verify_prime",
  "get_sieve"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import('resource://lastpass/jsbn.js');
Cu.import('resource://lastpass/jsbn2.js');
Cu.import('resource://lastpass/rng.js');
Cu.import('resource://lastpass/hex.js');
Cu.import('resource://lastpass/asn1.js');

Cu.import('resource://lastpass/console.js');

var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

// debug
//loader.loadSubScript("resource://lastpass/shared/rsacat.js");
// compressed
loader.loadSubScript("resource://lastpass/shared/rsacatc.js");

//console_log('RSACAT');
