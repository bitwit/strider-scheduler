var utils = require('./utils');
var scheduler = require('./scheduler');

var branchPendingPollCount = 0;
var completionCallback = null;

var beginPolling = function (branchesToPoll, done) {
    if (branchesToPoll.length > 0) {
        completionCallback = done;
        branchPendingPollCount = branchesToPoll.length;
        for (var i = 0; i < branchesToPoll.length; i++) {
            var checkingBranch = branchesToPoll[i];
            pollBranch(checkingBranch);
        }
        branchesToPoll.length = 0;
    } else {
        done();
    }
};

var pollBranch = function (scheduledBranch) {
    var User = scheduler.getContext().models.User;
    var now = new Date();
    User.findOne({_id: scheduledBranch.project.creator}, function (err, user) {
        var account = user.account(scheduledBranch.project.provider);
        var config = scheduledBranch.project.provider.config;

        if (config.auth.type === 'https' && !config.auth.username) {
            config.auth.username = account.config.accessToken;
            config.auth.password = '';
        }

        utils.getBranches(config, scheduledBranch.branch.privkey, function (err, data) {
            if (err || !data) {
                console.log('[Scheduler]: getBranches error', err, data);
                branchCheckDone();
                return;
            }
            var branches = {};
            var lines = data.trim().split(/\n+/);
            lines.forEach(function (line) {
                var lineSplit = line.split(/\s+/);
                var branchName = lineSplit[1].split('/').slice(-1)[0];
                branches[branchName] = lineSplit[0];
            });
            var hash = branches[scheduledBranch.branch.name];
            if (hash === undefined) {
                console.error("scheduled branch was not found in remote repo");
            } else {
                if (hash !== scheduledBranch.config.lastHash) {
                    console.log('[Scheduler]: There is a new hash for this branch');
                    console.log('[Scheduler]: Running scheduled job for ', scheduledBranch.project.name + ' : ' + scheduledBranch.branch.name);
                    var plugin = utils.getSchedulerPluginFromBranch(scheduledBranch.branch);
                    if (plugin) {
                        plugin.config.lastHash = hash;
                        plugin.config.lastJob = now;
                        scheduledBranch.project.markModified('branches');
                        scheduledBranch.project.save(function (err) {
                            if (!err) {
                                console.log('[Scheduler]: project saved');
                            } else {
                                console.log('[Scheduler]: error while project saving');
                            }
                            branchCheckDone();
                        });
                    } else {
                        console.log('[Scheduler]: Couldn\'t find plugin to save');
                        branchCheckDone();
                    }

                    var type = (scheduledBranch.branch.deploy_on_green) ? 'TEST_AND_DEPLOY' : 'TEST_ONLY';
                    scheduler.runScheduledJob(scheduledBranch.project, scheduledBranch.branch, type);
                } else {
                    console.log('[Scheduler]: No new changes to this branch');
                    branchCheckDone();
                }
            }
        });
    });
};

var branchCheckDone = function () {
    branchPendingPollCount--;
    if (branchPendingPollCount === 0) {
        console.log('[Scheduler]: check complete');
        completionCallback();
        completionCallback = null;
    }
};


module.exports = {
    beginPolling: beginPolling
};