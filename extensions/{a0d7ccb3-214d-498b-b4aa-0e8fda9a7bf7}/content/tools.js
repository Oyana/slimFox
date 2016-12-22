/*
	config.js
	Copyright © 2014 - 2014  WOT Services Oy <info@mywot.com>

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

var wot_modules = [];

var wot_tools = {

	wdump: function (str) {
		dump(str + "\n");
	},

	log: function() {
		Array.prototype.slice.call(arguments).forEach(function (item, index, arr) {
			dump(JSON.stringify(item, null, '    ') + "\n");
		})
	}

};
