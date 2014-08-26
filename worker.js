module.exports = {
    // Initialize the plugin for a job
    //   config: the config for this job, made by extending the DB config
    //           with any flat-file config
    //   job:    see strider-runner-core for a description of that object
    //   context: currently only defines "dataDir"
    //   cb(err, initializedPlugin)
    init: function (config, job, context, cb) {
        return cb(null, {});
    }
};