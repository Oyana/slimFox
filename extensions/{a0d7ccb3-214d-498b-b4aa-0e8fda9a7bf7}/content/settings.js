/*
	settings.js
	Copyright © 2007, 2008, 2009  WOT Services Oy <info@mywot.com>

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

var wot_settings =
{
	disallowed: {
		"witness_key": true
	},

	load_delayed: function()
	{
		try {
			if (this.browser) {
				return;
			}

			/* Hook up event handlers */
			this.browser = document.getElementById("appcontent");

			if (this.browser) {
				this.browser.addEventListener("DOMContentLoaded",
					wot_settings.onload, false);
			}
		} catch (e) {
			dump("wot_settings.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.browser) {
				this.browser.removeEventListener("DOMContentLoaded",
					wot_settings.onload, false);
				this.browser = null;
			}
		} catch (e) {
			dump("wot_settings.unload: failed with " + e + "\n");
		}
	},

	onload: function(event)
	{
		try {
			if (!event) {
				return;
			}

			var content = event.originalTarget;

			if (!content || !content.location || !content.location.href ||
					!WOT_PREF_TRIGGER.test(content.location.href)) {
				return;
			}

			if (!wot_settings.loadinputs(content) ||
				!wot_settings.loadsearch(content)) {
				return;
			}

			var saveids = [ "wotsave", "wotnext" ];

			for (var i = 0; i < saveids.length; ++i) {
				var save = content.getElementById(saveids[i]);

				if (!save) {
					continue;
				}

				save.addEventListener("click", function(e) {
							wot_settings.onsave(content, e);
						}, false);
			}

			var level = content.getElementById("wotlevel");

			if (level) {
				if (wot_crypto.islevel("registered")) {
					level.setAttribute("level", "registered");
				}
				/* Other levels? */
			}

			wot_settings.addscript(content, "wotsettings_ready();");
		} catch (e) {
			dump("wot_settings.onload: failed with " + e + "\n");
		}
	},

	onsave: function(content, event)
	{
		try {
			var save = content.getElementById("wotsave");

			if (save) {
				var saveclass = save.getAttribute("class");

				if (saveclass && saveclass.indexOf("disabled") >= 0) {
					return;
				}
			}

			var inputs = content.getElementsByTagName("input");

			for (var i = 0; i < inputs.length; ++i) {
                try {
                    var preftype = inputs[i].getAttribute("wotpref"),
                        id = inputs[i].getAttribute("id"),
                        type = inputs[i].getAttribute("type");

                    if (!preftype || !id || !type) continue;

                    if ((type == "checkbox" || type == "radio") &&
                            preftype == "bool") {
                        if (!wot_prefs.setBool(id, inputs[i].checked)) {
                            wot_tools.wdump("wot_settings.onsave: setBool failed for " + id);
                        }
                    } else {
                        var value = inputs[i].getAttribute("value");

                        if (!value) {
                            if (preftype == "string") {
                                value = "";
                            } else {
                                wot_tools.wdump("wot_settings.onsave: no value for " + id);
                                continue;
                            }
                        }

                        if (preftype == "bool") {
                            if (!wot_prefs.setBool(id, (value == "true" || value == "1"))) {
                                wot_tools.wdump("wot_settings.onsave: setBool failed for " + id);
                            }
                        } else if (preftype == "int") {
                            if (!wot_prefs.setInt(id, Number(value))) {
                                wot_tools.wdump("wot_settings.onsave: setInt failed for " + id + " and value " + value);
                            }
                        } else if (preftype == "string") {
                            if (!wot_prefs.setChar(id, value)) {
                                wot_tools.wdump("wot_settings.onsave: setChar failed for " + id);
                            }
                        }
                    }
                } catch (e) {
                    wot_tools.wdump("wot_settings.onsave(): failed for " + id + " with " + e);
                }
			}
			wot_prefs.flush();
			wot_settings.addscript(content, "wotsettings_saved();");
			return;
		} catch (e) {
			wot_tools.wdump("wot_settings.onsave: failed with " + e);
		}

		try {
			wot_settings.addscript(content, "wotsettings_failed();");
		} catch (e) {
			wot_tools.wdump("wot_settings.onsave: failed with " + e);
		}
	},

	addscript: function(content, js)
	{
		try {
			var script = content.createElement("script");

			script.setAttribute("type", "text/javascript");
			var text_node = content.createTextNode(js);
			script.appendChild(text_node);

			var body = content.getElementsByTagName("body");

			if (body && body.length > 0) {
				body[0].appendChild(script);
			}
		} catch (e) {
			dump("wot_settings.addscript: failed with " + e + "\n");
		}
	},

	loadinputs: function(content) {
		try {
			var inputs = content.getElementsByTagName("input");

			for (var i = 0; i < inputs.length; ++i) {
				var preftype = inputs[i].getAttribute("wotpref"),
                    id, value, type;

				if (!preftype) continue;

				id = inputs[i].getAttribute("id");
				if (!id || this.disallowed[id]) continue;

				type = inputs[i].getAttribute("type");
				if (!type) continue;

				value = null;

				if (preftype == "bool") {
					value = wot_prefs.getBool(id, null);
				} else if (preftype == "int") {
					value = wot_prefs.getInt(id, null);
				} else if (preftype == "string") {
					value = wot_prefs.getChar(id, null);
				} else {
					wot_tools.wdump("wot_settings.loadinputs: invalid preftype " + preftype);
					continue;
				}

				if (value == null) continue;

				if ((type == "checkbox" || type == "radio") && preftype == "bool") {
					inputs[i].checked = value;
				} else {
					inputs[i].setAttribute("value", value.toString());
				}
			}
			return true;

		} catch (e) {
			dump("wot_settings.loadinputs: failed with " + e + "\n");
		}
		return false;
	},

	loadsearch: function(content) {
		try {
			var search = content.getElementById("search-services");

			if (!search) return true;

			var rules = [],
			j = 0,
            i = 0;

			for (i in wot_search.rules) {
				if (!wot_search.rules[i].display ||
					!wot_search.rules[i].display.length) {
					continue;
				}
				rules[j++] = wot_search.rules[i].display;
			}
			rules.sort();

            var search_rules = [];

			for (j = 0; j < rules.length; ++j) {
				for (i in wot_search.rules) {
                    var item = wot_search.rules[i];
					if (item.display != rules[j]) {
						continue;
					}

					var id = WOT_SEARCH + "." + item.rule + ".enabled";

                    search_rules.push({
                        id: id,
                        display: item.display,
                        name: item.rule,
                        state: item.enabled === undefined ? true : item.enabled
                    });
				}
			}

//            wot_tools.wdump(JSON.stringify(search_rules));
            wot_settings.addscript(content, "build_search_rules('"+JSON.stringify(search_rules)+"')");
			return true;
		} catch (e) {
			wot_tools.wdump("wot_settings.loadsearch: failed with " + e);
		}
		return false;
	}

};

wot_modules.push({ name: "wot_settings", obj: wot_settings });
