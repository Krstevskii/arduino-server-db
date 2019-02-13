const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const moment = require('moment-timezone');

const port = process.env.PORT || 4000;

mongoose.connect('mongodb+srv://krstevskii:imwIqflnyK6YEWuP@arduino-express-nfc-lv454.mongodb.net/test?retryWrites=true', {useNewUrlParser: true})
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Load Model Users
require('./Model/users');
const User = mongoose.model('user');

// Load Model Past Bikes
require('./Model/past_bike_users');
const PastBike = mongoose.model('past_bike');

// Load EndStringCheckup
const ensureEndString = require('./config/endStrings');

// Load Model Current Bike
require('./Model/current_bike');
const CBike = mongoose.model('current_bike');

app.get('/', (req, res) => {

    res.send('<!DOCTYPE html>\n' +
        '<html>\n' +
        '<body>\n' +
        '\n' +
        '<h1>Smart Bike</h1>\n' +
        '\n' +
        '</body>\n' +
        '</html>\n');

});

app.post('/pay', ensureEndString, (req, res) => {

    const Pay = {

        embg: req.body.embg,
        pay_part1: req.body.extra,
    };

    CBike.findOne({embg: Pay.embg})
        .then(cuser => {
            cuser.endTime = Date.now();

            cuser
                .save()
                .then(endUser => {

                    const payTimeDifference = moment.utc(moment(endUser.endTime, "DD/MM/YYYY HH:mm:ss").diff(moment(endUser.startTime, "DD/MM/YYYY HH:mm:ss"))).format("HH:mm:ss");
                    timeHMSArray = payTimeDifference.split(':');

                    for (let i = 0; i < timeHMSArray.length; i++) {
                        timeHMSArray[i] = parseInt(timeHMSArray[i]) / Math.pow(60, i);
                    }

                    const totalTime = Math.ceil(timeHMSArray.reduce((total, current) => total + current)) * 30;
                    const finalPrice = totalTime + parseInt(Pay.pay_part1);

                    User.findOne({embg: endUser.embg})
                        .then(user => {
                            user.credits = user.credits - finalPrice;
                            user.save()
                                .then(user => {
                                    // res.send('The price has been deducted');
                                    CBike.findOne({embg: user.embg}, {_id: 0})
                                        .then(user => {
                                            console.log(user);
                                            const newUserToPermSave = {
                                                embg: user.embg,
                                                bike_id: user.bike_id,
                                                startTime: user.startTime,
                                                longitude: user.longitude,
                                                latitude: user.latitude,
                                                endTime: user.endTime
                                            };
                                            new PastBike(newUserToPermSave)
                                                .save()
                                                .then(user => {

                                                    CBike.remove({embg: user.embg})
                                                        .then(() => res.send('The price has been deducted'))
                                                        .catch(err => console.log(err));

                                                })
                                                .catch(err => console.log(err));
                                        });
                                })
                                .catch(() => console.log('The user has not been saved'));
                        })
                        .catch(() => console.log(`The user doesn't exist`));

                });
        });
});
app.post('/update_bike_user', ensureEndString, (req, res) => {

    let latitudeUpdate = req.body.latitude / Math.pow(10, 6);
    let longitudeUpdate = req.body.longitude / Math.pow(10, 6);
    let embg = req.body.embg;

    CBike.updateOne({embg: embg},
        {$push: {longitude: longitudeUpdate, latitude: latitudeUpdate}})
        .then((result) => {

            res.send("Map is Updated");
        })

        .catch(err => console.log(err));
});

app.post('/start_bike_user', ensureEndString, (req, res) => {

    console.log(req.body);

    const BuildUserBikeModel = {

        embg: req.body.embg,
        bike_id: req.body.bike_id,
        longitude: req.body.longitude / Math.pow(10, 6),
        latitude: req.body.latitude / Math.pow(10, 6)

    };

    CBike.findOne({embg: BuildUserBikeModel.embg})
        .then(result => {
            if (!result) {
                new CBike(BuildUserBikeModel)
                    .save()
                    .then(bikeUserModel => res.send("The bike has started"))
                    .catch(err => res.status(503).send("An error occurred"));

            } else {
                res.send('The user has already started the bike');
            }
        });
});

app.post('/find_user', ensureEndString, (req, res) => {

    let embg = req.body.embg;
    console.log(typeof embg);

    if (embg.length === 13) {
        User.findOne({embg: `${embg}`})
            .then(user => {
                if (!user) return res.status(404).send('The User does not exist');

                if (user.credits >= 50)
                    res.send("[1]");
                else
                    res.send("The user has insufficent credits");
            })
            .catch(err => res.status(503).send("An error occurred"));
    } else {
        res.send("Invalid embg");
    }
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
