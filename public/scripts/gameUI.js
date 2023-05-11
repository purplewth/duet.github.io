// Game UI module
const GameUI = (function() {
    // Initialze the game area canvas context        /* Get the canvas and 2D context */
    const cv = $("canvas").get(0);
    const context = cv.getContext("2d");

    // sounds
    const sounds = {
        background: new Audio("./src/audio/pirate.mp3"),
        coin: new Audio("./src/audio/coin.mp3"),
        star: new Audio("./src/audio/star.mp3"),
        pain: new Audio("./src/audio/pain.mp3"),
        freeze: new Audio("./src/audio/freeze.mp3"),
        gameover: new Audio("./src/audio/game-over.mp3"),
        shoot: new Audio("./src/audio/shoot.mp3")
    };

    sounds.background.loop = true;
    sounds.star.loop = true;

    sounds.background.volume = .1;
    sounds.shoot.volume = .5;
    sounds.star.volume = .5;
    sounds.gameover.volume = .5;
    
    // parameters
    let coinSpawnTime = 2000; // in milliseconds
    const maxStarAge = 10000; // in milliseconds
    let bananaSpawnTime = 8000; // in milliseconds, will update the value later
    let iceSpawnTime = 8000; // in milliseconds 
    const freezeTime = 3000;
    const cheatSpeed = 500;


    // initialize game area, players and items
    const gameArea = BoundingBox(context,330,30,570,1250);
    let UIplayers = {};
    let bullets = [];
    let coins = [];
    let stars = {};
    let bananas = [];
    let ices = [];

    const initialize = function() {
        UIplayers = {};
        bullets = [];
        coins = [];
        stars = {};
        bananas = [];
        ices = [];
        $("#game-area").css("display", "inline");

        sounds.background.currentTime = 0;
        sounds.background.volume = .1;
        sounds.background.play();

        $(document).unbind();
        // events on keydown
        $(document).on('keydown', function(event) {
            switch (event.keyCode){
                case 37: Socket.playerMove(1); break;
                case 38: Socket.playerMove(2); break;
                case 39: Socket.playerMove(3); break;
                case 40: Socket.playerMove(4); break;
                case 83: Socket.activateStar(); break;
                case 70: Socket.bigBulletKeyOn(); break;
            }
        });

        // events on keyup
        $(document).on("keyup", function(event) {
            switch (event.keyCode){
                case 37: Socket.playerStop(1); break;
                case 38: Socket.playerStop(2); break;
                case 39: Socket.playerStop(3); break;
                case 40: Socket.playerStop(4); break;
                case 32: Socket.bulletShoot(); break;
                case 20: Socket.cheatKeyActivated(); break;
                case 70: Socket.bigBulletKeyOff(); break;
            }
        });


        function doFrame(now) {
            Socket.doFrame(now);

            if (parseInt($("#time-remaining").text()) <= 0 || $("#time-remaining").text() == "") {
                return;
            }

            // handle bullet hit opponents
            let bulletIdx = 0;
            while (bulletIdx < bullets.length) {
                const bulletObj = bullets[bulletIdx];
                const bulletBoundingBox = bulletObj.getBoundingBox();
                const bulletColorIdx = bulletObj.getColorIdx();
                let bulletOwner;

                for (const username in UIplayers) {
                    const playerColorIdx = UIplayers[username].getColorIdx();
                    if (playerColorIdx == bulletColorIdx) {
                        bulletOwner = username;
                    }
                }

                if (!bulletOwner) {
                    continue;
                }

                for (const username in UIplayers) {
                    const playerColorIdx = UIplayers[username].getColorIdx();
                    const playerLocation = UIplayers[username].getXY();
                    if (playerColorIdx != bulletColorIdx) {

                        if (bulletBoundingBox.isPointInBox(playerLocation.x, playerLocation.y)) {
                            // delete the bullet
                            bullets.splice(bulletIdx,1);
                            bulletIdx--;

                            if (!isInvincible(username)) {
                                // players being hit flashes
                                UIplayers[username].flashGrey(200);

                                // players being hit player the "pain" sound
                                if (username == Socket.getSocketPlayerName()) {
                                    sounds.pain.currentTime = 0.7;
                                    sounds.pain.play();
                                }

                                // send signal to server
                                Socket.bulletHit(bulletOwner);
                            }
                            break;
                        }
                    }
                }
                bulletIdx++;
            }

            // handle coin spawn and collection
            function genRandomCoin() {
                // if there is no banana, spawn a randomized banana 
                GameUI.spawnCoin({x: 0, y: 0});
                coins[coins.length-1].randomize(gameArea);
                const location = coins[coins.length-1].getXY();
                Socket.spawnCoin(location);
                coinSpawnTime = Math.random() * 2000 + 1000;
            }

            if (coins.length == 0) {
                genRandomCoin();
                
            }
            
            else if (coins[coins.length-1].getAge(now) > coinSpawnTime) {
                genRandomCoin();
            }
            
            let coinIdx = 0;
            while (coinIdx < coins.length) {
                const coinObj = coins[coinIdx];
                const coinLocation = coinObj.getXY();
                for (const username in UIplayers) {
                    const playerBoundingBox = UIplayers[username].getBoundingBox();
                    
                    if (playerBoundingBox.isPointInLowerHalf(coinLocation.x, coinLocation.y)) {
                        // delete the coin if player touches the coin
                        coins.splice(coinIdx, 1);
                        Socket.coinCollected(username);
                        if (username == Socket.getSocketPlayerName()) {
                            sounds.coin.currentTime = 0;
                            sounds.coin.play();
                        }
                        coinIdx--;
                        break;
                    }
                }
                coinIdx++;
            }

            // delete star when time's up
            for (const username in stars) {
                if (stars[username].getAge(now) > maxStarAge) {
                    delete stars[username];
                    sounds.background.volume = .1;
                    sounds.star.pause();
                    sounds.star.currentTime = 0;
                }
            }
            
            // handle banana spawn and collection
            /* The whole process is:
                1. we push a new banana
                2. randomize it
                3. pass the location to the server
                4. server will broadcast the location to all clients
                5. clients draw the banana on the canvas
             */

            function genRandomBanana() {
                GameUI.spawnBanana({x: 0, y: 0});
                bananas[bananas.length-1].randomize(gameArea);
                const location = bananas[bananas.length-1].getXY();
                Socket.spawnBanana(location);
                bananaSpawnTime = Math.random() * 4000 + 6000;
            }

            if (bananas.length == 0){
                genRandomBanana();
                
            } else if (bananas[bananas.length-1].getAge(now) > bananaSpawnTime) {
                genRandomBanana();                
            }

            // handle player touching banana issue
            function checkPlayerTouchItems(itemArr){
                let itemIdx = 0;
                while (itemIdx < itemArr.length) {
                    // 1. get the banana loc
                    const itemObj = itemArr[itemIdx];
                    const itemLoc = itemObj.getXY();
                    // 2. check all players see any of them touch the banana
                    for (const username in UIplayers) {
                        const playerBoundingBox = UIplayers[username].getBoundingBox();
                        if (playerBoundingBox.isPointInLowerHalf(itemLoc.x, itemLoc.y)){
                            // Do different action for different item
                            if (itemObj.itemIdentifier == 'banana' && !isInvincible(username)){
                                // console.log('[DEBUG] Banana touched!')
                                Socket.bananaTouched(username);
                            }
                            if (itemObj.itemIdentifier == 'ice'){
                                // console.log('[DEBUG] Ice touched!')
                                Socket.iceTouched(username);
                            }
                            // remove the first item starting from itemIdx
                            itemArr.splice(itemIdx, 1);
                            itemIdx--;
                            break;
                        }
                    }
                    itemIdx++;
                }
            }

            function genRandomIce() {
                GameUI.spawnIce({x: 0, y: 0});
                ices[ices.length-1].randomize(gameArea);
                const location = ices[ices.length-1].getXY();
                Socket.spawnIce(location);
                iceSpawnTime = Math.random() * 4000 + 6000;
            }

            if (ices.length == 0) {
                genRandomIce();

            } else if (ices[ices.length-1].getAge(now) > iceSpawnTime) {
                GameUI.spawnIce({x: 0, y: 0});
                ices[ices.length-1].randomize(gameArea);
                const location = ices[ices.length-1].getXY();
                Socket.spawnIce(location);
            }

            // check bananas
            checkPlayerTouchItems(bananas);
            checkPlayerTouchItems(ices);

            requestAnimationFrame(doFrame);
        };

        Socket.getGameData();
        
        /* stat table related fucntions */
        // console.log('[DEBUG] Clearing the stat table...')
        resetStatTable();   // clear the stat table elements
        hideStat(); // hide the overlay
        
        // need some delay for doFrame, otherwise bug arises
        setTimeout(
            ()=> requestAnimationFrame(doFrame),
            10
        )
    };

    const initiatePlayers = function(players) {
        let char_idx = 0;
        const currentPlayer =  Socket.getSocketPlayerName();
        for (const username in players) {
            UIplayers[username] = Player(context, players[username].x, players[username].y, gameArea, char_idx);
            
            // set the player icon on the scoreboard
            if (username == currentPlayer) {
                setPlayerIconScoreboard(username, char_idx)
            }
            char_idx = char_idx + 1;
        }
    }

    const setPlayerIconScoreboard = function(playerName, idx) {
        $("#player-icon").attr("src", "./src/img/"+idx+"-character-icon.png");
        // console.log("[DEBUG] Setting player icon to: " + idx);
        $("#player-name").text(playerName);
    }

    const initiateTimer = function(time) {
        $("#time-remaining").text(time);
    }

    const initiateBullet = function(username, enlarged=false) {
        const player_idx = UIplayers[username].getColorIdx();
        const x = UIplayers[username].getXY().x;
        const y = UIplayers[username].getXY().y;
        const sequence = UIplayers[username].getSequence();
        let direction = -1;
        if (sequence) {
            switch (sequence.y) {
                case 1200:
                    direction = 0; break;
                case 1800:
                    direction = 1; break;
                case 600:
                    direction = 2; break;
                case 0:
                    direction = 3; break;
            }
        }
        if (enlarged) {
            bullets.push(Bullet(context, x, y, player_idx, direction, 3));
        }
        else {
            bullets.push(Bullet(context, x, y, player_idx, direction));
        }

        if (username == Socket.getSocketPlayerName()) {
            sounds.shoot.currentTime = 0;
            sounds.shoot.play();
        }
        
    }

    const playerMove = function(data) {
        const direction = parseInt(data.direction);
        UIplayers[data.username].move(direction);
    }

    const playerStop = function(data) {
        const direction = parseInt(data.direction);
        UIplayers[data.username].stop(direction);
    }

    const freezePlayerAction = function(playerToFreeze) {

        if (isInvincible(playerToFreeze)) {
            return;
        }

        if (playerToFreeze == Socket.getSocketPlayerName()) {
            sounds.freeze.currentTime = 0;
            sounds.freeze.play();
        }

        UIplayers[playerToFreeze].setSpeed(0);
        setTimeout(() => {
            UIplayers[playerToFreeze].setDefaultSpeed();
            // console.log('[DEBUG] Player ' + playerToFreeze + ' is unfrozen!')
        }, freezeTime)
    }

    const cheatSwitch = function(username) {
        const cheatPlayer = username;
        // console.log('[DEBUG] Cheat player: ' + cheatPlayer)
        if (UIplayers[cheatPlayer].getSpeed() == cheatSpeed){
            UIplayers[cheatPlayer].setDefaultSpeed();
        } else {
            UIplayers[cheatPlayer].setSpeed(cheatSpeed);
        }
    }

    const updateTimer = function(timeRemaining) {
        $("#time-remaining").text(timeRemaining);
    }

    const updatePlayers = function(time) {
        let usernames = Object.keys(UIplayers);
        for (const username in UIplayers) {
            UIplayers[username].update(time);
        }

        if (usernames.length == 2) {
            const user1_y = UIplayers[usernames[1]].getXY().y;
            const user0_y = UIplayers[usernames[0]].getXY().y;

            if (user1_y < user0_y) {
                usernames = usernames.reverse();    // to draw the upper players first
            }
        }

        for (const username of usernames) {
            UIplayers[username].draw();
        }
    }

    const updateGameData = function(data) {
        $("#score").text(data.score);
        $("#coins").text(data.coins);
    }

    const updateBullets = function(time) {
        let i = 0;
        while (i < bullets.length) {
            bullets[i].update(time);
            const x = bullets[i].getXY().x;
            const y = bullets[i].getXY().y;
            if (! gameArea.isPointInBox(x,y)) {
                bullets.splice(i,1);
            }
            else {
                bullets[i].draw(time);
                i++;
            }
        }
    }

    const updateCoins = function(time) {
        let i = 0;
        while (i < coins.length) {
            coins[i].update(time);
            coins[i].draw();
            i++;
        }
    }   

    const updateStars = function(timestamp) {
        for (const username in stars) {
            const {x, y} = UIplayers[username].getXY();
            stars[username].update(timestamp, x, y);
            stars[username].draw();
        }
            
    }

    const updateBanana = function(time) {
        let i = 0;
        while (i < bananas.length) {
            bananas[i].update(time);
            bananas[i].draw();
            i++;
        }
    }

    const updateIce = function(time) {
        let i = 0;
        while (i < ices.length) {
            ices[i].update(time);
            ices[i].draw();
            i++;
        }
    }

    const clearAllObjects = function () {
        context.clearRect(0, 0, cv.width, cv.height);
    }

    const showStat = function(data) {
        // format the table here
        constructStatTable(data);
        
        $("#game-stat-overlay").show();

        // play gameover sound here also
        sounds.background.pause();
        sounds.background.currentTime = 0;
        sounds.star.pause();
        sounds.star.currentTime = 0;
        sounds.gameover.play();
    }

    const hideStat = function() {
        $("#game-stat-overlay").hide();
    }
    
    const spawnCoin = function(location) {
        coins.push(Coin(context, location.x, location.y));
    }

    const spawnBanana = function(location) {
        bananas.push(Banana(context, location.x, location.y));
    }

    const spawnIce = function(location) {
        ices.push(Ice(context, location.x, location.y));
    }

    const constructStatTable = function(data) {
        // parse the player stat data into json
        const player_stat_str = JSON.stringify(data);
        const player_stat = data;

        // get the table body
        const table_body = $("#game-stat-table tbody");
        
        // Calculate the player rank
        const player_count = Object.keys(player_stat).length;
        const player_rank_score = [];
        for (let i = 0; i < player_count; i++) {
            const player_name = Object.keys(player_stat)[i];
            const player_score = player_stat[player_name].score;
            const player_bullet_used = player_stat[player_name].bulletUsed;
            const player_coins_collected = player_stat[player_name].coinCollected;
            // calculate an internal score to rank the player
            if (player_bullet_used == 0){
                player_rank_score.push({player: player_name, rank_score: player_score + player_coins_collected / 100, rank_num: -1 });
            } else {
                player_rank_score.push({player: player_name, 
                                    rank_score: player_score + player_coins_collected / 1000 / 2 + player_score / player_bullet_used / 2,
                                    rank_num: -1 });
            }
        }

        // sort the player rank score
        player_rank_score.sort((a, b) => b.rank_score - a.rank_score);
        
        // Assign ranks to each player based on their position in the sorted array
        let previous_score = -1;
        let previous_rank = -1;
        for (let i = 0; i < player_count; i++) {
            if (player_rank_score[i] == previous_score) {
                player_rank_score[i].rank_num = previous_rank;
            } else {
                previous_rank = i + 1;
                previous_score = player_rank_score[i].rank_score;
                player_rank_score[i].rank_num = i + 1;
            }
        }

        // count how many players and create corresponding rows
        for (let i = 0; i < player_count; i++) {
            // get the player name from the previously sorted array
            const player_name = player_rank_score[i].player;
            // console.log('[DEBUG] Adding player into game stat table... ' + player_name);
            // Create the row container for the player in the loop
            const row = $("<tr></tr>");

            // Create cell holding the stat for this player
            const player_cell = $("<td></td>").text(player_name);
            const score_cell = $("<td></td>").text(player_stat[player_name].score);
            const coins_cell = $("<td></td>").text(player_stat[player_name].coinsCollected);
            const bullet_cell = $("<td></td>").text(player_stat[player_name].bulletUsed);
            const stars_cell = $("<td></td>").text(player_stat[player_name].starActivated);
            const rank_cell = $("<td></td>").text(player_rank_score[i].rank_num);

            // Append the player statistics into the row and then append the row to the table
            row.append(player_cell);
            row.append(score_cell);
            row.append(coins_cell);
            row.append(bullet_cell);
            row.append(stars_cell);
            row.append(rank_cell);
            table_body.append(row);
        }

    }

    const resetStatTable = function() {
        // initialize the end game stat table
        const table_body = $("#game-stat-table tbody");
        table_body.empty();
    }

    const activateStar = function(username) {
        if (username in stars) {
            delete stars[username];
        }

        const playerLocation = UIplayers[username].getXY();
        stars[username] = Star(context, playerLocation.x, playerLocation.y);
        UIplayers[username].flash(maxStarAge);

        if (username == Socket.getSocketPlayerName()) {
            sounds.background.volume = 0;
            sounds.star.play();
        }
    }

    const isInvincible = function(username) {
        return (username in stars);
    }


    return {
        initialize,
        initiatePlayers, 
        initiateTimer,
        initiateBullet, 
        playerMove, 
        playerStop, 
        updateTimer,
        updatePlayers,
        updateGameData,
        updateBullets,
        updateCoins,
        updateStars,
        updateBanana,
        updateIce,
        clearAllObjects, 
        showStat, 
        hideStat,
        spawnCoin,
        spawnBanana,
        spawnIce,
        freezePlayerAction,
        constructStatTable,
        resetStatTable,
        activateStar,
        cheatSwitch,
        isInvincible
    };

})();