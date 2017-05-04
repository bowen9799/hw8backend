const bcrypt = require('bcrypt')
const md5 = require('md5')
var redis = require('redis').createClient(process.env.REDIS_URL)

var models = require('./model.js')
var User = require('./model.js').User
var Profile = require('./model.js').Profile

const isLogin = require('./middleware').isLogin
const session = require('express-session')
const passport = require('passport')

const GoogleStrategy = require('passport-google-oauth2').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const cookieParser = require('cookie-parser')

const facebookConfig = {
    clientID: '122457988307775',
    clientSecret: '20906289af8ecdc3af5a2616418899b9',
    callbackURL: 'https://ricebook-bowen9799.herokuapp.com/auth/facebook/callback'
}
const googleConfig = {
    clientID: '502212559219-tvsqfnmeosurk6qh65tp2keomkmnrn42.apps.googleusercontent.com',
    clientSecret: 'BstMWm893k1FqxhMUCokSoqX',
    callbackURL: 'https://ricebook-bowen9799.herokuapp.com/auth/google/callback'
}

const isLoggedIn = (req, res, next) => {
    var sid = req.cookies['sessionId']
    if (req.isAuthenticated()) {
        req.user = req.user.username
        next()
    }
    else if (!sid) {
        next()
    } else {
        redis.hgetall(sid, (err, usernameObj) => {
            if (err) {
                console.log(err)
            }
            if (usernameObj) {
                req.user = usernameObj.username
            }
            next()
        })
    }
}

const saltRounds = 10;
const cookieKey = 'sessionId'

// handler for POST /register
const register = (req, res) => {
    if (typeof req.body.username !== 'string'
        || typeof req.body.password !== 'string'
        || typeof req.body.email !== 'string'
        || typeof req.body.zipcode !== 'string'
        || typeof req.body.dob !== 'string') {
        return res.status(400).send('Bad request')
    } else {
        User.find({
            username: req.body.username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
                return res.status(500).send('Internal server error.')
            }
            if (result && result.length != 0) {
                res.sendStatus(401).send('Username already exists.')
            } else {
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(req.body.password, salt);
                new User({
                    username: req.body.username,
                    salt: salt,
                    hash: hash
                }).save()
                new Profile({
                    username: req.body.username,
                    email: req.body.email,
                    dob: req.body.dob,
                    following: [],
                    zipcode: req.body.zipcode,
                    phone: req.body.phone,
                    avatar: null,
                    headline: "Becoming a web developer!"
                }).save()
                res.send({
                    username: req.body.username,
                    result: "success"
                })
            }
        })
    }
}

// handler for POST /login
const login = (req, res) => {
    if (req.user) {
        redis.del(req.cookies[cookieKey])
    }
    if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        return res.status(400).send('Bad request.')
    } else {
        let username = req.body.username
        let password = req.body.password
        User.find({
            username: username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
                return res.status(500).send('Internal server error.')
            } else if (result.length === 0) {
                res.sendStatus(400).send('Username not registered.')
            } else {
                let currUser = result[0];
                let storedHash = bcrypt.hashSync(password, currUser.salt)
                if (storedHash !== currUser.hash) {
                    return res.status(401).send('Password incorrect.')
                }
                else {
                    let sessionKey = md5(username + new Date().getTime())
                    res.cookie(cookieKey, sessionKey, {
                        maxAge: 3600 * 1000,
                        httpOnly: true
                    })
                    redis.hmset(sessionKey, { username: username })
                    return res.send({
                        username: username,
                        result: "success"
                    })
                }
            }
        })
    }
}


// handler for PUT password
const password = (req, res) => {
    if (!(req.body && req.body.password)) {
        res.sendStatus(400)
    } else {
        redis.del(req.cookies[cookieKey])
        let username = req.user
        User.find({
            username: username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
            }
            if (result && result.length == 1) {
                let currentUser = result[0];
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(req.body.password, salt);
                User.update({
                    username: username
                }, {
                        username: username,
                        salt: salt,
                        hash: hash
                    }).exec((err) => {
                        res.send({
                            username: username,
                            result: "success"
                        })
                    })
            } else {
                res.sendStatus(400)
            }
        })
    }
}

const saveSession = (sid, userObj) => {
    redis.hmset(sid, userObj)
}

// handler for PUT /logout
const putLogout = (req, res) => {
    if (req.isAuthenticated()) {
        res.clearCookie(cookieKey);
        req.logout()
    }
    else if (req.cookies && req.cookies[cookieKey]) {
        redis.del(req.cookies[cookieKey], (err, response) => {
            res.clearCookie(cookieKey);
        })
    }
    res.sendStatus(200)
}

const fail = (req, res) => {
    res.sendStatus('401')
}

passport.serializeUser((user, done) => {
    done(null, user._id)
})

passport.deserializeUser((id, done) => {
    User.findOne({
        _id: id
    }).exec(function (err, user) {
        if (err || !user) {
            console.log(err)
        }
        else {
            done(null, user)
        }
    })
})

// handler for OAuth
const handleOAuth = (token, refreshToken, profile,
    done) => {
    process.nextTick(function () {
        const displayName = `${profile.displayName}@${profile.provider}`
        const email = profile.email ?
            profile.email : ''
        const avatar = profile.photos && profile.photos.length > 0 ?
            profile.photos[0].value : ''
        const authProp = `auth.${profile.provider}`
        User.findOne({
            username: displayName,
        }).exec(function (err, user) {
            if (err) {
                console.log(err)
                return done(err)
            }
            else if (user) {
                return done(null, user)
            }
            else {
                new Profile({
                    username: displayName,
                    email: email,
                    dob: new Date().getTime(),
                    following: [displayName],
                    zipcode: '',
                    phone: '',
                    avatar: avatar,
                    headline: "This user hasn't left a headline..."
                }).save()
                var user = {
                    username: displayName,
                    salt: '',
                    hash: '',
                    auth: { [profile.provider]: profile.displayName }
                }
                new User(user).save().then(r => { return done(null, r) })
            }
        })
    })
}

passport.use(new GoogleStrategy(googleConfig, handleOAuth))
passport.use(new FacebookStrategy(facebookConfig, handleOAuth))

exports = (app) => {
    app.use(cookieParser())
    app.use(session({ secret: 'BstMWm893k1FqxhMUCokSoqX' }))
    app.use(passport.initialize())
    app.use(passport.session())
    app.put('/password', [isLoggedIn, isLogin], password)
    app.post('/register', register)
    app.post('/login', login)
    app.use('/auth/google/login', passport.authenticate('google',
        { scope: ['email'] }))
    app.use('/auth/google/callback', passport.authenticate('google',
        { successRedirect: 'http://ricebook-bowen9799.surge.sh', failureRedirect: '/fail' }))
    app.use('/auth/facebook/login', passport.authenticate('facebook',
        { scope: ['email'] }))
    app.use('/auth/facebook/callback', passport.authenticate('facebook',
        { successRedirect: 'http://ricebook-bowen9799.surge.sh', failureRedirect: '/fail' }))
    app.use('/fail', fail)
    app.put('/logout', [isLoggedIn, isLogin], putLogout)
}

exports.isLoggedIn = isLoggedIn

module.exports = exports