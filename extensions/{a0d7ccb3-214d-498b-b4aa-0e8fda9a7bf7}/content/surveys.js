/*
 surveys.js
 Copyright © 2012 - 2013  WOT Services Oy <info@mywot.com>

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

const WOT_PREFIX_ASKED = "wot_asked";
const WOT_FBL_ASKED_RE = new RegExp(WOT_PREFIX_ASKED + "\:(.+)\:(.+)\:status");
const WOT_FBL_ASKED_LOADED = "wot_asked_loaded";

var wot_surveys = {

	fbl_form_schema:    "//",
	storage_file:       "storage.json",
//	fbl_form_uri:       "fbl.local/feedback/1/surveys.html",    // for dev only. don't forget to change version!
	fbl_form_uri:       "api.mywot.com/feedback/1/surveys.html",    // don't forget to change version!
	re_fbl_uri:         null,
	wrapper_id:         "wot_surveys_wrapper",
	pheight:            400,
	pwidth:             392,
	px:                 10,
	py:                 10,
	script_base:        "resource://wot-base-dir/",
	scripts:            [ "libs/jquery.js", "libs/jquery-ui.min.js",
						  "injections/wot_proxy.js", "injections/surveys.widgets.js"],

	global_calm_period:   3 * 24 * 3600, // Time in seconds after asking a question before we can ask next question
	site_calm_period:     10 * 24 * 3600, // delay between asking for the particular website if user hasn't given the feedback yet
	site_max_reask_tries: 3,    // How many times we can ask a user for the feedback about the website
	newuser_period:       14 * 24 * 3600, // Don't ask new users (<14 days)

	always_ask:         ['api.mywot.com', 'fb.mywot.com'],
	always_ask_passwd:  "#surveymewot", // this string must be present to show survey in forced way
	reset_passwd:       "#wotresetsurveysettings", // this string must be present to reset timers and optout

	FLAGS: {
		none:       0,  // a user didn't make any input yet
		submited:   1,  // a user has given the answer
		closed:     2,  // a user has closed the survey dialog without givin the answer
		optedout:   3   // a user has clicked "Hide forever"
	},

	survey_url: function()
	{
		return this.fbl_form_schema + this.fbl_form_uri;
	},

	load_delayed: function ()
	{
		this.re_fbl_uri = new RegExp("^" + wot_surveys.fbl_form_uri, "i");  // prepare RegExp once to use often

		// Load the JSON stored data about asked websites
		if (!wot_surveys.asked.is_loaded()) {
			wot_surveys.asked.load_from_file();
		}
	},

	domcontentloaded: function(event)
	{
		try {

			if (!event || !wot_util.isenabled()) {
				return;
			}

            try {   // Workaround to resolve "TypeError: can't access dead object" at start of the browser
                if (!event.originalTarget) { return; }
            } catch (e) { return; }

			var content = event.originalTarget,
				location = (content && content.location) ? content.location : {};

			var is_framed = (content.defaultView && content.defaultView != content.defaultView.top);

			// Process framed documents differently than normal ones
			if (is_framed) {

				if (location) {
					// skip all frames except of our own FBL form
					if (wot_surveys.re_fbl_uri.test(location.host + location.pathname)) {
						// here we found WOT FBL form loaded into a frame. Next step - to inject JS into it.
						wot_surveys.inject_javascript(content);
					}
				}

			} else {

				// same code as for warning screen
				if (!content || !location || !location.href ||
					wot_url.isprivate(location.href) || !(/^https?:$/.test(location.protocol))) {
					return;
				}

				var hostname = wot_url.gethostname(location.href);
				var warning_type = wot_warning.isdangerous(hostname, false);

				// ask only if no big Warning is going to be shown
				if (warning_type == WOT_WARNING_NONE|| warning_type == WOT_WARNING_NOTIFICATION) {
					wot_surveys.try_show(content, hostname);
				}
			}

		} catch (e) {
			dump("wot_surveys.domcontentloaded: failed with " + e + "\n");
		}

	},

	unload: function (event)
	{
		// dumping global hash table on unloading doesn't work here since wot_hashtable is already unloaded
//		wot_surveys.asked.dump_to_file();   // save state to the file
	},

	get_or_create_sandbox: function(content)
	{
		var sandbox = content.wotsandbox;

		if (!sandbox) {
			var wnd = new XPCNativeWrapper(content.defaultView);
			sandbox = new Components.utils.Sandbox(wnd, {
				sandboxPrototype: wnd
			});

			sandbox.window = wnd;
			sandbox.document = sandbox.window.document;

			sandbox.wot_post = wot_search.getsandboxfunc(sandbox, "wot_post", wot_surveys.sandboxapi);

			content.wotsandbox = sandbox;
		}

		return sandbox;
	},

	load_file: function(file)
	{
		var str = "";

		try {
			var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
			var scriptableStream = Components
				.classes["@mozilla.org/scriptableinputstream;1"]
				.getService(Components.interfaces.nsIScriptableInputStream);

			var channel = ioService.newChannel(file, null, null);
			var input = channel.open();
			scriptableStream.init(input);
			str = scriptableStream.read(input.available());
			scriptableStream.close();
			input.close();
		} catch (e) {
			dump("wot_surveys.load_file(): failed with " + e + "\n");
		}

		return str;
	},

	inject_javascript: function (content)
	{
		var sandbox = wot_surveys.get_or_create_sandbox(content);

		var contents = "",
			url = "";

		// load all scripts and join to one text
		for(var i=0; i < wot_surveys.scripts.length; i++) {
			url = wot_surveys.script_base + wot_surveys.scripts[i];
			contents = wot_surveys.load_file(url);

			// run scripts in fbl form-page
			try {
				Components.utils.evalInSandbox(contents, sandbox);
			} catch (e) {
				dump("wot_surveys.load_script(): evalInSandbox " +
					"failed with " + e + "\n");
			}
		}

	},

	inject: function (doc, question)
	{
		var ws = wot_surveys;
		var location = doc.defaultView.location;

		// skip params and hash in the URL
		question.url = location.protocol + "//" + location.host + location.pathname;

		var wrapper = doc.getElementById(ws.wrapper_id);
		if(wrapper) {
			return;
		}
		wrapper = doc.createElement("iframe");
		wrapper.setAttribute("id", ws.wrapper_id);

		if (!wrapper) {
			dump("can't add element to DOM / wot.surveys.inject_placeholder()");
			return;
		}

		wrapper.setAttribute("scrolling", "no");

		wrapper.setAttribute("style",
			"position: fixed; " +
				"top: " + ws.py + "px; " +
				"left: "+ ws.px +"px;" +
				"width: "+ ws.pwidth +"px; " +
				"height: "+ ws.pheight +"px; " +
				"z-index: 2147483647; " +
				"border: none; visibility: hidden;");

		wrapper.setAttribute("src", this.survey_url());

		var encoded_data = btoa(JSON.stringify(question));

		// Probably in FF we should transfer data to the frame by injecting it as JS (json) object instead of
		// relying to "name" property
		wrapper.setAttribute("name", encoded_data);  // transfer question's data via "name" property of iframe

		wot_browser.attach_element(wrapper, doc.defaultView); // attach iframe wrapper to DOM
	},

	try_show: function (doc, hostname)
	{
		try {
			var url = doc.defaultView.location.href;

			// test url for RESET command
			if (wot_surveys.always_ask.indexOf(hostname) >= 0 && url && url.indexOf(wot_surveys.reset_passwd) >= 0) {
				wot_surveys.reset_settings(hostname);
				return;
			}

			var question = wot_surveys.get_question(hostname);

			if (this.is_tts(hostname, url, question.question)) {
				this.inject(doc, question);
			}

		} catch (e) {
			dump("wot_surveys.try_show() failed with " + e + "\n");
		}
	},

	reset_settings: function (hostname)
	{
		var ws = wot_surveys;
		ws.asked.set_loaded();
		ws.opt_out(false);  // reset opt-out

		// reset the list of websites asked about
		ws.asked.enumerate(function(hostname, question_id) {
			ws.asked.remove(hostname, question_id, "time");
			ws.asked.remove(hostname, question_id, "count");
			ws.asked.remove(hostname, question_id, "status");
		});
		ws.asked.dump_to_file();

		ws.set_lasttime_asked(false); // reset last time to empty
	},

	remove_form: function (sandbox, timeout)
	{
		try {

			timeout = timeout || 100;

			window.setTimeout(function () {
				var wrapper = wot_surveys.get_wrapper(sandbox);
				if (wrapper) {
					wrapper.parentNode.removeChild(wrapper);
				}
			}, timeout);

		} catch (e) {
			dump("wot_surveys.remove_form() failed with " + e + "\n");
		}
	},

	get_question: function (hostname)
	{
		try {
			var question_id = wot_cache.get(hostname, "question_id");
			var question_text = wot_cache.get(hostname, "question_text");
            var dismiss_text = wot_cache.get(hostname, "dismiss_text");
			var choices_number = wot_cache.get(hostname, "choices_number");

			if (choices_number > 0) {
				var question = {
					target: hostname,
					decodedtarget: wot_idn.idntoutf(hostname),
					question: {
						id: question_id,
						text: question_text,
                        dismiss_text: dismiss_text,
						choices: []
					}
				};

				for(var i= 0, v, t; i < choices_number; i++) {
					v = wot_cache.get(hostname, "choice_value_" + i);
					t = wot_cache.get(hostname, "choice_text_" + i);
					question.question.choices.push({ value: v, text: t });
				}

				return question;

			} else {
				return {};
			}

		} catch (e) {
			return {};
		}

	},

	is_tts: function (hostname, url, question)
	{
		var ws = wot_surveys;

		try {
			if(!wot_surveys.asked.is_loaded()) return false; // data isn't ready for process
//			dump("if(!wot_surveys.asked.is_loaded()) passed.\n");

			if(!(question && question.id !== undefined && question.text && question.choices)) {
				// no question was given for the current website - do nothing
//				dump("is_tts: empty or no question test NOT PASSED\n");
				return false;
			}
//			dump("is_tts: question test passed.\n");

			// on special domains we should always show the survey if there is a special password given (for testing purposes)
			// e.g. try this url http://api.mywot.com/test.html#surveymewot
			if (ws.always_ask.indexOf(hostname) >= 0 && url && url.indexOf(ws.always_ask_passwd) >= 0) {
//				dump("is_tts: Magic 'always show' test PASSED\n");
				return true;
			}

			if (ws.is_optedout() || !wot_prefs.getBool("feedback_enabled", true)) {
//				dump("is_tts: Opted-out test NOT PASSED\n");
				return false;
			}

			// check if have asked the user more than X days ago or never before
			var lasttime = ws.get_lasttime_asked();
			if (lasttime && wot_util.time_since(lasttime) < ws.global_calm_period) {
//				dump("is_tts: Last time test NOT PASSED\n");
				return false;
			}

			var firstrun_time = wot_util.time_sincefirstrun();
			if (firstrun_time && firstrun_time < ws.newuser_period) {
//				dump("is_tts: old user test NOT PASSED\n");
				return false;
			}

			// check whether we already have asked the user about current website
			var asked_status = ws.asked.get(hostname, question.id, "status");
			var asked_time = ws.asked.get(hostname, question.id, "time");
			var asked_count = ws.asked.get(hostname, question.id, "count");

			if (asked_status === ws.FLAGS.submited) {
//				dump("is_tts: 'Already gave feedback for the website' test NOT PASSED\n");
				return false;
			}
			// all other statuses ("closed" and "none") are subject to show FBL again after delay

			if (asked_count >= ws.site_max_reask_tries) {
//				dump("is_tts: Max asked times NOT PASSED\n");
				return false;
			}

			// If we have never showed the FBL for this site before, or more than "delay"
			if (!(asked_time === null || wot_util.time_since(asked_time) >= ws.site_calm_period)) {
//				dump("is_tts: 'Calm delay for the website' test NOT PASSED\n");
				return false;
			}

//			dump("is_tts: already asked test passed -> show it!\n");
			return true;
		} catch (e) {
			dump("wot_surveys.is_tts() failed with " + e + "\n");
			return false;
		}

	},

	is_optedout: function()
	{
		return wot_prefs.getBool("feedback_optedout", false);
	},

	opt_out: function(value)
	{
		value = (value === undefined) ? true : value;
		wot_prefs.setBool("feedback_optedout", value);
	},

	remember_asked: function(target, question_id, status) {
		var ws = wot_surveys;

		try {

			status = status === undefined ? ws.FLAGS.none : status;

			var count = ws.asked.get(target, question_id, "count") || 0;

			ws.asked.set(target, question_id, "status", status);
			ws.asked.set(target, question_id, "time", new Date());
			ws.asked.set(target, question_id, "count", count + 1);  // increase counter of times FBL has been shown

			ws.asked.dump_to_file();

		} catch (e) {
			console.error("remember_asked() failed with", e);
		}
	},

	save_asked_status: function (data, status) {
		var ws = wot_surveys;
		try {
			if (data && data.target && data.question_id) {
				ws.remember_asked(data.target, data.question_id, status);

				// we remember the last time of user's interaction with FBL
				ws.set_lasttime_asked();
			}
		} catch (e) {
			dump("wot_surveys.save_asked_status() failed with " + e + "\n");
		}
	},

	get_lasttime_asked: function () {
		try {
			var lasttime = wot_prefs.getChar("feedback_lasttimeasked", null);
			if(lasttime) {
				return new Date(lasttime);
			}
		} catch (e) {
			dump("wot_surveys.get_lasttime_asked() failed with " + e + "\n");
		}
		return null;
	},

	set_lasttime_asked: function (time) {
		if (time === undefined) {
			time = new Date();
		}
		if (time === false) {
			time = "";
		}
		wot_prefs.setChar("feedback_lasttimeasked", String(time));
	},

	get_top_content: function (sandbox)
	{
		var top = null;
		if(sandbox && sandbox.window && sandbox.window.top) {
			top = sandbox.window.top;  // look into top content window document
		}
		return top;
	},

	get_wrapper: function (sandbox)
	{
		var wrapper = null;

		try {
			var top = wot_surveys.get_top_content(sandbox);
			if(top && top.document) {
				wrapper = top.document.getElementById(wot_surveys.wrapper_id);
				if(!wrapper) {
					dump("wot_surveys.get_wrapper(): can't find FBL wrapper in the document\n");
				}
			}
		} catch (e) {
			dump("wot_surveys.get_wrapper() failed with " + e + "\n");
		}

		return wrapper;
	},

	reveal_form: function (sandbox)
	{
		var wrapper = wot_surveys.get_wrapper(sandbox);

		if (wrapper) {
			var style = wrapper.getAttribute("style") || "";
			if (style) {
				style = style.replace(/^(.*visibility: )(hidden;)(.*)$/, "$1visible;$3");   // replace hidden -> visible
				wrapper.setAttribute("style", style);
			}
		}
	},

	dispatch: function (message, data, sandbox)
	{
		switch(message) {
			case "shown": // FBL form was shown
				wot_surveys.reveal_form(sandbox);   // make iframe visible
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.none);
				break;
			case "close": // FBL is asking to close it
				// data.target
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.closed);
				wot_surveys.remove_form(sandbox);
				break;
			case "optout": // FBL says the user wants to opt-out from the feedback loop.
				// data.target
				wot_surveys.opt_out();  // store setting
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.optedout);
				wot_surveys.remove_form(sandbox);
				break;
			case "submit":
				//	data.target, .url, .question_id, .answer
				wot_api_feedback.send(data.url, data.question_id, data.answer);
				wot_surveys.save_asked_status(data, wot_surveys.FLAGS.submited);
				wot_surveys.remove_form(sandbox, 1500); // wait a bit to show "thank you!"
				break;
		}
	},

	// This is a wrapper around functions that might be called from the injected JS
	sandboxapi: {

		wot_post: function (sandbox, data_json) {
			// this func is called from /content/injections/wot_proxy.js : wot.post()

			try {
				// try un-json data (DON'T call any methods of data_json since it is unsafe!)
				var data = JSON.parse(data_json);

//				dump("wot_surveys.sandpoxapi.wot_post(): " + JSON.stringify(data) + "\n");

				if (data && data.message && data.data) {
					wot_surveys.dispatch(data.message, data.data, sandbox);
				}
			} catch (e) {
				dump("wot_surveys.sandboxapi.wot_post(): failed with " + e + "\n");
			}

		}

	},

	asked: {

		is_loaded: function () {
			var res = wot_hashtable.get(WOT_FBL_ASKED_LOADED);
			return !!res;
		},

		set_loaded: function () {
			wot_hashtable.set(WOT_FBL_ASKED_LOADED, true);
		},

		get: function (hostname, question_id, prop) {
			var name = wot_surveys.asked._get_name(hostname, question_id, prop),
				res = null;
			if (name) {
				res = wot_hashtable.get(name);
			} else {
//				dump("wot_survey.asked._get_name() returned NULL\n");
			}
			return res;
		},

		set: function (hostname, question_id, prop, value) {
			var name = wot_surveys.asked._get_name(hostname, question_id, prop);
			if (name) {
				wot_hashtable.set(name, value);
//				dump("HashT_set: " + name + " == " + value + "\n");
			} else {
//				dump("wot_survey.asked._get_name() returned NULL\n");
			}
		},

		remove: function (hostname, question_id, prop) {
			var name = wot_surveys.asked._get_name(hostname, question_id, prop);
			wot_hashtable.remove(name);
		},

		_get_name: function (hostname, question_id, prop) {
			// makes a string indentifier like "mywot.com:12345:status"
			var cn = wot_idn.utftoidn(hostname);

			if (!cn) {
				return null;
			}

			return WOT_PREFIX_ASKED + ":" + cn + ":" + String(question_id) + ":" + prop;

		},

		_extract_name: function (element) {
			try {
				if (!element || !element.QueryInterface) {
					return null;
				}

				var property =
					element.QueryInterface(Components.interfaces.nsIProperty);

				if (!property) {
					return null;
				}

				// enumerate only records with property 'status'
				if (property.name.lastIndexOf(":status") < 0) {
					return null;
				}

				var match = property.name.match(WOT_FBL_ASKED_RE);

				if (!match || !match[1] || !match[2]) {
					return null;
				}

				return {
					name: match[1],
					question_id: match[2]
				};

			} catch (e) {
				dump("wot_cache.get_name_from_element: failed with " + e + "\n");
			}
			return null;
		},

		enumerate: function (func) {
			var ws = wot_surveys,
				hash = wot_hashtable.get_enumerator();

			while (hash.hasMoreElements()) {
				var name_question = ws.asked._extract_name(hash.getNext());
				if (name_question) {
					var name = name_question.name,
						question_id = name_question.question_id;
					if (name) {
						func(name, question_id);
					}
				}
			}
		},

		load_from_file: function () {
			wot_file.read_json(wot_surveys.storage_file, function (data, status) {

				try {
					if (data && data.asked) {
						for (var hostname in data.asked) {
							var questions = data.asked[hostname];
							for (var question_id in questions) {
								var qd = questions[question_id];
								if (qd) {
									var time =  qd['time'];
									var status = qd['status'];
									var count = qd['count'] || 0;

									if (time && status !== null) {
										wot_surveys.asked.set(hostname, question_id, "status", status);
										wot_surveys.asked.set(hostname, question_id, "time", time);
										wot_surveys.asked.set(hostname, question_id, "count", count);
									}
								}
							}
						}

					} else {
//						dump("FBL: no data in file storage found\n");
					}

				} catch (e) {
					dump("wot_surveys.load_from_file() failed with " + e + "\n");
				}

				wot_surveys.asked.set_loaded();    // set this flag anyway to indicate that loading finished
			});

		},

		dump_to_file: function () {
			var ws = wot_surveys, _asked = {};

			try {

				ws.asked.enumerate(function (name, question_id) {
					if (!_asked[name]) {
						_asked[name] = {};
					}

					_asked[name][question_id] = {
						status: ws.asked.get(name, question_id, "status"),
						time:   ws.asked.get(name, question_id, "time"),
						count:  (ws.asked.get(name, question_id, "count") || 0)
					};

				});

				var storage = {
					asked: _asked
				};
				wot_file.save_json(wot_surveys.storage_file, storage); // and dump to file

			} catch (e) {
				dump("wot_surveys.asked.dump_to_file() failed with " + e + "\n");
			}
		}
	}

};

wot_modules.push({ name: "wot_surveys", obj: wot_surveys });
