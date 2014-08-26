var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var utils = require('../lib/utils');
var moment = require('moment');

describe("utils", function() {
    var work = null;

    beforeEach(function() {

    });

    describe('getNextScheduledTime',function(){
        it("should get a null time when frequency is 0 a.k.a polling on new commits", function() {
            var config = {
                frequency: 0
            };
            var time = utils.getNextScheduledTime(config);
            expect(time).to.equal(null);
        });

        it('should set a time within the hour of now, regardless of calendar date in config', function(){
            var now = moment("2010-10-20 5:45 +0000", "YYYY-MM-DD HH:mm Z");
            utils.getNow = function(){
                return now;
            };
            var config = {
                frequency: 60 * 60 * 1000, //hourly
                time: moment("1976-10-01 4:30 +0000", "YYYY-MM-DD HH:mm Z")
            };
            var time = utils.getNextScheduledTime(config);
            expect(time.format()).to.equal('2010-10-20T06:30:00+00:00');
        });

        it('should set a time at the next scheduled day that week', function(){
            //This is a Sunday
            var now = moment("2014-10-12 5:45 +0000", "YYYY-MM-DD HH:mm Z");
            utils.getNow = function(){
                return now;
            };
            var config = {
                frequency: 60 * 60 * 1000 * 24, //daily
                time: moment("1976-10-01 4:30 +0000", "YYYY-MM-DD HH:mm Z"),
                daySelection:[
                    // Wednedays only
                    {key: 'Wednesday', value:3}
                ]
            };
            var time = utils.getNextScheduledTime(config);
            expect(time.format()).to.equal('2014-10-15T04:30:00+00:00');
        });

        it('should set a time one week from now',function(){
            //This is a Sunday
            var now = moment("2014-10-12 5:45 +0000", "YYYY-MM-DD HH:mm Z");
            utils.getNow = function(){
                return now;
            };
            var config = {
                frequency: 60 * 60 * 1000 * 24, //daily
                time: moment("1976-10-01 4:30 +0000", "YYYY-MM-DD HH:mm Z"),
                daySelection:[
                    // Sundays only, but the time above has passed already
                    {key: 'Sunday', value:0}
                ]
            };
            var time = utils.getNextScheduledTime(config);
            expect(time.format()).to.equal('2014-10-19T04:30:00+00:00');
        });

        it('should set a time on the next selected day regardless of array ordering',function(){
            //This is a Sunday
            var now = moment("2014-10-12 5:45 +0000", "YYYY-MM-DD HH:mm Z");
            utils.getNow = function(){
                return now;
            };
            var config = {
                frequency: 60 * 60 * 1000 * 24, //daily
                time: moment("1976-10-01 4:30 +0000", "YYYY-MM-DD HH:mm Z"),
                daySelection:[
                    {key: 'Friday', value:5},
                    {key: 'Tuesday', value:2}
                ]
            };
            var time = utils.getNextScheduledTime(config);
            expect(time.utc().format()).to.equal('2014-10-14T04:30:00+00:00');
        });

        it('should handle Date() to string format',function(){
            //This is a Sunday
            var now = moment("2014-10-12 5:45 +0000", "YYYY-MM-DD HH:mm Z");
            utils.getNow = function(){
                return now;
            };
            var config = {
                frequency: 60 * 60 * 1000 * 24, //daily
                time: moment('2014-10-13T01:48:26.433Z'), //format as expected from JSON objects
                daySelection:[
                    {key: 'Wednesday', value:3}
                ]
            };
            var time = utils.getNextScheduledTime(config);
            expect(time.format()).to.equal('2014-10-15T01:48:00+00:00');
        });

    });

});
