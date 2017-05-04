const express = require('express')
const bodyParser = require('body-parser')

const CORSMiddleware = (req, res, next) => {
    if (req.headers.origin) {
        res.set('Access-Control-Allow-Origin', req.headers.origin)
    }
    res.set('Access-Control-Allow-Credentials', true)
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    if (req.method && req.method == "OPTIONS") {
        res.sendStatus(200)
    }
    else {
        next()
    }
}

if (process.env.NODE_ENV !== "production") {
    require('dotenv').load()
}

const app = express()
app.use(bodyParser.json())
app.use(CORSMiddleware)
require('./auth')(app)
let isLoggedIn = require('./auth').isLoggedIn
app.use(isLoggedIn)

require('./profile')(app)
require('./article')(app)
require('./following')(app)
require('./db.js')

// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
    const addr = server.address()
    console.log(`Server listening at http://${addr.address}:${addr.port}`)
})