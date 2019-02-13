const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const currentBikeSchema = new Schema({

    embg: {
        type: String,
        unique: true,
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
    }

}
);

mongoose.model('current_bike', currentBikeSchema);
