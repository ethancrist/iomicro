/**
 * @title Microservice library
 * @description NPM module to reduce redundancy in microservices
 * @author ethancrist
 **/

'use strict';

// [DEPENDENCIES]
const app = require('express')();
var log = require('simple-node-logger');
const bodyParser = require('body-parser');
const dots = require('express-dot-engine');
const path = require('path');
const fs = require('fs');

// [MIDDLEWARE]
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('dot', dots.__express);
app.set('views', path.join(__dirname, './views'));
app.use(function(req, res, next) {
    if (!log.ready) return next();

    log.info('[Docs] '+req.method+' '+req.originalUrl+' '+(Object.keys(req.body).length > 0 ? JSON.stringify(req.body)+' ' : '')+req.headers['x-forwarded-for'])
    next()
});

// [OPTIONS]
var config = {
    appName: 'Microservice',
    logDir: 'log'
};

// [ESSENTIALS]
function initLogs() {
    if (!fs.existsSync(config.logDir)) fs.mkdirSync(config.logDir);

    // TODO: Create 'log/' dir if doesn't exist
    log = log.createRollingFileLogger({
        logDirectory: config.logDir+'/',
        fileNamePattern: '<DATE>.log',
        dateFormat: 'YYYY-MM-DD'
    });

    log.ready = true;
}
function checkAuth(req, res, next) {
    if (req.headers.authorization !== process.argv[2]) return res.status(403).json({ message: 'Missing proper authorization.' });
    next();
}
function request(url, options, callback) {
    if (typeof(options) === 'function') {
        callback = options;
        options = null;
    }
    if (options.private) checkAuth(callback);
    
    if (method === 'GET') app.get(url, callback);
    if (method === 'POST') app.post(url, callback);
    if (method === 'PUT') app.put(url, callback);
    if (method === 'DELETE') app.delete(url, callback);
}
var endpoint = {
    get: function (url, options, callback) { request('GET', url, options, callback },
    post: function (url, options, callback) { request('POST', url, options, callback },
    put: function (url, options, callback) { request('PUT', url, options, callback },
    delete: function (url, options, callback) { request('DELETE', url, options, callback },
};

function listen(port, options) {
    //if (!port) return log.error('[Microservice] ERROR: You must specify a port when listening.');
    
    config = Object.assign(config, options);

    initLogs();
    log.info('['+config.appName+'] '+config.hello);

    app.listen(port, options.callback);
}

module.exports = {
    log: log.info,

    // Express
    get: endpoint.get,
    use: app.use,
    listen: listen
};
