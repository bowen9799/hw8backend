const cookieKey = 'sid'
const sessions = {}

module.exports = {
    cookieKey,
    putToSession: (key, val) => sessions[key] = val,
    deleteFromSession: (key) => delete sessions[key],
    isLogin: (req, res, next) => {
        if (req.user) {
            next()
        }
        else {
            res.sendStatus(401)
        }
    }
}