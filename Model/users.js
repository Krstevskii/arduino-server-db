const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UsersSchema = new Schema({

    embg: {
        type: String,
        unique: true,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    lastname: {
        type: String,
        required: true
    },

    credits: {
        type: Number,
        required: true
    }

});

mongoose.model('user', UsersSchema);