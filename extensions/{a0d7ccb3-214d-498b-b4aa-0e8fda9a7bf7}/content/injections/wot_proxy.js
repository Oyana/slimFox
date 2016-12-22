/*
	wot_proxy.js
	Copyright © 2012 - 2013  WOT Services Oy <info@mywot.com>

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

/* -- This is imitation of wot object which is in the Chrome version of the addon.
*  The reason why we use it like this, is to reuse same code without changes between browsers.
*  wot_proxy helps with it by providing the same interface of wot object but using config.js values.
* */

"use strict";

var wot = {
	version: "20150420",    // TODO: init this value from the add-on core code
	platform: "firefox",
	debug: false,           // when changing this, don't forget to switch ga_id value also!
	default_component: 0,
	enable_surveys: true,   // Feedback loop engine

	ga_id: "UA-2412412-8", // test: UA-35564069-1 , live: UA-2412412-8

	// environment (browser, etc)
	env: {
		is_mailru: false,
		is_yandex: false,
		is_rambler: false
	},

	components: [
		{ name: 0 },
		{ name: 1 },
		{ name: 2 },
		{ name: 4 }
	],

	reputationlevels: [
		{ name: "rx", min: -2 },
		{ name: "r0", min: -1 },
		{ name: "r1", min:  0 },
		{ name: "r2", min: 20 },
		{ name: "r3", min: 40 },
		{ name: "r4", min: 60 },
		{ name: "r5", min: 80 }
	],

	confidencelevels: [
		{ name: "cx", min: -2 },
		{ name: "c0", min: -1 },
		{ name: "c1", min: 6 },
		{ name: "c2", min: 12 },
		{ name: "c3", min: 23 },
		{ name: "c4", min: 34 },
		{ name: "c5", min: 45 }
	],

	searchtypes: {
		optimized: 0,
		worst: 1,
		trustworthiness: 2
	},

	warningtypes: { /* bigger value = more severe warning */
		none: 0,
		notification: 1,
		overlay: 2,
		block: 3
	},

	warningreasons: { /* bigger value = more important reason */
		none: 0,
		unknown: 1,
		rating: 2,
		reputation: 3
	},

	urls: {
		base:		"http://www.mywot.com/",
		scorecard:	"http://www.mywot.com/scorecard/",
		settings:	"http://www.mywot.com/settings",
		welcome:	"http://www.mywot.com/settings/welcome",
		setcookies:	"http://www.mywot.com/setcookies.php",
		update:		"http://www.mywot.com/update",

		contexts: {
			rwlogo:     "rw-logo",
			rwsettings: "rw-settings",
			rwguide:    "rw-guide",
			rwviewsc:   "rw-viewsc",
			rwprofile:  "rw-profile",
			rwmsg:      "rw-msg",
			warnviewsc: "warn-viewsc",
			warnrate:   "warn-rate",
			popupviewsc: "popup",
			popupdonuts: "popup-donuts"
		}
	},

	firstrunupdate: 1, /* increase to show a page after an update */

	cachestatus: {
		error:	0,
		ok:		1,
		busy:	2,
		retry:	3,
		link:	4
	},

	expire_warned_after: 20000,  // number of milliseconds after which warned flag will be expired

	// Constants for playing with date & time (in seconds)
	DT: {
		MINUTE: 60,
		HOUR: 3600,
		DAY: 24 * 3600,
		WEEK: 7 * 24 * 3600,
		MONTH: 30 * 24 * 3600
	},

	/* logging */

	log: function (s)
	{
		if (wot.debug) {
			console.log(s);
		}
	},

	/* events */

	events: {},

	bind: function (name, func, params)
	{
	},

	post: function(name, message, data, port)
	{
		try {
			//Call the function from sandbox and make sure data passing from here is safe
			var data_obj = {
				name: name,
				message: message,
				data: data
			};

			wot_post(JSON.stringify(data_obj));

		} catch (e) {
			console.log("Failed to call wot_post()" + e);
		}
	},

	/* i18n */

	/* helpers */

	getuniques: function(list)
	{
		var seen = {};

		return list.filter(function(item) {
					if (seen[item]) {
						return false;
					} else {
						seen[item] = true;
						return true;
					}
				});
	},

	contextedurl: function(url, context)
	{
		var newurl = url;
		newurl += ( (url.indexOf("?") > 0) ? "&" : "?" );
		newurl += "utm_source=addon&utm_content=" + context;
		return newurl;
	},

	detect_environment: function(readonly)
	{
		var readonly = readonly || false;
		// try to understand in which environment we are run
		var user_agent = window.navigator.userAgent || "";
		wot.env.is_mailru = user_agent.indexOf("MRCHROME") >= 0;

		if(wot.env.is_mailru) {
			// set param to label requests
			wot.partner = "mailru";
		}

		if(!readonly) wot.prefs.set("partner", wot.partner);
	},

	time_sincefirstrun: function()
	{
		// gives time (in seconds) spent from very first run of the addon.
		var starttime_str = wot.prefs.get("firstrun:time");
		if (starttime_str) {
			var starttime = new Date(starttime_str);
			return (new Date() - starttime) / 1000;    // in seconds;

		} else {
			return undefined;
		}
	},

	time_since: function(a, b) {

		if (typeof a === "string") {
			a = new Date(a);
		}

		b = b || new Date();

		if (typeof b === "string") {
			b = new Date(b);
		}

		return (b - a) / 1000;  // in seconds
	}
};


wot.utils = {

	get_document: function (frame) {
		frame = frame || window;
		var framed_document = frame.document || frame.contentDocument;
		return framed_document;
	},

	get_or_create_element: function (id, tag, frame) {
		tag = tag || "div";
		var framed_document = wot.utils.get_document(frame);

		var elem = framed_document.getElementById(id);

		if(!elem) {
			elem = framed_document.createElement(tag);
			elem.setAttribute("id", id);
		}

		return elem;
	},

	attach_element: function (element, frame) {
		var framed_document = wot.utils.get_document(frame);

		if(framed_document) {
			var body = framed_document.getElementsByTagName("body");

			if (!element || !body || !body.length) {
				return false;
			}

			return body[0].appendChild(element);
		} else {
			wot.log("Can't get document of frame");
			return false;
		}

	},

	attach_style: function (style_file_or_object, uniq_id, frame) {
		try {
			uniq_id = uniq_id || null;
			var reuse_style = false;

			var framed_document = wot.utils.get_document(frame);

			if(!framed_document) {
				return false;
			}

			if(uniq_id) {
				var el = framed_document.getElementById(uniq_id);
				if(el) {
					// if the element exists already - remove it to update styles
					reuse_style = true;
				}
			}

			var head = framed_document.getElementsByTagName("head");

			if (!head || !head.length) {
				return false;
			}

			var style = reuse_style ? el : framed_document.createElement("style");

			if (!style) {
				return false;
			}

			if(uniq_id) {
				style.setAttribute("id", uniq_id);
			}

			style.setAttribute("type", "text/css");

			if (typeof style_file_or_object === "object") {
				style.innerText = style_file_or_object.style;
			} else {
				style.innerText = "@import \"chrome://wot/" + style_file_or_object + "\";";
			}

			if (!reuse_style) {
				head[0].appendChild(style);
			}

			return true;
		} catch (e) {
			console.log("wot.utils.attach_style() failed with", e, "Arguments:", arguments);
			return false;
		}
	},

	processhtml: function (html, replaces) {
		try {
			replaces.forEach(function(item) {
				html = html.replace(RegExp("{" + item.from + "}", "g"),
					item.to);
			});

			return html;
		} catch (e) {
			console.log("warning.processhtml: failed with " + e);
		}

		return "";
	},

	htmlescape: function(str) {
		var tagsToReplace = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		};
		return str.replace(/[&<>]/g, function(symb) {
			return tagsToReplace[symb] || symb;
		});
	}
};
