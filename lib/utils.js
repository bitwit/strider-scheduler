var exec = require('child_process').exec;
var moment = require('moment');
var _ = require('lodash');
var hourly = 1000 * 60 * 60
    , daily = hourly * 24;

var utils ={
    httpUrl: function httpUrl(config) {
        var base = config.url;
        if (base.indexOf('//') !== -1) {
            base = base.split('//')[1]
        }
        var url = config.auth.type + '://' + config.auth.username + ':' + config.auth.password + '@' + base
            , safe = config.auth.type + '://[username]:[password]@' + base;
        return [url, safe]
    },
    getBranches: function getBranches(config, privkey, done) {
        if (config.auth.type === 'ssh') {
            gitane.run({
                cmd: 'git ls-remote -h ' + gitUrl(config)[0],
                baseDir: '/',
                privKey: config.auth.privkey || privkey,
                detached: true
            }, function (err, stdout, stderr, exitCode) {
                if (err || exitCode !== 0) return done(err || new Error(stderr))
                processBranches(stdout, done)
            })
        } else {
            exec('git ls-remote -h ' + httpUrl(config)[0], function (err, stdout, stderr) {
                if (err) return done(err)
                //processBranches(stdout, done)
                done(null, stdout);
            })
        }
    },
    getSchedulerPluginFromBranch: function getSchedulerPluginFromBranch(branch) {
        for (var i = 0; i < branch.plugins.length; i++) {
            var plugin = branch.plugins[i];
            if (plugin.id === 'scheduler') {
                return plugin;
            }
        }
        return false;
    },
    getNow: function getNow(){
        return moment();
    },
    getNextScheduledTime: function getNextScheduledTime(branchConfig){
        var frequency = branchConfig.frequency
            , time = moment(branchConfig.time)
            , days = branchConfig.daySelection
            , now = utils.getNow()
            , timeMinutes = time.minutes()
            , timeHours = time.hours()
            , nextTime = now.clone().minutes(timeMinutes).seconds(0).milliseconds(0);

        //if hourly, it should either be this hour
        //or, if that time has passed, next hour
        if(frequency === hourly){
            nextTime.utc();
            if(nextTime < now){
                nextTime = nextTime.add(1, 'h');
            }
        }
        //if daily, we need to make sure that at least 1 day has also been selected
        else if(frequency === daily && days.length > 0){
            //set the expected hour
            nextTime = nextTime.hours(timeHours).utc();
            //iterate over today and the next 7 days (8 days checked total in case today's has recently passed)
            //to find the first future time
            for (var i = 0; i <= 7; i++) {
                nextTime.add((i) ? 1 : 0, 'd');
                //the day has to be one fo the selected days and > now
                if(days.indexOf(nextTime.day()) !== -1 && nextTime >= now){
                    break;
                }
            }
        } else {
            nextTime = null;
        }

        return nextTime;
    }
};

module.exports = utils;