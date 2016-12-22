/**
 * @file sso/js/console.js
 *
 * for compat with chrome
 */

var quiet=false;

var EXPORTED_SYMBOLS = [ "console_log", "console_warn", "console_error", "L" ];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);

var g_tsstart =  (new Date()).getTime(); 

function console_log(msg) {
  if (typeof(consoleService) != 'undefined' && !quiet) {
    consoleService.logStringMessage(msg);
  }
}

function console_warn(msg) {
  if (typeof(consoleService) != 'undefined' && !quiet) {
    var scriptError = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
    scriptError.init(msg, null, null, null, null, Ci.nsIScriptError.warningFlag, null);
    consoleService.logMessage(scriptError);
  }
}

function console_error(msg) {
  if (typeof(consoleService) != 'undefined' && !quiet) {
    var scriptError = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
    scriptError.init(msg, null, null, null, null, Ci.nsIScriptError.errorFlag, null);
    consoleService.logMessage(scriptError);
  }
}

function L(s)
{
  console_log(((new Date()).getTime()-g_tsstart)/1000+" : "+s);
}
