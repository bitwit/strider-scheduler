var scheduler = require('./lib/scheduler');

module.exports = {
    // mongoose schema, if you need project-specific config
    config: {
        "scheduler": {
            frequency: {type: Number, default: 0},
            lastJob: {type: Date},
            day: {type: String},
            time: {type: Date},
            daySelection: {type: Array}
        }
    },
    routes: function (app, ctx) {
        scheduler.init(ctx);
    },
    listen: function (emitter, context) {
        emitter.on('branch.plugin_config', function (project, branch, plugin, config) {
            if (plugin === 'scheduler') {
                scheduler.branchChange(project, branch, config);
            }
        });
        emitter.on('branch.plugin_order', function (project, branch, plugins) {
            scheduler.branchPluginOrderChange(project, branch, plugins);
        });
    }
};