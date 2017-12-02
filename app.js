/**
 * @title Microservice library
 * @description NPM module to reduce redundancy in microservices
 * @author ethancrist
 **/

'use strict';

// [DEPENDENCIES]
const app = require('express')();
const bodyParser = require('body-parser');
const dots = require('express-dot-engine');
const log = require('simple-node-logger').createRollingFileLogger({
    logDirectory: 'log/',
    fileNamePattern: '<DATE>.log',
    dateFormat: 'YYYY-MM-DD'
});

// [MIDDLEWARE]
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('dot', dots.__express);
app.set('views', path.join(__dirname, './views'));
app.use(log.info('[Docs] '+req.method+' '+req.originalUrl+' '+(Object.keys(req.body).length > 0 ? JSON.stringify(req.body)+' ' : '')+req.headers['x-forwarded-for'])
        next()
);

app.use((req, res, next) => {
    if (req.headers.authorization !== process.argv[2]) return res.status(403).json({ message: 'Missing proper authorization.' });
    next();
});

function log(message) {
   log.info(message); 
}

module.exports = {
    log: log 
};
