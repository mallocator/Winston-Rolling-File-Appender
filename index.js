'use strict';

var winston = require('winston');
var fs = require('fs');
var path = require('path');
var util = require('util');
var Transport = winston.Transport;


class RollingFile extends Transport {
    constructor(options) {
        super(options);

        function throwIf(target) {
            Array.prototype.slice.call(arguments, 1).forEach(function (name) {
                if (options[name]) {
                    throw new Error('Cannot set ' + name + ' and ' + target + 'together');
                }
            });
        }

        function canWrite(owner, inGroup, mode) {
            return owner && mode & 0x80 || inGroup && mode & 0x10 || mode & 0x2;
        }

        if (options.filename || options.dirname) {
            throwIf('filename or dirname', 'stream');
            this._filename = this.filename = options.filename ? path.basename(options.filename) : 'winston.log';
            this.dirname = options.dirname ? options.dirname : path.dirname(options.filename);
            this.options = options.options || { flags: 'a' };
        } else {
            throw new Error('Cannot log to file without filename or stream.');
        }
        if (options.checkPermissions === null)
            options.checkPermissions = true;

        if (options.checkPermissions) {
            var stat = fs.statSync(this.dirname);
            if (!canWrite(process.getuid() === stat.uid, process.getgid() === stat.gid, stat.mode)) {
                throw new Error('Cannot create logs in directory "' + this.dirname + '"');
            }
        }
        this.json = options.json !== false;
        this.colorize = options.colorize || false;
        this.maxFiles = options.maxFiles || 10;
        this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
        this._buffer = [];

        this._ext = path.extname(this._filename);
        this._basename = path.basename(this._filename, this._ext);
        this._oldFilesRegEx = new RegExp(this._basename + '\\.[0-9\\-]*\\.' + this._ext.substr(1));
    }

    /**
     * Core logging method exposed to Winston. Metadata is optional.
     * @param {string} level Level at which to log the message.
     * @param {string} message Message to log
     * @param {Object} [meta] Additional metadata to attach
     * @param {function} [callback] Continuation to respond to when complete.
     */
    log(level, message, meta, callback) {
        if (this.silent) {
            return callback && callback(null, true);
        }

        var output = this._format({
                level,
                message,
                meta,
                json: this.json,
                colorize: this.colorize,
                timestamp: this.timestamp
            }) + '\n';

        if (!this._open()) {
            this._buffer.push(output);
            return callback && callback(null, true);
        } else {
            self.stream.write(output);
            self._lazyDrain();
        }

        callback && callback(null, true);
    }

    _format(options) {
        var timestamp = null;
        if (options.timestamp) {
            timestamp = typeof options.timestamp === 'function' ? options.timestamp() : new Date().toISOString();
        }
        var output;

        if (options.json) {
            output = {
                level: options.level,
                message: options.message instanceof Buffer ? options.message.toString('base64') : options.message
            };

            if (timestamp) {
                output.timestamp = timestamp;
            }

            return JSON.stringify(output);
        }

        output = timestamp ? timestamp + ' - ' : '';
        output += options.colorize ? options.colorize(options.level) : options.level;
        output += ': ' + options.message;

        return output;
    }

    /**
     * Checks to see if a new file needs to be created based on the `maxsize` (if any) and the current size of the file used.
     */
    _open() {
        if (this.opening) {
            return false;
        }
        var todayString = new Date().toISOString().substr(0, 10);
        if (!this.streamDate || this.StreamDate != todayString) {
            this.opening = true;
            this._createStream(todayString);
            return false;
        }
        return true;
    }

    /**
     * Flushes any buffered messages to the current `stream` used by this instance.
     */
    _flush() {
        // Iterate over the `_buffer` of enqueued messaged and then write them to the newly created stream.
        this._buffer.forEach(str => {
            process.nextTick(() => {
                this.stream.write(str);
                this._size += str.length;
            });
        });
        // Quickly truncate the `_buffer` once the write operations have been started
        this._buffer.length = 0;
        // When the stream has drained we have flushed our buffer.
        this.stream.once('drain', () => {
            this.emit('flush');
            this.emit('logged');
        });
    }

    /**
     * Attempts to open the next appropriate file for this instance based on the common state (such as `maxsize` and `_basename`).
     * @param dateString
     * @private
     */
    _createStream(dateString) {
        if (this.stream) {
            this._flush();
        }

        var filename = path.join(this.dirname, this._basename + '.' + dateString + this._ext);
        fs.exists(filename, exists => {
            this.stream = fs.createWriteStream(filename, {
                'flags': exists ? 'a' : 'w'
            });
            this.once('flush', () => {
                this.opening = false;
                this.emit('open', filename);
            });
            this._flush();
        });
        this._createLink(filename);
        this._cleanOldFiles();
    }

    _createLink(filename) {
        var linkName = path.join(this.dirname, this._basename + this._ext);
        filename = path.basename(filename);
        function link() {
            fs.symlink(filename, linkName, err => {
                console.log('unable to create symlink', err);
            });
        }

        fs.exists(linkName, function (exists) {
            if (exists) {
                fs.readlink(linkName, function (err, dst) {
                    if (dst != filename) {
                        fs.unlink(linkName, link);
                        console.log('unlinked: ' + dst + " " + filename)
                    }
                });
            } else {
                link();
            }
        });
    }

    _cleanOldFiles() {
        var whitelist = {};
        var date = new Date();
        for (var i = 0; i < this.maxFiles; i++) {
            var filename = this._basename + '.' + date.toISOString().substr(0, 10) + this._ext;
            whitelist[filename] = true;
            date.setDate(date.getDate() - 1);
        }
        fs.readdir(this.dirname, (err, files) => {
            if (err) {
                console.log('There has been an error while trying to clean old log files:', err);
                return;
            }
            if (!files) {
                console.log('No (log) files found, probably permissions problem on directory');
                return;
            }
            files.forEach(file => {
                if (this._oldFilesRegEx.test(file) && !whitelist[file]) {
                    fs.unlink(path.join(this.dirname, file));
                }
            });
        });
    }

    /**
     * Lazily attempts to emit the `logged` event when `this.stream` has drained. This is really just a simple mutex that only works because Node.js is single-threaded.
     */
    _lazyDrain() {
        if (!this._draining && this.stream) {
            this._draining = true;
            this.stream.once('drain', () => {
                this._draining = false;
                this.emit('logged');
            });
        }
    }
}

exports.RollingFile = RollingFile;
