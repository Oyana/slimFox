/*
	config.js
	Copyright © 2005 - 2015 WOT Services Oy <info@mywot.com>

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

const WOT_PLATFORM = "firefox";
const WOT_VERSION  = "20151208";

/*
 * Constants
 */

const WOT_GUID = "{a0d7ccb3-214d-498b-b4aa-0e8fda9a7bf7}";

/* Reputation values */
const WOT_MAX_REPUTATION   = 100;
const WOT_MIN_REPUTATION_5 = 80;
const WOT_MIN_REPUTATION_4 = 60;
const WOT_MIN_REPUTATION_3 = 40;
const WOT_MIN_REPUTATION_2 = 20;

const WOT_REPUTATIONLEVELS = [
        { level: "x", name: "rx", min: -2 },
        { level: "0", name: "r0", min: -1 },
        { level: "1", name: "r1", min:  0 },
        { level: "2", name: "r2", min: WOT_MIN_REPUTATION_2 },
        { level: "3", name: "r3", min: WOT_MIN_REPUTATION_3 },
        { level: "4", name: "r4", min: WOT_MIN_REPUTATION_4 },
        { level: "5", name: "r5", min: WOT_MIN_REPUTATION_5 }
    ];

/* Confidence values */
const WOT_MAX_CONFIDENCE   = 100;
const WOT_MIN_CONFIDENCE_5 = 45;
const WOT_MIN_CONFIDENCE_4 = 34;
const WOT_MIN_CONFIDENCE_3 = 23;
const WOT_MIN_CONFIDENCE_2 = 12;
const WOT_MIN_CONFIDENCE_1 = 6;

const WOT_CONFIDENCELEVELS = [
        { level: "x", name: "cx", min: -2 },
        { level: "0", name: "c0", min: -1 },
        { level: "1", name: "c1", min: WOT_MIN_CONFIDENCE_1 },
        { level: "2", name: "c2", min: WOT_MIN_CONFIDENCE_2 },
        { level: "3", name: "c3", min: WOT_MIN_CONFIDENCE_3 },
        { level: "4", name: "c4", min: WOT_MIN_CONFIDENCE_4 },
        { level: "5", name: "c5", min: WOT_MIN_CONFIDENCE_5 }
    ];

// reference: http://www.mywot.com/wiki/Activity_scores
const WOT_ACTIVITYSCORE_LEVELS = [
        { name: "rookie", min: 0 },
        { name: "bronze", min: 1500 },
        { name: "silver", min: 3000 },
        { name: "gold",     min: 6000 },
        { name: "platinum", min: 10000 }
    ];

const WOT_AS_LEVELS = {
        ROOKIE: 0,
        BRONZE: 1500,
        SILVER: 3000,
        GOLD: 6000,
        PLATINUM: 10000
    };

/* Applications */
const WOT_COMPONENTS = [0, 4];

/* Search */
const WOT_SAFESEARCH_OSD_URL = "https://search.mywot.com/osd/en-US.xml";

/* API */
const WOT_SERVICE_NORMAL		= "http://api.mywot.com";
const WOT_SERVICE_SECURE		= "https://api.mywot.com";

const WOT_SERVICE_API_VERSION	= "/0.4/";
const WOT_SERVICE_UPDATE_FORMAT	= 4;

const WOT_SERVICE_API_LINK		= WOT_SERVICE_API_VERSION + "link";
const WOT_SERVICE_API_QUERY		= WOT_SERVICE_API_VERSION + "query";
const WOT_SERVICE_API_REGISTER	= WOT_SERVICE_API_VERSION + "register";
const WOT_SERVICE_API_RELOAD	= WOT_SERVICE_API_VERSION + "reload";
const WOT_SERVICE_API_SUBMIT	= WOT_SERVICE_API_VERSION + "submit";
const WOT_SERVICE_API_UPDATE    = WOT_SERVICE_API_VERSION + "update";
const WOT_SERVICE_API_FEEDBACK    = WOT_SERVICE_API_VERSION + "feedback";

/* API XML tags and attributes */
const WOT_SERVICE_XML_LINK						= "link";
const WOT_SERVICE_XML_QUERY						= "query";
const WOT_SERVICE_XML_QUERY_NONCE				= "nonce";
const WOT_SERVICE_XML_QUERY_TARGET				= "target";
const WOT_SERVICE_XML_QUERY_TARGET_INDEX		= "index";
const WOT_SERVICE_XML_QUERY_TARGET_NORMAL		= "normalized";
const WOT_SERVICE_XML_QUERY_APPLICATION			= "application";
const WOT_SERVICE_XML_QUERY_APPLICATION_NAME	= "name";
const WOT_SERVICE_XML_QUERY_APPLICATION_R		= "r";
const WOT_SERVICE_XML_QUERY_APPLICATION_C		= "c";
const WOT_SERVICE_XML_QUERY_APPLICATION_I		= "inherited";
const WOT_SERVICE_XML_QUERY_APPLICATION_L		= "lowered";
const WOT_SERVICE_XML_QUERY_APPLICATION_E		= "excluded";
const WOT_SERVICE_XML_QUERY_APPLICATION_T		= "t";
const WOT_SERVICE_XML_QUERY_CATEGORY		    = "category";
const WOT_SERVICE_XML_QUERY_CATEGORY_NAME	    = "name";
const WOT_SERVICE_XML_QUERY_CATEGORY_GROUP	    = "group";
const WOT_SERVICE_XML_QUERY_CATEGORY_C		    = "c";
const WOT_SERVICE_XML_QUERY_CATEGORY_I		    = "inherited";
const WOT_SERVICE_XML_QUERY_CATEGORY_VOTE	    = "vote";
const WOT_SERVICE_XML_QUERY_BLACKLIST		    = "bl";
const WOT_SERVICE_XML_QUERY_BLACKLIST_TYPE	    = "type";
const WOT_SERVICE_XML_QUERY_BLACKLIST_TIME	    = "time";
const WOT_SERVICE_XML_QUERY_QUESTION			= "question";
const WOT_SERVICE_XML_QUERY_QUESTION_ID			= "questionId";
const WOT_SERVICE_XML_QUERY_QUESTION_TEXT		= "questionText";
const WOT_SERVICE_XML_QUERY_CHOICE_TEXT 		= "choiceText";
const WOT_SERVICE_XML_QUERY_DISMISS_TEXT 		= "dismiss";
const WOT_SERVICE_XML_QUERY_MSG					= "message";
const WOT_SERVICE_XML_QUERY_MSG_ID				= "id";
const WOT_SERVICE_XML_QUERY_MSG_ID_MAINT		= "downtime";
const WOT_SERVICE_XML_QUERY_MSG_TYPE			= "type";
const WOT_SERVICE_XML_QUERY_MSG_URL				= "url";
const WOT_SERVICE_XML_QUERY_MSG_TARGET			= "target";
const WOT_SERVICE_XML_QUERY_MSG_TARGET_ALL		= "all";
const WOT_SERVICE_XML_QUERY_MSG_VERSION			= "version";
const WOT_SERVICE_XML_QUERY_MSG_VERSION_EQ		= "eq";
const WOT_SERVICE_XML_QUERY_MSG_VERSION_LE		= "le";
const WOT_SERVICE_XML_QUERY_MSG_VERSION_GE		= "ge";
const WOT_SERVICE_XML_QUERY_MSG_THAN			= "than";
const WOT_SERVICE_XML_QUERY_USER				= "user";
const WOT_SERVICE_XML_QUERY_STATUS				= "status";
const WOT_SERVICE_XML_REGISTER					= "register";
const WOT_SERVICE_XML_REGISTER_ID				= "id";
const WOT_SERVICE_XML_REGISTER_KEY				= "key";
const WOT_SERVICE_XML_RELOAD					= "reload";
const WOT_SERVICE_XML_RELOAD_ID					= WOT_SERVICE_XML_REGISTER_ID;
const WOT_SERVICE_XML_RELOAD_KEY				= WOT_SERVICE_XML_REGISTER_KEY;
const WOT_SERVICE_XML_SUBMIT					= "submit";
const WOT_SERVICE_XML_SUBMIT_RESULT				= "result";
const WOT_SERVICE_XML_UPDATE_INTERVAL			= "interval";
const WOT_SERVICE_XML_UPDATE_SEARCH				= "search";
const WOT_SERVICE_XML_UPDATE_SEARCH_NAME		= "name";
const WOT_SERVICE_XML_UPDATE_SHARED				= "shared";
const WOT_SERVICE_XML_UPDATE_SHARED_DOMAINS		= "domains";
const WOT_SERVICE_XML_UPDATE_SHARED_LEVEL		= "level";
const WOT_SERVICE_XML_UPDATE_CATEGORIES			= "categories";

/* My */
const WOT_MY_URL = "http://www.mywot.com/";
const WOT_MY_COOKIE_DOMAIN = ".mywot.com";
const WOT_MY_TRIGGER = /^(.+\.)?mywot.com$/;
const WOT_MY_SESSION_LENGTH = 86340 * 1000; /* < 1d */

/* Scorecard */
const WOT_SCORECARD_PATH = "scorecard/";
const WOT_SCORECARD_COMMENT = "/comment";
const WOT_SCORECARD_RATE = "/rate";

/* Operation intervals (in ms) */
const WOT_DELAY_WARNING					= 0;				/* 1 s */
const WOT_INTERVAL_BLOCK_ERROR			= 15 * 1000;		/* 15 s */
const WOT_INTERVAL_CACHE_REFRESH 	  	= 30 * 60 * 1000;	/* 30 min */
const WOT_INTERVAL_CACHE_REFRESH_BLOCK 	= 18000 * 1000;		/* 5 h */
const WOT_INTERVAL_CACHE_REFRESH_ERROR	= 30 * 1000;		/* 30 s */
const WOT_INTERVAL_LINK_RETRY			= 2 * 1000;			/* 2 s */
const WOT_INTERVAL_REGISTER_ERROR 	  	= 30 * 1000;		/* 30 s */
const WOT_INTERVAL_REGISTER_OFFLINE	  	= 30 * 1000;		/* 30 s */
const WOT_INTERVAL_RELOAD_ERROR 	  	= 5 * 60 * 1000;	/* 5 min */
const WOT_INTERVAL_SUBMIT_ERROR 		= 5 * 60 * 1000;	/* 5 min */
const WOT_INTERVAL_UPDATE_CHECK		  	= 10800 * 1000;		/* 3 h */
const WOT_MIN_INTERVAL_UPDATE_CHECK		= 30 * 60 * 1000;	/* 30 min */
const WOT_MAX_INTERVAL_UPDATE_CHECK		= 3 * 86400 * 1000;	/* 3 d */
const WOT_INTERVAL_UPDATE_ERROR		  	= 15 * 60 * 1000;	/* 15 min */
const WOT_INTERVAL_UPDATE_OFFLINE 	  	= 30 * 1000;		/* 30 s */
const WOT_TIMEOUT_QUERY 				= 15 * 1000;		/* 15 s */

/* Maximum number of attempts to access service */
const WOT_MAX_TRIES_SUBMIT = 30;
const WOT_MAX_TRIES_LINK = 3;

/* Maximum number of hostnames in a link query */
const WOT_MAX_LINK_PARAMS = 100;
const WOT_MAX_LINK_HOSTSLEN = 4096; /* Characters */

/* Parameters */
const WOT_LENGTH_WITNESS_ID   = 40;	/* Characters */
const WOT_LENGTH_WITNESS_KEY  = 40;

/* Warnings */
const WOT_MAX_WARNINGS = 100;
const WOT_DEFAULT_WARNING_LEVEL = 39;
const WOT_DEFAULT_MIN_CONFIDENCE_LEVEL = 8;

const WOT_BLOCK_LOADING = "chrome://wot/locale/loading.html";
const WOT_BLOCK_BLOCKED = "chrome://wot/content/blocked.html";

/*
 * Preferences
 */

const WOT_PREF_PATH = "settings/";
const WOT_PREF_FORWARD_TAB_MATCH = 8;
const WOT_PREF_FORWARD_TAB_BASE = 1;
const WOT_PREF_FORWARD = /^(http(s)?\:\/\/(.+\.)?mywot\.com)\/([^\/]{2}(-[^\/]+)?\/)?(settings)(\/([^\/]+))?\/?(\?.+)?$/;
const WOT_PREF_TRIGGER = /^(http(s)?\:\/\/(.+\.)?mywot\.com)\/([^\/]{2}(-[^\/]+)?\/)?(settings)\/.+/;


const WOT_PREF = "weboftrust.";

/* Values */
const WOT_WARNING_NONE			= 0;
const WOT_WARNING_NOTIFICATION	= 1;
const WOT_WARNING_DOM			= 2;
const WOT_WARNING_BLOCK			= 3;

const WOT_REASON_UNKNOWN		= 1;
const WOT_REASON_TESTIMONY		= 2;
const WOT_REASON_RATING			= 3;

const WOT_SEARCH_TYPE_OPTIMIZED	= 0;
const WOT_SEARCH_TYPE_WORST		= 1;
const WOT_SEARCH_TYPE_APP0		= 2;

/* First run */
const WOT_FIRSTRUN_WELCOME = 1;
const WOT_FIRSTRUN_CURRENT = 3;
const WOT_UPDATE_PATH = "update";


/* Preferences and defaults */
const wot_prefs_bool = [
	[ "accessible",					false ],
	[ "button_created",				false ],
	[ "create_button",				false ],
	[ "enabled",					true  ],
	[ "install_search",				false ],
	[ "my_cookies",					true  ],
	[ "prefetch",					false ],
	[ "private_disable",			false ],
	[ "search_ignore_0",			false ],
	[ "search_ignore_4",			true  ],
	[ "search_scripts",				true  ],
	[ "show_application_0",			true  ],
	[ "show_application_1",			false ],
	[ "show_application_2",			false ],
	[ "show_application_3",			false ],
	[ "show_application_4",			true  ],
	[ "show_search_popup",			true  ],
	[ "use_search_level",			false ],
	[ "ninja_donuts",   			false ],
	[ "warning_unknown_0",			false ],
	[ "warning_unknown_1",			false ],
	[ "warning_unknown_2",			false ],
	[ "warning_unknown_3",			false ],
	[ "warning_unknown_4",			false ],
	[ "feedback_enabled",			true  ],
	[ "feedback_optedout",			false ],
	[ "show_fulllist",			    false ],
	[ "wt_rw_ok",			        false ],
	[ "super_showtestimonies",	    false ], // show my rating on the search popup at bottom corners of the popup
    [ "settingsui_parental",        false ]  // this is should not be considered by the add-on. Only to render prefs on the settings page
];

const wot_prefs_char = [
	[ "cookie_updated",				"0"	],
	[ "extension_id",				""	],
	[ "firstrun_guide",				"0"	],
	[ "firstrun_time",				""	],
	[ "last_message",				""	],
	[ "last_version",				""	],
	[ "norepsfor",					""	],
	[ "partner",					""	],
	[ "status_level",				""	],
	[ "update_checked",				"0"	],
	[ "warning_opacity",			"0.7" ],
	[ "witness_id",					""	],
	[ "witness_key",				""	],
	[ "feedback_lasttimeasked",  	""	],
    [ "wt_rw_shown_dt",			    "" ],    // timestamp when RW WelcomeTip was shown last time
	[ "settingsui_warnlevel",  	    "normal" ], // this is should not be considered by the add-on. Only to render prefs on the settings page
	[ "settingsui_searchlevel",  	"normal" ],
	[ "stats_uid", 					"" ],
	[ "stats_sess", 				"" ],
	[ "stats_installtime", 			"" ],
	[ "stats_settings", 			"" ]
];

const wot_prefs_int = [
	[ "min_confidence_level",		WOT_DEFAULT_MIN_CONFIDENCE_LEVEL ],
	[ "popup_hide_delay",			1000 ],
	[ "popup_show_delay",			200 ],
	[ "ratingwindow_shown",			0 ],
	[ "rw_sharing_shown",			0 ],
	[ "rw_opened_sharing",			0 ],
	[ "activity_score",			    0 ],
	[ "wt_rw_shown",			    0 ],    // How many times RW WT was shown
	[ "search_level",				WOT_MIN_REPUTATION_4 ],
	[ "search_type",				WOT_SEARCH_TYPE_OPTIMIZED ],
	[ "update_interval",			WOT_INTERVAL_UPDATE_CHECK ],
	[ "warning_level_0",			WOT_DEFAULT_WARNING_LEVEL ],
	[ "warning_level_1",			WOT_DEFAULT_WARNING_LEVEL ],
	[ "warning_level_2",			WOT_DEFAULT_WARNING_LEVEL ],
	[ "warning_level_3",			WOT_DEFAULT_WARNING_LEVEL ],
	[ "warning_level_4",			0 ],
	[ "warning_type_0",				WOT_WARNING_DOM ],
	[ "warning_type_1",				WOT_WARNING_DOM ],
	[ "warning_type_2",				WOT_WARNING_DOM ],
	[ "warning_type_3",				WOT_WARNING_NONE ],
	[ "warning_type_4",				WOT_WARNING_NONE ],
	[ "settingsui_warntype",		WOT_WARNING_DOM ] // just for UI, other value is WOT_WARNING_BLOCK
];

/* Search rules */
const WOT_SEARCH				= "search";
const WOT_SEARCH_DISPLAY		= "display";
const WOT_SEARCH_DYNAMIC		= "dynamic";
const WOT_SEARCH_ENABLED		= "enabled";
const WOT_SEARCH_IGN			= "ign";
const WOT_SEARCH_PRE			= "pre";
const WOT_SEARCH_PRE_MATCH		= "match";
const WOT_SEARCH_PRE_RE			= "re";
const WOT_SEARCH_PRESTYLE		= "prestyle";
const WOT_SEARCH_REMOVE			= "remove";
const WOT_SEARCH_SCRIPT			= "script";
const WOT_SEARCH_SEARCHLEVEL	= "searchlevel";
const WOT_SEARCH_STYLE			= "style";
const WOT_SEARCH_URLIGN			= "urlign";
const WOT_SEARCH_URL			= "url";
const WOT_SEARCH_MATCH			= "match";
const WOT_SEARCH_MATCH_COND		= "condition";
const WOT_SEARCH_MATCH_DOC		= "document";
const WOT_SEARCH_MATCH_ELEM		= "element";
const WOT_SEARCH_CONTENT_ATTR	= "attribute";
const WOT_SEARCH_CONTENT_VALUE	= "value";
const WOT_SEARCH_CONTENT_NAME	= "name";
const WOT_SEARCH_CONTENT_RE		= "re";
const WOT_SEARCH_CONTENT_FLAGS	= "flags";
const WOT_SEARCH_TARGET			= "target";
const WOT_SEARCH_POPUP			= "popup";
const WOT_SEARCH_NINJA			= "ninja";

/* contexts for opening WOT links */
const WOT_URL_RWLOGO =       "rw-logo";
const WOT_URL_RWSETTINGS =   "rw-settings";
const WOT_URL_RWGUIDE =      "rw-guide";
const WOT_URL_RWVIEWSC =     "rw-viewsc";
const WOT_URL_RWPROFILE =    "rw-profile";
const WOT_URL_RWMSG =        "rw-msg";  // unused
const WOT_URL_WARNVIEWSC =   "warn-viewsc";
const WOT_URL_WARNRATE =     "warn-rate";
const WOT_URL_POPUPVIEWSC =  "popup";
const WOT_URL_POPUPDONUTS =  "popup-donuts";
const WOT_URL_MENUMY =       "menu-my";
const WOT_URL_BTN =          "button";
const WOT_URL_CTX =          "contextmenu";

const WOT_SITEAPI_ERRORS = {
    error_codes: {
        "0": "SUCCESS",
        "1": "NO_ACTION_DEFINED",
        "2": "IS_BANNED",
        "3": "AUTHENTICATION_FAILED",
        "4": "NO_TARGET",
        "5": "COMMENT_NOT_FOUND",
        "6": "COMMENT_REMOVAL_FAILED",
        "7": "COMMENT_NOT_ALLOWED",
        "8": "NO_COMMENTID",
        "9": "NO_CATEGORIES_SPECIFIED",
        "10": "NO_COMMENT_SPECIFIED",
        "11": "AUTHENTICATION_INVALID_QUERY_PARAMETERS",
        "12": "AUTHENTICATION_REP_SERVER_ERROR",
        "13": "NO_QUERY_SPECIFIED",
        "14": "QUERY_STRING_MISSING",
        "15": "COMMENT_HAS_BEEN_ALTERED",
        "16": "COMMENT_TOO_SHORT",
        "17": "COMMENT_TOO_LONG",
        "18": "COMMENT_SAVE_FAILED",
        SUCCESS: 0,
        NO_ACTION_DEFINED: 1,
        IS_BANNED: 2,
        AUTHENTICATION_FAILED: 3,
        COMMENT_NOT_FOUND: 5,
        COMMENT_REMOVAL_FAILED: 6,
        COMMENT_NOT_ALLOWED: 7,
        AUTHENTICATION_REP_SERVER_ERROR: 12,
        COMMENT_SAVE_FAILED: 18
    }
};

const WOT_STATS = {
	SID: 	"241",
	VER: 	"1.0",
	URL: 	"https://secure.mywot.com/config",
	ST: 	60 * 1000 * 30
};
