/*
	util.js
	Copyright © 2005 - 2014  WOT Services Oy <info@mywot.com>

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

var wot_util =
{
	reportError: function(params)
	{
		Components.utils.reportError(JSON.stringify(arguments));
	},

	isenabled: function()
	{
		try {
			return (wot_prefs.enabled &&
					wot_api_register.ready &&
						(!wot_prefs.private_disable ||
						 !wot_browser.isprivatemode()));
		} catch (e) {
			dump("wot_util.isenabled: failed with " + e + "\n");
		}

		return true;
	},

    isEmpty: function (obj) {
        for (var name in obj) {
            return false;
        }
        return true;
    },

	getstring: function(str, arr)
	{
		try {
			if (!this.string_bundle) {
				this.string_bundle = document.getElementById("wot-strings");
			}
			if (arr) {
				return this.string_bundle.getFormattedString(str, arr);
			} else {
				return this.string_bundle.getString(str);
			}
		} catch (e) {
			dump("wot_util.getstring: failed with " + e + "\n");
		}

		return null;
	},

    get_all_strings: function () {
        var res = {};
        try {
            if (!this.string_bundle) {
                this.string_bundle = document.getElementById("wot-strings");
            }

            var strings = this.string_bundle.strings;

            while (strings.hasMoreElements()) {
                var property = strings.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
                res[property.key] = property.value;
            }
            return res;

        } catch (e) {
            dump("wot_util.getstring: failed with " + e + "\n");
        }

        return res;
    },

    get_level: function (levels, value, next) {
        next = next ? next : false;

        var next_level = levels[levels.length - 1];

        for (var i = levels.length - 1; i >= 0; --i) {
            if (value >= levels[i].min) {
                return next ? next_level : levels[i];
            }
            next_level = levels[i];
        }

        return levels[1];
    },

    copy_attrs: function (node) {
        var obj = {};
        if (node) {
            for (var a in node.attributes) {
                var attr = node.attributes[a];
                obj[attr.name] = attr.value;
            }
        } else {
            wot_tools.wdump("wot_utils.copy_attrs() - empty node is provided");
        }
        return obj;
    },

    encode_utf8: function (s) {
        return unescape(encodeURIComponent(s));
    },

    decode_utf8: function (s) {
        return decodeURIComponent(escape(s));
    },

    utf8_to_unicode: function (str) {
        if (!str) return null;
        var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";

        return converter.ConvertToUnicode(str);
    },

    unicode_to_utf8: function (str) {
        var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";

        var encoded = converter.ConvertFromUnicode(str);
        return encoded + converter.Finish();

    },

	time_sincefirstrun: function()
	{
		try {
			// gives time (in seconds) spent from very first run of the addon.
			var starttime_str = wot_prefs.getChar("firstrun_time");
			if (starttime_str) {
				var starttime = new Date(starttime_str);
				return (new Date() - starttime) / 1000;    // in seconds;
			} else {
				return undefined;
			}
		} catch (e) {
			return undefined;
		}
	},

	time_since: function(a, b) {
		try {
			if (typeof a === "string") {
				a = new Date(a);
			}

			b = b || new Date();

			if (typeof b === "string") {
				b = new Date(b);
			}

			return (b - a) / 1000;  // in seconds
		} catch (e) {
			return null;
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
            wot_tools.wdump("warning.processhtml: failed with " + e);
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
    },
	parse_string_to_html_dom: function(str, wrapping_element) {
		wrapping_element = wrapping_element ? wrapping_element : "div";
		str = "<" + wrapping_element + ">" + str + "</" + wrapping_element + ">";

		var parserUtils = Components.classes["@mozilla.org/parserutils;1"]
			.getService(Components.interfaces.nsIParserUtils);
		var dummy_element = document.createElementNS("http://www.w3.org/1999/xhtml","div");
		var html_dom = parserUtils.parseFragment(str, 0, false, null, dummy_element).lastChild;

		return html_dom;
	}    
};

var wot_url =
{
	gethostname: function(url)
	{
		try {
			if (!url || !url.length) {
				return null;
			}

			var ios = Components.classes["@mozilla.org/network/io-service;1"]
						.getService(Components.interfaces.nsIIOService);

			var parsed = ios.newURI(url, null, null);

			if (!parsed || !parsed.host ||
					!this.issupportedscheme(parsed.scheme)) {
				return null;
			}

			var host = parsed.host.toLowerCase();

			if (!host) {
				return null;
			}

			while (this.isequivalent(host)) {
				host = host.replace(/^[^\.]*\./, "");
			}

			return wot_shared.encodehostname(host, parsed.path);
		} catch (e) {
			/* dump("wot_url.gethostname: failed with " + e + "\n"); */
		}

		return null;
	},

	issupportedscheme: function(scheme)
	{
		try {
			return /^(https?|ftp|mms|rtsp)$/i.test(scheme);
		} catch (e) {
			dump("wot_url.issupportedscheme: failed with " + e + "\n");
		}

		return false;
	},

	isequivalent: function(name)
	{
		try {
			if (!/^www(\d[^\.]*)?\..+\..+$/i.test(name)) {
				return false;
			}

			var component = Components
					.classes["@mozilla.org/network/effective-tld-service;1"];

			if (!component) {
				return true;
			}

			var ts = component.getService(
						Components.interfaces.nsIEffectiveTLDService);

			if (!ts) {
				return true;
			}

			var domain = name.replace(/^[^\.]*\./, "");
			var tld = ts.getPublicSuffixFromHost(domain);

			return (domain != tld);
		} catch (e) {
			dump("wot_url.isequivalent: failed with " + e + "\n");
		}

		return false;
	},

	isprivate: function(name)
	{
		try {
			/* This isn't meant to be a comprehensive check, just notice the most
			   common local and private addresses */
			return /^(localhost|((10|127)\.\d+|(172\.(1[6-9]|2[0-9]|3[01])|192\.168))\.\d+\.\d+)$/.test(name);
		} catch (e) {
			dump("wot_url.isprivate: failed with " + e + "\n");
		}

		return false;
	},

	isexcluded: function(name)
	{
		try {
			if (!name || !wot_prefs.norepsfor ||
					wot_prefs.norepsfor.length == 0) {
				return false;
			}

			var hosts = wot_prefs.norepsfor.replace(/\s/g, "").split(",");

			for (var i = 0; i < hosts.length; ++i) {
				if (hosts[i].length == 0) {
					continue;
				}

				if (hosts[i].charAt(0) == '.') {
					if (name.length > hosts[i].length &&
							name.lastIndexOf(hosts[i]) ==
								(name.length - hosts[i].length)) {
						return true;
					}
				} else if (hosts[i].charAt(hosts[i].length - 1) == '.') {
					if (name.indexOf(hosts[i]) == 0) {
						return true;
					}
				} else if (name == hosts[i]) {
					return true;
				}
			}
		} catch (e) {
			dump("wot_url.isexcluded: failed with " + e + "\n");
		}

		return false;
	},

	getwoturl: function(path, context, has_base)
	{
		try {
			var new_path = path;
			new_path += ( (path.indexOf("?") > 0) ? "&" : "?" );
			new_path += "utm_source=addon" + (context ? "&utm_content=" + context : "");
			return has_base ? new_path : WOT_MY_URL + new_path;
		} catch (e) {
			dump("wot_url.getwoturl: failed with " + e + "\n");
		}

		return null;
	},

	getprefurl: function(tab, secure, base, context)
	{
		try {
            var has_base = !!base;
			base = base || WOT_PREF_PATH;

			var path = base + wot_util.getstring("lang") +
						"/" + WOT_PLATFORM + "/" + WOT_VERSION;

			var url = path;

			if (url) {
				if (tab) {
					url += "/" + tab;
				}

				url = this.getwoturl(url, context, has_base);

				if (secure || wot_core.force_https) {
					url = url.replace(/^http\:/, "https:");
				}

				return url;
			}
		} catch (e) {
			dump("wot_url.getprefurl: failed with " + e + "\n");
		}

		return null;
	},

	getapiparams: function()
	{
		try {
			var params = "&lang=" +
				(wot_util.getstring("lang") || "en-US");

			var partner = wot_partner.getpartner();

			if (partner) {
				params += "&partner=" + partner;
			}

			params += "&version=" + WOT_PLATFORM + "-" + WOT_VERSION;
			return params;
		} catch (e) {
			dump("wot_url.getapiparams: failed with " + e + "\n");
		}

		return "";
	}
};

var wot_browser =
{
	isoffline: function()
	{
		try {
			var ios = Components.classes["@mozilla.org/network/io-service;1"]
						.getService(Components.interfaces.nsIIOService);

			return ios.offline;
		} catch (e) {
			dump("wot_browser.isoffline: failed with " + e + "\n");
		}

		return false;
	},

	isprivatemode: function()
	{

        try {
            // Firefox 20
            var win = getBrowser().contentDocument.defaultView;
            Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
            return PrivateBrowsingUtils.isWindowPrivate(win);

        } catch(e) {
            // pre Firefox 20 (if you do not have access to a doc.
            // might use doc.hasAttribute("privatebrowsingmode") then instead)
            try {
                var pbs = Cc["@mozilla.org/privatebrowsing;1"].
                    getService(Ci.nsIPrivateBrowsingService);
                return pbs.privateBrowsingEnabled;
            } catch(e) {
                Cu.reportError(e); return;
            }
        }

		return false;
	},

	gethostname: function()
	{
		return wot_url.gethostname(this.geturl());
	},

	geturl: function()
	{
		try {
			return gBrowser.selectedBrowser.currentURI.spec;
		} catch (e) {
		}

		return null;
	},

	getreferrer: function()
	{
		try {
			return getBrowser().contentDocument.referrer;
		} catch (e) {
			dump("wot_browser.getreferrer: failed with " + e + "\n");
		}

		return null;
	},

	show_notification: function(hostname, message, known)
	{
		try {
			var icon = "chrome://wot/skin/fusion/";

			if (wot_prefs.accessible) {
				icon += "accessible/";
			}

			if (known) {
				icon += "16_16/plain/r1.png";
			} else {
				icon += "16_16/plain/r0.png";
			}

			/* There's a chance the user has already changed the tab */
			if (hostname != wot_browser.gethostname()) {
				return;
			}

			var browser = getBrowser();

			if (!browser) {
				return;
			}

			if (browser.getNotificationBox) {
				/* Firefox 2 */
				var nbox = browser.getNotificationBox();

				if (!nbox || nbox.getNotificationWithValue("wot-warning")) {
					return;
				}

			    var buttons = [{
					label: wot_util.getstring("warning_button"),
					accessKey: null,
					popup: "wot-popup",
					callback: null
				}];

			    nbox.appendNotification(
					wot_util.getstring("warning", [message]),
					"wot-warning",
					icon, nbox.PRIORITY_WARNING_HIGH, buttons);
			} else {
				browser.hideMessage(browser.selectedBrowser, "both");
				browser.showMessage(browser.selectedBrowser, icon,
					wot_util.getstring("warning", [message]),
					wot_util.getstring("warning_button"),
					null, null, "wot-popup", "top", true, null);
			}
		} catch (e) {
			dump("wot_browser.show_notification: failed with " + e + "\n");
		}
	},

	hide_warning: function()
	{
		try {
			var browser = getBrowser();

			if (!browser) {
				return;
			}

			if (browser.getNotificationBox) {
				var nbox = browser.getNotificationBox();

				if (!nbox) {
					return;
				}

				var item = nbox.getNotificationWithValue("wot-warning");

				if (!item) {
					return;
				}

				nbox.removeNotification(item);
			} else {
				browser.hideMessage(browser.selectedBrowser, "both");
			}
		} catch (e) {
			dump("wot_browser.hide_warning: failed with " + e + "\n");
		}
	},

    open_wotsite: function (page, target, action, context, new_tab, has_base) {
        try {
            new_tab = new_tab === null ? true : new_tab;
            var browser = getBrowser(),
                path = page + encodeURIComponent(target);

            if (action) {
                path += action;
            }

            var url = wot_url.getwoturl(path, context, has_base);

            if (browser && url) {
                browser.selectedTab = browser.addTab(url);
                return true;
            }

        } catch (e) {
            wot_tools.wdump("ERROR: wot_util.wot_browser.open_wotsite() raised an exception. " + e);
        }

    },

	openscorecard: function (hostname, action, context)
	{
		try {
			if (!hostname) return false;
            return this.open_wotsite(WOT_SCORECARD_PATH, hostname, action, context, true, false);

		} catch (e) {
			dump("wot_browser.openscorecard: failed with " + e + "\n");
		}

		return false;
	},

	installsearch: function()
	{
		try {
			wot_prefs.setBool("install_search", false);

			var bss = Components.classes["@mozilla.org/browser/search-service;1"]
						.getService(Components.interfaces.nsIBrowserSearchService);

			var url = WOT_SAFESEARCH_OSD_URL;
			var lang = wot_util.getstring("lang");

			if (lang) {
				url = url.replace("/en-US", "/" + lang);
			}

			bss.addEngine(url, 1, null, false);
		} catch (e) {
			dump("wot_browser.installsearch: failed with " + e + "\n");
		}
	},

	get_document: function (frame)
	{
		try {
			frame = frame || getBrowser();
			var framed_document = frame.document || frame.contentDocument;
			return framed_document;
		} catch (e) {
			dump("wot_browser.get_document failed with " + e + "\n");
			return null;
		}
	},

	get_or_create_element: function (id, tag, frame)
	{
		try {
			tag = tag || "div";
			var framed_document = this.get_document(frame);

			var elem = framed_document.getElementById(id);

			if(!elem) {
				elem = framed_document.createElement(tag);
				elem.setAttribute("id", id);
			}

			return elem;
		} catch (e) {
			dump("wot_browser.get_or_create_element failed with " + e + "\n");
			return null;
		}
	},

	attach_element: function (element, frame)
	{
		try {
			var framed_document = this.get_document(frame);

			if(framed_document) {
				var body = framed_document.getElementsByTagName("body");

				if (!element || !body || !body.length) {
					return false;
				}

				return body[0].appendChild(element);
			} else {
				dump("Can't get document of frame");
				return false;
			}

		} catch (e) {
			dump("wot_browser.attach_element failed with " + e + "\n");
			return null;
		}
	}
};

/* Provides a simple wrapper for nsICryptoHash */
var wot_hash =
{
	load_delayed: function()
	{
		try {
			if (this.handle) {
				return;
			}
			this.handle = Components.classes["@mozilla.org/security/hash;1"].
	                        getService(Components.interfaces.nsICryptoHash);

			window.addEventListener("unload", function(e) {
					wot_hash.unload();
				}, false);
		} catch (e) {
			dump("wot_hash.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		this.handle = null;
	},

	/* Converts a string of bytes (code < 256) to an array of bytes, don't
	   use for multibyte strings */
	strtobin: function(str)
	{
		try {
			var bin = [];

			for (var i = 0; i < str.length; ++i) {
				bin[i] = str.charCodeAt(i) & 0xFF;
			}
			return bin;
		} catch (e) {
			dump("wot_hash.strtobin: failed with " + e + "\n");
		}
		return null;
	},

	/* Converts an array of bytes to a string of bytes */
	bintostr: function(bin)
	{
		try {
			var str = "";

			for (var i = 0; i < bin.length; ++i) {
				str += String.fromCharCode(bin[i] & 0xFF);
			}

			return str;
		} catch (e) {
			dump("wot_hash.bintostr: failed with " + e + "\n");
		}
		return null;
	},

	/* Converts a hex string to an array of bytes */
	hextobin: function(str)
	{
		try {
			/* We assume ASCII-compatible values for basic alnums */
			var asciitonibble = function(c)
			{
				var code_a = 'a'.charCodeAt(0);

				if (c >= code_a) {
					return (c - code_a + 10);
				} else {
					return (c - '0'.charCodeAt(0));
				}
			}
			var bin = [];

			for (var i = 0; i < str.length / 2; ++i) {
				bin[i] = asciitonibble(str.charCodeAt(2 * i    )) <<  4 |
						 asciitonibble(str.charCodeAt(2 * i + 1)) & 0xF;
			}
			return bin;
		} catch (e) {
			dump("wot_hash.hextobin: failed with " + e + "\n");
		}
		return null;
	},

	/* Converts an array of bytes to a hex string */
	bintohex: function(bin)
	{
		const HEX = "0123456789abcdef";
		var str = "";

		try {
			for (var i = 0; i < bin.length; ++i) {
				str += HEX.charAt((bin[i] >> 4) & 0xF);
				str += HEX.charAt( bin[i]       & 0xF);
			}
			return str;
		} catch (e) {
			dump("wot_hash.bintohex: failed with " + e + "\n");
		}
		return null;
	},

	/* Returns an array of bytes containing the SHA-1 hash from the given
	   array of bytes */
	sha1bin: function(bin)
	{
		try {
			this.handle.init(Components.interfaces.nsICryptoHash.SHA1);
			this.handle.update(bin, bin.length);

			/* Takes an array, but returns a string? */
			return this.strtobin(this.handle.finish(false));

		} catch (e) {
			dump("wot_hash.sha1bin: failed with " + e + "\n");
		}
		return null;
	},

	/* Returns an array of bytes containing the SHA-1 hash from the given
	   string of bytes */
	sha1str: function(str)
	{
		return this.sha1bin(this.strtobin(str));
	},

	/* Returns an array of bytes containing the SHA-1 hash from the given
	   hex string */
	sha1hex: function(str)
	{
		return this.sha1bin(this.hextobin(str));
	},

	/* Returns an array of bytes containing the HMAC-SHA-1 from the given
	   string of bytes using the given hex string key */
	hmac_sha1hex: function(hexkey, str)
	{
		try {
			var key = this.hextobin(hexkey);

			if (key.length > 20) {
				key = this.sha1bin(key);
			}

			var ipad = Array(64), opad = Array(64);

			for (var i = 0; i < 20; ++i) {
				ipad[i] = key[i] ^ 0x36;
				opad[i] = key[i] ^ 0x5C;
			}
			for (var j = 20; j < 64; ++j) {
				ipad[j] = 0x36;
				opad[j] = 0x5C;
			}

			var inner = this.sha1bin(ipad.concat(this.strtobin(str)));
			return this.sha1bin(opad.concat(inner));
		} catch (e) {
			dump("wot_hash.hmac_sha1hex: failed with " + e + "\n");
			return null;
		}
	}
};

wot_modules.push({ name: "wot_hash", obj: wot_hash });

var wot_arc4 =
{
	/* Takes a key as an array of bytes, returns a context */
	create: function(key)
	{
		try {
			var i, j = 0, k = 0, l;
			var ctx = {};

			ctx.s = [];
			ctx.x = 1;
			ctx.y = 0;

			for (i = 0; i < 256; ++i) {
				ctx.s[i] = i;
			}
			for (i = 0; i < 256; ++i) {
				l = ctx.s[i];
				j = (j + key[k] + l) & 0xFF;
				ctx.s[i] = ctx.s[j];
				ctx.s[j] = l;
				if (++k >= key.length) {
					k = 0;
				}
			}

			return ctx;
		} catch (e) {
			dump("trust_arc4.create failed with " + e + "\n");
			return null;
		}
	},

	/* Takes context and input as an array of bytes, returns crypted string
	   also as an array of bytes */
	crypt: function(ctx, input)
	{
		try {
			var i, j, k;
			var output = [];

			for (i = 0; i < input.length; ++i) {
				j = ctx.s[ctx.x];
				ctx.y = (ctx.y + j) & 0xFF;
				k = ctx.s[ctx.y];
				ctx.s[ctx.x] = k;
				ctx.s[ctx.y] = j;
				ctx.x = (ctx.x + 1) & 0xFF;
				output[i] = (input[i] ^ ctx.s[(j + k) & 0xFF]) & 0xFF;
			}

			return output;
		} catch(e) {
			dump("trust_arc4.crypt failed with " + e + "\n");
			return null;
		}
	}
};

const WOT_CRYPTO_COUNTER = "wot_crypto_counter";

var wot_crypto =
{
	load_delayed: function()
	{
		try {
			wot_hashtable.set(WOT_CRYPTO_COUNTER, Number(Date.now()));
		} catch (e) {
			dump("wot_crypto.load: failed with " + e + "\n");
		}
	},

	nonce: function()
	{
		try {
			var counter = wot_hashtable.get(WOT_CRYPTO_COUNTER);

			wot_hashtable.set(WOT_CRYPTO_COUNTER,
				Number(counter) + 1);

			return wot_hash.bintohex(wot_hash.sha1str(
						wot_prefs.witness_id +
						wot_prefs.update_checked +
						wot_prefs.cookie_updated +
						WOT_VERSION +
						wot_browser.geturl() +
						wot_browser.getreferrer() +
						counter +
						Date.now()));
		} catch (e) {
			dump("wot_crypto.nonce: failed with " + e + "\n");
		}

		return Date.now().toString();
	},

	getrandomid: function()
	{
		try {
			var id = this.nonce();

			if (/^[0-9]/.test(id)) {
				/* Convert the first character to a letter */
				id = String.fromCharCode(id.charCodeAt(0) + "1".charCodeAt(0)) +
						id.substr(1);
			}

			return id.substr(0, Math.floor(Math.random() * 13 + 8));
		} catch (e) {
			dump("wot_crypto.nonce: failed with " + e + "\n");
		}

		return null;
	},

	authenticate: function(str)
	{
		try {
			return wot_hash.bintohex(
				wot_hash.hmac_sha1hex(wot_prefs.witness_key, str));
		} catch (e) {
			dump("wot_crypto.authenticate: failed with " + e + "\n");
		}
		return null;
	},

	authenticate_query: function(str)
	{
		return str + "&auth=" + this.authenticate(str);
	},

	islevel: function(level)
	{
		try {
			var l = wot_prefs.status_level;

			if (!l || l.length != 40) {
				return false;
			}

			var h = wot_hash.bintohex(wot_hash.hmac_sha1hex(
						wot_prefs.witness_key, "level=" + level));

			return (l == h);
		} catch (e) {
			wot_tools.wdump("wot_crypto.islevel: failed with " + e);
		}
		return false;
	},

    encrypt: function(data, nonce)
    {
        try {
            if (data && nonce) {
                var key = wot_prefs.witness_key;

                if (key) {
                    return btoa(wot_hash.bintostr(wot_arc4.crypt(
                        wot_arc4.create(wot_hash.hmac_sha1hex(key, nonce)),
                        wot_hash.strtobin(data))));
                }
            }
        } catch (e) {
            wot_tools.wdump("crypto.encrypt: failed with " + e);
        }

        return null;
    },

    decrypt: function(data, nonce, index)
    {
        try {
            if (data && nonce) {
                var key = wot_prefs.witness_key;

                if (index == null || index < 0) {
                    index = "";
                } else {
                    index = "-" + index;
                }

                if (key) {
                    return wot_hash.bintostr(wot_arc4.crypt(
                        wot_arc4.create(wot_hash.hmac_sha1hex(key,
                            "response-" + nonce + index)),
                        wot_hash.strtobin(atob(data))));
                }
            }
        } catch (e) {
            wot_tools.wdump("wot_crypto.decrypt(): failed with " + e);
        }

        return null;
    }
};

wot_modules.push({ name: "wot_crypto", obj: wot_crypto });

/* Provides a simple wrapper for nsIIDNService */
var wot_idn =
{
	load: function()
	{
		try {
			if (this.handle) {
				return;
			}
			this.handle =
				Components.classes["@mozilla.org/network/idn-service;1"].
					getService(Components.interfaces.nsIIDNService);
		} catch (e) {
			dump("wot_idn.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		this.handle = null;
	},

	isidn: function(str)
	{
		try {
			return this.handle ? this.handle.isACE(str) : null;
		} catch (e) {
			dump("wot_idn.isidn: failed with " + e + "\n");
		}
		return false;
	},

	utftoidn: function(utf)
	{
		try {
			return this.handle ? this.handle.convertUTF8toACE(utf) : null;
		} catch (e) {
			dump("wot_idn.utftoidn: failed with " + e + "\n");
		}
		return null;
	},

	idntoutf: function(idn)
	{
		try {
			return this.handle ? this.handle.convertACEtoUTF8(idn) : null;
		} catch (e) {
			dump("wot_idn.idntoutf: failed with " + e + "\n");
		}
		return null;
	}
};

wot_modules.push({ name: "wot_idn", obj: wot_idn });

var wot_css =
{
	cache: {},

	/* Finds a given rule from a stylesheet, caches found entries */
	getstyle: function(href, id)
	{
		try {
			var rule = this.cache[href + "." + id];

			if (rule) {
				return rule.style;
			}

			var sheet;

			for (var i = 0; i < document.styleSheets.length; ++i) {
				sheet = document.styleSheets.item(i);

				if (sheet.href != href) {
					continue;
				}

				for (var j = 0; j < sheet.cssRules.length; ++j) {
					rule = sheet.cssRules.item(j);

					if (rule.selectorText.indexOf(id) < 0) {
						continue;
					}

					this.cache[href + "." + id] = rule;
					return rule.style;
				}
				break;
			}
		} catch (e) {
			dump("wot_css.getstyle: failed with " + e + "\n");
		}

		return null;
	},

	/* Parses a numeric entry from a style rule, ignores units */
	getstyle_numeric: function(style, parameter)
	{
		try {
			if (style) {
				var value = style[parameter];

				if (value) {
					var m = /^(\d+)/.exec(value);

					if (m && m[1]) {
						return Number(m[1]);
					}
				}
			}
		} catch (e) {
			dump("wot_css.getstyle_numeric: failed with " + e + "\n");
		}

		return null;
	},

	/* Sets a numeric entry with given unit to the style rule */
	setstyle_numeric: function(style, parameter, value, unit)
	{
		try {
			style[parameter] = value + unit;
		} catch (e) {
			dump("wot_css.setstyle_numeric: failed with " + e + "\n");
		}
	},

	/* Parses a rect entry from a style rule, ignores units */
	getstyle_rect: function(style, parameter)
	{
		try {
			if (style) {
				var value = style[parameter];

				if (value) {
					var r = /rect\(\s*(\d+)\D*,\s*(\d+)\D*,\s*(\d+)\D*,\s*(\d+)\D*\s*\)/;
					var m = r.exec(value);

					if (m && m[1] && m[2] && m[3] && m[4]) {
						return new Array(Number(m[1]), Number(m[2]),
							Number(m[3]), Number(m[4]));
					}
				}
			}
		} catch (e) {
			dump("wot_css.getstyle_rect: failed with " + e + "\n");
		}

		return null;
	},

	/* Sets a rect entry to the style rule, assumes pixels as unit */
	setstyle_rect: function(style, parameter, rect)
	{
		try {
			style[parameter] = "rect(" +
				rect[0].toFixed() + "px, " + rect[1].toFixed() + "px, " +
				rect[2].toFixed() + "px, " + rect[3].toFixed() + "px)";
		} catch (e) {
			dump("wot_css.setstyle_rect: failed with " + e + "\n");
		}
	}
};

var wot_file = {

	wot_dir: "WOT",

	import_libs: function()
	{
		Components.utils.import("resource://gre/modules/NetUtil.jsm");
		Components.utils.import("resource://gre/modules/FileUtils.jsm");
	},

	read_json: function (filename, callback) {

		try {

			wot_file.import_libs();

			var dir = FileUtils.getDir("ProfD", [wot_file.wot_dir], true); // to make sure the Dir exists
			var file = FileUtils.getFile("ProfD", [wot_file.wot_dir, filename]);

			NetUtil.asyncFetch(file, function(inputStream, status) {

				if (!Components.isSuccessCode(status)) {
					// Handle error!
					callback({});
					return;
				}

				try {
					var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

					if (data) {
						var res = JSON.parse(wot_util.utf8_to_unicode(data));
						if (res instanceof Object) {
							callback(res);
							return;
						}
					}
					callback({});   // whether no data is loaded call it anyway to finish the load process

				} catch (e) {
					dump("utils.wot_file.read_json() is failed with " + e + "\n");
					callback({});   // anyway, provide empty object
					return;
				}

			});

		} catch (e) {
			dump("wot_file.read_json() failed with " + e + "\n");
			callback({});   // anyway, provide empty object
		}

	},

	save_json: function (filename, obj, callback) {

		callback = callback || function(status){};

		try {
			wot_file.import_libs();

			var dir = FileUtils.getDir("ProfD", [wot_file.wot_dir], true); // to make sure the Dir exists
			var file = FileUtils.getFile("ProfD", [wot_file.wot_dir, filename]);

			// You can also optionally pass a flags parameter here. It defaults to
			// FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE;
			var ostream = FileUtils.openSafeFileOutputStream(file);

			var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
				createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";

			var data = JSON.stringify(obj);
			var istream = converter.convertToInputStream(data);

			NetUtil.asyncCopy(istream, ostream, function(status) {
				if (!Components.isSuccessCode(status)) {
					// Handle error!
					callback(false);
					return;
				}

				// Data has been written to the file.
				callback(true);
			});

		} catch (e) {
			dump("wot_file.save_json() failed with " + e + "\n");
			callback(false);   // report about failed attempt to save
		}
	}
};
