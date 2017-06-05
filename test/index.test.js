/* global describe, it, after, afterEach, before, beforeEach */
const events = require('events');
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const Transport = require('winston').Transport;


const rft = require('..');

describe('transport', () => {
    afterEach(() => {
        let files = fs.readdirSync(__dirname);
        for (let file of files) {
            if (file.endsWith('.log')) {
                fs.unlinkSync(path.join(__dirname, file));
            }
        }
    });

    it('should implement the right winston interface', () => {
        let instance = new rft.RollingFile({
            filename: 'test.log'
        });
        expect(instance).to.be.instanceOf(Transport);
        expect(instance).to.be.instanceOf(events.EventEmitter);
        expect(instance.log).to.be.a('function');
    });

    it('should log a message to file', done => {
        let instance = new rft.RollingFile({
            filename: 'test.log',
            dirname: __dirname
        });
        instance.log('info', 'test message', null, () => {
            setTimeout(() => {
                expect(fs.existsSync(path.join(__dirname, 'test.log'))).to.be.true;
                expect(fs.existsSync(path.join(__dirname, 'test.' + new Date().toISOString().substr(0, 10) + '.log'))).to.be.true;
                done();
            }, 25);
        });
    });
});
