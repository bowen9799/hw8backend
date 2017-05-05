var mongoose = require('mongoose')
require('./db.js')

var userSchema = new mongoose.Schema({
    username: String,
    salt: String,
    hash: String
})
var profileSchema = new mongoose.Schema({
    username: String,
    headline: String,
    following: [String],
    email: String,
    zipcode: String,
    avatar: String,
    dob: Date,
    phone: String
})
var articleSchema = new mongoose.Schema({
    _id: Number,
    author: String,
    text: String,
    date: Date,
    img: String,
    comments: [{
        commentId: Number,
        author: String,
        text: String,
        date: Date
    }]
})

exports.User = mongoose.model('users', userSchema)
exports.Article = mongoose.model('articles', articleSchema)
exports.Profile = mongoose.model('profiles', profileSchema)