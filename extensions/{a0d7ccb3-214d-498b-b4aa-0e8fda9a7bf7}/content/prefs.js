/*
	prefs.js
	Copyright © 2005-2012  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

/* Observes extension preferences */
var wot_prefs =
{
	load: function()
	{
		try {
			if (this.pref) {
				return;
			}

			this.ps = Components.classes["@mozilla.org/preferences-service;1"].
							getService(Components.interfaces.nsIPrefService);

			this.pref = this.ps.getBranch(null);
			this.pref_default = this.ps.getDefaultBranch(null);

			/* Default values */
			for (var i = 0; i < wot_prefs_bool.length; ++i) {
				this.setDefaultBool(wot_prefs_bool[i][0],
					wot_prefs_bool[i][1]);
				this[wot_prefs_bool[i][0]] = wot_prefs_bool[i][1];
			}

			for (var i = 0; i < wot_prefs_char.length; ++i) {
				this.setDefaultChar(wot_prefs_char[i][0],
					wot_prefs_char[i][1]);
				this[wot_prefs_char[i][0]] = wot_prefs_char[i][1];
			}

			for (var i = 0; i < wot_prefs_int.length; ++i) {
				this.setDefaultInt(wot_prefs_int[i][0],
					wot_prefs_int[i][1]);
				this[wot_prefs_int[i][0]] = wot_prefs_int[i][1];
			}

			/* Add observer */
			this.pbi = this.pref.QueryInterface(
							Components.interfaces.nsIPrefBranch2);
			this.pbi.addObserver(WOT_PREF, this, false);

			this.updateui = false;
		} catch (e) {
			dump("wot_prefs.load: failed with " + e + "\n");
		}
	},

	load_delayed: function()
	{
		try {
			this.sync();
		} catch (e) {
			dump("wot_prefs.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.pbi) {
				this.pbi.removeObserver(WOT_PREF, this);
				this.pbi = null;
			}
			this.pref_default = null;
			this.pref = null;
			this.ps = null;
		} catch (e) {
			dump("wot_prefs.unload: failed with " + e + "\n");
		}
	},

	setupdateui: function()
	{
		try {
			this.updateui = true;
			this.sync();
		} catch (e) {
			dump("wot_prefs.setupdateui: failed with " + e + "\n");
		}
	},

	getBool: function(name, default_value)
	{
		try {
			if (this.pref.getPrefType(WOT_PREF +
					name) == this.pref.PREF_BOOL) {
				return this.pref.getBoolPref(WOT_PREF + name);
			}
		} catch (e) {
			dump("wot_prefs.getBool(" + name + "): failed with " + e + "\n");
		}
		return default_value;
	},

	setBool: function(name, value)
	{
		try {
			this.pref.setBoolPref(WOT_PREF + name, value);
			return true;
		} catch (e) {
			dump("wot_prefs.setBool(" + name + "): failed with " + e + "\n");
		}
		return false;
	},

	setDefaultBool: function(name, value)
	{
		try {
			this.pref_default.setBoolPref(WOT_PREF + name, value);
			return true;
		} catch (e) {
			dump("wot_prefs.setDefaultBool(" + name + "): failed with " +
				e + "\n");
		}
		return false;
	},

	getInt: function(name, default_value)
	{
		try {
			if (this.pref.getPrefType(WOT_PREF +
					name) == this.pref.PREF_INT) {
				return this.pref.getIntPref(WOT_PREF + name);
			}
		} catch (e) {
			dump("wot_prefs.getInt(" + name + "): failed with " + e + "\n");
		}
		return default_value;
	},

	setInt: function(name, value)
	{
		try {
			this.pref.setIntPref(WOT_PREF + name, value);
			return true;
		} catch (e) {
			dump("wot_prefs.setInt(" + name + "): failed with " + e + "\n");
		}
		return false;
	},

	setDefaultInt: function(name, value)
	{
		try {
			this.pref_default.setIntPref(WOT_PREF + name, value);
			return true;
		} catch (e) {
			dump("wot_prefs.setDefaultInt(" + name + "): failed with " +
				e + "\n");
		}
		return false;
	},

	getChar: function(name, default_value, safe_utf8)
	{
		try {
			if (this.pref.getPrefType(WOT_PREF + name) == this.pref.PREF_STRING) {
				var res = this.pref.getCharPref(WOT_PREF + name);

                return safe_utf8 ? wot_util.decode_utf8(res) : res; // decode from utf8
			}
		} catch (e) {
			dump("wot_prefs.getChar(" + name + "): failed with " + e + "\n");
		}
		return default_value;
	},

	setChar: function(name, value, safe_utf8)
	{
		try {
            if (this.pref) {
                value = safe_utf8 ? wot_util.encode_utf8(value) : value; // endode to utf8 if needed
                this.pref.setCharPref(WOT_PREF + name, value);
                return true;
            }
		} catch (e) {
			dump("wot_prefs.setChar(" + name + "): failed with " + e + "\n");
		}
		return false;
	},

	setDefaultChar: function(name, value)
	{
		try {
			this.pref_default.setCharPref(WOT_PREF + name, value);
			return true;
		} catch (e) {
			dump("wot_prefs.setDefaultChar(" + name + "): failed with " +
				e + "\n");
		}
		return false;
	},

    getJSON: function (name, default_value) {
        try {
            var json = this.getChar(name, null, false);
            return json ? JSON.parse(wot_util.utf8_to_unicode(json)) : default_value;
        } catch (e) {
            wot_tools.wdump("wot_prefs.getJSON(" + name + "): failed with " + e);
            return default_value;
        }
    },

    setJSON: function (name, obj) {
        try {
            var json = JSON.stringify(obj);
            return this.setChar(name, wot_util.unicode_to_utf8(json), false);
        } catch (e) {
            wot_tools.wdump("wot_prefs.getJSON(" + name + "): failed with " + e);
            return false;
        }
    },

	clear: function(name)
	{
		try {
			this.pref.clearUserPref(WOT_PREF + name);
		} catch (e) {
			/* dump("wot_prefs.clear(" + name + "): failed with " + e + "\n"); */
		}
	},

	deleteBranch: function(name)
	{
		try {
			this.pref.deleteBranch(WOT_PREF + name.replace(/\.$/, ''));
		} catch (e) {
			dump("wot_prefs.deleteBranch(" + name + "): failed with " + e + "\n");
		}
	},

	flush: function()
	{
		try {
			this.ps.savePrefFile(null);
		} catch (e) {
			dump("wot_prefs.flush: failed with " + e + "\n");
		}
	},

    setSmart: function (name, value) {
        // Looks up through preferences names and call the proper function to set the value of the named preference
        var prefs_sets = [
            [ wot_prefs_char, wot_prefs.setChar ],
            [ wot_prefs_int, wot_prefs.setInt ],
            [ wot_prefs_bool, wot_prefs.setBool ]
        ];

        for (var s = 0; s < prefs_sets.length; s++) {
            var pset = prefs_sets[s][0];
            for (var i = 0; i < pset.length; ++i) {
                if (pset[i][0] === name) {
                    var func = prefs_sets[s][1];
                    func.call(wot_prefs, name, value);
                    return;
                }
            }
        }
    },

	sync: function()
	{
		try {
			var was_enabled = this.enabled;

			for (var i = 0; i < wot_prefs_bool.length; ++i) {
				this[wot_prefs_bool[i][0]] =
					this.getBool(wot_prefs_bool[i][0], wot_prefs_bool[i][1]);
			}

			for (var i = 0; i < wot_prefs_char.length; ++i) {
				this[wot_prefs_char[i][0]] =
					this.getChar(wot_prefs_char[i][0], wot_prefs_char[i][1]);
			}

			for (var i = 0; i < wot_prefs_int.length; ++i) {
				this[wot_prefs_int[i][0]] =
					this.getInt(wot_prefs_int[i][0], wot_prefs_int[i][1]);
			}

			/* Do stuff */
			if (this.updateui) {
				wot_ui.update();

				if (was_enabled != this.enabled) {
					wot_core.update();
				}

				if (this.install_search) {
					wot_browser.installsearch();
				}

				/* Always use prefetching when blocking is enabled */
				if (wot_warning.isblocking()) {
					this.prefetch = true;
				}
			}
		} catch (e) {
			dump("wot_prefs.sync: failed with " + e + "\n");
		}
	},

	observe: function(subject, topic, state)
	{
		try {
			if (topic == "nsPref:changed") {
				this.sync();
			}
		} catch (e) {
			dump("wot_prefs.observe: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_prefs", obj: wot_prefs });
