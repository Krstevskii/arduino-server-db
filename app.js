const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const moment = require('moment-timezone');

const port = process.env.PORT || 4000;

mongoose.connect('mongodb+srv://krstevskii:imwIqflnyK6YEWuP@arduino-express-nfc-lv454.mongodb.net/bikes?retryWrites=true', {useNewUrlParser: true})
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Load Model Bikes
require('./Model/bikes');
const Bike = mongoose.model('bikes');

// Load Model Users
require('./Model/users');
const User = mongoose.model('user');

// Load Model Past Bikes
require('./Model/past_bike_users');
const PastBike = mongoose.model('past_bike');

// Load Model Current Bike
require('./Model/current_bike');
const CBike = mongoose.model('current_bike');

// Load EndStringCheckup
const ensureEndString = require('./config/endStrings');

app.get('/', (req, res) => {

    res.json({
        msg: "/GET homepage testing"
    });

});

app.post('/pay', ensureEndString, (req, res) => {

    const Pay = {
        extra: req.body.extra,
        onStation: req.body.onStation,
        bike_id: req.body.bike_id
    };

    console.log(typeof Pay.bike_id);
    console.log(req.body);

    CBike.findOne({bike_id: Pay.bike_id})
        .then(currentBike => {
            const endTime = moment.tz(moment(Date.now()).format(), 'Europe/Skopje');
            const startTime = moment.tz(currentBike.startTime, "Europe/Skopje");
            let diff = endTime.diff(startTime, null, true);

            diff = moment.utc(diff).format('HH:mm:ss').split(':');

            User.findOne({embg: currentBike.embg})
                .then(user => {
                    user.credits = parseInt(user.credits) - (parseInt(diff) + 1) * 30 - parseInt(Pay.extra);
                    currentBike.endTime = endTime;

                    new User(user)
                        .save()
                        .then(user => {
                            new PastBike({
                                ...currentBike._doc,
                                onStation: Pay.onStation === '1'
                            })
                                .save()
                                .then(pbike => {
                                    CBike.deleteOne({bike_id: Pay.bike_id})
                                        .then(cbike => res.send("The user has ended the bike session"))
                                        .catch(err => res.send("An error occurred"));
                                })
                                .catch(err => res.status(503).send("An error occurred"));
                        })
                        .catch(err => res.status(503).send("An error occurred"));
                })
                .catch(err => res.status(503).send('An error occurred'));
        })
        .catch(err => res.status(503).send('An error occurred'));
});
app.post('/update_bike_user', ensureEndString, (req, res) => {

    let latitudeUpdate = req.body.latitude / Math.pow(10, 6);
    let longitudeUpdate = req.body.longitude / Math.pow(10, 6);
    let embg = req.body.embg;
    let bike_id = req.body.bike_id;

    Bike.findOne({bike_id: bike_id})
        .then(bike => {
            if(!bike) return res.status(404).send('The bike doesn\'t exist');

            bike_id = bike._id;

            CBike.findOneAndUpdate(
                {bike_id: bike_id, embg: embg},
                {$push: {longitude: longitudeUpdate, latitude: latitudeUpdate}},
                {new: true}
            )
                .then(result => {
                    if (!result)
                        return res.status(400).send('There is no such user and bike_id');

                    res.send('Map is Updated');
                })
                .catch(err => res.status(503).send("An error occurred"));
        });
});

app.post('/start_bike_user', ensureEndString, (req, res) => {

    const BuildUserBikeModel = {

        embg: req.body.embg,
        bike_id: req.body.bike_id,
        longitude: req.body.longitude / Math.pow(10, 6),
        latitude: req.body.latitude / Math.pow(10, 6)

    };

    CBike.findOne({embg: BuildUserBikeModel.embg})
        .populate('bike_id')
        .then(result => {
            if (!result) {
                Bike.findOne({bike_id: BuildUserBikeModel.bike_id})
                    .then(bike => {
                        BuildUserBikeModel.bike_id = bike._id;
                        new CBike(BuildUserBikeModel)
                            .save()
                            .then(bikeUserModel => res.send("The bike has started"))
                            .catch(err => res.status(503).send("An error occurred"));
                    })
                    .catch(err => res.status(503).send('An error occurred'));
            } else {
                if (result.embg === BuildUserBikeModel.embg)
                    res.send('The user has already started the bike');
                else
                    res.send('Another user already uses the bike');
            }
        })
        .catch(err => res.status(503).send("An error occurred"));
});

app.post('/find_user', ensureEndString, (req, res) => {

    const embg = req.body.embg;
    const bike_id = req.body.bike_id;

    if (embg.length === 13) {
        User.findOne({embg: `${embg}`})
            .then(user => {
                if (!user) return res.status(404).send('The User does not exist');

                if (user.credits >= 50) {
                    Bike.findOne({bike_id: bike_id})
                        .then(bike => {
                            console.log(bike);
                            if (!bike) return res.status(503).send("The bike doesn't exist");

                            if (bike.onStation)
                                return res.send('[11]');
                            else
                                return res.send('[1]');
                        })
                        .catch(err => res.status(503).send('An error has occurred'));
                } else
                    res.send("The user has insufficient credits");
            })
            .catch(err => res.status(503).send("An error occurred"));
    } else {
        res.send("Invalid embg");
    }
});

app.post('/save_bike', ensureEndString, (req, res) => {

    const newBike = {
        bike_id: req.body.bike_id,
        onStation: req.body.onStation
    };

    new Bike(newBike)
        .save()
        .then(bike => res.json({msg: '/POST bike has been added'}))
        .catch(err => res.status(503).send('An error has occurred'));

});


app.post('/save_user', ensureEndString, (req, res) => {

    const newUser = {
        embg: req.body.embg,
        name: req.body.firstname,
        lastname: req.body.lastname,
        credits: req.body.credits,
    };

    new User(newUser)
        .save()
        .then(user => {
            res.send(user);
        })
        .catch(err => console.log(err));

});

app.get('/get_all', (req, res) => {

    User.find({}).then(idea => {
        res.send(JSON.stringify(idea));
    });

});

app.listen(port, () => console.log(`Serving forever on port ${port}...`));
