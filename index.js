var app = require('express')();
var https = require('https');
var http = require('http').createServer(app);
var io = require('socket.io').listen(http);
var fs = require('fs');
var mongodb = require('mongodb');

mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://glowies2:2Ey0xJinEc3eFbEy@ds151943.mlab.com:51943/heroku_vp8n5tzw", function (err, mdb) {
    if (err) {
        console.log('Unable to connect to MongoDB', err);
    } else {
        console.log('Connection established to MongoDB');
        db = mdb.db("heroku_vp8n5tzw");
        collection = db.collection('user_collection');
        blacklistCol = db.collection('blacklist');
        collection.find({}, {limit: 5, sort: [["rank", "asc"]]}).toArray(function (err, result) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result.length) {
                console.log(result);
            } else {
                console.log('No doc in collection');
            }
        });
        http.listen((process.env.PORT || 3000), function () { // port = process.env.PORT
            console.log('listening on port: ' + (process.env.PORT || 3000));
        });
    }
});

io.on('connection', function (socket) {
    console.log(' ID: ' + socket.id + ' connected from: ' + socket.request.connection.remoteAddress);

    socket.emit('connection check', true);

    socket.on('check highscore', function (data) {
        var includes = 0;
        blacklistCol.find({}).toArray(function (err, result1) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result1.length) {
                for (var k = 0; k < result1.length; k++) {
                    if (result1[k].email == data.email) {
                        includes = 1;
                    }
                }
            } else {
                console.log('No doc in blacklist collection');
            }
        });

        if (includes) {
            // emit account suspended message
            // pass
        } else {
            collection.find({"uid": data.uid}).toArray(function (err, result) {
                if (err) {
                    console.log('Error finding in collection', err);
                } else if (result.length) {
                    // Update user highscores if necessary.
                    if (result[0].score < data.score || result[0].length < data.length || result[0].maxCombo < data.maxCombo) {
                        collection.updateOne({uid: data.uid}, {$set: {
                            uid: result[0].uid,
                            email: result[0].email,
                            nickname: result[0].nickname,
                            length: Math.max(result[0].length, data.length),
                            score: Math.max(result[0].score, data.score),
                            maxCombo: Math.max(result[0].maxCombo, data.maxCombo),
                            photoURL: data.photoURL
                        }});
                    }
                } else {
                    console.log('No doc in collection');
                }

                emitTopFive(socket);
            });
        }

    });

    socket.on('get ranks', function () {
        emitTopFive(socket);
    });

    socket.on('insert sample ranks', function () {
        collection.insertOne({uid: "0001", email: "derp@domain.com", nickname: "Derp", length: 0, score: 0, maxCombo: 0, photoURL: ""});
        collection.insertOne({uid: "0010", email: "herp@domain.com", nickname: "Herp", length: 0, score: 0, maxCombo: 0, photoURL: ""});
        collection.insertOne({uid: "0011", email: "gerp@domain.com", nickname: "Gerp", length: 0, score: 0, maxCombo: 0, photoURL: ""});
        collection.insertOne({uid: "0100", email: "zerp@domain.com", nickname: "Zerp", length: 0, score: 0, maxCombo: 0, photoURL: ""});
        collection.insertOne({uid: "0101", email: "berp@domain.com", nickname: "Berp", length: 0, score: 0, maxCombo: 0, photoURL: ""});
    });

    socket.on('suspend', function (data) {
        blacklistCol.insertOne({'email': data.email});
        console.log(data.email + " Has Been Suspended...");
    });

    socket.on('check user', function (data) {
        collection.find({"uid": data.uid}).toArray(function (err, result) {
            if(err){
                console.log('Error finding in collection', err);
            }else if(result.length){
                socket.emit('user return', {newUser: result[0].nickname == "", nickname: result[0].nickname, length: result[0].length, score: result[0].score, maxCombo: result[0].maxCombo});
            }else{
                collection.insertOne({
                    uid: data.uid,
                    email: data.email,
                    nickname: "",
                    length: 0,
                    score: 0,
                    maxCombo: 0,
                    photoURL: data.photoURL
                });
                socket.emit('user return', {newUser: true});
            }
        });
    });

    socket.on('change display name', function (data) {
        collection.find({"uid": data.uid}).toArray(function (err, result) {
            if(err){
                console.log('Error finding in collection', err);
                socket.emit("nickname return", {success: false});
            }else if(result.length && result[0].nickname == "" && data.nickname.length < 16 && /^[a-z0-9]+$/i.test(data.nickname)){
                // Only allow nickname change if the nickname field is an empty string
                collection.updateOne({uid: data.uid}, {$set: {
                    uid: result[0].uid,
                    email: result[0].email,
                    nickname: data.nickname,
                    length: result[0].length,
                    score: result[0].score,
                    maxCombo: result[0].maxCombo,
                    photoURL: result[0].photoURL
                }});
                socket.emit("nickname return", {success: true, nickname: data.nickname});
            }else{
                console.log("UID: " + data.uid + " tried illegal username change.");
                socket.emit("nickname return", {success: false});
            }
        });
    });

    socket.on('blacklist', function (data) {
        blacklistCol.find({}).toArray(function (err, result1) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result1.length) {
                var includes = 0;
                for (var k = 0; k < result1.length; k++) {
                    if (result1[k].email == data) {
                        includes = 1;
                    }
                }

                socket.emit('blacklist', !includes);
            } else {
                console.log('No doc in blacklist collection');
            }
        });
    });
});

function emitTopFive(socket){
    // Initialize the leaderboardInfo object that will store information about the multiple leaderboards
    var leaderboardInfo = Object();

    // Retrieve length leaderboard
    collection.find({}, {limit: 5, sort: [["length", "descending"]]}).toArray(function (err, result) {
        if (err) {
            console.log('Error finding in collection', err);
        } else if (result.length) {

            leaderboardInfo.length = result;

            // Retrieve score leaderboard
            collection.find({}, {limit: 5, sort: [["score", "descending"]]}).toArray(function (err, result) {
                if (err) {
                    console.log('Error finding in collection', err);
                } else if (result.length) {

                    leaderboardInfo.score = result;

                    // Retrieve maxCombo leaderboard
                    collection.find({}, {limit: 5, sort: [["maxCombo", "descending"]]}).toArray(function (err, result) {
                        if (err) {
                            console.log('Error finding in collection', err);
                        } else if (result.length) {
                            leaderboardInfo.maxCombo = result;
                            socket.emit('ranks', leaderboardInfo);
                        } else {
                            console.log('No doc in collection');
                        }
                    });
                } else {
                    console.log('No doc in collection');
                }
            });
        } else {
            console.log('No doc in collection');
        }
    });
}