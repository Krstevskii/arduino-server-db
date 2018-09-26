const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const port = process.env.PORT || 4000;

mongoose.connect('mongodb://krstevskii:krstevski14@ds141872.mlab.com:41872/users-nfc', {useNewUrlParser: true})
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Load Model Users
require('./Model/users');
const User = mongoose.model('user');

// Load Model Current Bike
require('./Model/current_bike');
const CBike = mongoose.model('current_bike');

app.get('/', (req, res) => {

    res.send('Hello World!');

});
app.post('/update_bike_user', (req, res) => {

    let latitudeUpdate = req.body.latitude / Math.pow(10, 6);
    let longitudeUpdate = req.body.longitude / Math.pow(10, 6);
    let embg = req.body.embg;


    CBike.updateOne({embg: embg},
        {$push: {longitude: longitudeUpdate, latitude: latitudeUpdate} })
        .then((result) => {

            console.log(result);
            res.send("Map is Updated");
        })
        .catch(err => console.log(err));

});
app.post('/start_bike_user', (req, res) => {

    const BuildUserBikeModel = {

        embg: req.body.embg,
        bike_id: req.body.bike_id,
        startTime: Date.now(),
        longitude: req.body.longitude / Math.pow(10, 6),
        latitude: req.body.latitude / Math.pow(10, 6)

    };

    console.log(BuildUserBikeModel.longitude + " " + BuildUserBikeModel.latitude);

    CBike.findOne({embg: BuildUserBikeModel.embg})
        .then(result => {
           if(result === null){

               new CBike(BuildUserBikeModel)
                   .save()
                   .then(bikeUserModel => res.send(JSON.stringify(bikeUserModel)))
                   .catch(err => console.log(err));

           }else{
               res.send('The user has already started the bike');
           }
        });
});

app.post('/find_user', (req, res) => {

    let embg = req.body.embg;
    embg = embg.substring(0, embg.length - 2);
    console.log("embg=" + embg);

    if((embg.length - 1) === 13) {
        User.findOne({embg: `${embg}`}, (err, user) => {
            if(user !== null){
                res.send("[1]");
            }else{
                res.send("[0]");
            }
        });
    }else{
        res.send("[0]");
    }

});
//gcloud app logs tail -s default
app.get('/get_all', (req, res) => {

    User.find({}).then(idea => {
       res.send(JSON.stringify(idea));
    });

});


app.listen(port, () => console.log(`Serving forever on port ${port}...`));