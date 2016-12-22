/*
	commands.js
	Copyright © 2005-2011  WOT Services Oy <info@mywot.com>

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

var wot_commands =
{
	load_delayed: function()
	{
		try {
			this.menu = document.getElementById("contentAreaContextMenu");

			if (this.menu) {
				this.menu.addEventListener("popupshowing",
					wot_commands.contextmenushowing, false);
			}
		} catch (e) {
			dump("wot_commands.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.menu) {
				this.menu.removeEventListener("popupshowing",
					wot_commands.contextmenushowing, false);
				this.menu = null;
			}
		} catch (e) {
			dump("wot_commands.unload: failed with " + e + "\n");
		}
	},

	getcontexthostname: function()
	{
		try {
			if (gContextMenu.onLink && gContextMenu.linkURL) {
				return wot_url.gethostname(gContextMenu.linkURL);
			}
		} catch (e) {
			dump("wot_commands.getcontexthostname:: failed with " + e + "\n");
		}

		return null;
	},

	contextmenushowing: function()
	{
		try {
			var hostname = wot_commands.getcontexthostname();
			var r = -1;

			if (hostname) {
				r = wot_search.getreputation(hostname);
			}

			var item = document.getElementById("wot-content-openlinkscorecard");

			if (item) {
				if (r < 0) {
					item.setAttribute("image", "");
				} else {
					item.setAttribute("image", wot_ui.geticonurl(r, 16, true));
				}
			}

			gContextMenu.showItem("wot-content-openlinkscorecard",
				!!hostname);
		} catch (e) {
			dump("wot_commands.contextmenushowing: failed with " + e + "\n");
		}
	},

	/* Determines the elements for which a tooltip should be shown */
	tooltip_update: function(element)
	{
		try {
			return (element == document.getElementById("wot-button") ||
					element == document.getElementById("wot-bar") ||
					element == document.getElementById("wot-bar-image"));
		} catch (e) {
			dump("wot_commands.tooltip_update: failed with " + e + "\n");
		}
		return false;
	},

	update: function(what)
	{
		try {
			if (!what) {
				what = "command";
			}

			/* Enabled? */
			document.getElementById("wot-" + what + "-enabled").
				setAttribute("checked", wot_prefs.enabled);

			var cached = wot_cache.isok(wot_core.hostname);

			/* Refresh */
			document.getElementById("wot-" + what + "-refresh").
				setAttribute("disabled", !wot_util.isenabled() || !cached);

		} catch (e) {
			dump("wot_commands.update: failed with " + e + "\n");
		}
	},

	enabled: function()
	{
		try {
			wot_prefs.enabled = !wot_prefs.enabled;
			wot_prefs.setBool("enabled", wot_prefs.enabled);
			wot_core.update();
		} catch (e) {
			wot_tools.wdump("wot_commands.enabled: failed with " + e);
		}
	},

	refresh: function()
	{
		try {
			if (wot_cache.iscached(wot_core.hostname)) {
				wot_cache.set(wot_core.hostname, "status", WOT_QUERY_RETRY);
				wot_core.update();
			}
		} catch (e) {
			wot_tools.wdump("wot_commands.refresh: failed with " + e);
		}
	},

	preferences: function()
	{
		try {
			getBrowser().loadURI(wot_url.getprefurl());
		} catch (e) {
			dump("wot_commands.preferences: failed with " + e + "\n");
		}
	},

	checkupdates: function()
	{
		try {
			wot_api_update.send(true);
		} catch (e) {
			dump("wot_commands.checkupdates: failed with " + e + "\n");
		}
	},

	my: function()
	{
		try {
			var url = wot_url.getwoturl("", WOT_URL_MENUMY);
			if (url) {
				getBrowser().loadURI(url);
			}
		} catch (e) {
			dump("wot_commands.my: failed with " + e + "\n");
		}
	},

	open_scorecard_link: function()
	{
        // Opens scorecard in a new tab for the URL selected via context menu
		try {
			wot_browser.openscorecard(wot_commands.getcontexthostname(), null, WOT_URL_CTX);
		} catch (e) {
		}
	}
};

wot_modules.push({ name: "wot_commands", obj: wot_commands });

var wot_events =
{
	click_button: function(event)
	{
		try {
			/* Middle-click takes to scorecard */
			if (event.button == 1 && wot_core.hostname) {
				wot_browser.openscorecard(wot_core.hostname, null, WOT_URL_BTN);
			}
		} catch (e) {
			dump("wot_events.click_button: failed with " + e + "\n");
		}
	}
};
