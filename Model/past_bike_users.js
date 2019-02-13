const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pastBikeSchema = new Schema({

    embg: {
        type: String,
        required: true
    },

    bike_id: {
        type: Number,
        required: true
    },

    startTime: {
        type: Date,
        required: true
    },

    endTime: {
        type: Date,
        required: false
    },

    longitude: {
        type: [Number],
        required: true
    },

    latitude: {
        type: [Number],
        required: true
    },

    onStation: {
        type: Boolean,
        required: true
    }

});

mongoose.model('past_bike', pastBikeSchema);
