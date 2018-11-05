var app = require('express')();
var https = require('https');
var http = require('http').createServer(app);
var io = require('socket.io').listen(http);
var fs = require('fs');
var mongodb = require('mongodb');

mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://glowies:1q4ogHrhg8I7@ds061206.mlab.com:61206/heroku_ls0g949q", function (err, mdb) {
    db = mdb.db("heroku_ls0g949q");
    if (err) {
        console.log('Unable to connect to MongoDB', err);
    } else {
        console.log('Connection established to MongoDB');
        collection = db.collection('leaderboard');
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
        http.listen(process.env.PORT || 3000, function () { // port = process.env.PORT
            console.log('listening on port: ' + process.env.PORT || 3000);
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
                    if (result1[k].name == data.name) {
                        includes = 1;
                    }
                }
            } else {
                console.log('No doc in blacklist collection');
            }
        });

        if (includes) {
            socket.emit('ranks', [{'name': 'YOUR', 'score': -1, 'rank': 0},
                {'name': 'ACCOUNT', 'score': -1, 'rank': 1},
                {'name': 'HAS', 'score': -1, 'rank': 2},
                {'name': 'BEEN', 'score': -1, 'rank': 3},
                {'name': 'SUSPENDED', 'score': -1, 'rank': 4}]
            );
        } else {
            collection.find({"name": data.name}).toArray(function (err, result) {
                if (err) {
                    console.log('Error finding in collection', err);
                } else if (result.length) {
                    if (result[0].score < data.score) {
                        collection.update({name: data.name}, {name: data.name, score: data.score, id: 0});
                    }
                    collection.find({}, {limit: 5, sort: [["score", "descending"]]}).toArray(function (err, result) {
                        if (err) {
                            console.log('Error finding in collection', err);
                        } else if (result.length) {
                            socket.emit('ranks', result);
                        } else {
                            console.log('No doc in collection');
                        }
                    });
                }
                else {
                    console.log('No doc in collection');
                }
            });
        }

    });

    socket.on('get ranks', function () {
        collection.find({}, {limit: 5, sort: [["score", "descending"]]}).toArray(function (err, result) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result.length) {
                socket.emit('ranks', result);
            } else {
                console.log('No doc in collection');
            }
        });
    });

    socket.on('reset ranks', function () {
        console.log('Ranks reset...');
        collection.remove({});
        collection.insert({name: "Derp", score: -1, uid: "0001"});
        collection.insert({name: "Herp", score: -2, uid: "0010"});
        collection.insert({name: "Gerp", score: -3, uid: "0011"});
        collection.insert({name: "Zerp", score: -4, uid: "0100"});
        collection.insert({name: "Berp", score: -5, uid: "0101"});
    });

    socket.on('suspend', function (data) {
        blacklistCol.insert({'name': data.name});
        console.log(data.name + " Has Been Suspended...");
    });

    socket.on('check user', function (data) {
        var includes = 0;
        collection.find({}).toArray(function (err, result) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result.length) {
                for (var i = 0; i < result.length; i++) {
                    if (result[i].name == data) {
                        includes = 1;
                    }
                }

                blacklistCol.find({}).toArray(function (err, result) {
                    if (err) {
                        console.log('Error finding in collection', err);
                    } else if (result.length) {
                        for (var i = 0; i < result.length; i++) {
                            if (result[i].name == data) {
                                includes = 1;
                            }
                        }

                        if (!includes) {
                            collection.insert({name: data, score: 0, id: "0"});
                        }
                        socket.emit('user return', !includes);
                    } else {
                        console.log('No doc in collection');
                    }
                });
            } else {
                console.log('No doc in collection');
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
                    if (result1[k].name == data) {
                        includes = 1;
                    }
                }

                socket.emit('blacklist', !includes);
            } else {
                console.log('No doc in blacklist collection');
            }
        });
    });

    collection.find({}, {limit: 5, sort: [["score", "descending"]]}).toArray(function (err, result) {
        if (err) {
            console.log('Error finding in collection', err);
        } else if (result.length) {
            socket.emit('ranks', result);
        } else {
            console.log('No doc in collection');
        }
    });
});