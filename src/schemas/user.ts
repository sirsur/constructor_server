const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const userSchema = new Schema ({
    email:  { type: String, required: true, },
    login: { type: String, required: true, },
    password: { type: String, required: true, }
});

const user = mongoose.model('testModel', userSchema);
module.exports = user;