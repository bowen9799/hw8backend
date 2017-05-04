var Profile = require('./model.js').Profile
const isLogin = require('./middleware').isLogin
const findUsername = require('./profile').findUsername

// handler for GET /following
const getFollowing = (req, res) => {
    const user = req.params.user ? req.params.user : req.user
    findUsername(user, (profile) => {
        res.send({
            username: user,
            following: profile.following ? profile.following : []
        })
    })
}

// handler for PUT /following
const putFollowing = (req, res) => {
    if (req.params.user === undefined) {
        return res.status(400).send('Bad request.')
    } else {
        findUsername(req.params.user, (result) => {
            if (result && result.username) {
                Profile.update(
                    { username: req.user },
                    {
                        $addToSet: {
                            following: {
                                $each: [result.username],
                                $sort: 1
                            }
                        }
                    }
                ).exec((err) => {
                    findUsername(req.user, (result) => {
                        res.send({
                            username: req.user,
                            following: result.following
                        })
                    })
                })
            }
            else {
                findUsername(req.user, (result) => {
                    res.send({
                        username: req.user,
                        following: result.following
                    })
                })
            }

        })
    }
}

// handler for DELETE ->/following
const removeFollowing = (req, res) => {
    if (req.params.user === undefined) {
        return res.status(400).send('Bad request.')
    } else {
        findUsername(req.params.user, (result) => {
            if (result && result.username) {
                Profile.update(
                    { username: req.user },
                    {
                        $pull: {
                            following: result.username
                        }
                    }
                ).exec((err) => {
                    findUsername(req.user, (result) => {
                        res.send({
                            username: req.user,
                            following: result.following
                        })
                    })
                })
            }
            else {
                findUsername(req.user, (result) => {
                    res.send({
                        username: req.user,
                        following: result.following
                    })
                })
            }

        })
    }
}

module.exports = (app) => {
    app.get('/following/:user?', isLogin, getFollowing)
    app.put('/following/:user', isLogin, putFollowing)
    app.delete('/following/:user', isLogin, removeFollowing)
}