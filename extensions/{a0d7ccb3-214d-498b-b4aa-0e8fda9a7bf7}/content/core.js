/*
	core.js
	Copyright © 2005 - 2013  WOT Services Oy <info@mywot.com>

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

function wot_listener(browser)
{
	this.browser = browser;
}

wot_listener.prototype =
{
	browser: null,

	aborted: 0x804b0002, /* NS_BINDING_ABORTED */

	loading: Components.interfaces.nsIWebProgressListener.STATE_START |
			 Components.interfaces.nsIWebProgressListener.STATE_REDIRECTING |
			 Components.interfaces.nsIWebProgressListener.STATE_TRANSFERRING |
			 Components.interfaces.nsIWebProgressListener.STATE_NEGOTIATING,

	finish_loading: Components.interfaces.nsIWebProgressListener.STATE_STOP ,

	same_document : Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT,

	isdocument: Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT,

	abort: function(request)
	{
		request.cancel(this.aborted);
	},

	QueryInterface: function(iid)
	{
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsISupportsWeakReference) &&
			!iid.equals(Components.interfaces.nsIWebProgressListener)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	},

	onLocationChange: function(browser, progress, request, location)
	{
		// browser - type="content-primary"
		try {
			if (progress.DOMWindow != browser.contentWindow) {
				return;
			}

			var tabUrl = location.spec;
			if (location) {
				wot_core.block(this, request, tabUrl, browser);
			}
			wot_core.update(browser);

			if (tabUrl && wot_stats.isWebURL(tabUrl)) {
				var ref = browser.contentDocument.referrer;
				if (request && request.referrer && typeof(request.referrer) != undefined) {
					ref = request.referrer.asciiSpec;
				}

				wot_stats.loc(tabUrl, ref);
			}
		} catch(e) { }
	},

	onProgressChange: function(progress, request, curSelfProgress,
		maxSelfProgress, curTotalProgress, maxTotalProgress)
	{
	},

	onStateChange: function(browser, progress, request, flags, status)
	{
		try {
			if (progress.DOMWindow != browser.contentWindow) {
				return;
			}
			if (flags & this.loading && flags & this.isdocument && request) {
				wot_core.block(this, request, request.name, browser);
			}
		} catch(e) { }
	},

	onStatusChange: function(browser, webProgress, request, status, message)
	{
	},

	onSecurityChange: function(browser, progress, request, state)
	{
	},

	// onRefreshAttempted: function(browser, webProgress, refrushURI, millis, sameUri)
	// {
	// },

	onLinkIconAvailable: function(browser)
	{
	}
};

var wot_core =
{
	blockedstreams: {},
	hostname: null,
	pending: {},
	purged: Date.now(),
	loaded: false,
	force_https: false,
	is_beingUninstalled: false,

	detect_environment: function()
	{
		// check if there is HTTPSEveryWhere addon also installed
		var is_https_everywhere = false;
		try {
			var https_everywhere =
				Components.classes["@eff.org/https-everywhere;1"]
					.getService(Components.interfaces.nsISupports).wrappedJSObject;
			is_https_everywhere = true;
		} catch (e) {
			is_https_everywhere = false; // there is no HTTPS EveryWhere
		}

		this.force_https = this.force_https || is_https_everywhere; // forced to use https if "HTTPS EveryWhere" addon is also installed
	},

	init: function()
	{
		try {

			this.detect_environment();
			window.addEventListener("load", function on_load (e) {
					window.removeEventListener("load", on_load, true);
					wot_core.load();
				}, false);

			window.addEventListener("unload", function(e) {
					wot_core.unload();
				}, false);

			window.addEventListener("sizemodechange", function (e) {
				wot_warning.blur();
			}, false);

			window.addEventListener("deactivate", function (e) {
				wot_warning.blur(true);
			}, false);

			window.addEventListener("activate", function (e) {
				wot_warning.blur();
			}, false);

			this.browser = document.getElementById("appcontent");

			if (this.browser) {
				this.browser.addEventListener("DOMContentLoaded", wot_core.domcontentloaded, false);
				this.browser.addEventListener("pageshow", wot_core.pageshow, false);    // the fix for the issue with Back/Forward buttons
				this.browser.addEventListener("click", wot_core.click, false);
			}
		} catch (e) {
			dump("wot_core.init: failed with " + e + "\n");
		}
	},

	load: function()
	{
		try {
			for (var i in wot_modules) {
				if (typeof(wot_modules[i].obj.load) == "function") {
					wot_modules[i].obj.load();
				}
			}

			wot_storage.init(function() {   // continue initialization only after the storage is loaded
				// schedule delayed load of modules ()
				window.setTimeout(function() {
					for (var i in wot_modules) {
						if (typeof(wot_modules[i].obj.load_delayed) == "function") {
							wot_modules[i].obj.load_delayed();
						}
					}

					wot_prefs.setupdateui();
					wot_api_register.send();
					wot_my_session.update(true);

					wot_core.loaded = true;
					wot_core.update();
				}, 250);

				try {
					Components.utils.import("resource://gre/modules/AddonManager.jsm");
					AddonManager.addAddonListener(wot_core.install_listener);
				} catch (e) {
					dump("wot_core.load() setting up uninstall listener failed with " + e + "\n");
				}

				var browser = getBrowser();
				wot_core.listener = new wot_listener(browser);
				browser.addTabsProgressListener(wot_core.listener);

				if (browser.tabContainer) {
					browser.tabContainer.addEventListener("TabSelect",
						wot_core.tabselect, false);
				}
			});

		} catch (e) {
			dump("wot_core.load: failed with " + e + "\n");
		}
	},

	install_listener: {
		onUninstalling: function(addon) {
			if (addon.id == WOT_GUID) {
				wot_core.is_beingUninstalled = true;
			}
		},
		onOperationCancelled: function(addon) {
			if (addon.id == WOT_GUID) {
				wot_core.is_beingUninstalled = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
			}
		}
	},

	unload: function()
	{
		try {
			var browser = getBrowser();

			if (this.listener) {
				browser.removeTabsProgressListener(this.listener);
				this.listener = null;
			}

			if (browser.tabContainer) {
				browser.tabContainer.removeEventListener("TabSelect",
					wot_core.tabselect, false);
			}

			if (this.browser) {
				this.browser.removeEventListener("DOMContentLoaded",
						wot_core.domcontentloaded, false);
				this.browser.removeEventListener("click",
						wot_core.click, false);
				this.browser = null;
			}

			// do pre-cleaning on uninstall (before modules are unloaded)
			if (wot_core.is_beingUninstalled) {
				wot_core.clean_search_rules();
			}

			for (var i = wot_modules.length - 1; i >= 0; i--) {
				if (typeof(wot_modules[i].obj.unload) == "function") {
					wot_modules[i].obj.unload();
				}
			}

			// do past-cleaning on uninstall
			if (wot_core.is_beingUninstalled) {
				wot_core.clean_profile_dir();
			}

		} catch (e) {
			dump("wot_core.unload: failed with " + e + "\n");
		}
	},

	domcontentloaded: function(event, retry)
	{
		if (!wot_core.loaded && !retry) {
			window.setTimeout(function() {
					wot_core.domcontentloaded(event, true);
				}, 500);
		}

		for (var i in wot_modules) {
			if (typeof(wot_modules[i].obj.domcontentloaded) == "function") {
				wot_modules[i].obj.domcontentloaded(event);
			}
		}
	},

	pageshow: function(event, retry)
	{
		if (!wot_core.loaded && !retry) {
			window.setTimeout(function() {
					wot_core.pageshow(event, true);
				}, 500);
		}

		for (var i in wot_modules) {
			if (typeof(wot_modules[i].obj.pageshow) == "function") {
				wot_modules[i].obj.pageshow(event);
			}
		}
	},

	click: function(event)
	{
		for (var i in wot_modules) {
			if (typeof(wot_modules[i].obj.click) == "function") {
				wot_modules[i].obj.click(event);
			}
		}
	},

	tabselect: function(event)
	{
		try {
			var browser = getBrowser().selectedTab;
			var tabUrl = event.target.linkedBrowser.currentURI.spec;
			wot_stats.focus(tabUrl);
			wot_core.update(browser);			
		} catch (e) {
			dump("wot_core.tabselect: failed with " + e + "\n");
		}
	},

	showloading: function(pl, request, url, hostname, browser)
	{
		try {
			var stream = null;
			if (request) {
				if (request.QueryInterface) {
					var channel = request.QueryInterface(
									Components.interfaces.nsIHttpChannel);

					if (channel && channel.requestMethod == "POST") {
						var upload = request.QueryInterface(
										Components.interfaces.nsIUploadChannel);

						if (upload) {
							stream = upload.uploadStream;
						}
					}
				}

				pl.abort(request);
			}

			if (wot_browser.isoffline()) {
				return;
			}

			this.blockedstreams[url] = stream;

			browser.loadURIWithFlags(WOT_BLOCK_LOADING + "#" +
				encodeURIComponent(btoa(url)),
				Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_HISTORY,
				null, null);

			wot_api_query.send(hostname);
		} catch (e) {
			dump("wot_core.showloading: failed with " + e + "\n");
		}
	},

	showblocked: function(pl, request, url, hostname, browser)
	{
		try {
			if (request) {
				pl.abort(request);
			}

			var blocked = "target=" + encodeURIComponent(hostname);

			for (var i = 0, a = 0; i < WOT_COMPONENTS.length; ++i) {
                a = WOT_COMPONENTS[i];
				if (!wot_prefs["show_application_" + a]) {
					continue;
				}

				var param = "";
				var reason = wot_warning.getwarningtype(hostname, a, true);

				if (reason == WOT_REASON_TESTIMONY) {
					param += "y";
				} else if (reason == WOT_REASON_RATING) {
					param += "r";
				}

				var r = wot_cache.get(hostname, "reputation_" + a),
                    x = wot_cache.get(hostname, "excluded_" + a);

                r = x ? -2 : r; // if excluded, then set level to -2

				param += wot_util.get_level(WOT_REPUTATIONLEVELS, r).level;

				if (wot_prefs.accessible) {
					param += "a";
				}

				blocked += "&" + a + "=" + param;
			}

			blocked = "?" + encodeURIComponent(btoa(blocked)) + "#" +
						encodeURIComponent(btoa(url));

			browser.loadURI(WOT_BLOCK_BLOCKED + blocked);
		} catch (e) {
			dump("wot_core.showblocked: failed with " + e + "\n");
		}
	},

	block: function(pl, request, url, browser)
	{
		try {
			if (!wot_util.isenabled() || !pl || !pl.browser || !url) {
				return false;
			}

			if (!wot_warning.isblocking()) {
				return false;
			}

			var hostname = wot_url.gethostname(url);

			if (!hostname || wot_url.isprivate(hostname) ||
					wot_url.isexcluded(hostname)) {
				return false;
			}

			if (wot_cache.isok(hostname)) {
				if (wot_warning.isdangerous(hostname, false) ==
						WOT_WARNING_BLOCK) {
					this.showblocked(pl, request, url, hostname, browser);
				}

				if (this.blockedstreams[url]) {
					delete this.blockedstreams[url];
				}
			} else {
				this.showloading(pl, request, url, hostname, browser);
			}

			return true;
		} catch (e) {
			dump("wot_core.block: failed with " + e + "\n");
		}
	},

	updateloading: function()
	{
		try {
			if (!wot_warning.isblocking()) {
				return;
			}

			var browser = getBrowser();
			var num = browser.mPanelContainer.childNodes.length;

			for (var i = 0; i < num; i++) {
				var tab = browser.getBrowserAtIndex(i);

				if (!tab || !tab.currentURI ||
						tab.currentURI.spec.indexOf(WOT_BLOCK_LOADING) != 0) {
					continue;
				}

				var url = this.isredirect(tab.currentURI.spec);

				if (!url) {
					continue;
				}

				var hostname = wot_url.gethostname(url);

				if (!hostname || !wot_cache.iscached(hostname)) {
					continue;
				}

				var age = Date.now() - wot_cache.get(hostname, "time");

				if (wot_cache.get(hostname, "status") == WOT_QUERY_ERROR &&
						age < WOT_INTERVAL_BLOCK_ERROR) {
					continue;
				}

				var postdata = null;

				if (this.blockedstreams[url]) {
					postdata = this.blockedstreams[url];
					delete this.blockedstreams[url];
				}

				/* Try again */
				tab.loadURIWithFlags(url,
					Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE,
					null, null, postdata);
			}
		} catch (e) {
			dump("wot_core.updateloading: failed with " + e + "\n");
		}
	},

	is_internal: function(url)
	{
		return (url.indexOf(WOT_BLOCK_LOADING) >= 0 || url.indexOf(WOT_BLOCK_BLOCKED) >= 0);
	},

	isredirect: function(url)
	{
		// on the Blocked page we extract encoded hostname from parameter, and use it as a target
		try {
			if (!url) return null;

			if(!this.is_internal(url)) return null;

			var m = /#(.+)$/.exec(url);

			if (m && m[1]) {
				return atob(decodeURIComponent(m[1]));
			}
		} catch (e) {
			dump("wot_core.isredirect: failed with " + e + "\n");
		}
		return null;
	},

	purgecache: function()
	{
		try {
			var interval = WOT_INTERVAL_CACHE_REFRESH;

			/* Purging cache entries while blocking is enabled causes the
				page to be reloaded while ratings are being loaded, so we'll
				purge the cache less often to not annoy the user... */

			if (wot_warning.isblocking()) {
				interval = WOT_INTERVAL_CACHE_REFRESH_BLOCK;
			}

			var now = Date.now();

			if ((now - wot_core.purged) < interval) {
				return;
			}

			wot_core.purged = now;
			var cache = wot_cache.get_enumerator();

			while (cache.hasMoreElements()) {
				var name = wot_cache.get_name_from_element(cache.getNext());

				if (!name) {
					continue;
				}

				if (wot_cache.get(name, "inprogress")) {
					continue;
				}

				var age = now - wot_cache.get(name, "time");

				if (age > interval) {
					wot_cache.destroy(name);
				}
			}
		} catch (e) {
			dump("wot_core.purgecache: failed with " + e + "\n");
		}
	},

	update: function(browser)
	{
		try {
			wot_core.hostname = null;

			if (!wot_api_register.ready || !wot_core.loaded) {
				wot_status.set("notready",
					wot_util.getstring("messages_notready"));
				return;
			}

			if (!wot_prefs.witness_id || !wot_prefs.witness_key ||
					wot_prefs.witness_id.length  != WOT_LENGTH_WITNESS_ID ||
					wot_prefs.witness_key.length != WOT_LENGTH_WITNESS_KEY) {
				wot_api_register.ready = false;
				wot_status.set("error",
					wot_util.getstring("description_restart"));
				return;
			}

			wot_core.hostname = wot_browser.gethostname();

			/* Update session */
			if (wot_core.hostname && WOT_MY_TRIGGER.test(wot_core.hostname)) {
				wot_my_session.update(false);
				wot_my_session.reload();

				var url = wot_browser.geturl();
				var match = url.match(WOT_PREF_FORWARD);

				if (match) {
					var section = match[WOT_PREF_FORWARD_TAB_MATCH];
                    var base = (match[WOT_PREF_FORWARD_TAB_BASE] + "/settings/") || WOT_PREF_PATH;

                        browser.loadURIWithFlags(wot_url.getprefurl(section, false, base),
						Components.interfaces.nsIWebNavigation
							.LOAD_FLAGS_BYPASS_HISTORY, null, null);
				}
			}

			if (!wot_util.isenabled()) {
				wot_status.set("disabled",
					wot_util.getstring("messages_disabled"));
				return;
			}

			/* Store any pending testimonies (from this window) */
			for (var i in wot_core.pending)  {
				if (wot_pending.store(i)) {
					wot_cache.set(i, "pending", false);
					delete wot_core.pending[i];
				}
			}

			/* Update any tabs waiting for reputations */
			wot_core.updateloading();

			/* Recover the original hostname */
			var redirected = wot_core.isredirect(wot_browser.geturl());
			if (redirected) {
				wot_core.hostname = wot_url.gethostname(redirected);
			}

			/* Purge expired cache entries */
			wot_core.purgecache();

			if (wot_browser.isoffline()) {
				/* Browser offline */
				wot_status.set("offline",
					wot_util.getstring("message_offline"));
				/* Retry after a timeout */
				window.setTimeout(wot_core.update, WOT_INTERVAL_UPDATE_OFFLINE);
				return;
			}

			/* Submit any pending testimonies, comments and comments' removals */
			wot_pending.submit();
            wot_api_comments.processpending();

			/* Check for updates (force update if no categories are loaded yet) */
            var forced_update = wot_util.isEmpty(wot_categories.categories) ||
                !wot_categories.grouping ||
                wot_categories.grouping.length == 0;

			wot_api_update.send(forced_update);

			wot_wg.update_tags();   // update user tags and popular tags

			if (!wot_core.hostname || wot_url.isprivate(wot_core.hostname) ||
					wot_url.isexcluded(wot_core.hostname)) {
				/* Invalid or excluded hostname */
				if (wot_cache.iscached(wot_core.hostname) &&
						!wot_cache.get(wot_core.hostname, "pending")) {
					wot_cache.destroy(wot_core.hostname);
				}
				wot_status.set("nohost",
					wot_util.getstring("messages_notavailable"));

				wot_status.update();
				return;
			}

			if (!wot_cache.iscached(wot_core.hostname)) {
				/* No previous record of the hostname, start a new query */
				wot_status.set("inprogress",
					wot_util.getstring("messages_loading"));
				wot_api_query.send(wot_core.hostname);
				return;
			}

			var age = Date.now() - wot_cache.get(wot_core.hostname, "time");

			if (wot_cache.get(wot_core.hostname, "inprogress")) {
				if (age > WOT_TIMEOUT_QUERY) {
					/* Done waiting, clear the flag  */
					wot_cache.set(wot_core.hostname, "inprogress", false);
				} else {
					/* Query already in progress, keep waiting */
					wot_status.set("inprogress",
						wot_util.getstring("messages_loading"));
					return;
				}
			}

			var status = wot_cache.get(wot_core.hostname, "status");

			if (status == WOT_QUERY_OK) {
				if (age > WOT_INTERVAL_CACHE_REFRESH) {
					wot_status.set("inprogress",
						wot_util.getstring("messages_loading"));
					wot_api_query.send(wot_core.hostname);
				} else {
					wot_status.update();
				}
				return;
			} else if (!wot_cache.get(wot_core.hostname, "pending")) {
				if (status == WOT_QUERY_RETRY || status == WOT_QUERY_LINK) {
					/* Retry immediately */
					wot_status.set("inprogress",
						wot_util.getstring("messages_loading"));
					wot_api_query.send(wot_core.hostname);
					return;
				} else if (age > WOT_INTERVAL_CACHE_REFRESH_ERROR) {
					wot_status.set("inprogress",
						wot_util.getstring("messages_loading"));
					wot_api_query.send(wot_core.hostname);
					return;
				}
			}

		} catch (e) {
			dump("wot_core.update: failed with " + e + "\n");
		}

		try {
			/* For some reason, we failed to get anything meaningful to display */
			wot_status.set("error",
				wot_util.getstring("messages_failed"));
		} catch (e) {
			dump("wot_core.update: failed with " + e + "\n");
		}
	},

	wot_service_url: function() {
		return this.force_https ? WOT_SERVICE_SECURE : WOT_SERVICE_NORMAL;
	},

	clean_search_rules: function () {
		// removes search rules from preferences
		wot_prefs.deleteBranch(WOT_SEARCH);
		wot_prefs.clear("update_checked");
	},

	clean_profile_dir: function () {
		// removes only WOT dir in the profile folder
		try {
			var nsiDir = FileUtils.getDir("ProfD", [wot_file.wot_dir], false);
			if (nsiDir && nsiDir.exists()) {
				nsiDir.remove(true);    // 'true' for recursive removal
			}
		} catch (e) {
			dump("wot_core.clean_profile_dir() failed with " + e + "\n");
		}
	}
};

wot_core.init();