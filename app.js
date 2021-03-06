const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody, sanitizeQuery} = require('express-validator/filter');
const types = require('./util/types');

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
app.post('/pay', ensureEndString,
    [
        body('bike_id')
            .not()
            .isEmpty()
            .isNumeric()
            .withMessage('Must be a number'),
        body('onStation')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isBoolean()
            .withMessage('Must be a true/false value')
            .toBoolean(),
        body('extra')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a number')
            .toInt(),
        body('slot')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a numeric value')
            .toInt()
    ]
    , (req, res) => {

        const Pay = {
            extra: req.body.extra === undefined ? 0 : req.body.extra,
            onStation: req.body.onStation,
            bike_id: req.body.bike_id,
            station: req.body.station === undefined ? 'None' : req.body.station,
            slot: req.body.slot === undefined ? -1 : req.body.slot
        };

        console.log(types(req.body));
        console.log(types(Pay));
        console.log(Pay);

        Bike.findOne({bike_id: Pay.bike_id})
            .then(bike => {
                bike.stationParams.onStation = Pay.onStation;
                bike.stationParams.slot = Pay.slot;
                bike.stationParams.station = Pay.station;
                bike.started = false;
                bike.save()
                    .catch(err => res.status(503).send('An error occurred'));

                CBike.findOne({bike_id: bike._id})
                    .then(currentBike => {
                        if (!currentBike) return res.status(404).send('The current user doesn\'t exist');

                        const endTime = moment.tz(moment(Date.now()).format(), 'Europe/Skopje');
                        const startTime = moment.tz(currentBike.startTime, "Europe/Skopje");
                        let diff = endTime.diff(startTime, null, true);

                        diff = moment.utc(diff).format('HH:mm:ss').split(':');
                        diff = diff[0];
                        User.findOne({embg: currentBike.embg})
                            .then(user => {
                                user.credits = user.credits - (diff + 1) * 30 - Pay.extra;
                                currentBike.endTime = endTime;

                                new User(user)
                                    .save()
                                    .then(user => {
                                        console.log('asdfasdfasdfasdfsa');

                                        new PastBike({
                                            ...currentBike._doc,
                                            onStation: Pay.onStation
                                        })
                                            .save()
                                            .then(pbike => {
                                                CBike.deleteOne({bike_id: bike._id})
                                                    .then(cbike => {
                                                        console.log('asdfasdf');
                                                        return res.send("The user has ended the bike session")
                                                    })
                                                    .catch(err => res.send("An error occurred"));
                                            })
                                            .catch(err => res.status(503).send(err));
                                    })
                                    .catch(err => res.status(503).send("An User error occurred"));
                            })
                            .catch(err => res.status(503).send('An error occurred'));
                    })
            })
            .catch(err => res.status(503).send('An error occurred'));
    })
;

app.post('/update_bike_user', ensureEndString,
    [
        body('embg')
            .not()
            .isEmpty()
            .isLength({min: 13, max: 13})
            .withMessage('Must be 13 characters long'),
        body('bike_id')
            .not()
            .isEmpty()
            .isNumeric()
            .withMessage('Must be a number'),
        body('longitude')
            .not()
            .isEmpty()
            .withMessage('Required')
            .toFloat(),
        body('latitude')
            .not()
            .isEmpty()
            .withMessage('Required')
            .toFloat(),

    ]
    , (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }

        console.log(types(req.body));

        let latitudeUpdate = req.body.latitude / Math.pow(10, 6);
        let longitudeUpdate = req.body.longitude / Math.pow(10, 6);
        let embg = req.body.embg;
        let bike_id = req.body.bike_id;

        Bike.findOne({bike_id: bike_id})
            .then(bike => {
                if (!bike) return res.status(404).send('The bike doesn\'t exist');

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

app.post('/start_bike_user', ensureEndString,
    [
        body('embg')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isLength({min: 13, max: 13})
            .withMessage('Must be 13 characters long'),
        body('bike_id')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a number'),
        body('longitude')
            .not()
            .isEmpty()
            .withMessage('Required')
            .toFloat(),
        body('latitude')
            .not()
            .isEmpty()
            .withMessage('Required')
            .toFloat(),

    ]
    , (req, res) => {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }
        console.log(types(req.body));
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

app.post('/find_user', ensureEndString,
    [
        body('embg')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isLength({min: 13, max: 13})
            .withMessage('Must be 13 characters long'),
        body('bike_id')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a number')
    ]
    , (req, res) => {

        console.log(types(req.body));
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }

        const embg = req.body.embg;
        const bike_id = req.body.bike_id;

        // if (embg.length === 13) {
        User.findOne({embg: `${embg}`})
            .then(user => {
                if (!user) return res.status(404).send('The User does not exist');

                if (user.credits >= 50) {
                    Bike.findOne({bike_id: bike_id})
                        .then(bike => {
                            console.log(bike);
                            if (!bike) return res.status(503).send('The bike doesn\'t exist');

                            if (bike.stationParams.onStation) {

                                bike.started = true;
                                bike.save()
                                    .then(bk => res.send('The station will open the bike in the next few seconds'))
                                    .catch(err => res.status(503).send('An error occurred'));
                            } else {
                                bike.started = true;
                                bike.save()
                                    .then(bk => res.send('[1]'))
                                    .catch(err => res.status(503).send('An error occurred'));
                            }
                        })
                        .catch(err => res.status(503).send('An error has occurred'));
                } else
                    res.send("The user has insufficient credits");
            })
            .catch(err => res.status(503).send("An error occurred"));
        // } else {
        //     res.send("Invalid embg");
        // }
    });

app.post('/check',
    [
        sanitizeBody('slot')
            .toInt()
    ],
    (req, res) => {

        console.log(types(req.body));
        console.log(req.body);
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }

        Bike.find()
            .then(bikes => {
                const bikeArray = bikes.filter(bike => bike.stationParams.station === req.body.station && bike.stationParams.slot === req.body.slot);
                if (!bikeArray[0])
                    return res.status(404).send('The bike isn\'t at the station');

                if (bikeArray[0].stationParams.onStation) {
                    if (bikeArray[0].started) {
                        bikeArray[0].stationParams.onStation = false;
                        bikeArray[0].save()
                            .then(bike => console.log(bike))
                            .catch(err => res.status(503).send('An error occurred'));

                        res.send('[1]');
                    } else
                        res.send('[0]');
                } else
                    res.send('[0]');
            });
    });

app.post('/save_bike', ensureEndString,
    [
        body('bike_id')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a number'),
        body('onStation')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isBoolean()
            .withMessage('Must be a true/false value')
            .toBoolean(),
        body('slot')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isNumeric()
            .withMessage('Must be a numeric value')
            .toInt()
    ]
    , (req, res) => {
        console.log(types(req.body));
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }

        const newBike = {
            bike_id: req.body.bike_id,
            stationParams: {
                onStation: req.body.onStation,
                station: req.body.station,
                slot: req.body.slot
            }
        };

        new Bike(newBike)
            .save()
            .then(bike => res.json({msg: '/POST bike has been added'}))
            .catch(err => res.status(503).send('An error has occurred'));

    });

app.post('/save_user', ensureEndString,
    [
        body('embg')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isLength({min: 13, max: 13})
            .withMessage('Must be 13 characters long and is Required'),
        body('firstname')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isLength({min: 3, max: 30})
            .withMessage('First name must be between 3 and 30 characters and is Required'),
        body('lastname')
            .not()
            .isEmpty()
            .withMessage('Required')
            .isLength({min: 3, max: 50})
            .withMessage('Last name must be between 3 and 50 characters and is Required'),
        sanitizeBody('credits')
            .toInt()
    ], (req, res) => {
        console.log(types(req.body));
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.array());
            return res.status(400).send('Not valid parameters');
        }

        const newUser = {
            embg: req.body.embg,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            credits: req.body.credits,
        };

        new User(newUser)
            .save()
            .then(user => {
                res.send(user);
            })
            .catch(err => res.status(503).send('An error occurred'));
    });

app.get('/get_all', (req, res) => {
    User.find({}).then(idea => {
        res.send(JSON.stringify(idea));
    });
});

app.listen(port, () => console.log(`Serving forever on port ${port}...`));
