var express = require('express');
var app = require('express')();
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var messageHistory = [];
var userCount = 10000;
var usernameData = {};
var usercolorData = {};
var onlineids = {};


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname, "static")));

io.on('connection', (socket) => {
    console.log('>> User connected');

    // Retrieve User Id from cookies
    let cookies = socket.handshake.headers['cookie'];
    let userid = "none";
    if (typeof cookies !== "undefined" && cookies.includes('userid=')){
        userid = cookies.split('; ').find(row => row.startsWith('userid')).split('=')[1];
    }

    let userobj = {};
    if (userid !== "none" && userid in usernameData){                      // Get existing user
        console.log("Found existing user with id: " + userid);
        userobj = {
            id: userid,
            username: usernameData[userid],
            usercolor: usercolorData[userid]
        };
    }
    else{                                                               // Generate new user
        console.log("Creating user with id: " + socket.id);
        let id = socket.id;
        usernameData[id] = userCount;
        usercolorData[id] = getRandomColor();
        userobj = {
            id: id,
            username: usernameData[id],
            usercolor: usercolorData[id]
        };
        userCount++;
    }

    onlineids[userobj.id] = socket.id;

    socket.emit("username", userobj);           // Send the client their new or stored username and id 

    socket.emit("history", messageHistory);     // Send the client current chat history

    io.emit("globalUserNames", usernameData);
    io.emit("globalUserColors", usercolorData);
    io.emit("currentUsers", onlineids);

    socket.on('disconnect', () => {
        console.log(onlineids);
        let idInd = Object.values(onlineids).indexOf(socket.id);
        console.log(idInd);
        if (idInd != -1){
            delete onlineids[Object.keys(onlineids)[idInd]];
            io.emit("currentUsers", onlineids);
        }
        console.log('>> User disconnected');
    });

    socket.on('chat message', (data) => {       // Recieve message and forward to other users
        let date = new Date();

        let payload = {
            msg: data.message,
            time: date.toTimeString().substring(0,5),
            user: data.userid
        }
        io.emit('chat message', payload);
        messageHistory.push(payload);
    });

    socket.on('changeName', (data) =>{
        if (Object.values(usernameData).indexOf(data.name) == -1) {    // checking if name already exists
            usernameData[data.userid] = data.name;
            let userobj = {
                id: data.userid,
                username: usernameData[data.userid],
                usercolor: usercolorData[data.userid]
            };
            socket.emit("username", userobj);
            io.emit("globalUserNames", usernameData);
        }
    });

    socket.on('changeColor', (data) =>{
        usercolorData[data.userid] = data.color;
        let userobj = {
            id: data.userid,
            username: usernameData[data.userid],
            usercolor: usercolorData[data.userid]
        };
        socket.emit("username", userobj);
        io.emit("globalUserColors", usercolorData);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  