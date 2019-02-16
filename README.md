# iomicro

![A microservice library for node.js](iomicro.png)

A simple, powerful way to create microservices in node.

```
npm install iomicro --save
```
I highly recommend automatically running ``` npm update ``` before starting your app as I frequently update this module. 

Complete example
------

The real beauty behind this library is the ability to set up microservices very quickly, without having to redefine the redundant setup parts of the app.
```javascript
const micro = require('iomicro');

micro.get('/', { private: true }, (req, res) => {
    res.render('home', { title: 'Home' });
});

micro.listen(3000, { appName: 'My App', hello: 'The app is now online.', apiKeysFile: 'api.keys', ssl: { key: '/path/to/key.pem', cert: '/path/to/cert.pem', forceHTTPS: true } }); 
```
This tiny app will do all of the following:
* Run an express app on port 3000
* Use HTTPS with SSL certificate and key passed through
* Log all requests and responses to the console and a log file asynchronously 
* Expose the URL *only* to users matching an API key you store in a secure file 
* Render fast, dynamic pages using [dotJS](http://olado.github.io/doT)
* JSONize POST request paramaters into ```req.body```

Usage
-----

Now I will detail in much more depth the specs of the API.

```javascript
const micro = require('iomicro');
```

<hr>

### Options
No options are required, and can be omitted entirely as a parameter.

#### Global options
```javascript
const options = {
    appName: 'Microservice', // The name of your app.
    hello: 'The app is now online.' // The message logged when the app starts up.
    apiKeysFile: '/path/to/api.keys', // Path to your encrypted file containing API keys
    ssl: {
        key: '/path/to/key.pem', // Path to your SSL key
        cert: '/path/to/cert.pem', // Path to your SSL cert
        forceHTTPS: true // Will auto-redirect all non-HTTPS requests to HTTPS.
    },
    logDir: 'logs', // The relative folder the logs are dumped to.
    viewDir: 'views', // The relative folder that res.render uses.
};

// Initialize options after iomicro is loaded without starting up a server.
micro.init(options)

// Initialize options when the server begins to listen.
micro.listen(3000, options).then(function() {
    console.log('Server is good to go!')
});
```
##### A note on HTTPS
If the `ssl` object is passed through with paths to a key and cert, an HTTPS server will automatically run instead of normal HTTP.

Additionally, if `forceHTTPS` is `true`, an HTTP server will automatically spin up on port 80 redirecting requests to the HTTPS server on the port you passed through.


#### Function-specific options
```javascript
micro.get('/api/users', { private: true }, getUsers);
```
In order for ``` private: true ``` to work, you must:

1) Create and [encrypt a file](#encryption) containing your API keys.
        You can encrypt a raw file of keys using [micro.encryptFile](#encryption).
        Each new line in the file will count as a new accepted API key.

/path/to/api.keys (how it looks before encrypted)
```
first_api_key
second_api_key
etc
```

2) Make the ```apiKeysFile``` variable in options the relative location of this encrypted file as exampled above.
3) On startup, send through the passphrase that was used to encrypt this file like the example below.

```javascript
API_KEYS_PHRASE="passphrase_that_was_used_to_encrypt_your_keys_file" node app.js
```

This ensures that no API keys will be immediately visible anywhere in your codebase.

Now, for the endpoints that have ``` private: true ``` it will then attempt to match all API keys listed with both
* The ```Authorization``` HTTP header, AKA ```req.headers.authorization```
* User POST parameter ```authorization```, AKA ```req.body.authorization```

This check will automatically occur every time for all ``` private: true ``` endpoints before any of your endpoint logic is run to serve as gatekeeping for users without a proper API key.
<hr>

### Creating endpoints
```javascript
micro.get('/api/users', { private: true }, (req, res) => {
    res.json([{ username: 'user1' }])
});
```
```javascript
micro.post('apps/app', (req, res) => {
    res.send('You posted: '+req.body)
});
```

Expose files such as JS or CSS files
```javascript
micro.static('/files', 'localDir')
```

Expose files at endpoint `files` with [express static options](https://expressjs.com/en/api.html#express.static)
```javascript
micro.static('/files', 'localDir', options)
```

<hr>

### Creating views

#### Pass through variables
Render the view ```login.dot``` in the ```<viewDir>``` folder
```javascript
res.render('login', req.body);
```

login.dot (assuming ```req.body.username``` exists)
```javascript
Welcome back, [[=model.username]].
```


#### Partials
```javascript
res.render('master');
```

master.dot
```javascript
Hello from master.dot!

[[= partial('slave.dot') ]]  
```
slave.dot
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
18:55:44.148 INFO  [<appName>] 200 GET / 127.0.0.1
18:56:24.506 INFO  [<appName>] 201 POST /register { "username": "foo", "password": "bar" } 127.0.0.1
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

### Bonus features

###### Encryption
Be sure to use a very long, randomized, secure passphrase. Encryption uses the AES-256-CBC algorithm.

Encrypt a raw text file
```javascript
// Encrypt the raw text from raw.txt and save it to a file called new.hash with 'passphrase'
micro.encryptFile('raw.txt', 'new.hash', 'passphrase')
```

Decrypt a ciphered text file
```javascript
const rawText = micro.decryptFile('new.hash', 'passphrase')
console.log(rawText) // Decrypted text from new.hash
```

Encrypt a raw string
```javascript
const cipher = micro.encrypt('I am raw text', 'passphrase')
```

Decrypt a ciphered string
```javascript
// 'I am raw text'
const raw = micro.decrypt('969951219ead9191b832cb780f2c0967', 'passphrase')
```

###### Run a websocket using [ws](https://github.com/websockets/ws)
```javascript
const socket = micro.socket({ port: 8080 })

socket.on('connection', function() {
    micro.log('User connected via websocket')
})
```
```javascript
// Start a secure websocket using a global SSL certificate
micro.init({ ssl: { cert: '/path/to/cert.pem', key: '/path/to/key.pem' } })
const secureSocket = micro.socket({ port: 8080 }) 
```
```javascript
// Start a secure websocket using a specific SSL certificate
const secureSocket = micro.socket({
    port: 8080,
    ssl: {
        cert: '/path/to/cert.pem',
        key: '/path/to/key.pem'
    }
})
```

###### Run bash commands
```javascript
// Utilizing Promise resolve and rejects
micro.bash('echo "A bash command was run!"').then((bashRes) => {
    micro.log(bashRes);
}, (bashErr) => {
    micro.error(bashRes);
})
```
```javascript
micro.bash('./runBackgroundProcess.sh');
```
<hr>

#### Active libaries used
###### [express](https://www.npmjs.com/package/express) (latest)
###### [body-parser](https://www.npmjs.com/package/body-parser) (latest)
###### [express-dot-engine](https://www.npmjs.com/package/express-dot-engine)
###### [simple-node-logger](https://www.npmjs.com/package/simple-node-logger)
###### [request-ip](https://www.npmjs.com/package/request-ip)
###### [crypto](https://www.npmjs.com/package/crypto)
