/*
 ratingwindow.js
 Copyright © 2009 - 2015  WOT Services Oy <info@mywot.com>

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

var wot_rw = {

    RW_URL: "chrome://wot/content/rw/ratingwindow.html",
    FRAME_ID: "wot-rwframe",
    is_inited: false,
    is_visible: false,
    CHAN_ELEM_ID: "wot-ratingwindow",
    CHAN_EVENT_ID: "wotrw",
    IGNORED_PREFS: ["ratingwindow_shown"],
    LEVELS: ["registered"], // list of possible levels to test

    get_rw_window: function () {
        var rw_frame = document.getElementById(this.FRAME_ID);
        return rw_frame ? rw_frame.contentWindow : null;
    },

    get_rw_document: function () {
        var rw_frame = document.getElementById(this.FRAME_ID);
        return rw_frame ? rw_frame.contentDocument : null;
    },

    get_rw_wot: function () {
        var rw = this.get_rw_window();
        return rw ? rw.wot : null;
    },

	message_seen: function (message_id) {
        try {
            if (wot_api_query.message_id.length > 0 &&
                wot_api_query.message_id !=
                    WOT_SERVICE_XML_QUERY_MSG_ID_MAINT) {
                wot_prefs.setChar("last_message", wot_api_query.message_id);
            }
        } catch (e) {
            wot_tools.wdump("wot_rw.message_seen: failed with " + e);
        }
    },

    hide_ratingwindow: function () {
        var popup = document.getElementById("wot-popup");
        if (popup) {
            popup.hidePopup();
        }
    },

    /* Called when the popup window is hidden */
    on_hide_popup: function()
    {
        this.is_visible = false;
        try {
            var rw_wot = wot_rw.get_rw_wot();
            rw_wot.ratingwindow.finishstate(true);  // finish state with unload = true to indicate the unintentional closing of RW

            /* Stores any pending testimonies */
            wot_core.update();
        } catch (e) {
            wot_tools.wdump("wot_rw.hide_popup: failed with " + e);
        }
    },

    on_rw_open: function (event) {

        var rw = this.get_rw_window(),
            rw_doc = this.get_rw_document(),
            rw_wot = this.get_rw_wot();

        if (!rw || !rw_doc || !rw_wot) return;

        this.is_visible = true;

        if (!this.is_inited) {
            this.initialize(rw, rw_doc, rw_wot);
            // RW will ask BG to update it, so no need to update it here
        } else {
            wot_rw.update(); // RW is already loaded so we need to just update it
        }

        // We ignore attempts of RW to increase the counter. Instead, we increase it here.
        wot_prefs.setInt("ratingwindow_shown", wot_prefs.ratingwindow_shown + 1);
        wot_prefs.setInt("rw_opened_sharing", wot_prefs.rw_opened_sharing + 1);
    },

    update_messages: function () {
        /* Sets message data into RW */
        try {
            var rw = this.get_rw_window();
            if (!rw) return;

            var msg_data = {
                text: "",
                id: null,
                url: null,
                status: null
            };

            if (wot_api_query.message.length != 0 && wot_api_query.message_type.length != 0) {
                msg_data.text = wot_api_query.message;
                msg_data.status = wot_api_query.message_type;
                msg_data.id = wot_api_query.message_id;
                msg_data.url = wot_api_query.message_url;
            }

            rw.wot_bg.wot.core.moz_set_usermessage(JSON.stringify(msg_data));

        } catch (e) {
            wot_tools.wdump("ERROR: wot_ratingwindow.update_messages(): Failed / " + e);
        }
    },

    get_cached: function () {

        var target = wot_core.hostname,
            data = {},
	        wg = {};


        if (target && wot_cache.isok(target) && !wot_url.isprivate(target)) {
            var normalized_target = wot_cache.get(target, "normalized") || target;

	        // Get WG data from the cache and merge it into
	        wg = wot_cache.get_param(target, "wg") || {};
		    wg.wg = wot_wg.is_enabled(); // override cached state by the actual

            // prepare data for the RW
            data = {
                target: target,
                updated: wot_cache.get(target, "time"),
                cached: {
                    status: wot_cache.get(target, "status"),
                    value: {
                        normalized: wot_shared.decodehostname(normalized_target)
                    },
                    comment: wot_cache.get_comment(target),
	                wg: wg
                }
            };

            // fill it with reputation data
            for (var i = 0; i < WOT_COMPONENTS.length; i++) {
                var app = WOT_COMPONENTS[i];
                var rep = wot_cache.get(target, "reputation_" + app),
                    cnf = wot_cache.get(target, "confidence_" + app),
                    exl = wot_cache.get(target, "excluded_" + app),
                    t = wot_cache.get(target, "testimony_" + app);

                if (!data.cached.value[app]) {
                    data.cached.value[app] = {};
                }

                data.cached.value[app].r = exl ? -2 : rep;
                data.cached.value[app].c = exl ? 0 : cnf;
                data.cached.value[app].t = t;
            }

            data.cached.value.cats = wot_categories.target_categories(target);
            data.cached.value.blacklist = wot_categories.target_blacklists(target);

        } else {
            data = {
                target: null,
                updated: null,
                cached: {
                    status: WOT_QUERY_ERROR,
                    value: {
                        normalized: target
                    }
                }
            };
        }

        return data;
    },

    resetstate: function () {
        // This is only needed when user rates a website via scorecard. In order to update the RW because it might have
        // cached old testimonies already
        var rw_wot = this.get_rw_wot();
        if (rw_wot) {
            rw_wot.ratingwindow.resetstate();
        }
    },

    update: function () {
        // Updates content of Rating Window. RW must be already initialized (locales, categories info, etc).
//        wot_tools.wdump("RW.update()");

        if (!this.is_visible) return;

        var rw = this.get_rw_window(),
            rw_doc = this.get_rw_document(),
            rw_wot = this.get_rw_wot(),
            target = wot_core.hostname;

        if (!rw || !rw_doc || !rw_wot) return;

        var data = wot_rw.get_cached();   // no rep data for nonexistant targets

        wot_rw.push_preferences(rw, wot_rw.get_preferences());  // update preferences every time before showing RW

        wot_rw.update_messages();

        // set the user's activity score additionally to bg.wot.core.
        // FIXME: use activity score provided by preferences in RW instead of direct manupulation of core.usercontent[]
        if (rw.wot_bg) {
            rw.wot_bg.wot.core.usercontent = [
                { "label": wot_prefs.activity_score }
            ];
        }

        // iterate through known user levels to find current one and provide it to rating window
        for (var l, i=0; i < wot_rw.LEVELS.length; i++) {
            l = wot_rw.LEVELS[i];
            if (wot_crypto.islevel(l) && rw.wot_bg) {
                rw.wot_bg.wot.core._level = l;  // set the level into rating window
                break;
            }
        }

        rw_wot.ratingwindow.update(target, JSON.stringify(data));
    },

    update_ratingwindow_comment: function () {

        var target = wot_core.hostname,
            cached = wot_rw.get_cached(),
            rw_wot = wot_rw.get_rw_wot(),
            local_comment = wot_keeper.get_comment(target); // get locally stored comment if exists

	    this.update_ratingwindow_tags();

        rw_wot.ratingwindow.update_comment(cached.cached, local_comment, wot_cache.get_captcha());
    },

	update_ratingwindow_tags: function () {
		var rw = wot_rw.get_rw_window(),
			_core = rw.wot_bg.wot.core;

		// Now fetch tags data and fill the variables in rating window space
		if (_core) {
			_core.tags.mytags_updated = wot_wg.get_mytags_updated();
			_core.tags.popular_tags_updated = wot_wg.get_popular_tags_updated();
			_core.tags.mytags = wot_wg.get_mytags();
			_core.tags.popular_tags = wot_wg.get_popular_tags();
		}
	},

    get_preferences: function () {
        var prefs = {};

	    try {
            prefs = {
                accessible:         wot_prefs.accessible,
                show_fulllist:      wot_prefs.show_fulllist,
                ratingwindow_shown: wot_prefs.ratingwindow_shown,   // this has special processing
	            rw_opened_sharing:  wot_prefs.rw_opened_sharing,
	            rw_sharing_shown:   wot_prefs.rw_sharing_shown,
                activity_score:     wot_prefs.activity_score,
                wt_rw_ok:           wot_prefs.wt_rw_ok,
                wt_rw_shown:        wot_prefs.wt_rw_shown,
                wt_rw_shown_dt:     wot_prefs.wt_rw_shown_dt,
	            last_message:       wot_prefs.last_message
            };

        } catch (e) {
            wot_tools.wdump("ERROR: wot_rw.get_preferences() raised an exception: " + e);
        }

        return prefs;
    },

    push_preferences: function (rw, prefs) {
        try {
            rw.wot_bg.wot.prefs.load_prefs(JSON.stringify(prefs));

        } catch (e) {
            wot_tools.wdump("ERROR: wot_rw.push_preferences() raised an exception: " + e);
        }
    },

    on_submit: function (data) {
//        wot_tools.wdump("RW: on_submit() " + JSON.stringify(data));

        if (!data || !data.params) {
            wot_tools.wdump("on_submit() received empty data to submit.");
            return;
        }

        var target = data.target,
            testimony_0 = data.params.testimony_0,
            testimony_4 = data.params.testimony_4,
            votes = data.params.votes,
            changed_votes = data.params.changed_votes;   // as object

        if (target && wot_cache.isok(target)) {
            wot_cache.set(target, "testimony_0", Number(testimony_0));
            wot_cache.set(target, "testimony_4", Number(testimony_4));
            wot_cache.set(target, "votes", votes);  // votes as a string ready to submit. Real cache update should be done later.

            // Update cached categories with user's votes
            var cached_categories = wot_categories.target_categories(target);
            for (var cid in changed_votes) {
                if (cached_categories[cid]) {
                    // if category is assigned to the site already just update the vote
                    cached_categories[cid].v = changed_votes[cid];
                } else {
                    // if cat is not assigned yet do it now
                    cached_categories[cid] = wot_categories.get_category(cid);
                    cached_categories[cid].v = changed_votes[cid];
                }
            }
            wot_categories.cache_categories(target, cached_categories); // put it back to the cache

            wot_cache.set(target, "pending", true);
            wot_core.pending[target] = true;

            if (data.update_rw) wot_core.update();  // updating rating window before the comment is also submitted is not a good idea
        }
    },

    on_ratingwindow_event: function (event) {
        try {
            var details = event.detail;
            if (!details) return false;

//            wot_tools.log("on_ratingwindow_event()", details);

            var message_id = details.message_id,
                data = details.data;

            // Important: don't use "this" here, because it points to other than wot_rw object!

            switch (message_id) {
                case "update":  // bg.wot.core.update() is called from RW
                    if (data && data.update_rw) {
                        wot_rw.update();
                    }
                    // TODO: do other updates (e.g. toolbar icon, etc)
                    wot_commands.update();  // Update button's context menu
                    break;

                case "update_ratingwindow_comment":
                    wot_rw.update_ratingwindow_comment();
                    break;

                case "message_seen":
                    wot_rw.message_seen(data.message_id);
                    break;

                case "navigate":
                    wot_browser.open_wotsite(data.url, "", "", data.context, true, true);
                    wot_rw.hide_ratingwindow();
                    break;

                case "prefs:set":
                    if (data.key && wot_rw.IGNORED_PREFS.indexOf(data.key) < 0) {   // ignore special prefs
                        wot_prefs.setSmart(data.key, data.value);    // not good to assume Char type here, so be careful
                    }
                    break;

                case "close":
                    wot_rw.hide_ratingwindow();
                    break;

                case "submit":
                    wot_rw.on_submit(data);
                    break;

                case "get_comment":
                    wot_api_comments.get(data.target);
                    break;

                case "submit_comment":
                    wot_api_comments.submit(data.target, data.user_comment, data.user_comment_id, data.votes);
                    break;

                case "remove_comment":
                    wot_api_comments.remove(data.target);
                    break;

                case "keeper.remove_comment":
                    wot_keeper.remove_comment(data.target);
                    break;

                case "keeper.save_comment":
                    wot_keeper.save_comment(data.target, data.user_comment, data.user_comment_id, data.votes, data.keeper_status);
                    break;

	            case "api_get_tags":
//		            data.core_keyword , data.method
//		            wot_api_tags.get_tags(data.core_keyword, data.method);
		            wot_wg.update_tags();
			        break;

	            case "log":
		            wot_tools.log("LOG: ", data);
		            break;

	            case "reload":
		            wot_rw.is_inited = false;
		            break;
            }

            return true;

        } catch (e) {
            wot_tools.wdump("ERROR: wot_rw.on_ratingwindow_event() raised an exception: " + e);
        }
    },

    init_channel: function (elem_id, event_id) {
        var doc = this.get_rw_document(),
            rw = this.get_rw_window();

        if (!doc || !rw) return false;

        rw.wot_bg.wot.core.moz_connect(elem_id, event_id);

        var chan = doc.getElementById(elem_id);
        if (chan) {
            chan.addEventListener(event_id, this.on_ratingwindow_event);
        } else {
            wot_tools.wdump("Can't find 'wot-ratingwindow' element in RatingWindow DOM. Very bad!");
        }

        return true;
    },

    initialize: function (rw, rw_doc, rw_wot) {
        try {
            this.init_channel(this.CHAN_ELEM_ID, this.CHAN_EVENT_ID);

            var locale_strings = wot_util.get_all_strings();
            rw.chrome.i18n.loadMessages(JSON.stringify(locale_strings));    // using JSON to push data to sandboxed content

            var prefs = this.get_preferences();
            this.push_preferences(rw, prefs);

            // setup categories data in the RW
            rw_wot.categories = wot_categories.categories;
            rw_wot.grouping = wot_categories.grouping;
            rw_wot.cgroups = wot_categories.cgroups;
            rw_wot.cat_combinations = wot_categories.cat_combinations;
            rw_wot.cat_combinations_prio = wot_categories.cat_combinations_prio;

            // init other values
            rw_wot.firstrunupdate = WOT_FIRSTRUN_CURRENT;

	        this.update_ratingwindow_tags();

            rw_wot.ratingwindow.onload();   // this runs only once in FF

            this.is_inited = true;

        } catch (e) {
            wot_tools.wdump("Failed with wot_rw.initialize()" + e);
        }
    }

};

wot_modules.push({ name: "wot_rw", obj: wot_rw });
