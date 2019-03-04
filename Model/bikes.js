const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const BikeSchema = new Schema({

    bike_num: {
        type: String,
        required: true
    },

    onStation: {
        type: Boolean,
        required: true,
        default: false
    }

});

mongoose.model('bikes', BikeSchema);
