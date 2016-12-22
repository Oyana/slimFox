/*
	search.js
	Copyright © 2006-2012  WOT Services Oy <info@mywot.com>

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


var wot_search =
{
	attrstr: [
			WOT_SEARCH_DISPLAY,
			WOT_SEARCH_URL,
			WOT_SEARCH_IGN,
			WOT_SEARCH_URLIGN,
			WOT_SEARCH_PRESTYLE,
			WOT_SEARCH_SCRIPT,
			WOT_SEARCH_STYLE,
			WOT_SEARCH_NINJA
		],

	attrint: [
			WOT_SEARCH_DYNAMIC,
			WOT_SEARCH_SEARCHLEVEL
		],

	load_delayed: function()
	{
		try {
			if (this.rules) {
				return;
			}

			this.attribute  = wot_crypto.getrandomid();
			this.processed  = wot_crypto.getrandomid();
			this.prestyleid = wot_crypto.getrandomid();

			this.rules = {};

			/* Prefs */
			this.sync();
			this.pbi = wot_prefs.pref.QueryInterface(
							Components.interfaces.nsIPrefBranch2);
			this.pbi.addObserver(WOT_PREF + WOT_SEARCH, this, false);
		} catch (e) {
			dump("wot_search.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.pbi) {
				this.pbi.removeObserver(WOT_PREF + WOT_SEARCH, this);
				this.pbi = null;
			}
		} catch (e) {
			dump("wot_search.unload: failed with " + e + "\n");
		}
	},

	/* Parsing */

	setint: function(entry, value)
	{
		return this.setchar(entry, value, true);
	},

	setchar: function(entry, value, is_number)
	{
		try {
			var sr = wot_storage.get("search", {});
			if (value !== null && value !== undefined) {
				sr[entry] = value;
			} else {
				delete sr[entry];
			}
			wot_storage.set("search", sr);
			return true;
		} catch (e) {
			dump("wot_search.setchar: failed with " + e + "\n");
		}

		return false;
	},

	getrule: function (entry, def_value) {
		// extend entry name to fully qualified (prepended with "search.")
		var fullentry = entry.indexOf("search") == 0 ? entry : "search." + entry,
			val = this._searchrules[fullentry];
		return val === undefined ? def_value : val;
	},

	parsecontentrules: function(base, child)
	{
		try {
			var attr = 0, value = 0;
			var node = child.firstChild;

			while (node) {
				if (node.nodeName == WOT_SEARCH_CONTENT_ATTR) {
					/* Attribute rule */
					var key = base + WOT_SEARCH_CONTENT_ATTR + attr + ".";

					/* Flags (optional) */
					this.setchar(key + WOT_SEARCH_CONTENT_FLAGS,
						node.getAttribute(WOT_SEARCH_CONTENT_FLAGS));

					/* Attribute name and regexp */
					if (this.setchar(key + WOT_SEARCH_CONTENT_NAME,
							node.getAttribute(WOT_SEARCH_CONTENT_NAME)) &&
						this.setchar(key + WOT_SEARCH_CONTENT_RE,
							node.getAttribute(WOT_SEARCH_CONTENT_RE))) {
						++attr;
					} else {
//						wot_prefs.deleteBranch(key);
						this.setchar(key + WOT_SEARCH_CONTENT_FLAGS, null);
						this.setchar(key + WOT_SEARCH_CONTENT_NAME, null);
						this.setchar(key + WOT_SEARCH_CONTENT_RE, null);
					}
				} else if (node.nodeName == WOT_SEARCH_CONTENT_VALUE) {
					/* Value rule */
					var key = base + WOT_SEARCH_CONTENT_VALUE + value + ".";

					/* Flags (optional) */
					this.setchar(key + WOT_SEARCH_CONTENT_FLAGS,
						node.getAttribute(WOT_SEARCH_CONTENT_FLAGS));

					/* Regexp */
					if (this.setchar(key + WOT_SEARCH_CONTENT_RE,
							node.getAttribute(WOT_SEARCH_CONTENT_RE))) {
						++value;
					} else {
//						wot_prefs.deleteBranch(key);
						this.setchar(key + WOT_SEARCH_CONTENT_FLAGS, null);
						this.setchar(key + WOT_SEARCH_CONTENT_RE, null);
					}
				}

				node = node.nextSibling;
			}
		} catch (e) {
			dump("wot_search.parsecontentrules: failed with " + e + "\n");
		}
	},

	parsematchrule: function(base, child, match)
	{
		try {
			var entry = base + child.nodeName + match + ".";

			/* Condition */
			var cond = child.getAttribute(WOT_SEARCH_MATCH_COND);
			this.setchar(entry + WOT_SEARCH_MATCH_COND, cond);

			if (cond) {
				var index = 0;
				var node = child.firstChild;

				/* Subrules */
				while (node) {
					if (node.nodeName == WOT_SEARCH_MATCH) {
						this.parsematchrule(entry, node, index++);
					}

					node = node.nextSibling;
				}

				return;
			}

			/* Document (optional) */
			this.setchar(entry + WOT_SEARCH_MATCH_DOC,
				child.getAttribute(WOT_SEARCH_MATCH_DOC));

			/* Element */
			if (!this.setchar(entry + WOT_SEARCH_MATCH_ELEM,
					child.getAttribute(WOT_SEARCH_MATCH_ELEM))) {
				return;
			}

			/* Content rules */
			this.parsecontentrules(entry, child);
		} catch (e) {
			dump("wot_search.parsematchrule: failed with " + e + "\n");
		}
	},

	parseprerule: function(base, child, pre)
	{
		try {
			var entry = base + WOT_SEARCH_PRE + pre + ".";

			if (this.setchar(entry + WOT_SEARCH_PRE_RE,
					child.getAttribute(WOT_SEARCH_PRE_RE)) &&
				this.setint(entry + WOT_SEARCH_PRE_MATCH,
					child.getAttribute(WOT_SEARCH_PRE_MATCH))) {
				return true;
			} else {
//				wot_prefs.deleteBranch(entry);
				this.setchar(entry + WOT_SEARCH_PRE_RE, null);
				this.setchar(entry + WOT_SEARCH_PRE_MATCH, null);
			}
		} catch (e) {
			dump("wot_search.parseprerule: failed with " + e + "\n");
		}

		return false;
	},

	parserule: function(node)
	{
		try {
			var name = node.getAttribute(WOT_SERVICE_XML_UPDATE_SEARCH_NAME);

			if (!name) {
				return;
			}

			var base = WOT_SEARCH + "." + name + ".";
			var enabled = wot_prefs.getBool(base + WOT_SEARCH_ENABLED, true);

			wot_prefs.deleteBranch(base);

			/* Don't forget the enabled status */
			if (!enabled) {
				wot_prefs.setBool(base + WOT_SEARCH_ENABLED, enabled);
			}

			var url = node.getAttribute(WOT_SEARCH_URL);
			var display = node.getAttribute(WOT_SEARCH_DISPLAY);

			if (!url || !display) {
				return;
			}

			var remove = node.getAttribute(WOT_SEARCH_REMOVE);

			if (remove && remove.toLowerCase() == "true") {
				return;
			}

			for (var j = 0; j < this.attrstr.length; ++j) {
				this.setchar(base + this.attrstr[j],
					node.getAttribute(this.attrstr[j]));
			}

			for (var j = 0; j < this.attrint.length; ++j) {
				this.setint(base + this.attrint[j],
					node.getAttribute(this.attrint[j]));
			}

			var index = [];
			var child = node.firstChild;

			while (child) {
				var elem = child.nodeName;

				if (elem) {
					index[elem] = index[elem] || 0;

					if (elem == WOT_SEARCH_PRE) {
						this.parseprerule(base, child, index[elem]++);
					} else if (elem == WOT_SEARCH_MATCH ||
							   elem == WOT_SEARCH_POPUP) {
						this.parsematchrule(base, child, index[elem]++);
					} else if (elem == WOT_SEARCH_TARGET) {
						this.parsecontentrules(base + WOT_SEARCH_TARGET + ".",
							child);
					}
				}

				child = child.nextSibling;
			}
		} catch (e) {
			dump("wot_search.parserule: failed with " + e + "\n");
		}
	},

	parse: function(search)
	{
		try {
			this.loading = true;

			wot_storage.set("search", {});  // clear stored search rules and start from scratch

			for (var i = 0; i < search.length; ++i) {
				this.parserule(search[i]);
			}
			wot_storage.flush(true);
			this.sync();

		} catch (e) {
			dump("wot_search.parse: failed with " + e + "\n");
		}

		this.loading = false;
	},

	/* Loading */

	observe: function(subject, topic, state)
	{
		try {
			if (!this.loading && topic == "nsPref:changed") {
				this.sync();
			}
		} catch (e) {
			dump("wot_search.observe: failed with " + e + "\n");
		}
	},

	loadruletree: function(node, pref, next)
	{
		try {
			/* 1 = array, 2 = index, 4 = next */
			var m = next.match(RegExp("^([^\d\.]+)(\\d+)(\.(.+))?"));

			if (m && m[1] && m[2] != null && m[4]) {
				var name = m[1], index = Number(m[2]);

				node[name] = node[name] || [];
				node[name][index] =
					this.loadruletree(node[name][index] || {}, pref, m[4]);
			} else {
				node[next] = this.getrule(pref, "");
			}

			return node;
		} catch (e) {
			dump("wot_search.loadmatch: failed with " + e + "\n");
		}

		return null;
	},

	loadmatchrule: function(name, attr, pref, index, next)
	{
		try {
			this.rules[name][attr] = this.rules[name][attr] || {
				match: [],
				condition: "and"
			};

			this.rules[name][attr].match[index] =
				this.loadruletree(this.rules[name][attr].match[index] || {},
					pref, next);
		} catch (e) {
			dump("wot_search.loadmatchrule: failed with " + e + "\n");
		}
	},

	loadprerule: function(name, pref, index, attr)
	{
		try {
			this.rules[name].pre = this.rules[name].pre || [];
			this.rules[name].pre[index] = this.rules[name].pre[index] || {};

			if (attr == WOT_SEARCH_PRE_MATCH) {
				this.rules[name].pre[index][attr] = this.getrule(pref, 0);
			} else if (attr == WOT_SEARCH_PRE_RE) {
				this.rules[name].pre[index][attr] = this.getrule(pref, "");
			}
		} catch (e) {
			dump("wot_search.loadprerule: failed with " + e + "\n");
		}
	},

	loadrule: function(rule)
	{
		try {
			/* 1 = name, 4 = attribute, 5 = attribute index, 7 = next */
			var m = rule.match(/^([^\.]+)(\.(([^\.\d]+)(\d+)?)(\.(.+))?)?/);

			if (!m) {
				return;
			}

			var name = m[1], attr = m[4], index = Number(m[5]), next = m[7];

			if (!name || !attr) {
				return;
			}

			if (!this.rules[name]) {
				this.rules[name] = {
					rule:    name,
					enabled: true
				};
			}

			var pref = WOT_SEARCH + "." + rule;

			if (m[5] != null && next) {
				if (attr == WOT_SEARCH_PRE) {
					this.loadprerule(name, pref, index, next);
				} else if (attr == WOT_SEARCH_MATCH ||
						attr == WOT_SEARCH_POPUP) {
					this.loadmatchrule(name, attr, pref, index, next);
				}
			} else if (attr == WOT_SEARCH_TARGET) {
				this.rules[name].target =
					this.loadruletree(this.rules[name].target || {},
						pref, next);
			} else if (this.attrint.indexOf(attr) >= 0) {
				this.rules[name][attr] = this.getrule(pref, 0);
			} else if (this.attrstr.indexOf(attr) >= 0) {
				this.rules[name][attr] = this.getrule(pref, "");
			} else {
				this.rules[name][attr] = this.getrule(pref, true);
			}
		} catch (e) {
			wot_tools.wdump("wot_search.loadrule: failed with " + e);
		}
	},

	sync: function()
	{
		try {
			this.rules = {};
			this._searchrules = wot_storage.get("search", {});

			var keyword = "search.",
				kw_len = keyword.length;

			for (var i in this._searchrules) {
				if (!this._searchrules.hasOwnProperty(i)) continue;
				if (i.indexOf(keyword) == 0) {  // remove prepending "search." keyword
					i = i.slice(kw_len);
				}
				this.loadrule(i);
			}
		} catch (e) {
			wot_tools.wdump("wot_search.sync: failed with " + e);
		}
	},

	/* Processing */

	domcontentloaded: function(event)
	{
        try {   // Workaround to resolve "TypeError: can't access dead object" at start of the browser
            if (!event.originalTarget) {
	            wot_tools.wdump("event.originalTarget is undefined");
	            return;
            }
        } catch (e) {
	        return; } // do nothing

		try {
			event.originalTarget.wot_domloaded = Date.now();
			wot_search.watch(event.originalTarget);
		} catch (e) {
			wot_tools.wdump("wot_search.domcontentloaded: failed with " + e);
		}
	},

	pageshow: function(event)
	{
        try {   // Workaround to resolve "TypeError: can't access dead object" at start of the browser
            if (!event.originalTarget) {
	            wot_tools.wdump("event.originalTarget is undefined");
	            return;
            }
        } catch (e) {
	        return; } // do nothing

		if (event.originalTarget) {
			var wot_domloaded = event.originalTarget.wot_domloaded || 0;
			// check when the last domcontentloaded event was raised,
			// and if it was long ago, force to watch the DOM again (workaround for caching issue #74)
			if (Date.now() - wot_domloaded > 800) {
				wot_search.watch(event.originalTarget);
			}
		}
	},

	watch: function(content)
	{
		try {
			var rule = wot_search.process(content);

			if (rule) {
				if (!rule.dynamic && !content.defaultView.frameElement) {
					return;
				}
			} else if (!wot_prefs.prefetch) {
				return;
			}

			var mo = new MutationObserver(function(mutations, observer) {
					observer.disconnect();
					delete(observer);

					window.setTimeout(function() {
							wot_search.watch(content);
						}, 500);
				});

			mo.observe(content, {
				attributes: true, childList: true, subtree: true
			});
		} catch (e) {
			wot_tools.wdump("wot_search.watch: failed with " + e);
		}
	},

	processrule: function(link, rule)
	{
		try {
			var url = link.href;
			var target = null;

			/* Preprocess the link */
			if (rule.pre) {
				for (var i = 0; i < rule.pre.length; ++i) {
					if (!rule.pre[i].re) {
						continue;
					}

					var m = new RegExp(rule.pre[i].re).exec(url);

					if (m && m[rule.pre[i].match]) {
						url = decodeURIComponent(m[rule.pre[i].match]);
						target = wot_idn.utftoidn(wot_url.gethostname(url));
						break;
					}
				}
			}

			/* See if ignored */
			if (rule.ign && new RegExp(rule.ign).test(url)) {
				return null;
			}

			/* Find target hostname */
			if (!target) {
				target = wot_idn.utftoidn(wot_url.gethostname(url));
			}

			/* Match by element if we have a target rule */
			if (target && rule.target &&
					!this.matchelement(rule.target, link)) {
				return null;
			}

			return target;
		} catch (e) {
			dump("wot_search.processrule: failed with " + e + "\n");
		}

		return null;
	},

	is_ninja: function(rule)
	{
		return rule.ninja && wot_prefs.ninja_donuts;
	},

	addrating: function(target, content, link, rule)
	{
		try {
			// ninja - is experimental feature to make donuts on the SERP hidden
			var is_ninja = this.is_ninja(rule);
			var elem = content.createElement("div");

			if (elem) {

				var link_parent = link.parentNode;

				elem.setAttribute(this.attribute, target);

				if(is_ninja) elem.setAttribute("class", "invisible");

				elem.setAttribute("style", "cursor: pointer; " +
					"width: 16px; " +
					"height: 16px;" +
					"display: inline-block;");

				elem.appendChild(document.createTextNode("\u00A0"));
				elem.addEventListener("click", this.onclick, false);

				if(is_ninja) {

					var ninja_timer = null,
						visibility = null;

					// clojure
					var set_visibility = function set_visibility() {
						elem.setAttribute("class", visibility);
					};

					var do_ninja = function do_ninja(event) {
						// It needs to be called as clojure to access "elem"

						if (ninja_timer) clearTimeout(ninja_timer);

						if(event.type == "mouseout") {

							visibility = "invisible";
							// delay, to prevent premature hiding causes by bubled events from element's children
							ninja_timer = setTimeout(set_visibility, 100);
							return;
						} else {
							visibility = "visible";
						}

						set_visibility();
					};

					// use parent to avoid hiding donut when cursor moves to it but goes out of the link
					link_parent.addEventListener("mouseover", do_ninja, false);
					link_parent.addEventListener("mouseout", do_ninja, false);
				}

				if (link.nextSibling) {
					link.parentNode.insertBefore(elem, link.nextSibling);
				} else {
					link.parentNode.appendChild(elem);
				}
			}
		} catch (e) {
			dump("wot_search.addrating: failed with " + e + "\n");
		}
	},

	matchregexp: function(spec, data)
	{
		try {
			/* Custom flags:
				- n = negative match
				*/
			var flags = spec.flags || "";
			var rv = new RegExp(spec.re, flags.replace("n", "")).test(data);

			return (flags.indexOf("n") < 0) ? rv : !rv;
		} catch (e) {
			dump("wot_search.matchregexp: failed with " + e + "\n");
		}

		return false;
	},

	matchelement: function(match, elem)
	{
		var i;

		try {
			/* Match by attributes */
			if (match.attribute && match.attribute.length) {
				for (i = 0; i < match.attribute.length; ++i) {
					if (!match.attribute[i].name || !match.attribute[i].re) {
						continue;
					}

					if (!elem.hasAttribute(match.attribute[i].name) ||
							!this.matchregexp(match.attribute[i],
								elem.getAttribute(match.attribute[i].name))) {
						return false;
					}
				}
			}

			/* Match by content */
			if (match.value && match.value.length) {
				if (!elem.hasChildNodes()) {
					return false;
				}

				for (i = 0; i < match.value.length; ++i) {
					if (!match.value[i].re) {
						continue;
					}

					if (!this.matchregexp(match.value[i], elem.innerHTML)) {
						return false;
					}
				}
			}

			return true;
		} catch (e) {
			dump("wot_search.matchelement: failed with " + e + "\n");
		}

		return false;
	},

	findmatchingelement: function(match, content)
	{
		try {
			var set = [];

			if (match.element == "$frame") {
				set.push(content.defaultView.frameElement);
			} else {
				var docelem = content;

				if (match.document == "$parent" &&
						content.defaultView.parent) {
					docelem = content.defaultView.parent.document;
				}

				if (!docelem) {
					return null;
				}

				if (/^#/.test(match.element)) {
					set.push(docelem.getElementById(
						match.element.replace(/^#/, "")));
				} else {
					set = docelem.getElementsByTagName(match.element);
				}
			}

			if (set && set.length) {
				/* One matching element is enough */
				for (var i = 0; i < set.length; ++i) {
					if (set[i] && this.matchelement(match, set[i])) {
						return set[i];
					}
				}
			}
		} catch (e) {
			dump("wot_search.findmatchingelement: failed with " + e + "\n");
		}

		return null;
	},

	matchcontent: function(match, content)
	{
		try {
			/* Process conditional rules */
			if (match.condition && match.match) {
				for (var i = 0; i < match.match.length; ++i) {
					var rv = this.matchcontent(match.match[i], content);

					if (match.condition == "or" && rv) {
						return true;
					} else if (match.condition == "and" && !rv) {
						return false;
					}
				}

				return (match.match.length == 0 || match.condition == "and");
			}

			/* See if there's a matching element */
			if (match.element &&
					this.findmatchingelement(match, content)) {
				return true;
			}
		} catch (e) {
			dump("wot_search.matchcontent: failed with " + e + "\n");
		}

		return false;
	},

	matchrule: function(content, url)
	{
		try {
			var rule = null;

			for (var i in this.rules) {
				if (!this.rules[i].enabled || !this.rules[i].url) {
					continue;
				}

				/* Match by URL */
				if (!RegExp(this.rules[i].url).test(url) ||
						(this.rules[i].urlign &&
						 RegExp(this.rules[i].urlign).test(url))) {
					continue;
				}

				rule = this.rules[i];
				break;
			}

			return rule;
		} catch (e) {
			dump("wot_search.matchrule: failed with " + e + "\n");
		}

		return null;
	},

	process: function(content)
	{
		try {
			if (!wot_util.isenabled() || !content || !content.links) {
				return null;
			}

			var url = null;

			if (content.location && content.location.href) {
				url = content.location.href;
			}

			if (!url) {
				return null;
			}

			/* Using about:blank in a frame isn't cool, btw */
			if (url == "about:blank" &&
					content.defaultView.frameElement &&
					content.defaultView.frameElement.baseURI) {
				url = content.defaultView.frameElement.baseURI;
			}

			/* URL match */
			var rule = this.matchrule(content, url);

			if (!rule && !wot_prefs.prefetch) {
				return null; /* If in prefetch mode, continue anyway */
			}

			var contentmatch = true;

			if (rule && rule.match) {
				/* Content match */
				contentmatch = this.matchcontent(rule.match, content);

				if (!contentmatch && !wot_prefs.prefetch) {
					/* Return the rule anyway so we can keep an eye on content
					  	changes */
					return rule;
				}
			}

			var haspopup = false;

			if (rule && contentmatch) {
				if (rule.popup && rule.popup.match &&
						rule.popup.match.length) {
					/* Add only only to the specified element */
					var elem = this.findmatchingelement(rule.popup.match[0],
									content);

					if (elem) {
						haspopup = wot_popup.addpopup(content, elem);
					}
				} else {
					/* Just add to the document */
					haspopup = wot_popup.addpopup(content);
				}
			}

			/* Walk through each link and fetch ratings */
			var cache = {};
			var fetch = {};
			var offline = wot_browser.isoffline();

			for (var i = 0; i < content.links.length; ++i) {
				var link = content.links[i];
				if (link.isContentEditable || link.getAttribute(this.processed) ||
						!link.parentNode) {
					continue; /* Process each link only once */
				}

				var target = null;
				var showrating = false;

				if (rule && contentmatch) {
					target = this.processrule(link, rule);
				}

				if (target) {
					showrating = true;
				} else if (wot_prefs.prefetch) {
					/* Prefetch ratings for all links, not only if ratings are
						shown */
					target = wot_idn.utftoidn(
								wot_url.gethostname(link.href));
				}

				if (!target) {
					continue;
				}

				if (wot_cache.iscached(target) &&
						wot_cache.get(target, "status") != WOT_QUERY_RETRY) {
					cache[target] = target;
				} else {
					fetch[target] = target;
				}

				if (showrating) {
					this.addrating(target, content, link, rule);
				}

				link.setAttribute(this.processed, true);
			}

			if (rule && contentmatch) {
				if (rule.script) {
					this.addscript(content, rule.script);
				}

				if(this.is_ninja(rule)) {
					/* Visibility and CSS transitions for Ninja-donuts */

					var ninja_style =
						"div[" + this.attribute + "] {" +
						"-moz-transition: opacity 0.1s cubic-bezier(0.25,0.1,0.25,1) 0.5s;" +
						"} " +
						"div[" + this.attribute + "].visible {" +
						"-moz-transition: opacity 0s;" +
						"opacity: 1.0;" +
						"} " +
						"div[" + this.attribute + "].invisible {" +
						"opacity: 0.0;" +
						"}";
					this.addstyle(content, ninja_style, "wotninja");
				}

				if (rule.prestyle) {
					this.addstyle(content, this.formatcss(rule.prestyle),
						this.prestyleid);
				}

				/* Add styles for cached ratings */
				this.update(rule, content, cache, offline);
			}

			/* Load missing ratings */
			if (!offline) {
				wot_api_link.send(rule, content, fetch);
			}

			return rule;
		} catch (e) {
			dump("wot_search.process: failed with " + e + "\n");
		}
		return null;
	},

	update: function(rule, content, cache, last)
	{
		try {
			var style = "";

			for (var i in cache) {
				if (wot_cache.iscached(i)) {
					var s = wot_cache.get(i, "status");

					if (s == WOT_QUERY_OK || s == WOT_QUERY_LINK) {
						style += this.getcss(rule, i);
					}
				}
			}

			if (style.length > 0) {
				this.addstyle(content, style);
			}
		} catch (e) {
			dump("wot_search.update: failed with " + e + "\n");
		}
	},

	sandboxapi: {
		loadscript: function(sandbox, url)
		{
			try {
				if (!sandbox || typeof(url) != "string" ||
						!/^https?\:\/\//.test(url)) {
					return;
				}

				var request = new XMLHttpRequest();

				request.open("GET", url);
				new wot_cookie_remover(request);

				request.onload = function() {
					wot_search.sandboxapi.lastloadedscript = {
						url: url,
						code: request.responseText,
						status: request.status,
						time: Date.now()
					};

					if (request.status != 200 || !request.responseText ||
							!request.responseText.length) {
						return;
					}

					try {
						Components.utils.evalInSandbox(request.responseText,
							sandbox);
					} catch (e) {
						dump("wot_search.sandboxapi.loadscript: evalInSandbox " +
							"failed with " + e + "\n");
					}
				};

				request.send(null);
			} catch (e) {
				dump("wot_search.sandboxapi.loadscript: failed with " + e + "\n");
			}
		},

		getlastscript: function(sandbox)
		{
			return this.lastloadedscript;
		},

		getratings: function(sandbox, url)
		{
			try {
				if (typeof(url) != "string") {
					return null;
				}

				var target = wot_idn.utftoidn(wot_url.gethostname(url));

				if (wot_cache.isok(target)) {
					var rv = {
						target: target
					};

					for (var i = 0, a = 0; i < WOT_COMPONENTS.length; ++i) {
                        a = WOT_COMPONENTS[i];
						rv["reputation_" + a] =
							wot_cache.get(target, "reputation_" + a);
						rv["confidence_" + a] =
							wot_cache.get(target, "confidence_" + a);
						rv["testimony_"  + a] =
							wot_cache.get(target, "testimony_"  + a);
						rv["excluded_"  + a] =
							wot_cache.get(target, "excluded_"  + a);
					}

					return rv;
				}
			} catch (e) {
				dump("wot_search.sandboxapi.getratings: failed with " + e +
					"\n");
			}

			return null;
		},

		getpreference: function(sandbox, name)
		{
			try {
				if (typeof(name) != "string") {
					return null;
				}

				var type = wot_prefs.pref.getPrefType(WOT_PREF + name);

				switch (type) {
				case wot_prefs.pref.PREF_STRING:
					return wot_prefs.getChar(name);
				case wot_prefs.pref.PREF_INT:
					return wot_prefs.getInt(name);
				case wot_prefs.pref.PREF_BOOL:
					return wot_prefs.getBool(name);
				}
			} catch (e) {
				dump("wot_search.sandboxapi.getpreference: failed with " + e +
					"\n");
			}

			return null;
		},

		setpreference: function(sandbox, name, value)
		{
			try {
				if (typeof(name) != "string") {
					return false;
				}

				var rv = false;

				switch (typeof(value)) {
				case "string":
					rv = wot_prefs.setChar(name, value);
					break;
				case "number":
					rv = wot_prefs.setInt(name, value.toFixed());
					break;
				case "boolean":
					rv = wot_prefs.setBool(name, value);
					break;
				}

				if (rv) {
					wot_prefs.flush();
					return rv;
				}
			} catch (e) {
				dump("wot_search.sandboxapi.setpreference: failed with " + e +
					"\n");
			}

			return false;
		},

		getapiparams: function(sandbox)
		{
			try {
				return wot_url.getapiparams();
			} catch (e) {
				dump("wot_serach.sandboxapi.getapiparams: failed with " + e +
					"\n");
			}
		}
	},

	getsandboxfunc: function(sandbox, name, obj)
	{
		obj = obj || wot_search.sandboxapi;

		return function() {
			var args = [ sandbox ];

			for (var i = 0; i < arguments.length; ++i) {
				args.push(arguments[i]);
			}

			return obj[name].apply(obj, args);
		};
	},

	addscript: function(content, code)
	{
		try {
			if (!wot_prefs.search_scripts || !code.length) {
				return;
			}

			var sandbox = content.wotsandbox;

			if (!sandbox) {
				var wnd = new XPCNativeWrapper(content.defaultView);
				var sandbox = new Components.utils.Sandbox(wnd, {
					sandboxPrototype: wnd
				});

				sandbox.window = wnd;
				sandbox.document = sandbox.window.document;

				sandbox.wot_loadscript =
					this.getsandboxfunc(sandbox, "loadscript");
				sandbox.wot_getlastscript =
					this.getsandboxfunc(sandbox, "getlastscript");
				sandbox.wot_getratings =
					this.getsandboxfunc(sandbox, "getratings");
				sandbox.wot_getpreference =
					this.getsandboxfunc(sandbox, "getpreference");
				sandbox.wot_setpreference =
					this.getsandboxfunc(sandbox, "setpreference");
				sandbox.wot_getapiparams =
					this.getsandboxfunc(sandbox, "getapiparams");

				content.wotsandbox = sandbox;
			}

			try {
				Components.utils.evalInSandbox(code, sandbox);
			} catch (e) {
				dump("wot_search.addscript: evalInSandbox failed with " +
					e + "\n");
			}
		} catch (e) {
			dump("wot_search.addscript: failed with " + e + "\n");
		}
	},

	addstyle: function(content, css, id)
	{
		try {
			if (id && content.getElementById(id)) {
				return;
			}

			var style = content.createElement("style");

			style.setAttribute("type", "text/css");
			if (id) {
				style.setAttribute("id", id);
			}
			
			var text_node = content.createTextNode(css);
			style.appendChild(text_node);

			var head = content.getElementsByTagName("head");

			if (head && head.length > 0) {
				head[0].appendChild(style);
			}
		} catch (e) {
			dump("wot_search.addstyle: failed with " + e + "\n");
		}
	},

	formatcss: function(css)
	{
		return css.replace(/ATTR/g, this.attribute);
	},

	getreputation: function(name)
	{
		try {
			var status = wot_cache.get(name, "status");

			if (status != WOT_QUERY_OK && status != WOT_QUERY_LINK) {
				return -1;
			}

			if (wot_cache.get(name, "excluded_0")) {
				return -2;
			}

			var r = wot_cache.get(name, "reputation_0");

            // respect "Parental control" setting and use the worst reputation between app0 and app4
            if (wot_prefs.warning_level_4 > 0) {
                var r_app4 = wot_cache.get(name, "reputation_4");
                if (r_app4 >= 0 && r_app4 < r) {
                    r = r_app4;
                }
			}

			return r;
		} catch (e) {
			dump("wot_search.getreputation: failed with " + e + "\n");
		}

		return -1;
	},

	getcss: function(rule, name)
	{
		try {
			if (!rule.style) {
				return "";
			}

			var r = this.getreputation(name);

			if ((wot_prefs.use_search_level && r >= wot_prefs.search_level) ||
					(rule.searchlevel != null && r >= rule.searchlevel)) {
				return "";
			}

			var css = this.formatcss(rule.style);
			css = css.replace(/NAME/g, name);

			return css.replace(/IMAGE/g, wot_ui.geticonurl(r, 16, true));
		} catch (e) {
			dump("wot_search.getcss: failed with " + e + "\n");
		}

		return "";
	},

	onclick: function(event)
	{
		try {
			var target = event.originalTarget.getAttribute(wot_search.attribute);
			if (target) {
				wot_browser.openscorecard(target, null, WOT_URL_POPUPDONUTS);
				event.stopPropagation();
			}
		} catch (e) {
			dump("wot_search.onclick: failed with " + e + "\n");
		}
	}
};

wot_modules.push({ name: "wot_search", obj: wot_search });
