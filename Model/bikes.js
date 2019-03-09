const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const BikeSchema = new Schema({

    bike_id: {
        type: String,
        required: true,
        index: true,
        unique: true
    },

    stationParams: {
        onStation: {
            type: Boolean,
            required: true,
            default: false
        },

        station: {
            type: String
        },

        slot: {
            type: Number
        }
    },

    started: {
        type: Boolean,
        required: true,
        default: false
    }


});

mongoose.model('bikes', BikeSchema);
