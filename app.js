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
const requestIp = require('request-ip')
const exec = require('child_process').exec
const crypto = require('crypto')
const algorithm = 'aes-256-cbc'
var apiKeysCache = []

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
function prepare(options) {
    if (app.ready) return
    app.ready = true

    config = Object.assign(config, options)

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
function encrypt(raw, passphrase) {
    /**
     * @purpose Encrypt raw text with a passphrase.
     **/
    try {
        const cipher = crypto.createCipher(algorithm, passphrase)

        let crypted = cipher.update(raw, 'utf8', 'hex')
        crypted += cipher.final('hex')

        return crypted
    } catch {
        log.error('[iomicro] Could not encrypt data, please try reformatting.')
        return ''
    }

}
function decrypt(cipher, passphrase) {
    /**
     * @purpose Decrypt a cipher with a passphrase.
     **/
    try {
        const decipher = crypto.createDecipher(algorithm, passphrase)

        let dec = decipher.update(cipher, 'hex', 'utf8')
        dec += decipher.final('utf8')

        return dec
    } catch {
        log.error('[iomicro] Could not decrypt data, please check your passphrase.')
        return ''
    }
}
function encryptFile(rawFile, newFile, passphrase) {
    /**
     * @purpose Encrypt a raw file with a passphrase.
     **/
    const fileData = fs.readFileSync(rawFile, 'utf8')
    const cipher = encrypt(fileData, passphrase)

    // Writing the new encrypted data to the path given.
    const writeStream = fs.createWriteStream(newFile)
    writeStream.write(cipher)
    writeStream.end()
}
function decryptFile(file, passphrase) {
    /**
     * @purpose Decrypt a file contents with a passphrase.
     * @return String of file contents.
     **/
    const fileData = fs.readFileSync(file, 'utf8')

    // Returning file contents as a string.
    return decrypt(fileData, passphrase)
}
function initApiKeys() {
    /**
     * @purpose Read encrypted API keys file, decrypt it and store API keys in an array.
     * @return Array of decrypted API keys.
     **/
    const apiKeyPhrase = process.env.API_KEYS_PHRASE
 
    // No API key file or API key passsphrase were specified; api keys cannot be decrypted.
    if (!config.apiKeysFile || !apiKeyPhrase) return []

    if (apiKeysCache.length > 0) return apiKeysCache

        log.info('[iomicro] Decrypting API keys file, and updating its cache...')
    // API keys cache did not exist; decrypting API keys file given with API key phrase given and storing it into the cache.
    const apiKeysFileContent = decryptFile(config.apiKeysFile, apiKeyPhrase)

    // Each new line within the API keys file is a new index in the API keys cache array.
    apiKeysCache = apiKeysFileContent.split('\n')
    apiKeysCache = apiKeysCache.filter((blacklist) => { return blacklist !== ''})

    // Returning the array of decrypted API keys.
    return apiKeysCache
}
function checkAuth(req, res) {
    /**
     * @purpose Gatekeeping users for { private: true } endpoints, ensuring they have proper API keys.
     * @usage Only called as middleware for { private: true } endpoints.
     **/
    let authIsValid = false

    // Either no API key file or API key phrase was specified; blocking all users from this endpoint.
    if (!config.apiKeysFile || !process.env.API_KEYS_PHRASE) {
        const message = '[iomicro] In order to use { private: true }, you must do the following: \n'+
                      '                                 1) Create and encrypt a file containing your API keys.\n'+
                      '                                         You can encrypt a raw file of keys using micro.encryptFile.\n'+
                      '                                         Each new line in the file will count as a new accepted API key.\n'+
                      '                                 2) Make the <apiKeysFile> variable in options the relative location of this encrypted file.\n'+
                      '                                 3) On startup, send through the passphrase that was used to encrypt this file like so:\n'+
                      '                                        \'$ API_KEYS_PHRASE="passphrase_that_was_used_to_encrypt_your_keys_file" node app.js\'\n'+
                      '                                 See the implementation documentation for more information.\n'+
                      '                                 For now, all attempts at accessing { private: true } endpoints will be 403 Forbidden.'

        log.error(message)
        return authIsValid
    }

    const decryptedApiKeys = initApiKeys()

    // If the key sent in the Authorization header or request body field "authorization" === any API key, then the auth is valid!
    for (let i = 0, len = decryptedApiKeys.length; i < len; i++) {
        const key = decryptedApiKeys[i]
        authIsValid = req.headers.authorization === key || req.body.authorization === key

        if (authIsValid) return authIsValid
    }
    return authIsValid
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
        var requestLogged = false;

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

        // Only running the logger after they have initialized res.send
        // This is to ensure that res.statusCode is guaranteed to be defined, in case
        // their res.send is running in an async block of code.
        var originalResSend = res.send;
        res.send = function() {
            // Running original Express res.send
            originalResSend.apply(this, arguments);

            // Logging data AFTER so res.statusCode can be included
            if (!requestLogged) {
                requestLogged = true;
                logger(req, res);
            }
        } 

        // Endpoint callback logic running...
        original.apply(this, arguments);

        return function(req, res) {};
    }
    
    if (method === 'GET') app.get(url, callback);
    if (method === 'POST') app.post(url, callback);
    if (method === 'PUT') app.put(url, callback);
    if (method === 'DELETE') app.delete(url, callback);
    if (method === 'PATCH') app.patch(url, callback);
    if (method === 'USE') app.use(url, callback);
}
var endpoint = {
    get: function (url, options, callback) { request('GET', url, options, callback) },
    post: function (url, options, callback) { request('POST', url, options, callback) },
    put: function (url, options, callback) { request('PUT', url, options, callback) },
    delete: function (url, options, callback) { request('DELETE', url, options, callback) },
    patch: function (url, options, callback) { request('PATCH', url, options, callback) },
    use: function(url, options, callback) { request('USE', url, options, callback) }
};

function listen(port, options) {
    // Loading config on listen if not already initialized
    if (options) prepare(options)

    initViewEngine()
    initApiKeys()

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
            http.createServer(app).listen(80, config.callback)
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
    this.init = prepare

    this.bash = runBash
    this.log = function(message) { log.info('['+config.appName+'] '+message) }
    this.error = function(message) { log.error('['+config.appName+'] '+message) }

    // Bad for performance, should be a getter if anything. Deprecating for now
    //this.express = express

    this.get = endpoint.get
    this.post = endpoint.post
    this.put = endpoint.put
    this.delete = endpoint.delete
    this.patch = endpoint.patch
    this.use = endpoint.use
    this.static = microStatic
    this.listen = listen

    this.encrypt = encrypt
    this.decrypt = decrypt
    this.encryptFile= encryptFile
    this.decryptFile= decryptFile

    this.socket = function(options) {
        /**
         * @purpose Run a websocket.
         **/
        const WebSocket = require('ws')

        if (options.ssl || config.ssl) {
            // Preparing secure websocket server with cert and key passed
            // Preferring to use options.ssl if it was passed,
            // or if not, using one passed through on micro.init
            //
            //
            var ssl = config.ssl
            if (options.ssl) ssl = options.ssl

            const server = new https.createServer({
                key: fs.readFileSync(ssl.key),
                cert: fs.readFileSync(ssl.cert)
            });

            const wss = new WebSocket.Server({ server });

            server.listen(options.port);

            return wss
        }

        // No SSL was passed; starting insecure websocket server
        return new WebSocket.Server(options)
    }
}

module.exports = new Micro()
