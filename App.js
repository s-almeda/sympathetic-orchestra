/*
Node + Express Example code for CS160 Summer 2022
Prepared by Shm Garanganao Almeda 

Code referenced from: 
https://www.digitalocean.com/community/tutorials/how-to-create-a-web-server-in-node-js-with-the-http-module"
https://expressjs.com/en/starter/hello-world.html
https://codeforgeek.com/render-html-file-expressjs/
https://stackoverflow.com/questions/32257736/app-use-express-serve-multiple-html

Photo Credits:
Bunny by Satyabratasm on Unsplash <https://unsplash.com/photos/u_kMWN-BWyU>
*/

//Node modules to *require*
//if these cause errors, be sure you've installed them, ex: 'npm install express'
const express = require('express');
const router = express.Router();
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

//specify that we want to run our website on 'http://localhost:8000/'
const host = 'localhost';
const port = 8000;

//storing a copy of these variables here, serverside
let cursorX = 0;
let cursorY = 0;

var publicPath = path.join(__dirname, 'public'); //get the path to use our "public" folder where we stored our html, css, images, etc
app.use(express.static(publicPath));  //tell express to use that folder

// Body parser middleware to handle JSON requests
app.use(bodyParser.json());

//here's where we specify what to send to users that connect to our web server...
//if there's no url extension, it will show "index.html"
router.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "/"));
});

app.get('/player', function (req, res) {
    res.sendFile(publicPath + '/player/index.html');
});
//when someone visits the localhost:8000/hands, we serve the hands_test.html demo
app.get('/hands', function (req, res) {
    res.sendFile(publicPath + '/hands_test.html');
});

//when the user goes to the 
app.post('/landmarks', (req, res) => {
    console.log('Received landmarks:', req.body);

    //let's grab the 8th landmark out of there

    const landmarks = req.body.landmarks;
    if (landmarks && landmarks.length > 0 && landmarks[0].length > 8) {
        const eighthLandmark = landmarks[0][7];  // use index 7 to grab the 8th landmark
        cursorX = eighthLandmark.x;
        cursorY = eighthLandmark.y;
        console.log(`Updated serverside cursor coordinates: X=${cursorX}, Y=${cursorY}`);
    } else {
        console.log('Invalid landmark data received.');
    }

    // tell the recognize_hands code that successfully received its message!
    res.sendStatus(200);
});

// Endpoint to *serve* our copies of the cursorX and cursorY coordinates to the p5.js code when requested
app.get('/coordinates', (req, res) => {
    res.json({ x: cursorX, y: cursorY });
});


// placeholders
app.get('/b', function (req, res) {
    res.sendFile(publicPath + '/b.html');
});
app.get('/c', function (req, res) {
    res.sendFile(publicPath + '/c.html');
});



//run this server by entering "node App.js" using your command line. 
   app.listen(port, () => {
     console.log(`Server is running on http://${host}:${port}`);
   });

