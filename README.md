![A microservice library for node.js](https://sto.narrownode.net/github/microservice.png)
<npm stats>

A simple, powerful way to create microservices in node.

```
npm install microservice
```
## Active libaries used
* express (latest)
* body-parser (latest)
* simple-node-logger

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

micro.post('apps/app', (req, res) => {
    res.send('You posted: '+req.body)
});
