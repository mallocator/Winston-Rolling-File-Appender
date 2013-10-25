Winston-Rolling-File-Appender
=============================

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
for [node.js](http://nodejs.org/) and [npm](https://npmjs.org), use the package.json to install your dependecies (running "npm install"):

	{
		...
		"dependencies": {
			"winstonRollingTransport" : "git://github.com/mallocator/Winston-Rolling-File-Appender.git#master"
		}
		...
	}

or install it manually

	npm install git://github.com/mallocator/Winston-Rolling-File-Appender.git
