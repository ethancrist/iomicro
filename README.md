![A microservice library for node.js](https://sto.narrownode.net/github/microservice.png =325x120)
<npm stats>

A simple, powerful way to create microservices in node.

```
npm install microservice
```
## Active libaries used
* express (latest)
* body-parser (latest)
* express-dot-engine
* simple-node-logger

## Complete example
```javascript
const micro = require('microservice');

micro.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

micro.listen(3000, { app: 'App Name' }, 'My app is now running.'); 
```
This tiny app will do the following:
* Log all requests responses to the console and a log file asynchronously 
    * All logs are dumped to 'log/<YYYY>-<MM>-<DD>.log'
* Render fast, dynamic pages using [dotJS](https://www.npmjs.com/package/express-dot-engine)
* JSONize POST request paramaters into ```req.body```

## API
The real beauty behind this library is the ability to set up microservices very quickly, without having to redefine the redundant setup parts of the app.

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
```
