![A microservice library for node.js](https://sto.narrownode.net/github/microservice.png)
\<npm stats\>

A simple, powerful way to create microservices in node.

```
npm install microservice
```
Complete example
------

The real beauty behind this library is the ability to set up microservices very quickly, without having to redefine the redundant setup parts of the app.
```javascript
const micro = require('microservice');

micro.get('/', { private: true }, (req, res) => {
    res.render('home', { title: 'Home' });
});

micro.listen(3000, { appName: 'My App' hello: 'The app is now online.' }); 
```
This tiny app will do all of the following:
* Run an express app on port 3000
* Log all requests responses to the console and a log file asynchronously 
* Expose the URL *only* to users who pass an access key specified on startup
* Render fast, dynamic pages using [dotJS](http://olado.github.io/doT)
* JSONize POST request paramaters into ```req.body```

Usage
-----

Now I will detail in much more depth the specs of the API.

```javascript
const micro = require('microservice');
```

<hr>

### Options
No options are required, and can be ommitted entirely as a parameter.

#### Global
```javascript
micro.listen(3000, {
    appName: 'Microservice', // The name of your app.
    hello: 'The app is now online.' // The message logged when the app starts up.
    logDir: 'logs', // The relative folder the logs are dumped to.
    viewDir: 'views', // The relative folder that res.render uses.
    callback: function() {} // A custom function to be run on startup.
});
```

#### Function
TODO: Clean this up
```javascript
micro.get('/api/users', { private: true }, getUsers);
```
In order for ```private: true``` to work, pass through an access key on startup
```javascript
node app.js "myreallyreallyreallyreallylonghashedkey"
node api.js "Bearer eylajs9x1m.wpz0jcmqo9askdmzioenosjhmdow22~o0cj"
```
This ensures that no keys will be immediately visible anywhere in your codebase.

For the endpoints that have ```private: true``` it will then attempt to match said key with
* The ```Authorization``` HTTP header, AKA ```req.headers.authorization```
* User POST parameter ```authorization```, AKA ```req.body.authorization```

###### I'm aware this feature is limited, and will likely add support for multiple or elastic keys in the future.
<hr>

### Creating endpoints
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

<hr>

### Creating views

#### Pass through variables
Render the view ```login.dot``` in the ```<viewDir>``` folder
````javascript
res.render('login', req.body);
```

**login.dot** (assuming ```req.body.username``` exists)
```javascript
Welcome back, [[=model.username]].
```

#### Partials
```javascript
res.render('master');
```

**master.dot**
```javascript
Hello from master.dot!

[[= partial('slave.dot') ]]  
```
**slave.dot**
```
Hello from slave.dot
```

All-around HTML, CSS, and JS syntax apply in these views.

###### For more, read: [express-dot-engine](https://www.npmjs.com/package/express-dot-engine)

<hr>

### Logging
All logs are logged to the console and saved to ```<logDir>/<YYYY>-<MM>-<DD>.log```

The timestamps on each line use the timezone native to your system.

#### Automatic logs
On app startup
```
19:01:24.366 INFO  [<appName>] <hello>
```

On every user request
```
18:55:44.148 INFO  [<appName>] GET / 127.0.0.1
18:56:24.506 INFO  [<appName>] POST /register { "username": "foo", "password": "bar" } 127.0.0.1
```

#### Triggered logs
```INFO``` logging
```javascript
micro.log('Log this message please.');
```

```ERROR``` logging
```javascript
micro.error('Something bad happened :(');
```

Result in
```
19:01:24.366 INFO  [<appName>] Log this message please.
19:01:24.994 ERROR  [<appName>] Something bad happened :(
```

<hr>

#### Active libaries used
###### [express](https://www.npmjs.com/package/express) (latest)
###### [body-parser](https://www.npmjs.com/package/body-parser) (latest)
###### [express-dot-engine](https://www.npmjs.com/package/express-dot-engine)
###### [simple-node-logger](https://www.npmjs.com/package/simple-node-logger)
###### [request-ip](https://www.npmjs.com/package/request-ip)
