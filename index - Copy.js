var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io').listen(http);
var fs = require('fs');
var mongodb = require('mongodb');

mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://glowies:1q4ogHrhg8I7@ds061206.mlab.com:61206/heroku_ls0g949q", function(err, db) {
    mdb = db;
    if (err) {
        console.log('Unable to connect to MongoDB', err);
    } else {
        console.log('Connection established to MongoDB');
        collection = db.collection('leaderboard');
        blacklistCol = db.collection('blacklist');
        collection.find({},{limit:5,sort:[["rank","asc"]]}).toArray(function(err,result){
            if(err){
                console.log('Error finding in collection', err);
            }else if(result.length){
                console.log(result);
            }else{
                console.log('No doc in collection');
            }
        });
        http.listen(process.env.PORT || 3000, function(){ // port = process.env.PORT
            console.log('listening on port: '+ process.env.PORT || 3000);
        });
        poke();
    }
});

io.on('connection', function(socket){
    console.log(' ID: ' + socket.id + ' connected from: ' + socket.request.connection.remoteAddress);

    socket.on('check highscore',function(data){
        collection.find({},{limit:5,sort:[["rank","asc"]]}).toArray(function(err,result){
            if(err){
                console.log('Error finding in collection', err);
            }else if(result.length){
                rank = result;
                for(var i=0;i<5;i++){
                    if(rank[i].score<data.score){
                        for(var j=4;j>i;j--){
                            collection.update({rank:j},{rank:j,name:rank[j-1].name,score:rank[j-1].score});
                            rank[j] = rank[j-1];
                        }
                        collection.update({rank:i},{rank:i,name:data.name,score:data.score});
                        rank[i] = {
                            "name":data.name,
                            "score":data.score
                        };
                        console.log('Rank '+(i+1)+' updated...\n'+data.name+' : '+data.score);

                        break;
                    }else if(rank[i].name == data.name){
                        break;
                    }
                }
                socket.emit('ranks',rank);
            }else{
                console.log('No doc in collection');
            }
        });
    });
    
    socket.on('get ranks',function(){
        collection.find({},{limit:5,sort:[["rank","asc"]]}).toArray(function(err,result){
            if(err){
                console.log('Error finding in collection', err);
            }else if(result.length){
                socket.emit('ranks',result);
            }else{
                console.log('No doc in collection');
            }
        });
    });

    socket.on('reset ranks',function(){
        console.log('Ranks reset...');
        collection.remove({});
        for(var i=0;i<5;i++){
            collection.insert({name:"Derp",score:0,rank:i});
        }
    });

    socket.on('remove rank',function(){
        collection.find({},{limit:5,sort:[["rank","asc"]]}).toArray(function(err,result) {
            if (err) {
                console.log('Error finding in collection', err);
            } else if (result.length) {
                rank = result;
                newRank = rank.slice(1, 5);
                newRank.push({'rank': -1, 'name': 'Derp', 'score': 0});
                collection.remove({});
                for (var i = 0; i < newRank.length; i++) {
                    newRank[i].rank++;
                    collection.insert(newRank[i]);
                }
                socket.emit('ranks', newRank);
            } else {
                console.log('No doc in collection');
            }
        });
    });

    collection.find({},{limit:5,sort:[["rank","asc"]]}).toArray(function(err,result){
        if(err){
            console.log('Error finding in collection', err);
        }else if(result.length){
            socket.emit('ranks',result);
        }else{
            console.log('No doc in collection');
        }
    });
});

function poke(){
    console.log('Poke!');
    setTimeout(poke,59000);
}