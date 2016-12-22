/*
 proxies.js
 Copyright © 2009 - 2014  WOT Services Oy <info@mywot.com>

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

// The purpose of this file is to handle objects and methods that exist in Chrome browser but doesn't in Firefox

var wot_bg = {
    wot: {}
};    // background page object

$.extend(wot_bg.wot, wot, {

        prefs: { // preferences

            _prefs: {},

            get: function (k) {
                return wot_bg.wot.prefs._prefs[k];
            },

            set: function (k, v) {
                var _this = wot_bg.wot;
                // TODO: implement pushing setting preferences to the BG
                wot_bg.wot.prefs._prefs[k] = v;
                _this.core.moz_send("prefs:set", {key: k, value: v});
            },

            load_prefs: function (json_data) {
                wot_bg.wot.prefs._prefs = JSON.parse(json_data);
                wot_bg.wot.wt.load_settings(); // update WelcomeTips settings from preferences
            }
        },

        core: { // stubs of Background page

            _level: "", // TODO: implement getting current user "level",
            _moz_element_id: null,
            _moz_event_id: null,
            badge: {
                text: "",
                type: null
            },

            usermessage: {},

            is_level: function (level) {
                return wot_bg.wot.core._level == level;
            },

            update: function (update_rw) {
                wot_bg.wot.core.moz_send("update", { update_rw: update_rw});  // ask BG to update rating window
            },

            update_ratingwindow_comment: function () {
                wot_bg.wot.core.moz_send("update_ratingwindow_comment", null);  // ask BG to update comment data
            },

            unseenmessage: function () {

	            var _this = wot_bg.wot.core;

	            return (_this.usermessage &&
		            _this.usermessage.text &&
		            _this.usermessage.id &&
		            _this.usermessage.id != wot_bg.wot.prefs.get("last_message") &&
		            _this.usermessage.id != "downtime");
            },

            open_mywot: function(page, context) {
                wot.ratingwindow.navigate(page, context);
            },

            moz_set_usermessage: function (json_data) {
                // Takes jsoned message to show it user in RW

                var data = JSON.parse(json_data);
                if (data && data.text) wot_bg.wot.core.usermessage = data;
            },

            moz_connect: function (element_id, event_id) {
                // init communication channel's properties
                wot_bg.wot.core._moz_element_id = element_id;
                wot_bg.wot.core._moz_event_id = event_id;
            },

            moz_send: function (message_id, data) {
                // Sends event with data to background code (outside of RatingWindow)
                var obj = document.getElementById(wot_bg.wot.core._moz_element_id);
	            if (obj) {
		            var e = new CustomEvent(wot_bg.wot.core._moz_event_id, {
			            "detail": {
				            "message_id": message_id,
				            "data": data
			            }
		            });
		            obj.dispatchEvent(e);
	            }
            },

	        tags: {

		        // these variables are updated from content/ratingwindow.js: update_ratingwindow_tags()
		        mytags: [ ],
		        mytags_updated: null,       // time when the list was updated last time
		        MYTAGS_UPD_INTERVAL: 30 * 60 * 1000,

		        popular_tags: [ ],
		        popular_tags_updated: null,
		        POPULARTAGS_UPD_INTERVAL: 30 * 60 * 1000
	        }
        },

        keeper: {
            remove_comment: function (target) {
                wot_bg.wot.core.moz_send("keeper.remove_comment", { target: target });
            },

            save_comment: function (target, user_comment, user_comment_id, votes, keeper_status) {
                wot_bg.wot.core.moz_send("keeper.save_comment", {
                    target: target,
                    user_comment: user_comment,
                    user_comment_id: user_comment_id,
                    votes: votes,
                    keeper_status: keeper_status
                });
            }
        },

        url: {
            decodehostname: function (v) { return v;}   // no need to process data in RW since it is already process in BG
        },

        api: {

            submit: function (target, params, update_rw) {
                wot_bg.wot.core.moz_send("submit", { target: target, params: params, update_rw: update_rw });
            },

            comments: {

                get: function (target) {
                    wot_bg.wot.core.moz_send("get_comment", { target: target });
                },

                submit: function (target, user_comment, user_comment_id, votes) {
                    wot_bg.wot.core.moz_send("submit_comment", {
                        target: target,
                        user_comment: user_comment,
                        user_comment_id: user_comment_id,
                        votes: votes
                    });
                },

                remove: function (target) {
                    wot_bg.wot.core.moz_send("remove_comment", { target: target });
                }

            },

	        tags: {
		        my: {
			        get_tags: function () {
				        wot_bg.wot.core.moz_send("api_get_tags", { core_keyword: "mytags", method: "getmytags" });
			        }
		        },

		        popular: {
			        get_tags: function () {
				        wot_bg.wot.core.moz_send("api_get_tags", { core_keyword: "popular_tags", method: "getmastertags" });
			        }
		        }
	        }

        },

        cache: {
            cacheratingstate: function (target, state, votes) {
                // Detects whether testimonies where changed.
                // This function doesn't store anything in the Cache as against Chrome implementation.
                // TODO: it should store new state/votes so when finish state is called again it doesn't send ratings second time

                var changed = false,
                    obj = wot.ratingwindow.getcached();

                wot.components.forEach(function(item) {
                    if (state[item.name]) {
                        obj.value[item.name] = obj.value[item.name] || {};

                        if (obj.value[item.name].t != state[item.name].t) {
                            obj.value[item.name].t  = state[item.name].t;
                            changed = true;
                            return false;   // exit the cycle
                        }
                    }
                });

                if (!wot.utils.isEmptyObject(votes)) {
                    for (var cid in votes) {
                        if (!obj.value.cats[cid]) {
                            obj.value.cats[cid] = {
                                id: cid,
                                c: 0    // since it wasn't in the cache, then it is not identified (?)
                            }
                        }
                        obj.value.cats[cid].v = votes[cid];
                    }
                    changed = true;
                }

                return changed;

            },

            setflags: function (target, flags) {
                // {warned: true, warned_expire: warned_expire }
                // TODO: implement sending flags to BG cache
            }
        },

        ga: {},  // this object is replaced on every chrome.extension.getBackgroundPage() call

        wt: {   // Welcome Tips proxy wrapper

	        activity_score_max: 1500,

            settings: {
                rw_ok: false,
                rw_shown: 0,
                rw_shown_dt: null
            },

            save_setting: function(name) {
                var bg = chrome.extension.getBackgroundPage(),
                    _this = wot_bg.wot.wt;

                if (_this.settings[name] !== undefined) {
                    bg.wot.prefs.set("wt_"+name, _this.settings[name]);
                }
            },

            load_settings: function () {
                var _this = wot_bg.wot.wt;
                for (var name in _this.settings) {
                    if (_this.settings.hasOwnProperty(name)) {
                        var val = wot_bg.wot.prefs.get("wt_" + name);
                        if (val !== undefined) {
                            _this.settings[name] = wot_bg.wot.prefs.get("wt_" + name);
                        }
                    }
                }
            }
        }
    });

    wot_bg.console = {

        log: function(args) {
            if (window.console && window.console.log) {
                window.console.log("LOG: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
            wot_bg.wot.core.moz_send("log", { args: arguments });
        },
        warn: function (args) {
            if (window.console && window.console.log) {
                window.console.log("WARN: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
            wot_bg.wot.core.moz_send("log", { args: arguments });
        },
        error: function (args) {
            if (window.console && window.console.log) {
                window.console.log("ERROR: " + arguments[1] + " , " + arguments[2] + " , " + arguments[3]);
            }
            wot_bg.wot.core.moz_send("log", { args: arguments });
        }
    };

// IN order to allow RatingWindow to close itself we redefine the global method (what a nasty life!).
window.close = function() {
    wot_bg.wot.core.moz_send("close", null);
};

// Magic trick to supply wot.prefs with actual code
$.extend(wot, { prefs: wot_bg.wot.prefs });

var chrome = {
    extension: {
        getBackgroundPage: function () {
            // if (wot.ga) {
            //     wot_bg.wot.ga = wot.ga; // init/update the GA object
            // }
            return wot_bg;
        }
    },

    i18n: {

        messages: {},

        getMessage: function(c) {
            return chrome.i18n.messages[c];
        },

        loadMessages: function (json_data) {
            chrome.i18n.messages = JSON.parse(json_data);
        }

    }
};

