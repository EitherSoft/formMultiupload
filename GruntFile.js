module.exports = function(grunt) {
    var gtx = require('gruntfile-gtx').wrap(grunt);

    gtx.loadAuto();

    var gruntConfig = require('./grunt');
    gruntConfig.package = require('./package.json');

    gtx.config(gruntConfig);
    gtx.alias('build:coffee', ['coffee:compile','uglify:components','clean:coffee' ]);
    gtx.alias('build:js', ['uglify:components']);
    gtx.finalise();
}