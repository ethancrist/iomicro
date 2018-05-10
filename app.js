/**
 * @title Microservice library
 * @description NPM module to reduce redundancy in microservices
 * @author ethancrist
 **/

'use strict';

// [DEPENDENCIES]
const express = require('express')
const app = express()
var log = require('simple-node-logger')
const bodyParser = require('body-parser')
const dots = require('express-dot-engine')
const path = require('path')
const http = require('http')
const https = require('https')
const fs = require('fs');
const requestIp = require('request-ip');
const exec = require('child_process').exec;

// [OPTIONS]
var config = {
    appName: 'Microservice',
    hello: 'The app is now online.',
    logDir: 'logs',
    viewDir: 'views'
};

// [MIDDLEWARE]
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(requestIp.mw());


// [UTIL]
function setOptions(defaultOptions, options) {
    /**
     * @webcore Core.setOptions [function]
     * @purpose Merge two objects that may or may not overlap where the options override the default but the default are a fallback if an option wasn't set.
     * @usage ```javascript
     *        Core.setOptions({ unsetOption: 'defaultValue', otherOption: 'defaultValue' }, { otherOption: 'set' })
     *        ```
     * @returns Type: `Object`
     *          ```javascript
     *          { unsetOption: 'defaultValue', otherOption: 'set' }
     *          ```
     **/
    if (options === undefined) options = {};

    var newOptions = {};
    for (var i = 0; i < Object.keys(defaultOptions).length; i++) {
        // { "thisKey": "thisValue" } <= Looping through the entire object like this, treating as an array
        var thisKey = Object.keys(defaultOptions)[i];
        var defaultValue = defaultOptions[thisKey];

        var allOptionsUnset = options === undefined || options === null;
        var thisOptionUnset = options[thisKey] === undefined || options[thisKey] === null || options[thisKey] === '';

        // Falling back to default if not set, overriding the default if set
        if (allOptionsUnset || thisOptionUnset) {
            // This option wasn't set; falling back to default
            newOptions[thisKey] = defaultValue;
        } else {
            // This option was set; not using default
            newOptions[thisKey] = options[thisKey];
        }
    };
    // The result: an object that need not any if statements to check if null
    return newOptions
}


// [ESSENTIALS]
function prepare() {
    if (app.ready) return
    app.ready = true
    initLogs()
}
function runBash(command) {
    /**
     * @purpose Run a bash command wrapped in a Promise.
     **/
    return new Promise(function(resolve, reject) {
        exec(command, function(err, stdout, stderr) {
            err ? reject(err) : resolve(stdout+stderr); 
        })
    })
}
function microStatic(endpoint, localDir, options) {
    /**
     * @P.S. Do you like micro-static filters?
     * @purpose Expose files via express.static
     * @usage micro.static('/endpoint', 'local/dir', options)
     * @options ##### `minify`
     *          Type: `Boolean` Default: `false`
     *          Minify all files automagically when they are exposed for faster performance.
     **/
    var defaultOptions = {
        minify: false
    }
    //options = setOptions(defaultOptions, options)
    if (!options) options = {};

    if (options.minify) {
        log.info('[iomicro] Minifying and compressing all files exposed to '+endpoint)

        //var compression = require('compression')
        //app.use(compression())
    }

    app.use(endpoint, express.static(localDir, options))
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
function checkAuth(req, res) {
    if (!process.argv[2]) {
        var message = '[iomicro] ERROR: In order to use { private: true }, send an access key like so: \n'+
                      '         \'$ node app.js "reallyreallyreallyreallyreallyreallylonghashedkey"\'';
        log.error(message);
        return false;
    }
    return req.headers.authorization === process.argv[2] || req.body.authorization === process.argv[2];
}
function logger(req, res) {
    // Logging after response is sent
    if (!log.ready) initLogs();

    var user = {
        //ip: req.clientIp === '::1' ? '127.0.0.1' : req.client.Ip,
        ip: req.clientIp,
        post: Object.keys(req.body).length > 0 ? JSON.stringify(req.body)+' ' : ''
    };

    log.info('['+config.appName+'] '+res.statusCode+' '+req.method+' '+req.originalUrl+' '+user.post+user.ip);
}
function request(method, url, options, callback) {
    if (typeof(options) === 'function') {
        callback = options
        options = null
    }

    var req, res;

    // Custom middleware
    var original = callback;
    callback = function() {
        req = arguments[0], res = arguments[1];

        if (config.ssl && config.ssl.forceHTTPS && !req.secure) {
            // Redirecting to HTTPS if forceHTTPS == true and on normal HTTP
            res.redirect('https://'+req.headers.host+req.url);
            logger(req, res);
            return function(req, res) {};
        }
        
        if (options && options.private) {
            var isAuthorized = checkAuth(req, res);

            if (!isAuthorized) {
                res.status(403).json({ message:'Missing proper authorization.' });
                logger(req, res);
                return function(req, res) {};
            }
        }

        original.apply(this, arguments);
        logger(req, res);

        return function(req, res) {};
    }
    
    if (method === 'GET') app.get(url, callback);
    if (method === 'POST') app.post(url, callback);
    if (method === 'PUT') app.put(url, callback);
    if (method === 'DELETE') app.delete(url, callback);
    if (method === 'USE') app.use(url, callback);
}
var endpoint = {
    get: function (url, options, callback) { request('GET', url, options, callback) },
    post: function (url, options, callback) { request('POST', url, options, callback) },
    put: function (url, options, callback) { request('PUT', url, options, callback) },
    delete: function (url, options, callback) { request('DELETE', url, options, callback) },
    use: function(url, options, callback) { request('USE', url, options, callback) }
};

function listen(port, options) {
    config = Object.assign(config, options)

    initViewEngine()

    log.info('['+config.appName+'] '+config.hello);

    if (config.ssl) {
        // Attempting to read certs
        config.ssl = {
            key: fs.readFileSync(config.ssl.key),
            cert: fs.readFileSync(config.ssl.cert),
            forceHTTPS: config.ssl.forceHTTPS
        }

        // HTTPS enabled; using SSL
        if (config.ssl.forceHTTPS) {
            // Catching all port 80s on HTTP and redirecting to HTTPS
            //http.createServer(app).listen(80, config.callback)
        }

        // Starting this secure puppy up
        return new Promise(function(resolve, reject) {
            https.createServer(config.ssl, app).listen(port, resolve)
        })
    }

    // No HTTPS; run app normally
    return new Promise(function(resolve, reject) {
        app.listen(port, resolve);
    })

}

// [EXPORTS]
var Micro = function() {
    /**
     * @purpose Initialize.
     **/
    prepare()
}
Micro.prototype.bash = runBash
Micro.prototype.log = function(message) { log.info('['+config.appName+'] '+message) }
Micro.prototype.error = function(message) { log.error('['+config.appName+'] '+message) }

// Bad for performance, should be a getter if anything. Deprecating for now
//Micro.prototype.express = express

Micro.prototype.get = endpoint.get
Micro.prototype.post = endpoint.post
Micro.prototype.put = endpoint.put
Micro.prototype.delete = endpoint.delete
Micro.prototype.use = endpoint.use
Micro.prototype.static = microStatic
Micro.prototype.listen = listen

Micro.prototype.socket = function(options) {
    /**
     * @purpose Run a websocket.
     **/
    const WebSocket = require('ws')
    return new WebSocket.Server(options)
}

module.exports = new Micro()
