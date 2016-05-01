Winston-Rolling-File-Appender
=============================
[![npm version](https://badge.fury.io/js/Winston-Rolling-File-Appender.svg)](http://badge.fury.io/js/Winston-Rolling-File-Appender)
[![Build Status](https://travis-ci.org/mallocator/Winston-Rolling-File-Appender.svg?branch=master)](https://travis-ci.org/mallocator/Winston-Rolling-File-Appender)
[![Coverage Status](https://coveralls.io/repos/github/mallocator/Winston-Rolling-File-Appender/badge.svg?branch=master)](https://coveralls.io/github/mallocator/Winston-Rolling-File-Appender?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/Winston-Rolling-File-Appender.svg)](https://david-dm.org/mallocator/Winston-Rolling-File-Appender) 

A rolling file transport for the logging library winston for node.js.
This transport has been modified from the original transport to create a log file for each day.

If configured with my.log as filename, the generated files will be for example:

	my.2012-08-01.log
	my.2012-08-02.log
	my.2012-08-03.log
	...
	my.2012-08-10.log
	my.log ( -> symbolic link to latest log file)

The transport has been used and tested on linux machines. No idea if this works on windows.


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