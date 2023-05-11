const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

const app = express();

app.use(express.static("public"));

app.use(express.json());

const gameSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 3600000 } //1 hour
});
app.use(gameSession);

// check if contains word characters and number only
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}


app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync("./data/users.json"));

    if (!username || !password) {
        res.json({status: "error", error:'All fields are required.'})
        return;
    }

    if (!containWordCharsOnly(username)) {
        res.json({status: "error", error:"Username should contain only underscores, letters, or numbers."})
        return;
    }

    if (username in users) {
        res.json({status: "error", error:"Username is already in use."})
        return;
    }

    const hash = bcrypt.hashSync(password, 10);
    users[username] = {
        password: hash
    }

    fs.writeFileSync('./data/users.json', JSON.stringify(users, null, " "));

    res.json({status: "success"})

});


app.post("/signin", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('data/users.json'));

    if (!(username in users)) {
        res.json({status: "error", error: "Username not exist."})
        return;
    }

    else {
        const hashedpassword = users[username].password;
        if (!bcrypt.compareSync(password, hashedpassword)) {
            res.json({status: "error", error: "Password not match."})
            return;
        }
    }

    if (username in onlineUsers) {
        res.json({status: "error", error: "Already logged in."})
        return;
    }

    req.session.user = {username};
    res.json({status: "success", user: {username}});
 
});


app.get("/validate", (req, res) => {
    if(!req.session.user) {
        res.json({status:"error", error:"Not logged in."})
        return;
    }

    if (req.session.user.username in onlineUsers) {
        req.session.user = null;
        res.json({status: "error", error: "Logged in on another browser."})
        return;
    }
    res.json({status:'success', user: req.session.user});
    return;
});


app.get("/signout", (req, res) => {
    req.session.user = null;

    res.json({status: 'success'});
});

const {createServer} = require("http");
const {Server} = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

io.use((socket, next) => {
    gameSession(socket.request, {}, next);
});

// Initiate online user list
const onlineUsers = {};

// Initiate available room list
const availableRooms = {};

// Initaite gaming room list
const gamingRooms = {};

// Max Player per room
const maxPlayerPerRoom = 2;
const minPlayerToStartGame = 2;  // 2 for production, 1 for developmeent


io.on("connection", (socket) => {
    if (socket.request.session.user) {
        const username = socket.request.session.user.username;
        onlineUsers[username] = {username};
    }

    socket.on("disconnect", () => {
        if (socket.request.session.user) {
            const {username} = socket.request.session.user;
            delete onlineUsers[username];
            io.emit("remove user", username);

            for (const roomName in availableRooms) {
                Room.leaveRoom(roomName, username);
                io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
                io.in(roomName).emit('gamestart status update', Room.checkReadyToStart(roomName));

                if (Room.isEmpty(roomName)) {
                    if (Room.isGaming(roomName)) {
                        gamingRooms[roomName].setTimeRemaining(0);
                    }
                    Room.deleteRoom(roomName);
                    io.emit("rooms", JSON.stringify(availableRooms));
                }
            }
        };
    });
    
    socket.on("get users", () => {
        socket.emit("users", JSON.stringify(onlineUsers));
        if (socket.request.session.user) {
            const username = socket.request.session.user.username;
            io.emit("add user", username);
        }
    });

    socket.on("get rooms", () => {
        socket.emit("rooms", JSON.stringify(availableRooms));
    });

    socket.on("create room", (roomName) => {
        if (roomName in availableRooms) {
            socket.emit("create room error", "Room Name already exist!");
        }

        else {
            if (socket.request.session.user) {
                const username = socket.request.session.user.username;
                Room.createRoom(roomName, username);
                io.emit("rooms", JSON.stringify(availableRooms));
                
                socket.emit("join room success", roomName);
                socket.join(roomName);
                io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
                io.in(roomName).emit('gamestart status update', Room.checkReadyToStart(roomName));
            }
        }
    });

    socket.on("join room", (roomName) => {
        if (socket.request.session.user) {
            const username = socket.request.session.user.username;
            
            if (Room.isFull(roomName)) {
                socket.emit("join room error", roomName + " is full.");
            }

            else if (!Room.isAvailable(roomName)) {
                socket.emit("join room error", roomName + " is not available.")
            }

            else if (Room.isGaming(roomName)) {
                socket.emit("join room error", roomName + " game has started.")
            }

            else {
                Room.joinRoom(roomName, username);
                socket.emit("join room success", roomName);
                socket.join(roomName);
                io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
                io.in(roomName).emit('gamestart status update', Room.checkReadyToStart(roomName));
            }
        }
    });

    socket.on("leave room", (roomName) => {
        // User cannot leave room if it is in a ready state
        // 
        if (socket.request.session.user) { // if user is logged in
            const username = socket.request.session.user.username;
            
            // Check if the user is in a ready state
            if (Room.checkUserReadyState(username, roomName)){
                // if user is in a ready state, do nothing
                return;
            }

            // Otherwise, we let the user leave the room
            Room.leaveRoom(roomName, username);
            io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));        
            io.in(roomName).emit('gamestart status update', Room.checkReadyToStart(roomName));
            if (Room.isEmpty(roomName)) {
                Room.deleteRoom(roomName);
                io.emit("rooms", JSON.stringify(availableRooms));
            };

            socket.emit("leave room success");
            socket.leave(roomName);
        }
    });

    socket.on("ready on click", (roomName) => {
        if (socket.request.session.user) {
            const username = socket.request.session.user.username;
            if (Room.isUserInRoom(username, roomName)) {
                if (availableRooms[roomName][username].ready) {
                    availableRooms[roomName][username].ready = false;
                    io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
                }
                else {
                    availableRooms[roomName][username].ready = true;
                    io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
                }
            }
        }

        // console.log('[Debug] Checking checking whether room is ready to start...\n'+'\tresult:'+
        //         Room.checkReadyToStart(roomName));

        io.in(roomName).emit('gamestart status update', Room.checkReadyToStart(roomName));
    });

    socket.on("get game data", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms]
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].getGameData(username, socket);           
            }

        }
    })

    socket.on("game start", (roomName) => {
        // console.log("[DEBUG] Checking what's inside socket.rooms:")
        // console.log([...socket.rooms])
        if (socket.request.session.user) {
            io.in(roomName).emit('game start');
            if (gamingRooms[roomName]) {
                delete gamingRooms[roomName];
            }
            gamingRooms[roomName] = Game(roomName);
        }
    })

    socket.on("player move", (direction) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms]
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            const data = {roomName, username, direction}

            io.in(roomName).emit("player move", JSON.stringify(data));
        }
    })

    socket.on("game over", (roomName) => {
        // Once the game is over we should display the statistic table with players' rank
        // and their scores
        io.emit("show stat table", statistics);
    })

    socket.on("player stop", (direction) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms]
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            const data = {roomName, username, direction}

            io.in(roomName).emit("player stop", JSON.stringify(data));
        }
    })

    socket.on("do frame", (time) => {
        if(socket.request.session.user) {
            const rooms = [...socket.rooms]
            const roomName = rooms[1];
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].doFrame(time, socket);
            }
        }
    })

    socket.on("bullet shoot", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].bulletShoot(username, socket);
            }
        }
    })

    socket.on("bullet hit", (bulletOwner) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (bulletOwner == username) {
                if (gamingRooms[roomName]) {
                    gamingRooms[roomName].bulletHit(username);
                }          
            }
        }
    })

    socket.on("coin collected", (coinOwner) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (coinOwner == username) {
                if (gamingRooms[roomName]) {
                    gamingRooms[roomName].coinCollected(username);
                }          
            }
        }
    })

    socket.on("spawn coin", (location) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            if (gamingRooms[roomName]) {
                socket.broadcast.to(roomName).emit("spawn coin", location);
            }
        }          
    })

    socket.on("activate star", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            if (gamingRooms[roomName]) {
                const username = socket.request.session.user.username;
                gamingRooms[roomName].activateStar(username);
            }
        }
    })

    socket.on("spawn banana", (location) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1]; // get the current room
            if (gamingRooms[roomName]) {
                socket.broadcast.to(roomName).emit("spawn banana", location);
            }
        }          
    })
    
    socket.on("spawn ice", (location) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1]; // get the current room
            if (gamingRooms[roomName]) {
                socket.broadcast.to(roomName).emit("spawn ice", location);
            }
        }          
    })

    socket.on("banana touched", (bananaToucher) => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            if (gamingRooms[roomName]) {
                socket.emit("freeze player", bananaToucher);
            }
        }
    })

    socket.on("ice touched", (iceToucher) => {
        if (socket.request.session.user) {
            if (iceToucher == socket.request.session.user.username) {
                const rooms = [...socket.rooms];
                const roomName = rooms[1];
                const playerArr = Object.keys(gamingRooms[roomName].getPlayersData());

                // Randomly picking the player to freeze
                let playerToFreeze = null;
                playerArr.splice(playerArr.indexOf(iceToucher), 1);
                if (playerArr.length == 0 ) return;
    
                playerToFreeze = playerArr[Math.floor(Math.random() * playerArr.length)]
                // console.log('[DEBUG] Ice touched, player to freeze: ' + playerToFreeze);
    
                if (gamingRooms[roomName]) {
                    gamingRooms[roomName].freezePlayer(playerToFreeze, socket);
                }
            }
        }
    })

    socket.on("get current player", () => {
        if (socket.request.session.user) {
            const username = socket.request.session.user.username;
            
            socket.emit("get current player", username);
        }
    })

    socket.on("cheatkey activated", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].cheatActivated(username);
                io.in(roomName).emit("cheatkey activated", username);
            }
        }
    })

    socket.on("big bullet key on", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].bigBulletOn(username);
            }
        }        
    })

    socket.on("big bullet key off", () => {
        if (socket.request.session.user) {
            const rooms = [...socket.rooms];
            const roomName = rooms[1];
            const username = socket.request.session.user.username;
            if (gamingRooms[roomName]) {
                gamingRooms[roomName].bigBulletOff(username);
            }
        }        
    })

});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game server has started...");
});


// function for room management
const Room = (function () {
    const createRoom = function(roomName, username) {
        if (!(roomName in availableRooms)) {
            availableRooms[roomName] = {};
            availableRooms[roomName][username] = {username, ready: false};
        }
    };

    const joinRoom = function(roomName, username) {
        if (roomName in availableRooms) {
            if (! (username in availableRooms[roomName])) {
                availableRooms[roomName][username] = {username, ready: false};
            }
        }
    };

    const leaveRoom = function(roomName, username) {
        if (username in availableRooms[roomName]) {
            delete availableRooms[roomName][username];
        };
    };

    const deleteRoom = function(roomName) {
        if (roomName in availableRooms) {
            delete availableRooms[roomName];
        }

        if (roomName in gamingRooms) {
            delete gamingRooms[roomName];
        }
    };

    const isEmpty = function(roomName) {
        return (Object.keys(availableRooms[roomName]).length == 0);
    }

    const isFull = function(roomName) {
        // console.log('[DEBUG] Checking numebr of players in the room...');
        // console.log('Max palyer: ' + maxPlayerPerRoom);
        return (Object.keys(availableRooms[roomName]).length >= maxPlayerPerRoom);
    }

    const isUserInRoom = function(username, roomName) {
        return (username in availableRooms[roomName]);
    }

    const isAvailable = function(roomName) {
        // This function checks whether the roomName is in the available room list
        // console.log('[Debug] '+ availableRooms)
        // console.log('[Debug] '+ (roomName in availableRooms))
        return (roomName in availableRooms);
    }

    const checkUserReadyState = function(username, roomName) {
        if (roomName in availableRooms) {
            const user_ready_state = availableRooms[roomName][username].ready;
            return user_ready_state;
        }
        else return false;
    }

    const checkReadyToStart = function(roomName){
        // Check if all the players in the room are in the status of ready
        // Unlock the start game button if all are ready
        let ready_flag = true;
        if (roomName in availableRooms) {
            const currentRoomObj = availableRooms[roomName];
            // console.log('[DEBUG] availableRooms: ' + availableRooms)
            // console.log('[DEBUG] currentRoomObj: ' + currentRoomObj)
            const num_player_in_room = Object.keys(currentRoomObj).length;
    
            // if there is at least one player in the room, we check ready state,
            // otherwise
            if (num_player_in_room > 0){
                const player_list = Object.keys(availableRooms[roomName]);
            
                // console.log('[Debug] Player names in the room: ' + player_list)
                // console.log('[Debug] currentRoomObj: ' + currentRoomObj)
        
                // Check enough player to start
                if (player_list.length < minPlayerToStartGame)
                    ready_flag = false;
        
                // Check player ready states
                for (let i = 0; i < player_list.length; i++) {
                    const player_name = player_list[i];
                    // console.log('[Debug] player in the loop: ' + player_name)
                    if (!currentRoomObj[player_name].ready){
                        ready_flag = false;
                        break;
                    }
                }
                return ready_flag;
            }
        }

        else {
            return false;
        }
    }

    const isGaming = function(roomName) {
        return (roomName in gamingRooms);
    }

    return {createRoom, joinRoom, leaveRoom, deleteRoom, isEmpty, isFull, isUserInRoom, isAvailable,
            checkReadyToStart, isGaming, checkUserReadyState};
})();


const Game = function (roomName) {
    const totalGameTime = 180; // in seconds

    let timeRemaining = totalGameTime; // in seconds

    const bulletPrice = 1;
    const starPrice = 10; // should change to 10 at the end
    const bigBulletPrice = 3;

    const enlargedBullet = {};

    playersData = {};
    initial_x = 400;
    for (const username in availableRooms[roomName]) {
        playersData[username] = {
            x: initial_x,
            y: 400,
            coins: 0,
            coinsCollected: 0,
            score: 0,
            bulletUsed: 0,
            starActivated: 0,
        };
        initial_x += 400;

        enlargedBullet[username] = false;
    }

    io.in(roomName).emit("initiate players", JSON.stringify(playersData));
    io.in(roomName).emit("initiate timer", totalGameTime);

    function updateGameTime() {
        timeRemaining = timeRemaining - 1;

        if (timeRemaining > 0) {
            setTimeout(updateGameTime, 1000);
        }

        else {  // time's up

            // broadcast the game over command message
            io.in(roomName).emit("game over", JSON.stringify(getPlayersData()));

            io.in(roomName).emit("update timer", timeRemaining);

            // reset the player ready state to false
            for (const username in availableRooms[roomName]) {
                availableRooms[roomName][username].ready = false;
            }
            io.in(roomName).emit("room user update", JSON.stringify(availableRooms[roomName]));
            io.in(roomName).emit("gamestart status update", Room.checkReadyToStart(roomName));
            delete gamingRooms[roomName];
        }
    }

    setTimeout(updateGameTime, 1000);

    const doFrame = function(now, socket) {

        io.in(roomName).emit("update timer", timeRemaining);

        // update sprites
        io.in(roomName).emit("update sprites", now);

        // update game data
        const username = socket.request.session.user.username;
        getGameData(username, socket);

        // Game over situation
        if (timeRemaining == 0) {
            return;
        };
    }

    const getPlayersData = function () {
        return playersData;
    }

    const getGameData = function(username, socket) {
        data = playersData[username];

        socket.emit("get game data", JSON.stringify(data));     
    }
    
    const bulletShoot = function (username, socket) {
        if (enlargedBullet[username]) {
            if (playersData[username].coins >= bigBulletPrice) {
                playersData[username].bulletUsed++;
                playersData[username].coins = playersData[username].coins - bigBulletPrice;
                io.in(roomName).emit("big bullet shoot", username);
                socket.emit("update game data", JSON.stringify(playersData[username]));
            }
        }

        else if (playersData[username].coins >= bulletPrice) {
            playersData[username].bulletUsed++;
            playersData[username].coins = playersData[username].coins - bulletPrice;
            io.in(roomName).emit("bullet shoot", username);
            socket.emit("update game data", JSON.stringify(playersData[username]));
        }
    }

    const bulletHit = function (username) {
        playersData[username].score++;
    }

    const coinCollected = function (username) {
        playersData[username].coins++;
        playersData[username].coinsCollected++;
    }

    const activateStar = function (username) {
        if (playersData[username].coins >= starPrice) {
            playersData[username].coins = playersData[username].coins - starPrice;
            playersData[username].starActivated++;
            io.in(roomName).emit("activate star", username);
        }
    }

    const freezePlayer = function (username) {
        io.in(roomName).emit("freeze player", username);
    }

    const bigBulletOn = function(username) {
        if (username in enlargedBullet) {enlargedBullet[username] = true;}
    }

    const bigBulletOff = function(username) {
        if (username in enlargedBullet) {enlargedBullet[username] = false;}
    }

    const cheatActivated = function(username) {
        playersData[username].coins = 9999;
    }

    const setTimeRemaining = function(time) {
        timeRemaining = time;
    }

    return {
        doFrame, 
        getPlayersData,
        getGameData,
        bulletShoot,
        bulletHit,
        coinCollected,
        activateStar,
        freezePlayer,
        bigBulletOn,
        bigBulletOff,
        cheatActivated,
        setTimeRemaining,
    };

};