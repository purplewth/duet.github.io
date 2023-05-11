const Socket = (function() {
    // This stores the current Socket.IO socket
    let socket = null;
    let currentPlayer = null;

    const getSocket = function() {
        return socket;
    };

    const connect = function() {
        socket = io();

        socket.on("connect", () => {
            getCurrentPlayer();

            socket.emit("get users");

            socket.emit("get rooms");

        });

        socket.on("users", (onlineUsers) => {
            onlineUsers = JSON.parse(onlineUsers);

            OnlineUsersPanel.update(onlineUsers);
        });

        socket.on("add user", (username) => {

            OnlineUsersPanel.addUser(username);
        });

        socket.on("remove user", (username) => {

            OnlineUsersPanel.removeUser(username);
        });

        socket.on("rooms", (availableRooms) => {
            availableRooms = JSON.parse(availableRooms);

            GameLobby.update(availableRooms);
        });
        
        socket.on("create room error", (errorMessage) => {
            GameLobby.createRoomError(errorMessage);
        });

        socket.on("join room success", (roomName) => {
            GameLobby.hide();
            GameRoom.setRoomName(roomName);
            GameRoom.show();
            
        });

        socket.on("join room error", (errorMessage) => {
            GameLobby.joinRoomError(errorMessage);
        });

        socket.on("leave room success", () => {
            GameRoom.hide();
            GameLobby.show();
        });

        socket.on("user join room", (username) => {
            GameRoom.addUser(username);
        });

        socket.on("user leave room", (username) => {
            GameRoom.removeUser(username);
        });

        socket.on("room user update", (room) => {
            room = JSON.parse(room);
            GameRoom.update(room);
        });

        socket.on('gamestart status update', (ready_to_go) => {

            if (ready_to_go){
                // Enable the start game button
                $('#start-game-button').removeClass('disabled');

                $("#start-game-button").unbind();
                $("#start-game-button").on("click", (e) => {
                    e.preventDefault();

                    const roomName = $("#room-name").text().trim();
                    Socket.gameStart(roomName);
                });
            }
            else {
                $('#start-game-button').addClass('disabled');
                $("#start-game-button").unbind();
            }
        })

        socket.on('game start', () => {
            // Start the game now, we hide all other panels and only leave the game stage
            GameRoom.hide();
            OnlineUsersPanel.hide();
            UserPanel.hide();

            GameUI.initialize();
        })

        socket.on("initiate players", (players) => {
            players = JSON.parse(players);
            GameUI.initiatePlayers(players);
        })

        socket.on("initiate timer", (totalGameTime) => {
            GameUI.initiateTimer(totalGameTime);
        })
        
        socket.on("get game data", (data) => {
            data = JSON.parse(data);
            GameUI.updateGameData(data);
        })

        socket.on("player move", (data) => {
            data = JSON.parse(data);
            GameUI.playerMove(data);
        })

        socket.on("player stop", (data) => {
            data = JSON.parse(data);
            GameUI.playerStop(data);
        })

        socket.on("update timer", (timeRemaining) => {
            GameUI.updateTimer(timeRemaining);
        })

        socket.on("update sprites", (timestamp) => {
            GameUI.clearAllObjects();
            GameUI.updateBanana(timestamp);
            GameUI.updateIce(timestamp);
            // then draw coins
            GameUI.updateCoins(timestamp);

            // then draw bullet
            GameUI.updateBullets(timestamp);

            // draw player at last
            GameUI.updatePlayers(timestamp);
            GameUI.updateStars(timestamp);
        })

        socket.on("update game data", (data) => {
            GameUI.updateGameData(data);
        })
        
        socket.on("game over", (data) => {
            // data are the game stats from getPlayersData() in game_server.js
            data = JSON.parse(data);
            GameUI.showStat(data);
            
            // Function to go back to waiting room
            function backToWaitingRoom() {
                $("#game-area").hide();
                GameUI.hideStat();
                GameUI.clearAllObjects();

                GameRoom.show();
                OnlineUsersPanel.show();
                UserPanel.show();
            }

            // TODO: back to Waiting Room enable by button
            $(document).on("keyup", function(event) {
                // console.log('[DEBUG] keycode: ' + event.keyCode + ' pressed.')
                if (event.keyCode == 13){
                    // console.log('[DEBUG] ENTER being pressed...')
                    backToWaitingRoom();
                }
            })
        })

        socket.on("bullet shoot", (username) => {
            GameUI.initiateBullet(username);
        })

        socket.on("big bullet shoot", (username) => {
            GameUI.initiateBullet(username, true);
        })

        socket.on("spawn coin", (location)=> {
            location = JSON.parse(location);
            GameUI.spawnCoin(location);
        })

        socket.on("activate star", (username) => {
            GameUI.activateStar(username);
        })
        
        socket.on('spawn banana', (location) => {
            location = JSON.parse(location);
            GameUI.spawnBanana(location);
        })        
        
        socket.on('spawn ice', (location) => {
            location = JSON.parse(location);
            GameUI.spawnIce(location);
        })

        socket.on("freeze player", (username) => {
            // console.log('[DEBUG] freeze player: ' + username + '****');
            if (username == currentPlayer){
                // console.log('[INFO] You are frozen!!')
            }
            GameUI.freezePlayerAction(username);    
        })

        socket.on("get current player", (username) => {
            // console.log('[DEBUG] get current player ' + username);
            currentPlayer = username;
            // console.log('[DEBUG] get current player ' + currentPlayer);
        })
        
        socket.on('cheatkey activated', (username)=>{
            if (username == currentPlayer){
                // console.log('[INFO] You are cheating!!')
            }
            GameUI.cheatSwitch(username);    
        })
    };

    // This function disconnects the socket from the server
    const disconnect = function() {
        socket.disconnect();
        socket = null;
    };

    const createRoom = function(roomName) {
        socket.emit("create room", roomName);
    }

    const joinRoom = function(roomName) {
        socket.emit("join room", roomName);
    }

    const leaveRoom = function(roomName) {
        socket.emit("leave room", roomName);
    }

    const readyOnClick = function(roomName) {
        socket.emit("ready on click", roomName);
    }

    const gameStart = function(roomName) {
        socket.emit("game start", roomName);
    }

    const playerMove = function(direction) {
        socket.emit("player move", direction);
    }

    const playerStop = function(direction) {
        socket.emit("player stop", direction);
    }

    const doFrame = function(time) {
        socket.emit("do frame", time);
    }

    const bulletShoot = function() {
        socket.emit("bullet shoot");
    }
    
    const getGameData = function () {
        socket.emit("get game data");
    }

    const bulletHit = function(username) {
        socket.emit("bullet hit", username);
    }

    const coinCollected = function(username) {
        socket.emit("coin collected", username);
    }

    const bananaTouched = function(username) {
        socket.emit("banana touched", username);
    }

    const cheatKeyActivated = function() {
        socket.emit("cheatkey activated");
    }

    const bigBulletKeyOn = function() {
        socket.emit("big bullet key on");
    }

    const bigBulletKeyOff = function() {
        socket.emit("big bullet key off");
    }

    const iceTouched = function(username) {
        socket.emit("ice touched", username);
    }

    const spawnCoin = function(location) {
        socket.emit("spawn coin", JSON.stringify(location));
    }

    const activateStar = function() {
        socket.emit("activate star");
    }
    
    const spawnBanana = function(location) {
        socket.emit("spawn banana", JSON.stringify(location));
    }

    const spawnIce = function(location) {
        socket.emit("spawn ice", JSON.stringify(location));
    }

    const getCurrentPlayer = function() {
        // console.log('[DEBUG] get current player...');
        socket.emit("get current player");
    }

    const getSocketPlayerName = function() {
        return currentPlayer;
    }

    return { 
        getSocket, 
        connect, 
        disconnect,
        createRoom,
        joinRoom, 
        leaveRoom, 
        readyOnClick, 
        gameStart, 
        playerMove, 
        playerStop, 
        doFrame,
        bulletShoot,
        getGameData,
        bulletHit,
        coinCollected,
        spawnCoin,
        activateStar,
        bananaTouched,
        iceTouched,
        spawnCoin,
        spawnBanana,
        spawnIce,
        getCurrentPlayer,
        getSocketPlayerName,
        cheatKeyActivated,
        bigBulletKeyOn,
        bigBulletKeyOff,
    };
})();
