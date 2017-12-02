![A microservice library for node.js](https://sto.narrownode.net/github/microservice.png)
\<npm stats\>

A simple, powerful way to create microservices in node.

```
npm install microservice
```
## Active libaries used
* [express](https://www.npmjs.com/package/express) (latest)
* [body-parser](https://www.npmjs.com/package/body-parser) (latest)
* [express-dot-engine](https://www.npmjs.com/package/express-dot-engine)
* [simple-node-logger](https://www.npmjs.com/package/simple-node-logger)

## Complete example
The real beauty behind this library is the ability to set up microservices very quickly, without having to redefine the redundant setup parts of the app.
```javascript
const micro = require('microservice');

micro.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

micro.listen(3000, { appName: 'My App' }, 'This app is now running.'); 
```
This tiny app will do the following:
* Run an express app on port 3000
* Log all requests responses to the console and a log file asynchronously 
    * All logs are dumped to: ```log/<YYYY>-<MM>-<DD>.log```
* Render fast, dynamic pages using [dotJS](http://olado.github.io/doT)
* JSONize POST request paramaters into ```req.body```

## API
```javascript
const micro = require('microservice');
```

### Endpoints
```javascript
micro.get('/api/users', { private: true }, (req, res) => {
    res.json([{ username: 'user1' }]
});
```
```javascript
micro.post('apps/app', (req, res) => {
    res.send('You posted: '+req.body)
});

### Logging
```javascript
micro.log('Log this message please.');
```
Output in console and new line in ```logs/<YYYY>-<MM>-<DD>.log```
```19:01:24.366 INFO  [<appName>] Log this message please.```

This uses the timezone native to your system.
