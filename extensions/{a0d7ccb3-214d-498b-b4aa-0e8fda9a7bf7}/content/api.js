/*
	api.js
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

var wot_api_link =
{
	call: function(rule, content, batch, retrycount)
	{
		try {
			var hosts = batch.join("/") + "/";

			/* split into two requests if the parameter is too long */
			if (hosts.length > WOT_MAX_LINK_HOSTSLEN &&
					batch.length > 1) {
				this.call(rule, content, batch.splice(0, batch.length / 2),
					retrycount);
				this.call(rule, content, batch, retrycount);
				return;
			}

			var nonce = wot_crypto.nonce();

			for (var i = 0; i < batch.length; ++i) {
				wot_cache.add_nonce(nonce + "-" + i, batch[i]);
			}

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
								wot_prefs.witness_key, nonce));

			if (!context) {
				return;
			}

			var crypted = wot_arc4.crypt(context, wot_hash.strtobin(hosts));

			if (!crypted) {
				return;
			}

			var qs = WOT_SERVICE_API_LINK +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&hosts="	+ encodeURIComponent(btoa(
									wot_hash.bintostr(crypted))) +
				wot_url.getapiparams();

			if (wot_prefs.prefetch) {
				qs += "&mode=prefetch";
			}

			var request = new XMLHttpRequest();

			request.open("GET", wot_core.wot_service_url() +
					wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
						wot_cache.add_query(
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_LINK),
							request.responseXML.getElementsByTagName(
								WOT_SERVICE_XML_QUERY_TARGET),
							true);

						var cache = {};
						var retry = {};
						var hasretries = false;

						for (var i = 0; i < batch.length; ++i) {
							var s = wot_cache.get(batch[i], "status");

							if (s == WOT_QUERY_OK || s == WOT_QUERY_LINK) {
								cache[batch[i]] = batch[i];
							} else if (wot_shared.isencodedhostname(batch[i])) {
								retry[batch[i]] = batch[i];
								hasretries = true;
							}
						}

						if (rule) {
							wot_search.update(rule, content, cache, true);
						}

						retrycount = retrycount || 0;

						if (hasretries && ++retrycount <= WOT_MAX_TRIES_LINK) {
							window.setTimeout(function() {
									wot_api_link.send(rule, content, retry,
										retrycount);
								}, WOT_INTERVAL_LINK_RETRY);
						}
					}

					for (var i = 0; i < batch.length; ++i) {
						wot_cache.remove_nonce(nonce + "-" + i);
					}
				} catch (e) {
					dump("wot_api_link.onload: failed with " + e + "\n");
				}
			}

			request.send(null);
		} catch (e) {
			dump("wot_api_link.call: failed with " + e + "\n");
		}
	},

	send: function(rule, content, cache, retrycount)
	{
		try {
			if (!wot_util.isenabled()) {
				return;
			}

			var fetch = [];

			for (var i in cache) {
				if (cache[i] != i ||
						(wot_cache.iscached(i) && (wot_cache.get(i, "pending") ||
						 wot_cache.get(i, "inprogress")))) {
					continue;
				}

				fetch.push(i);
			}

			while (fetch.length > 0) {
				this.call(rule, content, fetch.splice(0, WOT_MAX_LINK_PARAMS),
					retrycount);
			}
		} catch (e) {
			dump("wot_api_link.send: failed with " + e + "\n");
		}
	}
};

var wot_api_query =
{
	/* Variables */
    message: "",
	message_id: "",
	message_type: "",
	message_url: "",
	users: [],

    /* Constants */
    XML_QUERY_STATUS_LEVEL: "level",
    XML_QUERY_USER_LABEL: "label",

	/* Methods */
    send: function(hostname, callback)
	{
		try {
			if (!wot_util.isenabled()) {
				return false;
			}

			if (wot_cache.iscached(hostname) &&
					(wot_cache.get(hostname, "pending") ||
						wot_cache.get(hostname, "inprogress"))) {
				return false;
			}

			wot_cache.create(hostname);
			wot_cache.set(hostname, "time", Date.now());
			wot_cache.set(hostname, "inprogress", true);
			wot_cache.set(hostname, "status", WOT_QUERY_ERROR);

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
								wot_prefs.witness_key, nonce));

			if (!context) {
				wot_cache.set(hostname, "inprogress", false);
				return false;
			}

			var crypted = wot_arc4.crypt(context, wot_hash.strtobin(
								wot_idn.utftoidn(hostname)));

			if (!crypted) {
				wot_cache.set(hostname, "inprogress", false);
				return false;
			}

			var qs = WOT_SERVICE_API_QUERY +
				"?id=" 		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&target="	+ encodeURIComponent(btoa(
									wot_hash.bintostr(crypted))) +
				wot_url.getapiparams();

			var request = new XMLHttpRequest();

			wot_cache.add_nonce(nonce, hostname);

			request.open("GET", wot_core.wot_service_url() +
				wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			/* If we don't receive data reasonably soon, retry */
			var timeout =
				window.setTimeout(function() {
						wot_api_query.timeout(request, hostname, callback);
					},	WOT_TIMEOUT_QUERY);

			request.onload = function(ev)
			{
				try {
					if (timeout) {
						window.clearTimeout(timeout);
					}

					wot_cache.set(hostname, "time", Date.now());

					if (request.status == 200) {
						wot_cache.add_query(
							request.responseXML.getElementsByTagName(WOT_SERVICE_XML_QUERY),
							request.responseXML.getElementsByTagName(WOT_SERVICE_XML_QUERY_TARGET),
							false);

						wot_api_query.parse_messages(
							request.responseXML.getElementsByTagName(WOT_SERVICE_XML_QUERY_MSG));

						wot_api_query.parse_users(
							request.responseXML.getElementsByTagName(WOT_SERVICE_XML_QUERY_USER));

						wot_api_query.parse_status(
							request.responseXML.getElementsByTagName(WOT_SERVICE_XML_QUERY_STATUS));
					}

					wot_cache.set(hostname, "inprogress", false);
					wot_cache.remove_nonce(nonce);
					wot_core.update();

					if (typeof(callback) == "function") {
						callback();
					}
				} catch (e) {
					dump("wot_api_query.onload: failed with " + e + "\n");
				}
			};

			request.send();
			return true;
		} catch (e) {
			dump("wot_api_query.send: failed with " + e + "\n");
		}
		return false;
	},

	timeout: function(request, hostname, callback) /* XMLHttpRequest */
	{
		try {
			if (!wot_cache.get(hostname, "inprogress")) {
				return;
			}

			dump("wot_api_query.timeout: for " + hostname + "\n");

			request.abort();
			wot_cache.set(hostname, "time", Date.now());
			wot_cache.set(hostname, "inprogress", false);
			wot_core.update();

			if (typeof(callback) == "function") {
				callback();
			}
		} catch (e) {
			dump("wot_api_query.timeout: failed with " + e + "\n");
		}
	},

	parse_messages: function(messages)
	{
		try {
			if (!messages) {
				return;
			}

			var i = 0;
			var m = messages.item(0);
			var msgid, type, target, version, than, url;

			while (m) {
				/* Display the first message that is targeted to us */
				msgid	= m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_ID);
				type    = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_TYPE);
				url     = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_URL);
				target  = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_TARGET);
				version = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_VERSION);
				than    = m.attributes.getNamedItem(WOT_SERVICE_XML_QUERY_MSG_THAN);

				/* Must have mandatory fields */
				if (msgid && msgid.value && type && type.value &&
					target && target.value &&
					m.firstChild && m.firstChild.nodeValue &&
						(target.value == WOT_SERVICE_XML_QUERY_MSG_TARGET_ALL ||
							target.value == WOT_PLATFORM)) {
					/* A message targeted to our platform */
					if (version && version.value && than && than.value) {
						/* A versioned message */
						if ((version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_EQ &&
								Number(WOT_VERSION) == Number(than.value)) ||
							(version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_LE &&
								Number(WOT_VERSION) <= Number(than.value)) ||
							(version.value ==
									WOT_SERVICE_XML_QUERY_MSG_VERSION_GE &&
								Number(WOT_VERSION) >= Number(than.value))) {
							/* Targeted to us */
							this.message_id = msgid.value;
							this.message_type = type.value;
							this.message = m.firstChild.nodeValue;
							if (url && url.value) {
								this.message_url = url.value;
							}
							break;
						}
					} else {
						/* Targeted to us */
						this.message_id = msgid.value;
						this.message_type = type.value;
						this.message = m.firstChild.nodeValue;
						if (url && url.value) {
							this.message_url = url.value;
						}
						break;
					}
				}

				m = messages.item(++i);
			}
		} catch (e) {
			dump("wot_api_query.parse_messages: failed with " + e + "\n");
		}
	},

	parse_users: function(users)
	{
		try {
			this.users = [];

			if (!users) return;

			var u = users.item(0),// take only first items, ignore others
                user_item = {},
                a = null,
                user_props = {
                    // so far we don't need most of fields any more that is why they are commented out
//                icon:       WOT_SERVICE_XML_QUERY_USER_ICON,
//                bar:        WOT_SERVICE_XML_QUERY_USER_BAR,
//                "length":   WOT_SERVICE_XML_QUERY_USER_LENGTH,
//                url:        WOT_SERVICE_XML_QUERY_USER_URL,
//                text:       WOT_SERVICE_XML_QUERY_USER_TEXT,
//                notice:     WOT_SERVICE_XML_QUERY_USER_NOTICE,
                label:      this.XML_QUERY_USER_LABEL        // this is the only property we need
            };

			if (u) {
                for (var k in user_props) {
                    a = u.attributes.getNamedItem(user_props[k]);
                    if (a && a.value) {
                        user_item[k] = a.value;
                    }
                }
                this.users.push(user_item);

                // set activity score from "user's label"
                if (!isNaN(user_item.label)) {
                    wot_prefs.setInt("activity_score", parseInt(user_item.label));
                }
			}
		} catch (e) {
			wot_tools.wdump("wot_api_query.parse_users: failed with " + e);
		}
	},

	parse_status: function(stats)
	{
		try {
			wot_prefs.clear("status_level");

			if (!stats) return;

            var s = stats.item(0);

            if (!s) return;

			var l = s.attributes.getNamedItem(this.XML_QUERY_STATUS_LEVEL);

			if (l && l.value) {
				wot_prefs.setChar("status_level", l.value);
			}

		} catch (e) {
			wot_tools.wdump("wot_api_query.parse_status: failed with " + e);
		}
	}
};

const WOT_REGISTER_RUNNING = "wot_register_running";

var wot_api_register =
{
	ready: false,
	tries: 0,

	geteid: function()
	{
		try {
			if (wot_prefs.extension_id && wot_prefs.extension_id.length > 0) {
				return true;
			}
			if (!wot_prefs.setChar("extension_id", wot_crypto.nonce())) {
				return false;
			}
			return (wot_prefs.extension_id.length > 0);
		} catch (e) {
			dump("wot_api_register.geteid: failed with " + e + "\n");
		}
		return false;
	},

	send: function()
	{
		try {
			if (this.ready) {
				return;
			}

			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (wot_prefs.witness_id &&
				wot_prefs.witness_id.length  == WOT_LENGTH_WITNESS_ID &&
				wot_prefs.witness_key &&
				wot_prefs.witness_key.length == WOT_LENGTH_WITNESS_KEY) {
				this.ready = true;
				wot_core.update();
				return;
			}

			if (wot_browser.isoffline()) {
				wot_status.set("offline", wot_util.getstring("messages_offline"));
				this.timeout = window.setTimeout(wot_api_register.send, WOT_INTERVAL_REGISTER_OFFLINE);
				return;
			}

			wot_status.set("notready", wot_util.getstring("messages_notready"));

			if (!this.geteid() || wot_hashtable.get(WOT_REGISTER_RUNNING)) {
				this.timeout = window.setTimeout(wot_api_register.send, WOT_INTERVAL_REGISTER_ERROR);
				return;
			}

			wot_hashtable.set(WOT_REGISTER_RUNNING, 1);
			++this.tries;

			var request = new XMLHttpRequest();

			request.open("GET", WOT_SERVICE_SECURE +
				WOT_SERVICE_API_REGISTER +
				"?nonce="	+ wot_crypto.nonce() +
				"&eid="		+ wot_prefs.extension_id +
				wot_url.getapiparams());

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_register.send: failed with " + e + "\n");
			this.error();
		}
	},

	onload: function(event)
	{
		try {
			if (!event || !event.target || event.target.status != 200 ||
					!event.target.responseXML) {
				wot_api_register.error();
				return;
			}

			var reg = null;
			var tags = event.target.responseXML.getElementsByTagName(
							WOT_SERVICE_XML_REGISTER);

			if (tags) {
				reg = tags.item(0);
			}

			if (!reg || !reg.attributes) {
				wot_api_register.error();
				return;
			}

			var id  = reg.attributes.getNamedItem(WOT_SERVICE_XML_REGISTER_ID);
			var key = reg.attributes.getNamedItem(WOT_SERVICE_XML_REGISTER_KEY);

			if (!id || !id.value || !key || !key.value ||
				id.value.length  != WOT_LENGTH_WITNESS_ID ||
				key.value.length != WOT_LENGTH_WITNESS_KEY) {
				wot_api_register.error();
				return
			}

			if (!wot_prefs.setChar("witness_id", id.value) ||
				!wot_prefs.setChar("witness_key", key.value)) {
				wot_api_register.error();
				return;
			}

			wot_api_register.ready = true;
			wot_my_session.update(true);
			wot_core.update();

			wot_hashtable.remove(WOT_REGISTER_RUNNING);
		} catch (e) {
			dump("wot_register.onload: failed with " + e + "\n");
			wot_api_register.error();
		}
	},

	error: function()
	{
		try {
			wot_status.set("error",
				wot_util.getstring("messages_error_register"));

			wot_api_register.timeout =
				window.setTimeout(wot_api_register.send,
					wot_api_register.tries * WOT_INTERVAL_REGISTER_ERROR);

			wot_hashtable.remove(WOT_REGISTER_RUNNING);
		} catch (e) {
			dump("wot_register.error: failed with " + e + "\n");
		}
	}
};

const WOT_RELOAD_RUNNING = "wot_reload_running";

var wot_api_reload =
{
	send: function(reload)
	{
		try {
			if (this.timeout) {
				window.clearTimeout(this.timeout);
				this.timeout = null;
			}

			if (!wot_util.isenabled() ||
					!wot_api_register.geteid() ||
					wot_hashtable.get(WOT_RELOAD_RUNNING)) {
				return;
			}

			wot_hashtable.set(WOT_RELOAD_RUNNING, 1);

			var query_string = WOT_SERVICE_API_RELOAD +
				"?id="		+ wot_prefs.witness_id +
				"&nonce=" 	+ wot_crypto.nonce() +
				"&reload=" 	+ encodeURIComponent(reload) +
				"&eid="		+ wot_prefs.extension_id +
				wot_url.getapiparams();

			var request = new XMLHttpRequest();

			request.open("GET", WOT_SERVICE_SECURE +
				wot_crypto.authenticate_query(query_string));

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_reload.send: failed with " + e + "\n");
			this.error();
		}
	},

	onload: function(event)
	{
		try {
			if (!event || !event.target || event.target.status != 200 ||
					!event.target.responseXML) {
				wot_api_reload.error();
				return;
			}

			var reload = null;
			var tags = event.target.responseXML.getElementsByTagName(WOT_SERVICE_XML_RELOAD);

			if (tags) {
				reload = tags.item(0);
			}

			if (!reload || !reload.attributes) {
				wot_api_reload.error();
				return;
			}

			var id  = reload.attributes.getNamedItem(WOT_SERVICE_XML_RELOAD_ID);
			var key = reload.attributes.getNamedItem(WOT_SERVICE_XML_RELOAD_KEY);

			if (!id || !id.value || !key || !key.value ||
				id.value.length  != WOT_LENGTH_WITNESS_ID ||
				key.value.length != WOT_LENGTH_WITNESS_KEY) {
				wot_api_reload.error();
				return;
			}

			if (!wot_prefs.setChar("witness_id", id.value) ||
				!wot_prefs.setChar("witness_key", key.value)) {
				wot_api_reload.error();
				return;
			}

			wot_my_session.update(false);

			/* Invalidate cache */
			var cache = wot_cache.get_enumerator();

			while (cache.hasMoreElements()) {
				var name = wot_cache.get_name_from_element(cache.getNext());
				if (name) {
					wot_cache.set(name, "status", WOT_QUERY_RETRY);
                    wot_cache.remove(name, "exists");   // to tell that cache doesn't exist for the target
				}
			}

			wot_wg.update_tags(true);   // forced to update mytags and mastertags

			wot_core.update();
			wot_hashtable.remove(WOT_RELOAD_RUNNING);
		} catch (e) {
			dump("wot_reload.onload: failed with " + e + "\n");
			wot_api_reload.error();
		}
	},

	error: function()
	{
		try {
			wot_api_reload.timeout =
				window.setTimeout(wot_api_reload.send,
					WOT_INTERVAL_RELOAD_ERROR);

			wot_hashtable.remove(WOT_RELOAD_RUNNING);
		} catch (e) {
			dump("wot_reload.error: failed with " + e + "\n");
		}
	}
};

var wot_api_submit =
{
	send: function(pref, target, testimonies, votes)
	{
		try {
			if (!wot_util.isenabled() || !pref || !target ||
					!testimonies) {
				return;
			}

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(wot_prefs.witness_key, nonce));

			if (!context) {
				return;
			}

			var crypted = wot_arc4.crypt(context,wot_hash.strtobin(target));

			if (!crypted) return;

			var qs = WOT_SERVICE_API_SUBMIT +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce +
				"&target="	+ encodeURIComponent(btoa(wot_hash.bintostr(crypted)));

			var found = 0;

			for (var i = 0; i < WOT_COMPONENTS.length; ++i) {
                var app = WOT_COMPONENTS[i];
				if (testimonies[app] >= -1) {
					qs += "&testimony_" + app + "=" + testimonies[app];
					++found;
				}
			}

            if (votes && votes.length > 0) {
                qs += "&votes=" + votes;
            }

			if (!found) return;

			qs += wot_url.getapiparams();

			var request = new XMLHttpRequest();

			if (!request) return;

            var url = wot_core.wot_service_url() + wot_crypto.authenticate_query(qs);
//            wot_tools.wdump("API Submit: " + url);

			request.open("GET", url);

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
						var submit = request.responseXML.getElementsByTagName(WOT_SERVICE_XML_SUBMIT);

						if (submit && submit.length > 0) {
							wot_pending.clear(pref);
						}
					}
				} catch (e) {
					dump("wot_api_submit.onload: failed with " + e + "\n");
				}
			};

			request.send(null);
		} catch (e) {
			dump("wot_api_submit.send: failed with " + e + "\n");
		}
	}
};

var wot_api_feedback =
{
	send: function(url, question, choice)
	{
		try {
			if (!wot_util.isenabled() || !url || !choice || !question) {
//				dump("wot_api_feedback.send() - invalid params were given\n");
				return;
			}

			var nonce = wot_crypto.nonce();

			var context = wot_arc4.create(wot_hash.hmac_sha1hex(
				wot_prefs.witness_key, nonce));

			if (!context) {
//				dump("wot_api_feedback.send() - no context was given\n");
				return;
			}

			var crypted = wot_arc4.crypt(context,
				wot_hash.strtobin(url));

			if (!crypted) {
//				dump("wot_api_feedback.send() - url encryption failed\n");
				return;
			}

			var qs = WOT_SERVICE_API_FEEDBACK +
				"?question=" + String(question) +
				"&choice=" + String(choice) +
				"&url=" + encodeURIComponent(btoa(wot_hash.bintostr(crypted))) +
				"&id="		+ wot_prefs.witness_id +
				"&nonce="	+ nonce;

			qs += wot_url.getapiparams();

			var request = new XMLHttpRequest();

			if (!request) {
//				dump("wot_api_feedback.send() - failed to create Request object\n");
				return;
			}

			request.open("GET", wot_core.wot_service_url() + wot_crypto.authenticate_query(qs));

			new wot_cookie_remover(request);

			request.onload = function(event)
			{
				try {
					if (request.status == 200) {
//						dump("wot_api_feedback.onload: answer submitted successfully\n");
					}
				} catch (e) {
					dump("wot_api_feedback.onload: failed with " + e + "\n");
				}
			};

			request.send(null);
//			dump("wot_api_feedback.send() feedback was sent\n");

		} catch (e) {
			dump("wot_api_feedback.send: failed with " + e + "\n");
		}
	}
};

var wot_api_update =
{
	send: function(force)
	{
		try {
			var interval = wot_prefs.update_interval;

			if (interval < WOT_MIN_INTERVAL_UPDATE_CHECK) {
				interval = WOT_MIN_INTERVAL_UPDATE_CHECK;
			} else if (interval > WOT_MAX_INTERVAL_UPDATE_CHECK) {
				interval = WOT_MAX_INTERVAL_UPDATE_CHECK;
			}

			var last = Date.now() - interval;

			if (!force && WOT_VERSION == wot_prefs.last_version &&
					last < Number(wot_prefs.update_checked)) {
				return;
			}

			/* Increase the last check time a notch */
			var next = last + WOT_INTERVAL_UPDATE_ERROR;

			if (!wot_prefs.setChar("last_version", WOT_VERSION) ||
					!wot_prefs.setChar("update_checked", next)) {
				return;
			}

			wot_prefs.flush();

			/* Build a request */
			var request = new XMLHttpRequest();

			request.open("GET", wot_core.wot_service_url() +
				WOT_SERVICE_API_UPDATE +
				"?id="		+ wot_prefs.witness_id +
				"&nonce="	+ wot_crypto.nonce() +
				"&format="	+ WOT_SERVICE_UPDATE_FORMAT +
				wot_url.getapiparams());

			new wot_cookie_remover(request);

			request.onload = this.onload;
			request.send(null);
		} catch (e) {
			dump("wot_api_update.send: failed with " + e + "\n");
		}
	},

	onload: function(event)
	{
		try {
			if (!event) {
				return;
			}

			var request = event.target;
			if (!request || request.status != 200) return;

			var response = request.responseXML;
			if (!response) return;

			/* Update the the last check time */
			wot_prefs.setChar("update_checked", Date.now());

			var update = null;
			var tags = response.getElementsByTagName(WOT_PLATFORM);

			if (tags) {
				update = tags.item(0);
			}

			if (!update) return;

			/* Attributes */
			var interval = update.getAttribute(WOT_SERVICE_XML_UPDATE_INTERVAL);

			if (interval && Number(interval) > 0) {
				wot_prefs.setInt("update_interval", interval * 1000);
			}

            /* Categories */
            var cats = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_CATEGORIES);
            if (cats && cats[0]) wot_categories.parse(cats[0]);

			/* Search rules */
			var search = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_SEARCH);
			if (search) wot_search.parse(search);

			/* Shared domains */
			var shared = response.getElementsByTagName(WOT_SERVICE_XML_UPDATE_SHARED);
			if (shared) wot_shared.parse(shared);


			wot_prefs.flush();
		} catch (e) {
			dump("wot_api_update.onload: failed with " + e + "\n");
		}
	}
};

var wot_pending =
{
	store: function(hostname) {
        // Stores user's testimonies from memory cache to preferences (which is more persistent storage)
		try {
			if (!wot_cache.iscached(hostname) ||
					!wot_cache.get(hostname, "pending")) {
				return false;
			}

			var target = wot_idn.utftoidn(hostname),
                obj = {};

			if (!target) return false;

            obj.target = target;

			for (var i = 0; i < WOT_COMPONENTS.length; ++i) {
                var app = WOT_COMPONENTS[i];
				obj["testimony_" + app] = wot_cache.get(hostname, "testimony_" + app);
			}

            obj.votes = wot_cache.get(hostname, "votes") || "";

			var pref_name = Date.now();

			if (wot_prefs.setChar("pending." + pref_name, JSON.stringify(obj))) {
//                wot_tools.wdump("Stored in prefs: " + JSON.stringify(obj));
				return true;
			}

			wot_prefs.flush();
		} catch (e) {
			wot_tools.wdump("wot_pending.store: failed with " + e);
		}

		return false;
	},

	clear: function(pref)
	{
		try {
			if (!pref || !pref.length) {
				return;
			}

			var base = "pending." + pref;

			if (!wot_prefs.getChar(base, null)) {
				return;
			}

			wot_prefs.clear(base);
			wot_prefs.clear(base + ".submit");
			wot_prefs.clear(base + ".tries");
			wot_prefs.deleteBranch(base);
			wot_prefs.flush();
		} catch (e) {
			dump("wot_pending.clear: failed with " + e + "\n");
		}
	},

	parse: function(pref, json_data)
	{
		try {
//			var m = /^([^\s]+)(.*)/.exec(data);

            var data = JSON.parse(json_data);

			if (!data || !data.target) {
				wot_tools.wdump("wot_pending.parse: invalid entry: " + pref + ": " + json_data);
				this.clear(pref);
				return null;
			}

			var rv = {
				target: data.target,
				testimonies: [],
                votes: data.votes || "",    // categories' votes as a string
                votes_list: {}              // parsed votes as an object
			};

			for (var i = 0; i < WOT_COMPONENTS.length; ++i) {
                var app = WOT_COMPONENTS[i],
                    t = data["testimony_" + app];

				if (t === null || t < 0 || isNaN(t)) {
					rv.testimonies[app] = -1;
				} else {
					rv.testimonies[app] = Number(t);

					if (rv.testimonies[app] > WOT_MAX_REPUTATION) {
						rv.testimonies[app] = WOT_MAX_REPUTATION;
					}
				}
			}

//            // parsing string votes
            // FIXME: use the code below for restoring user's votes from pending submission when cache doesn't have them
//            if (data.votes && data.votes.length > 2) {
//                var votes_array = data.votes.split("/");
//                for (i = 0; i < votes_array.length; i++) {
//                    var vv = votes_array[i];
//                    if (vv && vv.length > 0) {
//                        var v = vv.split(":", 2);
//                        if (v && v.length == 2) {
//                            rv.votes_list[v[0]] = { v: v[1] };
//                        }
//                    }
//                }
//            }

//			wot_tools.wdump("wot_pending.parse: " + pref + ": " + rv.target);
			return rv;

		} catch (e) {
			wot_tools.wdump("wot_pending.parse: failed with " + e);
		}

		return null;
	},

	submit: function()
	{
		try {
			var branch = wot_prefs.ps.getBranch(WOT_PREF + "pending.");
			var children = branch.getChildList("", {});

			for (var i = 0; i < children.length; ++i) {
				var pref = children[i];

				if (!/^\d+$/.test(pref)) {
					continue;
				}

				var base = "pending." + pref;
				var json_data = wot_prefs.getChar(base, null);

				if (!json_data) continue;

				var submit_time = wot_prefs.getChar(base + ".submit", null);

				if (submit_time) {
					submit_time = Date.now() - Number(submit_time);
					if (submit_time < WOT_INTERVAL_SUBMIT_ERROR) {
						continue;
					}
				}

				var tries = wot_prefs.getChar(base + ".tries", null);

				if (tries) {
					tries = Number(tries);
					if (tries >= WOT_MAX_TRIES_SUBMIT) {
						this.clear(pref);
						continue;
					}
				} else {
					tries = 0;
				}

				if (!wot_prefs.setChar(base + ".submit", Date.now()) ||
						!wot_prefs.setChar(base + ".tries", tries + 1)) {
					continue;
				}

				var parsed = this.parse(pref, json_data);

				if (!parsed) continue;

//                wot_tools.wdump("API Submits Parsed: " + JSON.stringify(parsed));

                wot_api_submit.send(pref, parsed.target, parsed.testimonies, parsed.votes);

				if (!wot_cache.iscached(parsed.target) || wot_cache.get(parsed.target, "pending")) {
					continue;
				}

                // Now update cache with user's input: testimonies first
				for (i = 0; i < WOT_COMPONENTS.length; ++i) {
                    var app = WOT_COMPONENTS[i];
					wot_cache.set(parsed.target, "testimony_" + app, parsed.testimonies[app]);
				}

                // Categories
                // TODO: implement restoring votes from parsed voted in case if votes were restored from "pending" data (i.e. not in cache yet)

                wot_cache.set(parsed.target, "votes", parsed.votes); // FIXME: do we still need this here?
			}
		} catch (e) {
			dump("wot_pending.submit: failed with " + e);
		}
	}
};

var wot_keeper = {

    STATUSES: {
        LOCAL: 1,       // indicates permanent storing of data locally
        SUBMITTING: 2   // indicates the saving is temporary until submition is reported succesful
    },

	STORAGE_NAME: "keeper",

    /* Comment-specific methods to work with Keeper */

    get_comment: function (target) {
        // returns comment data stored locally for the specified target. Comment data is {body, timestamp, votes, wcid}
        var data = wot_keeper.get_by_name(target, "comment");
        if (data) {
            return data;
        } else {
            return {};
        }
    },

    save_comment: function (target, comment_body, wcid, votes, status) {

        var data = {
            timestamp: Date.now(),
            target: target,
            comment: comment_body,
            wcid: wcid,
            votes: votes,    // votes as object to be able to restore them to UI
            status: status || wot_keeper.STATUSES.LOCAL
        };

        wot_keeper.store_by_name(target, "comment", data);
    },

    remove_comment: function (target) {
        wot_keeper.remove_by_name(target, "comment");
    },

    /* Generic methods to work with Keeper */

    get_by_name: function (target, name) {
        // generic method to get data from local by target and name
        try {
	        var keeper_data = wot_storage.get(this.STORAGE_NAME, {});
            return keeper_data[wot_keeper._fullname(target, name)] || null;
        } catch (e) {
            wot_tools.wdump("wot_keeper.get_by_name() Failed with " + e);
        }
        return null;
    },

    store_by_name: function (target, name, obj) {
	    var keeper_data = wot_storage.get(this.STORAGE_NAME, {});
	    keeper_data[wot_keeper._fullname(target, name)] = obj;
	    wot_storage.set(this.STORAGE_NAME, keeper_data, true);
    },

    remove_by_name: function (target, name) {
	    var keeper_data = wot_storage.get(this.STORAGE_NAME, {});
	    keeper_data[wot_keeper._fullname(target, name)] = undefined;
	    wot_storage.set(this.STORAGE_NAME, keeper_data, true);
    },

    _fullname: function (target, name) {
        return name + "." + target;
    },

	move_from_prefs_to_storage: function () {
		var branches = {
			"keeper.": true
		};

		var keeper_data = wot_storage.get(this.STORAGE_NAME, {});

		for (var b in branches) {

			try {
				var branch = wot_prefs.ps.getBranch(WOT_PREF + b);
				var items = branch.getChildList("", {});
				for (var i = 0; i < items.length; i++) {
					var subname = items[i];
					keeper_data[subname] = wot_prefs.getJSON("keeper." + items[i]) || null;
				}

				wot_storage.set(this.STORAGE_NAME, keeper_data);
				wot_prefs.deleteBranch(b);

			} catch (e) {
				wot_tools.wdump("move_from_prefs_to_storage() / ["+b+"] failed with " + e);
			}
		}
		wot_storage.flush();
	},

	load_delayed: function () {
		this.move_from_prefs_to_storage();
	}

};

wot_modules.push({ name: "wot_keeper", obj: wot_keeper });

var wot_website_api = {

	server: "www.mywot.com",
	version: "1",   // Comments API version
	nonces: {},     // to know connection between nonce and target

	serialize: function (obj) {
		// prepare data to be sent using xmlhttprequest via POST
		var str = [];
		for(var p in obj){
			if (obj.hasOwnProperty(p)) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			}
		}
		return str.join("&");
	},

	call: function (apigroup, api_settings, apiname, options, params, on_error, on_success) {
		try {

			var allowed_groups = ["comment", "wg"];

			if (allowed_groups.indexOf(apigroup) < 0) {
				wot_tools.log("apigroup", apigroup, "is not allowed to call");
				return false;
			}

			var _this = wot_website_api,
				nonce = wot_crypto.nonce(),
				original_target = params.target;

			params = params || {};
			var post_params = {};

			params.id = wot_prefs.witness_id;
			params.nonce = nonce;
			params.version = WOT_PLATFORM + "-" + WOT_VERSION;

			options = options || { type: "GET" };

			if (options.encryption) {
				params.target = wot_crypto.encrypt(wot_idn.utftoidn(params.target), nonce);
			}

			var components = [];

			for (var i in params) {
				if (params[i] != null) {
					var param_name = i,
						param_value = params[i];

					// Use a hash instead of the real value in the authenticated query
					if (options.hash && options.hash == i) {
						param_name = "SHA1";
						param_value = wot_hash.bintohex(wot_hash.sha1str(unescape( encodeURIComponent( params[i] )))); //wot_crypto.bintohex(wot_crypto.sha1.sha1str(unescape( encodeURIComponent( params[i] ))));
					}

					components.push(param_name + "=" + encodeURIComponent(param_value));
				}
			}

			var query_string = components.join("&"),
				path = "/api/" + _this.version + "/addon/"+ apigroup +"/" + apiname,
				full_path = path + "?" + query_string;

			if (options.authentication) {
				var auth = wot_crypto.authenticate(full_path);

				if (!auth || !components.length) {
					return false;
				}
				full_path += "&auth=" + auth;
			}

			if (options.type == "POST") {
				post_params.query = full_path;

				if (options.hash) {
					post_params[options.hash] = params[options.hash];   // submit the real value of the parameter that is authenticated as the hash
				}
			}

			// the add-on does NOT have permissions for httpS://www.mywot.com so we use http and own encryption
			var type = options.type ? options.type : "GET";
			var url = "http://" + wot_website_api.server + (type == "POST" ? path : full_path);

			_this.nonces[nonce] = original_target;    // remember the link between nonce and target

			var request = new XMLHttpRequest();
			request.open(type, url);

			request.onload = function (event) {
				if (!event || !event.target || event.target.status != 200 ||
					!event.target.responseText) {
					wot_tools.wdump("api.comments.call.error: url = " + url + ", status = " + event.target.status);

					if (typeof(on_error) == "function") {
						on_error(request, event.target.status, {});
					}
					return;
				}

//                wot_tools.wdump("api.comments.call.success: url = " + url + ", status = " + event.target.status);

				var data = JSON.parse(event.target.responseText);

				if (typeof(on_success) == "function") {
					on_success(data, event.target.status, nonce);
				}

			};

			var prepared_post_params = null;

			if (type == "POST") {
				prepared_post_params = wot_website_api.serialize(post_params);
				request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				request.setRequestHeader("Content-length", prepared_post_params.length);
				request.setRequestHeader("Connection", "close");
			}

			request.send(prepared_post_params);
			return true;

		} catch (e) {
			wot_tools.wdump("wot_api_comments.call(): failed with " + e);
		}

		return false;

	},

	pull_nonce: function (nonce) {

		var _this = wot_website_api,
			target = null;

		if (_this.nonces[nonce]) {
			target = _this.nonces[nonce];
			delete _this.nonces[nonce];
		}

		return target;
	},

	is_error: function (error) {

		var error_code = 0,
			error_debug = "it is raining outside :(";

		if (error instanceof Array && error.length > 1) {
			error_code = error[0];
			error_debug = error[1];
		} else {
			error_code = (error !== undefined ? error : 0);
		}

		if (error_code && error_code != WOT_SITEAPI_ERRORS.error_codes.COMMENT_NOT_FOUND) {
			wot_tools.wdump("Error is returned:" + error_code + " / " + error_debug + " / " + error);
		}

		return error_code;  // if not zero, than it is error
	}

};

var wot_api_comments = {
    PENDING_COMMENT_SID: "pending_comment.",
    PENDING_REMOVAL_SID: "pending_removal.",
    MAX_TRIES: 10,  // maximum amount of tries to send a comment or remove a comment
    retrytimeout: {
        submit: 30 * 1000,
        remove: 20 * 1000
    },

    get: function(target) {
        var _this = wot_api_comments;
//        wot_tools.wdump("wot_api_comments.get(target) " + target);

        if (target && !wot_url.isprivate(target)) {
            wot_website_api.call("comment", {}, "get",
                {
                    encryption: true,
                    authentication: true
                },
                {
                    target: target
                },
                null,   // TODO: handle network errors
                function (data) {
                    _this.on_get_comment_response(data);
                }
            );
        } else {
            // if target is null, erase the comment info from rating window
            _this.on_get_comment_response({});
        }
    },

    submit: function (target, comment, comment_id, votes) {

        var _this = wot_api_comments,
            pref_pending_name = _this.PENDING_COMMENT_SID + target;

        // try to restore pending submission first
        var state = wot_storage.get(pref_pending_name, {
	        target: target,
	        comment_data: {},
	        tries: 0
        });

        // if params are given, it means we are on normal way of sending data (not on retrying)
        if (comment) {
            state.comment_data.comment = comment;
            state.comment_data.cid = comment_id || 0;
	        if (votes) {
		        // since WG votes are not mandatory if there is at leat one hashtag
		        state.comment_data.categories = votes;
	        }
            state.tries = 0;
        }

        if (++state.tries > _this.MAX_TRIES) {
            wot_tools.wdump("FAIL: api.comments.submit: failed " + target + " (max tries)");
	        wot_storage.clear(pref_pending_name);
            return;
        }

	    wot_storage.set(pref_pending_name, state);    // remember the submission

        state.comment_data['target'] = target;

	    wot_website_api.call("comment", {}, "submit",
            {
                encryption: true,
                authentication: true,
                type: "POST",
                hash: "comment" // this field must be hashed and the hash must be authenticated
            },
            state.comment_data,
            function (request) { // handle network errors
                if (request.status != 403) {
                    wot_api_comments.retry("submit", [ target ]);
                } else {
                    wot_tools.wdump("api.comment.submit: failed " + target + " (403)");
	                wot_storage.clear(wot_api_comments.PENDING_COMMENT_SID + target);
                }
            },
            wot_api_comments.on_submit_comment_response
        );

        // set the local cache to the comment value
        wot_cache.set_comment(target, {
            comment: comment,
            wcid: comment_id,
            status: WOT_QUERY_RETRY,    // the sign of unverified submission // TODO: replace to BUSY constant
            timestamp: Date.now()
        });
    },

    remove: function (target) {

        var _this =  wot_api_comments,
            pref_pending_name = _this.PENDING_REMOVAL_SID + target;

        // try to restore pending submission first
        var state = wot_storage.get(pref_pending_name, {
            target: target,
            tries: 0
        });

        if (++state.tries > _this.MAX_TRIES) {
            wot_tools.wdump("api.comments.submit: failed " + target + " (max tries)");
	        wot_storage.clear(pref_pending_name);
            return;
        }

	    wot_storage.set(pref_pending_name, state);    // remember the submission

	    wot_website_api.call("comment", {}, "remove",
            {
                encryption: true,
                authentication: true,
                type: "POST"
            },
            {
                target: target
            },
            function (request) {   // handle network errors
                if (request.status != 403) {
                    wot_api_comments.retry("remove", [ target ]);
                } else {
                    wot_tools.wdump("api.comment.remove: failed " + target + " (403)");
	                wot_storage.clear(wot_api_comments.PENDING_REMOVAL_SID + target);
                }
            },
            wot_api_comments.on_remove_comment_response
        );
    },

    retry: function(apiname, params, customtimeout)
    {
        var timeout = customtimeout || wot_api_comments.retrytimeout[apiname];

        if (timeout) {
            window.setTimeout(function() {
                wot_api_comments[apiname].apply(wot_api_comments, params || []);
            }, timeout);
        }
    },

    processpending: function()
    {
        var branches = {};
        branches[this.PENDING_COMMENT_SID] = wot_api_comments.submit;
        branches[this.PENDING_REMOVAL_SID] = wot_api_comments.remove;

	    var bag = wot_hashtable.get_enumerator();

	    // go through stored in memory values and keep ones that belong to Storage
	    while (bag.hasMoreElements()) {
		    var name = wot_storage.get_name_from_element(bag.getNext());
		    if (name && name != "is_loaded" && name != "flushed") {
			    for (var b in branches) {
				    try {
					    if (name.indexOf(b) == 0) {
						    var target = name.slice(b.length);
						    branches[b].apply(wot_api_comments, [target]);
					    }

				    } catch (e) {
					    wot_tools.wdump("wot_api_comments.processpending() / ["+b+"] failed with " + e);
				    }
			    }
		    }
	    }
    },

    on_get_comment_response: function (data) {
//        wot_tools.wdump("wot_api_comments.on_get_comment_response(data)" + JSON.stringify(data));
        // check whether error occured or data arrived
        var _this = wot_api_comments,
            nonce = data ? data.nonce : null, // to recover target from response
            target = wot_website_api.pull_nonce(nonce),
            error_code = target ? wot_website_api.is_error(data.error) : WOT_SITEAPI_ERRORS.error_codes.COMMENT_NOT_FOUND;

        switch (error_code) {
            case WOT_SITEAPI_ERRORS.error_codes.SUCCESS:
                wot_cache.set_comment(target, data);
                break;
            case WOT_SITEAPI_ERRORS.error_codes.COMMENT_NOT_FOUND:
                wot_cache.remove_comment(target);   // remove the comment if it is cached
                break;
            default:
                wot_cache.set_comment(target, { status: WOT_QUERY_ERROR, error_code: error_code });
        }

	    var fail_errors = [ // the list of errors that won't give WOT Groups data
		    WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_FAILED,
		    WOT_SITEAPI_ERRORS.error_codes. AUTHENTICATION_REP_SERVER_ERROR,
		    WOT_SITEAPI_ERRORS.error_codes.NO_ACTION_DEFINED
	    ];

	    if (fail_errors.indexOf(error_code) < 0 && target) {  // check for tags data (WOT Groups)
		    var tags = wot_api_tags.clean(data.wgtags),
			    wg_enabled = data.wg || false;

		    wot_wg.enable(wg_enabled);

		    wot_cache.set_param(target, "wg", {
//			    wg: wg_enabled,
			    tags: tags
		    });
	    } else if (target) {    // otherwise when got a failure code
		    wot_cache.remove_param(target, "wg");
	    }

        wot_cache.set_captcha(!!data.captcha);

        wot_rw.update_ratingwindow_comment();
    },

    on_submit_comment_response: function (data) {
        /* Handler for "Submit" responses. On success it updates the local cache  */

//        wot_tools.wdump("wot_api_comments.on_submit_comment_response(data) " + data);
        var _this = wot_api_comments,
            nonce = data.nonce, // to recover target from response
            target = wot_website_api.pull_nonce(nonce),
            error_code = wot_website_api.is_error(data.error);

        switch (error_code) {
            case WOT_SITEAPI_ERRORS.error_codes.SUCCESS:
	            var local = wot_keeper.get_comment(target);

	            wot_keeper.remove_comment(target);  // delete the locally saved comment only on successful submit
                wot_cache.update_comment(target, { status: WOT_QUERY_OK, error_code: error_code });
                wot_storage.clear(_this.PENDING_COMMENT_SID + target); // don't try to send again

	            if (local && local.comment) {
		            // extract tags and append them to the cached list of mytags
		            var mytags = wot_wg.extract_tags(local.comment);
		            wot_wg.append_mytags(mytags);
	            }

                break;

            // for these errors we should try again, because there is non-zero possibility of quantum glitches around
            case WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_FAILED:
            case WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_REP_SERVER_ERROR:
            case WOT_SITEAPI_ERRORS.error_codes.COMMENT_SAVE_FAILED:
                wot_cache.update_comment(target, { status: WOT_QUERY_ERROR, error_code: error_code });
                _this.retry("submit", [ target ]);   // yeah, try it again, ddos own server ;)
                break;

            default:
                wot_cache.update_comment(target, { status: WOT_QUERY_ERROR, error_code: error_code });
	            wot_storage.clear(_this.PENDING_COMMENT_SID + target);
        }

        wot_cache.set_captcha(!!data.captcha);

        wot_rw.update_ratingwindow_comment(); // to update status "the website is commented by the user"
    },

    on_remove_comment_response: function (data) {
//        wot_tools.wdump("wot_api_comments.on_remove_comment_response(data) " + data);

        var _this = wot_api_comments,
            nonce = data.nonce, // to recover target from response
            target = wot_website_api.pull_nonce(nonce),
            error_code = wot_website_api.is_error(data.error);

        switch (error_code) {
            case WOT_SITEAPI_ERRORS.error_codes.SUCCESS:
                wot_cache.remove_comment(target);
                wot_keeper.remove_comment(target);
	            wot_storage.clear(_this.PENDING_REMOVAL_SID + target);
                break;

            // some errors require retry due to singularity of the Universe
            case WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_FAILED:
            case WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_REP_SERVER_ERROR:
            case WOT_SITEAPI_ERRORS.error_codes.COMMENT_REMOVAL_FAILED:
                wot_cache.update_comment(target, { status: WOT_QUERY_ERROR, error_code: error_code });
                _this.retry("remove", [ target ]);
                break;

            default:
                wot_cache.update_comment(target, { status: WOT_QUERY_ERROR, error_code: error_code });
	            wot_storage.clear(_this.PENDING_REMOVAL_SID + target);
        }

        wot_rw.update_ratingwindow_comment(); // to update status "the website is commented by the user"
    }
};

var wot_api_tags = {
	my: {
		get_tags: function () {
			wot_api_tags.get_tags("mytags", "getmytags");
		}
	},

	popular: {
		get_tags: function () {
			wot_api_tags.get_tags("popular_tags", "getmastertags");
		}
	},

	get_tags: function (core_keyword, method) {

		try {

			wot_website_api.call("wg",
				{
					version: wot_website_api.version
				},
				method,
				{
					encryption: true,
					authentication: true
				},
				{},
				function (err) {
					wot_tools.log("api.get_tags() failed", err);
					wot_wg.release_lock(method);
				},
				function (data) {
					wot_wg.release_lock(method);
					wot_api_tags._on_get_tags(data, core_keyword);
				});

		} catch (e) {
			wot_tools.log("api.get_tags() failed", err);
		}

	},

	_on_get_tags: function (data, core_keyword) {

		var error_code = wot_website_api.is_error(data.error);

		var fail_errors = [ // the list of errors that won't give WOT Groups data
			WOT_SITEAPI_ERRORS.error_codes.AUTHENTICATION_FAILED,
			WOT_SITEAPI_ERRORS.error_codes. AUTHENTICATION_REP_SERVER_ERROR,
			WOT_SITEAPI_ERRORS.error_codes.NO_ACTION_DEFINED
		];

		var func = wot_wg['set_' + core_keyword];

		if (fail_errors.indexOf(error_code) < 0 && data.wgtags) {  // check for tags data (WOT Groups)
			if (typeof(func) == 'function') {
				func(wot_api_tags.clean(data.wgtags));
			}
		} else if (!data.wgtags) {
			if (typeof(func) == 'function') {
				func([]);
			}
		}

		wot_wg.enable(data.wg === true);
	},

	clean: function (tag_array) {
		// clean tags from hash char is it's there and add tokens field
		var tags = [];

		if (tag_array instanceof Array) {
			tags = tag_array.map(function (item) {
				if (item.value) {
					item.value = item.value.replace(/#/g, '');
				}
				return item;
			});
		}

		return tags;
	}
};
