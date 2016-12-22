/*
	cookies.js
	Copyright © 2006, 2007, 2009  WOT Services Oy <info@mywot.com>

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

const WOT_COOKIE_TIMEOUT = 10000;
const WOT_COOKIE_TOPIC = "http-on-modify-request";

function wot_cookie_remover(request)
{
	this.channel = request.channel;

	this.service = Components.classes["@mozilla.org/observer-service;1"].
						getService(Components.interfaces.nsIObserverService);
	this.service.addObserver(this, WOT_COOKIE_TOPIC, false);

	this.timeout = window.setTimeout(this.stop, WOT_COOKIE_TIMEOUT);
}

wot_cookie_remover.prototype =
{
	channel: null,
	service: null,
	timeout: null,

	QueryInterface: function(iid)
	{
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsIObserver)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	},

	observe: function(subject, topic, data)
	{
		try {
			if (topic == WOT_COOKIE_TOPIC && subject == this.channel) {
				this.channel.QueryInterface(Components.interfaces.nsIHttpChannel);
				this.channel.setRequestHeader("Cookie", "", false);
				this.stop();
			}
		} catch (e) {
			dump("wot_cookie_remover.observe: failed with " + e + "\n");
		}
	},

	stop: function()
	{
		try {
			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (this.service) {
				this.service.removeObserver(this, WOT_COOKIE_TOPIC);
				this.service = null;
			}

			this.channel = null;
		} catch (e) {
			dump("wot_cookie_remover.stop: failed with " + e + "\n");
		}
	}
};
