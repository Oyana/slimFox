/*
	popup.js
	Copyright © 2006 - 2013  WOT Services Oy <info@mywot.com>

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

const WOT_POPUP_HTML =
    '<div id="wot-logo">{POPUPHEADERTEXT}</div>' +
        '<div id="wot-ratings{ID}" class="wot-ratings">' +
        '<div id="wot-hostname"></div>' +
        '<div id="wot-r0-stack{ID}" class="wot-stack wot-stack-left">' +
        '<div id="wot-r0-header{ID}" class="wot-header">{POPUPTEXT0}</div>' +
        '<div id="wot-r0-rep{ID}" class="wot-rep"></div>' +
	    '<div id="wot-r0-cnf{ID}" class="wot-rating-confidence">' +
		    '<div class="confidence-dot confidence-dot-1"></div>' +
		    '<div class="confidence-dot confidence-dot-2"></div>' +
		    '<div class="confidence-dot confidence-dot-3"></div>' +
		    '<div class="confidence-dot confidence-dot-4"></div>' +
		    '<div class="confidence-dot confidence-dot-5"></div>' +
	    "</div>" +
        '<div class="rating-legend-wrapper">' +
            '<div class="rating-legend">{REPTEXT0}</div>' +
        '</div>' +

        '</div>' +
        '<div id="wot-r4-stack{ID}" class="wot-stack wot-stack-right">' +
        '<div id="wot-r4-header{ID}" class="wot-header">{POPUPTEXT4}</div>' +
        '<div id="wot-r4-rep{ID}" class="wot-rep"></div>' +
	    '<div id="wot-r4-cnf{ID}" class="wot-rating-confidence">' +
		    '<div class="confidence-dot confidence-dot-1"></div>' +
		    '<div class="confidence-dot confidence-dot-2"></div>' +
		    '<div class="confidence-dot confidence-dot-3"></div>' +
		    '<div class="confidence-dot confidence-dot-4"></div>' +
		    '<div class="confidence-dot confidence-dot-5"></div>' +
	    "</div>" +
        '<div class="rating-legend-wrapper">' +
            '<div class="rating-legend">{REPTEXT4}</div>' +
        '</div>' +

        '</div>' +
        '</div>' +
        '<div id="wot-categories">' +
        '<div id="wot-cat-text">{POPUPNOCAT}</div>' +
        '<ul id="wot-cat-list"></ul>' +
        '</div>' +
        '<div class="wot-corners-wrapper">' +
        '<div id="wot-pp-tr" class="wot-pp-tr"></div>' +
        '<div id="wot-pp-cs" class="wot-pp-cs"></div>' +
        '</div>';

const WOT_POPUP_STYLE = "@import \"chrome://wot/skin/include/popup.css\";";

var wot_popup =
{
	offsety:		-15,
	offsetx:		4,
	height:			220,
	width:			300,
//	ratingheight:	52,
//	areaheight:		214,
	barsize:		20,
	offsetheight:	0,
	postfix:		"-" + Date.now(),
	id:				"wot-popup-layer",
	onpopup:		false,
    layer:          null,
    MAX_CATEGORIES: 3,

	load_delayed: function()
	{
		try {
			if (this.browser) {
				return;
			}

			this.appearance = 0;
			this.browser = document.getElementById("appcontent");
			this.id += this.postfix;

			if (this.browser) {
				this.browser.addEventListener("mouseover",
					wot_popup.onmouseover, false);
			}
		} catch (e) {
			dump("wot_popup.load: failed with " + e + "\n");
		}
	},

	unload: function()
	{
		try {
			if (this.browser) {
				this.browser.removeEventListener("mouseover",
						wot_popup.onmouseover, false);
				this.browser = null;
			}
		} catch (e) {
			dump("wot_popup.unload: failed with " + e + "\n");
		}
	},

	addpopup: function(content, elem)
	{
		try {
			if (!wot_prefs.show_search_popup) {
                return false;
            }

            var replaces = [
                { from: "ID", to: this.postfix },
                { from: "POPUPTEXT0", to: wot_util.getstring("components_0") },
                { from: "POPUPTEXT4", to: wot_util.getstring("components_4") },
                { from: "POPUPHEADERTEXT", to: wot_util.getstring("popup_headertext") },
                { from: "POPUPNOCAT", to: wot_util.getstring("popup_nocattext") }
            ];

			if (!this.layer) {
				this.layer = wot_util.processhtml(WOT_POPUP_HTML, replaces);
			}

			if (content.getElementById(this.id)) {
				return true;
			}

            if (!elem) {
                var body = content.getElementsByTagName("body");

                if (body && body.length) {
                    elem = body[0];
                }

                if (!elem) return false;
            }

            if (elem.isContentEditable) return false;

            // var layer = content.createElement("div");
            var layer = wot_util.parse_string_to_html_dom(this.layer);
            var accessible_cls = wot_prefs.accessible ? " wot-popup-layer-accessible" : "";

			layer.setAttribute("id", this.id);
			layer.setAttribute("class", "wot-popup-layer" + accessible_cls);
			layer.setAttribute("style", "visibility: hidden;");

			var style = content.createElement("style");
			style.setAttribute("type", "text/css");
			style.appendChild(content.createTextNode(WOT_POPUP_STYLE));

			var head = content.getElementsByTagName("head");

			if (!elem || !head || !head.length) {
				return false;
			}

			layer.addEventListener("click", function() {
					wot_browser.openscorecard(layer.getAttribute("target"), null, WOT_URL_POPUPVIEWSC);
				}, false);

			elem.appendChild(layer);
			head[0].appendChild(style);

			return true;
		} catch (e) {
			dump("wot_popup.addpopup: failed with " + e + "\n");
		}
		return false;
	},

	loadlayer: function(content, layer, target)
	{
		try {
			var status = wot_cache.get(target, "status"),
                tr_t, cs_t, r, c, x, t;

			if (status != WOT_QUERY_OK && status != WOT_QUERY_LINK) {
				return false;
			}

			for (var i = 0; i < WOT_COMPONENTS.length; ++i) {
                var app = WOT_COMPONENTS[i];
				var rep_elem = content.getElementById("wot-r" + app + "-rep" + this.postfix);
				var cnf_elem = content.getElementById("wot-r" + app + "-cnf" + this.postfix);

				if (!rep_elem || !cnf_elem) {
					continue;
				}

				r = wot_cache.get(target, "reputation_" + app),
				c = wot_cache.get(target, "confidence_" + app),
		        x = wot_cache.get(target, "excluded_" + app),
                t = wot_util.get_level(WOT_REPUTATIONLEVELS, wot_cache.get(target, "testimony_" + app)).name;

                r = x ? -2 : r; // if Excluded is set, select proper rep level (rx);
                rep_elem.setAttribute("reputation", wot_util.get_level(WOT_REPUTATIONLEVELS, r).name);

                c = x ? -2 : c;
			    cnf_elem.setAttribute("confidence", wot_util.get_level(WOT_CONFIDENCELEVELS, c).name);

                // set testimonies for TR and CS to bottom corners of the popup testimony_
                if (app == 0) {
                    tr_t = t;
                } else if (app == 4) {
                    cs_t = t;
                }
			}

            // set target name
            var normalized_target = wot_cache.get(target, "normalized") || null;

            var hostname_elem = content.getElementById("wot-hostname");
            if (hostname_elem) {
                var display_target = normalized_target && normalized_target.length ? normalized_target : target;
                hostname_elem.textContent = wot_util.htmlescape(wot_shared.decodehostname(display_target));
            }

            // show user's ratings for the site
            if (wot_prefs.super_showtestimonies) {
                var tr_t_corner = content.getElementById("wot-pp-tr");
                if (tr_t_corner && tr_t) {
                    tr_t_corner.setAttribute("r", tr_t);
                }

                var cs_t_corner = content.getElementById("wot-pp-cs");
                if (cs_t_corner && cs_t) {
                    cs_t_corner.setAttribute("r", cs_t);
                }
            }

            // Update categories in the popup
            var target_cats = wot_categories.target_categories(target),
                cats = wot_categories.select_identified(target_cats),
                cat_list = content.getElementById("wot-cat-list"),
                cat_text = content.getElementById("wot-cat-text");

            if (cats && !wot_util.isEmpty(cats) && cat_list) {
                var ordered_cats = wot_categories.rearrange_categories(cats);
                cat_text.style.display = "none";
                if (wot_popup.update_categories(cat_list, ordered_cats.all, content) > 0) {
                    wot_popup.toggle_categories(true, content); // show categories
                } else {
                    wot_popup.toggle_categories(false, content);
                }

            } else {
                wot_popup.toggle_categories(false, content); // hide categories list
            }



			return true;

		} catch (e) {
			wot_tools.wdump("wot_popup.loadlayer: failed with " + e);
		}
		return false;
	},

    toggle_categories: function (show, content) {
        var cat_list = content.getElementById("wot-cat-list"),
            cat_text = content.getElementById("wot-cat-text");
        if (cat_list && cat_text) {
            if (show) {
                cat_text.style.display = "none";
                cat_list.style.display = "block";
            }
            else {
                cat_text.style.display = "block";
                cat_list.style.display = "none";
            }
        }
    },

    update_categories: function (list_node, categories, content) {
        var cnt = 0;

        // remove all list items
        while(list_node.firstChild) {
            list_node.removeChild(list_node.firstChild);
        }

        for (var k in categories) {
            if (cnt >= this.MAX_CATEGORIES) break;

            var cat = categories[k],
                cid = cat.id,
                li = content.createElement("li"),
                cls = ["cat-item"],
                cat_name = wot_categories.get_category_name(cid, true); // name is already htmlescaped

            if (!cat_name) {
                continue;   // skip undefined categories, don't take them into account
            }

            cls.push(wot_categories.get_category_css(cid)); // css type is already htmlescaped
            var cl = wot_util.get_level(WOT_CONFIDENCELEVELS, cat.c).name;
            cls.push(cl);

            li.textContent = cat_name;
            li.setAttribute("class", cls.join(" "));

            cnt++;
            list_node.appendChild(li);
        }

        return cnt;
    },

	hidelayer: function(content, appearance)
	{
		try {
			var layer = content.getElementById(this.id);

			if (layer && layer.style.visibility != "hidden" &&
					(appearance == null || appearance == this.appearance) &&
					!this.onpopup) {
				layer.style.visibility = "hidden";
			}
		} catch (e) {
			/* dump("wot_popup.hidelayer: failed with " + e + "\n"); */
		}
	},

	findelem: function(event)
	{
		try {
			var elem = event.originalTarget;
			var attr = null;
			var onpopup = false;

			while (elem) {
				if (elem.attributes) {
					attr = elem.attributes.getNamedItem(wot_search.attribute);
					if (attr && attr.value) {
						break;
					}
					attr = null;
					if (elem.id == this.id) {
						onpopup = true;
					}
				}
				elem = elem.parentNode;
			}

			this.onpopup = onpopup;

			if (!elem || !attr) {
				return null;
			}

			return elem;
		} catch (e) {
			dump("wot_popup.findelem: failed with " + e + "\n");
		}
		return null;
	},

	onmouseover: function(event)
	{
		try {

            var event_view = event.view; // workaround for FF Nightly 22.0a1 (when this object is accessed second time, it is null)

			if (!wot_util.isenabled() || !wot_prefs.show_search_popup || !event_view) {
				return;
			}

			var content = event_view.document;

			if (!content) return;

			var layer = content.getElementById(wot_popup.id);

			if (!layer) return;

			wot_popup.target = wot_popup.findelem(event);

			if (!wot_popup.target) {
				var appearance = wot_popup.appearance;

				window.setTimeout(function() {
						wot_popup.hidelayer(content, appearance);
					}, wot_prefs.popup_hide_delay);

				return;
			}

			var attr = wot_popup.target.attributes.getNamedItem(wot_search.attribute),
			    target = attr.value;

			if (layer.style.visibility == "visible" &&
					layer.getAttribute("target") == target) {
				return;
			}

			layer.setAttribute("target", target);

			if (!wot_popup.loadlayer(content, layer, target)) {
				wot_popup.hidelayer(content);
				return;
			}

            var style = event_view.getComputedStyle(layer),
                popupheight = Math.max(isNaN(style.height) ? 0 : style.height , wot_popup.height),
                popupwidth = style.width || wot_popup.width;

			var height = parseInt(event_view.innerHeight - wot_popup.barsize);
			var width  = 0 + event_view.innerWidth  - wot_popup.barsize;

			if (height < popupheight ||	width < popupwidth) {
				wot_popup.hidelayer(content);
				return;
			}

			var vscroll = isNaN(event_view.pageYOffset) ? 0 : parseInt(event_view.pageYOffset);
			var hscroll = isNaN(event_view.pageXOffset) ? 0 : parseInt(event_view.pageXOffset);

			// more accurate way to calc position
			// got from http://javascript.ru/ui/offset
			var elem = wot_popup.target;
			var box = elem.getBoundingClientRect();

			var docElem = content.documentElement;
			var body = content.body;

            var y_offset = 0;   // vertical offset for the pointer (which is not implemented yet)

            var scrollTop = event_view.pageYOffset || docElem.scrollTop || body.scrollTop;
			var scrollLeft = event_view.pageXOffset || docElem.scrollLeft || body.scrollLeft;
			var clientTop = docElem.clientTop || body.clientTop || 0;
			var clientLeft = docElem.clientLeft || body.clientLeft || 0;
			var y  = box.top +  scrollTop - clientTop;
			var x = box.left + scrollLeft - clientLeft;

			var posy = wot_popup.offsety + y;// + wot_popup.target.offsetHeight;
			var posx = wot_popup.offsetx + x + wot_popup.target.offsetWidth;

            if (posy < vscroll) {
                // if placeholder's top doesn't fit into view, align it to the view
                posy = vscroll;
            }

			if (posy + popupheight > height + vscroll) {
                if (posy < height + vscroll) {
                    y_offset = height + vscroll - y;
                }
                posy = (y - popupheight + height + vscroll + wot_popup.offsety)/2;
			}

			if (posx - hscroll < 0) {
				posx = hscroll;
			} else if ((posx + wot_popup.width) > (width + hscroll)) {
				posx = width - wot_popup.width + hscroll;
			}

			var appearance = ++wot_popup.appearance;

			if (layer.style.visibility != "hidden") {
				layer.style.top  = posy + "px";
				layer.style.left = posx + "px";
			} else {
				window.setTimeout(function() {
						if (wot_popup.target &&
								appearance == wot_popup.appearance) {
							layer.style.top  = posy + "px";
							layer.style.left = posx + "px";
							layer.style.visibility = "visible";
						}
					}, wot_prefs.popup_show_delay);
			}
		} catch (e) {
			wot_tools.wdump("wot_popup.onmouseover: failed with " + e);
		}
	}
};

wot_modules.push({ name: "wot_popup", obj: wot_popup });
