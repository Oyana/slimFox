/*
	storage.js
	Copyright © 2013  WOT Services Oy <info@mywot.com>

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

// Stores the data from server in the local JSON file in the profile directory. Kind of persistent cache.

"use strict";

var wot_storage =
{
	_FILENAME: "storage.json",
	_HASHPREFIX: "wot_storage",
	flushed: null,
	flush_timer: null,

	init: function(callback)
	{
		// we can't use name "load" for this function to avoid it been loaded in the core.load without callback
		try {

			var is_loaded = wot_storage.get_from_memory("is_loaded");   // no need to read file when new window is opened. Storage data is already in shared memory

			if (!is_loaded) {
				// read the file and place data to this object's data field
				wot_file.read_json(this._FILENAME, function (data) {

					if (data && !wot_util.isEmpty(data)) {
						for (var k in data) {
							if (data.hasOwnProperty(k)) {
								wot_storage.put_to_memory(k, data[k]);
							}
						}
						wot_storage.put_to_memory("is_loaded", true);
					} else {
						// TODO: remove storage data from memory
					}

				});
			}

		} catch (e) {
			wot_tools.wdump("wot_storage.load: failed with " + e);
		}

		if(typeof(callback) == "function") callback(); // call the callback anyway, even if storage is failed to load in order to make the add-on work
	},

	put_to_memory: function (key, val) {
		wot_hashtable.set(this._HASHPREFIX + ":" + key, wot_util.unicode_to_utf8(JSON.stringify(val)));
	},

	get_from_memory: function (key) {
		var v = wot_hashtable.get(this._HASHPREFIX + ":" + key);
		if (v) {
			try {
				return JSON.parse(wot_util.utf8_to_unicode(v));
			} catch (e) {
				return undefined;
			}
		} else {
			return undefined;
		}
	},

	get_name_from_element: function(element)
	{
		var RE = RegExp(this._HASHPREFIX + "\:(.+)");
		try {
			if (!element || !element.QueryInterface) return null;

			var property = element.QueryInterface(Components.interfaces.nsIProperty);

			if (!property) return null;

			var match = property.name.match(RE);

			if (!match || !match[1]) return null;

			return match[1];
		} catch (e) {
			dump("wot_storage.get_name_from_element: failed with " + e + "\n");
		}
		return null;
	},

	get: function (name, default_value) {
		try {
            var t = this.get_from_memory(name);
            return t !== undefined ? t : default_value;
		} catch (e) {
			wot_tools.wdump("wot_storage.get(" + name + "): failed with " + e);
			return default_value;
		}
	},

	set: function (name, obj, flush) {
		try {
			this.put_to_memory(name, obj);
			if (flush !== false) {
				this.flush(flush);
			}
			return true;
		} catch (e) {
			wot_tools.wdump("wot_storage.set(" + name + "): failed with " + e);
			return false;
		}
	},

	clear: function(key)
	{
		try {
			wot_hashtable.remove(this._HASHPREFIX + ":" + key)
		} catch (e) {
		}
	},

	flush: function(force, callback)
	{
		try {

			// don't flush too often (3 secs) unless explicitly asked
			var flushed = this.get("flushed", null);
			if (flushed && Date.now() - flushed < 3000 && !force) {

				// flush after short delay
				if (!this.flush_timer) {
					this.flush_timer = window.setTimeout(function() {
						wot_storage.flush(true);
					}, 5000);
				}

				if (typeof(callback) == "function") callback(false);
				return;
			}

			// cancel scheduled flushing since we already flushing
			if (this.flush_timer) {
				window.clearTimeout(this.flush_timer);
				this.flush_timer = null;
			}

			var bag = wot_hashtable.get_enumerator(),
				data = {};

			// go through stored in memory values and keep ones that belong to Storage
			while (bag.hasMoreElements()) {
				var name = this.get_name_from_element(bag.getNext());
				if (name && name != "is_loaded" && name != "flushed") {
					data[name] = this.get(name, null);
				}
			}

			this.set("flushed", Date.now());
			wot_file.save_json(this._FILENAME, data, callback);
			wot_storage.put_to_memory("is_loaded", true);   // since we had something to dump to file, lets assume that data is in memory

		} catch (e) {
			dump("wot_storage.flush: failed with " + e + "\n");
		}
	}

};

wot_modules.push({ name: "wot_storage", obj: wot_storage });
