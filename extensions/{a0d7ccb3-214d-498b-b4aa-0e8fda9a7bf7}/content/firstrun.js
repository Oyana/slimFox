/*
	firstrun.js
	Copyright © 2007-2012  WOT Services Oy <info@mywot.com>

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

var wot_firstrun =
{
	opentab: function(version, url)
	{
		try {
			if (Number(wot_prefs.firstrun_guide) >= version) {
				return true;
			}

			if (!wot_prefs.setChar("firstrun_guide", WOT_FIRSTRUN_CURRENT)) {
				return false;
			}

			wot_prefs.flush();

			window.setTimeout(function() {
					var browser = getBrowser();
					if (browser && url) {
						browser.selectedTab = browser.addTab(url);
					}
				}, 500);
		} catch (e) {
			dump("wot_firstrun.opentab: failed with " + e + "\n");
		}

		return false;
	},

	load_delayed: function() {
		try {
			if (!wot_api_register.ready) {
				window.setTimeout(function() {
					wot_firstrun.load_delayed();
				}, 500);

				return;
			}

			var tab = "welcome";
			var partner = wot_partner.getpartner();

			if (partner) {
				tab = partner + "/" + tab;
			}

			if (this.opentab(WOT_FIRSTRUN_WELCOME, wot_url.getprefurl(tab))) {

				// not a first time launch, but...
				// check whether the date of first time is set, otherwise set it to 2 weeks ago date
				if (!wot_prefs.getChar("firstrun_time", "")) {
					var d = new Date();
					var past_date = new Date(d.getFullYear(), d.getMonth(), d.getDay() - 14);
					wot_prefs.setChar("firstrun_time", past_date);
				}

                var update_url = [ WOT_MY_URL.replace(/^(.+)\/$/,"$1"), WOT_UPDATE_PATH,
                                  wot_util.getstring("lang"), WOT_PLATFORM, WOT_VERSION ].join("/");
                this.opentab(WOT_FIRSTRUN_CURRENT, update_url);

			} else {
				// the add-on is launched first time
				// remember the date/time of the first launch
				wot_prefs.setChar("firstrun_time", new Date());
			}
		} catch (e) {
			dump("wot_firstrun.load: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_firstrun", obj: wot_firstrun });
