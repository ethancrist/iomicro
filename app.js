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
const requestIp = require('request-ip');
const exec = require('child_process').exec;

// [OPTIONS]
var config = {
    appName: 'Microservice',
    hello: 'The app is now online.',
    logDir: 'logs',
    viewDir: 'views',
    callback: function() {} 
};

// [MIDDLEWARE]
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(requestIp.mw());

// [ESSENTIALS]
function runBash(command, callback) {
    var response = "";
    exec(command, function(err, stdout, stderr) {
        err ? response =  err : response = stdout+stderr; 
        if (callback) callback(response);
    });
}
function initViewEngine() {
    if (!fs.existsSync(config.viewDir)) fs.mkdirSync(config.viewDir);
    app.engine('dot', dots.__express);
    app.set('views', path.join('./'+config.viewDir));
    app.set('view engine', 'dot');
}
function initLogs() {
    if (!fs.existsSync(config.logDir)) fs.mkdirSync(config.logDir);

    log = log.createRollingFileLogger({
        logDirectory: config.logDir+'/',
        fileNamePattern: '<DATE>.log',
        dateFormat: 'YYYY-MM-DD'
    });

    log.ready = true;
}
function checkAuth(req, res, next) {
    if (!process.argv[2]) {
        var message = '[iomicro] ERROR: In order to use { private: true }, send an access key like so: \n'+
                      '         \'$ node app.js "reallyreallyreallyreallyreallyreallylonghashedkey"\'';
        log.error(message);
        return false;
    }
    return req.headers.authorization === process.argv[2] || req.body.authorization === process.argv[2];
}
function request(method, url, options, callback) {
    if (typeof(options) === 'function') {
        callback = options;
        options = null;
    }

    var req, res;

    // Custom middleware
    var original = callback;
    callback = function() {
        req = arguments[0], res = arguments[1];

        if (options && options.private) {
            var isAuthorized = checkAuth(arguments[0], arguments[1], arguments[2]);
            if (!isAuthorized) return arguments[1].status(403).json({ message: 'Missing proper authorization.' }); 
        }

        // User is authorized; continue as planned
        return original.apply(this, arguments);
        //switch (checkAuth(arguments[0], arguments[1], arguments[2])) {
            //case -1:
            //case false:
                //return arguments[1].status(403).json({ message: 'Missing proper authorization.' });
            //case true:
                //return original.apply(this, arguments);
        //}
    }

    if (method === 'GET') app.get(url, callback);
    if (method === 'POST') app.post(url, callback);
    if (method === 'PUT') app.put(url, callback);
    if (method === 'DELETE') app.delete(url, callback);
    if (method === 'USE') app.use(url, callback);

    // Logging after response is sent
    if (!log.ready) return;

    var user = {
        //ip: req.clientIp === '::1' ? '127.0.0.1' : req.client.Ip,
        ip: req.clientIp,
        post: Object.keys(req.body).length > 0 ? JSON.stringify(req.body)+' ' : ''
    };

    log.info('['+config.appName+'] '+res.statusCode+' '+req.method+' '+req.originalUrl+' '+user.post+user.ip);
}
var endpoint = {
    get: function (url, options, callback) { request('GET', url, options, callback) },
    post: function (url, options, callback) { request('POST', url, options, callback) },
    put: function (url, options, callback) { request('PUT', url, options, callback) },
    delete: function (url, options, callback) { request('DELETE', url, options, callback) },
    use: function(url, options, callback) { request('USE', url, options, callback) }
};

function listen(port, options) {
    //if (!port) return log.error('[Microservice] ERROR: You must specify a port when listening.');
    
    config = Object.assign(config, options);

    initViewEngine();
    initLogs();
    log.info('['+config.appName+'] '+config.hello);

    app.listen(port, config.callback);
}

module.exports = {
    bash: runBash,

    // simple-node-logger
    log: function(message) { log.info('['+config.appName+'] '+message) },
    error: function(message) { log.error('['+config.appName+'] '+message) },

    // express
    get: endpoint.get,
    post: endpoint.post,
    put: endpoint.put,
    delete: endpoint.delete,
    use: endpoint.use,
    listen: listen
};
