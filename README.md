Winston-Rolling-File-Appender
=============================
[![npm version](https://badge.fury.io/js/rolling-file-transport.svg)](https://badge.fury.io/js/rolling-file-transport)
[![Build Status](https://travis-ci.org/mallocator/Winston-Rolling-File-Appender.svg?branch=master)](https://travis-ci.org/mallocator/Winston-Rolling-File-Appender)
[![Coverage Status](https://coveralls.io/repos/github/mallocator/Winston-Rolling-File-Appender/badge.svg?branch=master)](https://coveralls.io/github/mallocator/Winston-Rolling-File-Appender?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/Winston-Rolling-File-Appender.svg)](https://david-dm.org/mallocator/Winston-Rolling-File-Appender)

A rolling file transport for the logging library Winston for node.js.
This transport has been modified from the original transport to create a log file for each day.

If configured with my.log as the filename, the generated files will be, for example:

	my.2012-08-01.log
	my.2012-08-02.log
	my.2012-08-03.log
	...
	my.2012-08-10.log
	my.log ( -> symbolic link to latest log file)

The transport has been used and tested on Linux machines. No idea if this works on Windows.

# Deprecation Warning

This project is no longer actively maintained. If you're looking for a rotating log transport, you can find alternatives on npmjs.org such as [winston-daily-rotate-file](https://www.npmjs.com/package/winston-daily-rotate-file)


# Usage

```javascript
var winston = require('winston');
require('rolling-file-transport');

winston.loggers.add('myLogger', {
	rollingFile : {
		filename : '/path/to/my/filename.log',	// files will use filename.<date>.log for all files
		level : 'info',							// Set your winston log level, same as original file transport
		timestamp : true,						// Set timestmap format/enabled, Same ass original file transport
		maxFiles : 10,							// How many days to keep as back log
		json : false							// Store logging data ins json format
	}
});
```

# Install

```npm install --save rolling-file-transport```
