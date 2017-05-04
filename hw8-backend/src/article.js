var Article = require('./model.js').Article
const isLogin = require('./middleware').isLogin
const findProfileByUsername = require('./profile').findUsername
const uploadImage = require('./uploadCloudinary')

let articleId = new Date().getTime()

const findAuthor = (author, callback) => {
    Article.find({
        author: author
    }).exec((err, items) => {
        callback(items)
    })
}

const findId = (id, callback) => {
    Article.find({
        _id: id
    }).exec((err, items) => {
        callback(items)
    })
}

// edit an article by id
const updateArticle = (id, text, callback) => {
    Article.update(
        { _id: id },
        {
            $set: { text: text }
        }
    ).exec((err) => {
        callback(err)
    })
}

const sendArticleById = (res, id) => {
    findId(id, (results) => {
        if (results.length != 1) {
            res.status(400).send('Bad Request')
        }
        else {
            res.send({
                articles: results
            })
        }
    })
}

const sendFeedById = (id, callback) => {
    findProfileByUsername(id, (profile) => {
        let users = profile.following ? [id, ...profile.following] : [id]
        Article.find({
            author: { $in: users }
        }).limit(10).sort({ 'date': -1 }).exec((err, items) => {
            callback(items)
        })
    })
}

// post a new comment under an article
const postComment = (articleId, commentId, text, author, callback) => {
    Article.update(
        { _id: articleId },
        {
            $push: {
                comments: {
                    $each: [{
                        commentId: commentId,
                        author: author,
                        text: text,
                        date: new Date().getTime()
                    }],
                    $sort: { commentId: 1 }
                }
            }
        }
    ).exec((err) => {
        callback(err)
    })
}

// GET handler -> /articles
const getArticles = (req, res) => {
    if (req.params && req.params.id) {
        if (req.params.id.match(/^\d/)) {
            findId(req.params.id, (results) => {
                res.send({
                    articles: results
                })
            })
        } else {
            findAuthor(req.params.id, (results) => {
                res.send({
                    articles: results
                })
            })
        }
    } else {
        sendFeedById(req.user, (items) => {
            res.send({
                articles: items
            })
        })
    }
}

// PUT handler -> /articles
const putArticles = (req, res) => {
    if (req.params.id === undefined || req.body.text === undefined) {
        return res.status(400).send('Bad Request')
    } else {
        if (req.params.id.match(/^\d/)) {
            findId(req.params.id, (results) => {
                if (results.length != 1) {
                    res.status(400).send('Bad Request')
                }
                else {
                    let article = results[0]
                    if (!req.body.commentId) {
                        if (article.author !== req.user) {
                            res.status(403).send('Forbidden')
                        }
                        else {
                            updateArticle(req.params.id, req.body.text,
                                () => sendArticleById(res, req.params.id))
                        }
                    }
                    else if (req.body.commentId == -1) {
                        let commentId = articleId + 1
                        articleId += 1
                        postComment(req.params.id, commentId, req.body.text,
                            req.user, () => sendArticleById(res, req.params.id))
                    }
                    else {
                        Article.findOne({ _id: req.params.id },
                            {
                                comments: {
                                    $elemMatch:
                                    { commentId: req.body.commentId }
                                }
                            }
                        ).exec((err, item) => {
                            if (item.comments[0].author !== req.user) {
                                res.status(403).send('Forbidden')
                            }
                            else {
                                sendArticleById(res, req.params.id)
                            }
                        })
                    }
                }
            })
        } else {
            res.status(400).send('Bad Request')
        }
    }
}

// POST handler -> /article
const postArticle = (req, res) => {
    if (typeof req.body.text !== 'string') {
        return res.status(400).send('Bad request')
    } else {
        let article = {
            _id: articleId,
            author: req.user,
            img: null,
            date: new Date().getTime(),
            comments: [],
            text: req.body.text
        }
        // adding img if img exists
        if (req.fileurl) {
            article.img = req.fileurl
        }
        new Article(article).save()

        articleId += 1
        res.send({
            articles: [article]
        })
    }
}

module.exports = (app) => {
    app.get('/articles/:id?', isLogin, getArticles)
    app.put('/articles/:id', isLogin, putArticles)
    app.post('/article', [isLogin, uploadImage('articleImg')], postArticle)
}