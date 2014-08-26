var moment = require('moment');
var poller = require('./poller');
var utils = require('./utils');

var schedulerWaitPeriod = 1 * 60 * 1000;
var timeoutId;

var context;
var scheduledBranches = [];


var init = function (_context) {
    context = _context;
    var Project = context.models.Project;
    Project.find({}, function (err, projects) {
        for (var i = 0; i < projects.length; i++) {
            var project = projects[i];
            for (var j = 0; j < project.branches.length; j++) {
                var branch = project.branches[j];
                for (var k = 0; k < branch.plugins.length; k++) {
                    var plugin = branch.plugins[k];
                    if (plugin.id === 'scheduler' && plugin.enabled && plugin.config && plugin.config.time !== undefined) {
                        addBranchToSchedule(project, branch.name, plugin.config);
                    }
                }
            }
        }
        console.log('[Scheduler]: Currently', scheduledBranches.length, 'branches are scheduled');
    });
};

var getContext = function () {
    return context;
};

var addBranchToSchedule = function (project, branchName, config) {
    var scheduledBranch = {
        project: project,
        branch: project.branch(branchName),
        config: config,
        nextScheduledTime: utils.getNextScheduledTime(config)
    };
    console.log('[Scheduler]: Added ', project.name, branchName, 'next scheduled for', scheduledBranch.nextScheduledTime.format());
    scheduledBranches.push(scheduledBranch);
    if (scheduledBranches.length === 1) {
        console.log('[Scheduler]: First branch added, starting timer');
        timeoutId = setTimeout(checkScheduledBranches, schedulerWaitPeriod);
    }
};

var getScheduledBranch = function (project, branchName) {
    for (var i = 0; i < scheduledBranches.length; i++) {
        var scheduledBranch = scheduledBranches[i];
        if (scheduledBranch.project._id.toString() === project._id.toString() && branchName === scheduledBranch.branch.name) {
            return scheduledBranch;
        }
    }
    return false;
};

var removeScheduledBranch = function (project, branchName) {
    var didRemoveBranch = false;
    for (var i = 0; i < scheduledBranches.length; i++) {
        var scheduledBranch = scheduledBranches[i];
        if (scheduledBranch.project._id.toString() === project._id.toString() && branchName === scheduledBranch.branch.name) {
            console.log('[Scheduler]: Removing', scheduledBranch.project.name, branchName);
            scheduledBranches.splice(i, 1);
            didRemoveBranch = true;
            break;
        }
    }
    if (didRemoveBranch && !scheduledBranches.length) {
        console.log('[Scheduler]: Last branch, stopping timer');
        clearTimeout(timeoutId);
    }
    return didRemoveBranch;
};

var checkScheduledBranches = function () {
    var now = moment();
    for (var i = 0; i < scheduledBranches.length; i++) {
        var scheduledBranch = scheduledBranches[i];
        var frequency = scheduledBranch.config.frequency
            , type
            , branchesToPoll = [];
        //Poll for changes
        if (frequency === 0) {
            branchesToPoll.push(scheduledBranch);
        }
        //Hourly & Daily Check
        else if (now > scheduledBranch.nextScheduledTime) {
          type = (scheduledBranch.branch.deploy_on_green) ? 'TEST_AND_DEPLOY' : 'TEST_ONLY';
          //Run the scheduled job
          runScheduledJob(scheduledBranch.project, scheduledBranch.branch, type);
          //Prepare for next scheduled job
          var nextTime = utils.getNextScheduledTime(scheduledBranch.config);
          scheduledBranch.nextScheduledTime = nextTime;
          console.log('[Scheduler]: Running new job. Branch next scheduled to run at', nextTime.format());
        }
    }
    if (branchesToPoll.length > 0) {
        poller.beginPolling(branchesToPoll, checkComplete);
    } else {
        checkComplete();
    }
};

var checkComplete = function () {
    if (scheduledBranches.length) {
        timeoutId = setTimeout(checkScheduledBranches, schedulerWaitPeriod);
    } else {
        console.log('[Scheduler]: not rescheduling');
    }
};

var runScheduledJob = function (project, branch, type) {
    var now = new Date()
        , trigger
        , job;

    trigger = {
        type: 'manual',
        author: {
            email: 'scheduler@strider',
            image: '/ext/scheduler/icon.png'
        },
        timestamp: now,
        source: {type: 'Scheduler', page: 'N/A'}
    };

    if (type === 'TEST_AND_DEPLOY')
        trigger.message = 'Scheduled Test & Deploy';
    else
        trigger.message = 'Scheduled Test';

    job = {
        type: type,
        project: project.name,
        ref: {branch: branch.name},
        trigger: trigger,
        created: now
    };

    context.emitter.emit('job.prepare', job)
};

var branchChange = function (project, branchName, config) {
    var scheduledBranch = getScheduledBranch(project, branchName);
    if (scheduledBranch) {
        scheduledBranch.config = config;
        if(config.frequency !== 0){
            var nextTime = utils.getNextScheduledTime(config);
            scheduledBranch.nextScheduledTime = nextTime;
            console.log('branch rescheduled to', nextTime.format());
        }
    } else {
        //TODO: This isn't scheduled yet because it was just configured
        addBranchToSchedule(project, branchName, config);
    }
};

var branchPluginOrderChange = function (project, branchName, plugins) {
    var schedulerFound = false;
    for (var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        if (plugin.id === 'scheduler') {
            schedulerFound = true;
            if (plugin.enabled) {
                //add to queue, or keep it there
                var branch = getScheduledBranch(project, branchName);
                if (!branch) {
                    //branch doesn't exist yet, so add it
                    //but ONLY, if it's config has been set
                    if (plugin.config && plugin.config.time) {
                        addBranchToSchedule(project, branchName, plugin);
                    }
                } else {
                    // we shouldn't need to do anything else if the plugin is enabled and already scheduled
                }
            } else {
                //remove, if scheduled
                removeScheduledBranch(project, branchName);
            }
            break;
        }
    }
    if (!schedulerFound) {
        //remove, if exists
        removeScheduledBranch(project, branchName);
    }
};

module.exports = {
    init: init,
    getContext: getContext,
    branchChange: branchChange,
    branchPluginOrderChange: branchPluginOrderChange,
    runScheduledJob: runScheduledJob
};