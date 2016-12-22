/*
	partner.js
	Copyright © 2009-2011  WOT Services Oy <info@mywot.com>

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

var wot_partner =
{
	partner: null,

	supported: {
	},

	load_delayed: function()
	{
		try {
			if (this.partner) {
				wot_prefs.setChar("partner", this.partner);
			}
		} catch (e) {
			dump("wot_partner.load_delayed: failed with " + e + "\n");
		}
	},

	getpartner: function()
	{
		try {
			if (wot_prefs.partner && this.supported[wot_prefs.partner]) {
				return wot_prefs.partner;
			}
		} catch (e) {
			dump("wot_partner.getpartner: failed with " + e + "\n");
		}

		return null;
	}
};

wot_modules.push({ name: "wot_partner", obj: wot_partner });
