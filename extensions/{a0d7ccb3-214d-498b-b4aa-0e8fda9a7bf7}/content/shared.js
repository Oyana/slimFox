/*
	shared.js
	Copyright © 2008-2011  WOT Services Oy <info@mywot.com>

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

const WOT_PREFIX_SHARED = "wot_shared";

var wot_shared =
{
	set: "abcdefghijklmnopqrstuvwxyz234567",
	rev: null,

	load_delayed: function()
	{
		try {
			this.sync();
		} catch (e) {
			dump("wot_shared.load: failed with " + e + "\n");
		}
	},

	parse: function(shared)
	{
		try {
			var i;
			var data = {};

			for (i = 0; i < shared.length; ++i) {
				var attr = shared[i].attributes.getNamedItem(WOT_SERVICE_XML_UPDATE_SHARED_LEVEL);

				if (!attr || !attr.value) {
					return;
				}

				var level = Number(attr.value);

				if (level < 1) {
					return;
				}

				attr = shared[i].attributes.getNamedItem(WOT_SERVICE_XML_UPDATE_SHARED_DOMAINS);

				if (!attr || !attr.value) {
					return;
				}

				if (!data[level]) {
					data[level] = [];
				}

				data[level] = data[level].concat(attr.value.split(","));
			}

			var stor_shared = {};
			for (i in data) {
				stor_shared["shared." + i] = data[i].join(",");
			}
			wot_storage.set("shared", stor_shared, true);
			wot_prefs.deleteBranch("shared.");   // we don't need this in preferences any more

			this.sync();
		} catch (e) {
			dump("wot_shared.parse: failed with " + e + "\n");
		}
	},

	sync: function()
	{
		try {
			var stor_shared = wot_storage.get("shared", {});

			for (var i in stor_shared) {
				if (!stor_shared.hasOwnProperty(i)) continue;

				var parts = i.split(".", 2);
				var level = Number(parts[1]);

				if (level < 1) {
					continue;
				}

				var data = stor_shared[i];

				if (!data || !data.length) {
					continue;
				}

				var domains = data.split(",");

				for (var j = 0; j < domains.length; ++j) {
					if (!domains[j].length) {
						continue;
					}

					var pn = wot_idn.utftoidn(domains[j]);

					if (!pn) {
						continue;
					}

					wot_hashtable.set(WOT_PREFIX_SHARED + ":" + pn, level);
				}
			}
		} catch (e) {
			dump("wot_shared.load: failed with " + e + "\n");
		}
	},

	isshared: function(host)
	{
		try {
			return wot_hashtable.get(WOT_PREFIX_SHARED + ":" + host);
		} catch (e) {
			dump("wot_shared.isshared: failed with " + e + "\n");
		}

		return null;
	},

	isencodedhostname: function(host)
	{
		try {
			return /^_p_[a-z2-7]+\..+$/.test(host);
		} catch (e) {
			dump("url.isencodedhostname: failed with " + e + "\n");
		}

		return false;
	},

	encodehostname: function(host, path)
	{
		try {
			if (!host || !path) {
				return host;
			}

			/* Clean up the path, drop query string and hash */
			path = path.replace(/^\s+/, "")
					.replace(/\s+$/, "")
					.replace(/[\?#].*$/, "");

			if (path.length < 2 || path[0] != "/") {
				return host;
			}

			var h = wot_idn.utftoidn(host);

			if (!h) {
				return host;
			}

			var c = path.split("/");

			if (!c || !c.length) {
				return host;
			}

			/* Drop a suspected filename from the end */
			if (path[path.length - 1] != "/" &&
					/\.[^\.]{1,6}$/.test(c[c.length - 1])) {
				c.pop();
			}

			var level = 0;

			for (var i = c.length; !level && i > 0; --i) {
				level = this.isshared(h + c.slice(0, i).join("/"));
			}

			if (!level) {
				return host;
			}

			var p = c.slice(0, level + 1).join("/").replace(/^\//, "");

			if (!p || !p.length) {
				return host;
			}

			var encoded = this.base32encode(p);

			if (encoded == null) {
				return host;
			}

			return "_p_" + encoded + "." + host;
		} catch (e) {
			dump("wot_shared.encodehostname: failed with " + e + "\n");
		}

		return host;
	},

	decodehostname: function(host)
	{
		try {
			var m = /^_p_([a-z2-7]+)\.(.+)$/.exec(host);

			if (!m || !m[1] || !m[2]) {
				return host;
			}

			var decoded = this.base32decode(m[1]);

			if (decoded == null) {
				return host;
			}

			return m[2] + "/" + decoded;
		} catch (e) {
			dump("wot_shared.decodehostname: failed with " + e + "\n");
		}

		return host;
	},

	base32encode: function(s)
	{
		try {
			/* Unicode to UTF-8 */
			s = unescape(encodeURIComponent(decodeURIComponent(s)));

			var r = "";
			var b = 0;
			var l = 0;

			for (var i = 0; i < s.length; ++i) {
				var n = s.charCodeAt(i);

				if (n > 255) {
					return null; /* Invalid input */
				}

				b = (b << 8) + n;
				l += 8;

				do {
					l -= 5;
					r += this.set[(b >> l) & 0x1F];
				} while (l >= 5);
			}

			if (l > 0) {
				r += this.set[(b << (5 - l)) & 0x1F];
			}

			return r;
		} catch (e) {
			dump("wot_shared.base32encode: failed with " + e + "\n");
		}

		return null;
	},

	base32decode: function(s)
	{
		try {
			/* Build a reverse lookup table */
			if (!this.rev) {
				this.rev = {};

				for (var i = 0; i < this.set.length; ++i) {
					this.rev[this.set.charAt(i)] = i;
				}
			}

			var r = "";
			var b = 0;
			var l = 0;

			for (var i = 0; i < s.length; ++i) {
				var n = this.rev[s.charAt(i)];

				if (n == null) {
					return null; /* Invalid input */
				}

				b = (b << 5) + n;
				l += 5;

				while (l >= 8) {
					l -= 8;
					r += String.fromCharCode((b >> l) & 0xFF);
				}
			}

			if (l >= 5) {
				return null; /* Invalid input */
			}

			/* UTF-8 to Unicode */
			return decodeURIComponent(escape(r));
		} catch (e) {
			dump("wot_shared.base32decode: failed with " + e + "\n");
		}

		return null;
	}
};

wot_modules.push({ name: "wot_shared", obj: wot_shared });
