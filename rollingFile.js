var winston = require('winston');
var fs = require('fs');
var path = require('path');
var util = require('util');
var Transport = winston.Transport;

function log(options) {
	var timestamp = typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp ? new Date().toString().substr(4, 20) : null;
	var output;
	
	if (options.json) {
		output = {};
		output.level = options.level;
		output.message = options.message;
		
		if (timestamp) {
			output.timestamp = timestamp;
		}
		
		return JSON.stringify(output, function(key, value) {
			if (value instanceof Buffer) { return value.toString('base64'); }
			return value;
		});
	}
	
	output = timestamp ? timestamp + ' - ' : '';
	output += options.colorize ? config.colorize(options.level) : options.level;
	output += ': ' + options.message;
	
	return output;
};

var RollingFile = winston.transports.RollingFile = exports.RollingFile = function(options) {
	Transport.call(this, options);
	
	function throwIf(target) {
		Array.prototype.slice.call(arguments, 1).forEach(function(name) {
			if (options[name]) { throw new Error('Cannot set ' + name + ' and ' + target + 'together'); }
		});
	}
	
	if (options.filename || options.dirname) {
		throwIf('filename or dirname', 'stream');
		this._filename = this.filename = options.filename ? path.basename(options.filename) : 'winston.log';
		this.dirname = options.dirname ? options.dirname : path.dirname(options.filename);
		this.options = options.options ? options.options : {
			flags : 'a'
		};
	} else {
		throw new Error('Cannot log to file without filename or stream.');
	}
	if (options.checkPermissions === null)
        options.checkPermissions = true;
	
	if (options.checkPermissions) {
		function canWrite(owner, inGroup, mode) {
			return owner && mode & 00200 || inGroup && mode & 00020 || mode & 00002;
		}
		var stat = fs.statSync(this.dirname);
		if (!canWrite(process.getuid() === stat.uid, process.getgid() === stat.gid, stat.mode)) { 
			throw new Error('Cannot create logs in directory "' + this.dirname + '"'); 
		}
	}
	this.json = options.json !== false;
	this.colorize = options.colorize || false;
	this.maxFiles = options.maxFiles ? options.maxFiles : 10;
	this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
	this._buffer = [];
	
	this._ext = path.extname(this._filename);
	this._basename = path.basename(this._filename, this._ext);
	this._oldFilesRegEx = new RegExp(this._basename + '\\.[0-9\\-]*\\.' + this._ext.substr(1));
};

// Inherit from `winston.Transport`.
util.inherits(RollingFile, Transport);

// Expose the name of this Transport on the prototype
RollingFile.prototype.name = 'rollingFile';

// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
RollingFile.prototype.log = function(level, msg, meta, callback) {
	if (this.silent) { return callback(null, true); }
	
	var output = log({
		level : level,
		message : msg,
		meta : meta,
		json : this.json,
		colorize : this.colorize,
		timestamp : this.timestamp
	}) + '\n';
	
	var self = this;
	if (!this.open()) {
		return self._buffer.push(output);
	} else {
		self.stream.write(output);
		self._lazyDrain();
	}
	
	callback(null, true);
};

// ### function open (callback)
// #### @callback {function} Continuation to respond to when complete
// Checks to see if a new file needs to be created based on the `maxsize` (if any) and the current size of the file used.
RollingFile.prototype.open = function() {
	if (this.opening) { return false; }
	var todayString = new Date().toISOString().substr(0, 10);
	if (!this.streamDate || this.StreamDate != todayString) {
		this.opening = true;
		this._createStream(todayString);
		return false;
	}
	return true;
};

// ### function close ()
// Closes the stream associated with this instance.
RollingFile.prototype.close = function() {
	var self = this;
	
	if (this.stream) {
		this.stream.end();
		this.stream.destroySoon();
		
		this.stream.once('drain', function() {
			self.emit('flush');
			self.emit('closed');
		});
	}
};

// ### function flush ()
// Flushes any buffered messages to the current `stream` used by this instance.
RollingFile.prototype.flush = function() {
	var self = this;
	// Iterate over the `_buffer` of enqueued messaged and then write them to the newly created stream.
	this._buffer.forEach(function(str) {
		process.nextTick(function() {
			self.stream.write(str);
			self._size += str.length;
		});
	});
	// Quickly truncate the `_buffer` once the write operations have been started
	self._buffer.length = 0;
	// When the stream has drained we have flushed our buffer.
	self.stream.once('drain', function() {
		self.emit('flush');
		self.emit('logged');
	});
};

// ### @private function _createStream ()
// Attempts to open the next appropriate file for this instance based on the common state (such as `maxsize` and
// `_basename`).
RollingFile.prototype._createStream = function(dateString) {
	if (this.stream) {
		this.flush();
	}
	
	var self = this;
	var filename = path.join(this.dirname, this._basename + '.' + dateString + this._ext);
	fs.exists(filename, function(exists) {
		self.stream = fs.createWriteStream(filename, {
			'flags' : exists ? 'a' : 'w'
		});
		self.once('flush', function() {
			self.opening = false;
			self.emit('open', filename);
		});
		self.flush();
	});
	this._createLink(filename);
	this._cleanOldFiles();
};

RollingFile.prototype._createLink = function(filename) {
	var linkName = path.join(this.dirname, this._basename + this._ext);
    filename = path.basename(filename);
	function link() {
		fs.symlink(filename, linkName);
	}
	
	fs.exists(linkName, function(exists) {
		if (exists) {
			fs.readlink(linkName, function(err, dst) {
				if (dst != filename) {
					fs.unlink(linkName, link);
                console.log('unlinked: ' +dst + " " + filename)
				}
			});
		} else {
			link();
		}
	});
};

RollingFile.prototype._cleanOldFiles = function() {
	var whitelist = {};
	var date = new Date();
	for ( var i = 0; i < this.maxFiles; i++) {
		var filename = this._basename + '.' + date.toISOString().substr(0, 10) + this._ext;
		whitelist[filename] = true;
		date.setDate(date.getDate() - 1);
	}
	var self = this;
	fs.readdir(this.dirname, function(err, files) {
		if (err) {
			console.log('There has been an error while trying to clean old log files:', err);
			return;
		}
		if (!files) {
			console.log('No (log) files found, probably permissions problem on directory');
			return;
		}
		files.forEach(function(file) {
			if (self._oldFilesRegEx.test(file) && !whitelist[file]) {
				fs.unlink(path.join(self.dirname, file));
			}
		});
	});
};

// ### @private function _lazyDrain ()
// Lazily attempts to emit the `logged` event when `this.stream` has drained. This is really just a simple mutex that only
// works because Node.js is single-threaded.
RollingFile.prototype._lazyDrain = function() {
	var self = this;
	
	if (!this._draining && this.stream) {
		this._draining = true;
        
        var that = this;		
		this.stream.once('drain', function() {
			that._draining = false;
			self.emit('logged');
		});
	}
};
