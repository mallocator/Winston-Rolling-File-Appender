'use strict';

var events = require('events');
var fs = require('fs');
var path = require('path');

var expect = require('chai').expect;

var Transport = require('winston').Transport;
var rft = require('..');


describe('transport', () => {
    it('should implement the right winston interface', () => {
        var instance = new rft.RollingFile({
            filename: 'test.log'
        });
        expect(instance).to.be.instanceOf(Transport);
        expect(instance).to.be.instanceOf(events.EventEmitter);
        expect(instance.log).to.be.a('function');
    });

    it('should log a message to file', done => {
        var instance = new rft.RollingFile({
            filename: 'test.log',
            dirname: __dirname
        });
        instance.log('info', 'test message', null, () => {
            expect(fs.existsSync(path.join(__dirname, 'test.log'))).to.be.true;
            expect(fs.existsSync(path.join(__dirname, 'test.' + new Date().toISOString().substr(0, 10) + '.log'))).to.be.true;
            done();
        });
    });
});