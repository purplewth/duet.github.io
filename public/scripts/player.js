const Player = function(ctx, x, y, gameArea, idx) {

    const colorIdx = idx;

    // This is the sprite sequences of the player facing different directions.
    // It contains the idling sprite sequences `idleLeft`, `idleUp`, `idleRight` and `idleDown`,
    // and the moving sprite sequences `moveLeft`, `moveUp`, `moveRight` and `moveDown`.
    const sequences = 
    { // the sheet has dimension 1840 * 2400 pixels.
        idleLeft:  { x: 0, y: 1200, width: 460, height: 600, count: 1, timing: 2000, loop: false },
        idleUp:    { x: 460, y: 1800, width: 460, height: 600, count: 1, timing: 2000, loop: false },
        idleRight: { x: 460, y: 600, width: 460, height: 600, count: 1, timing: 2000, loop: false },
        idleDown:  { x: 460, y:  0, width: 460, height: 600, count: 1, timing: 2000, loop: false },
        moveLeft:  { x: 0, y: 1200, width: 460, height: 600, count: 4, timing: 100, loop: true },
        moveUp:    { x: 0, y: 1800, width: 460, height: 600, count: 4, timing: 100, loop: true },
        moveRight: { x: 0, y: 600, width: 460, height: 600, count: 4, timing: 100, loop: true },
        moveDown:  { x: 0, y: 0, width: 460, height: 600, count: 4, timing: 100, loop: true }
    };

    const sheetName = "./src/img/"+idx + "-character-sprite-sheet.png";

    const sprite = Sprite(ctx, x, y);

    sprite.setSequence(sequences.idleDown)
          .setScale(0.1)
          .setShadowScale({ x: 0.75, y: 0.20 })
          .useSheet(sheetName);

    // This is the moving direction, which can be a number from 0 to 4:
    // - `0` - not moving
    // - `1` - moving to the left
    // - `2` - moving up
    // - `3` - moving to the right
    // - `4` - moving down
    let direction = 0;

    // This is the moving speed (pixels per second) of the player
    const defaultSpeed = 150;
    let speed = defaultSpeed;
    
    // This function sets the player's moving direction.
    // - `dir` - the moving direction (1: Left, 2: Up, 3: Right, 4: Down)
    const move = function(dir) {
        if (dir >= 1 && dir <= 4 && dir != direction) {
            switch (dir) {
                case 1: sprite.setSequence(sequences.moveLeft); break;
                case 2: sprite.setSequence(sequences.moveUp); break;
                case 3: sprite.setSequence(sequences.moveRight); break;
                case 4: sprite.setSequence(sequences.moveDown); break;
            }
            direction = dir;
        }
    };

    // This function stops the player from moving.
    // - `dir` - the moving direction when the player is stopped (1: Left, 2: Up, 3: Right, 4: Down)
    const stop = function(dir) {
        if (direction == dir) {
            switch (dir) {
                case 1: sprite.setSequence(sequences.idleLeft); break;
                case 2: sprite.setSequence(sequences.idleUp); break;
                case 3: sprite.setSequence(sequences.idleRight); break;
                case 4: sprite.setSequence(sequences.idleDown); break;
            }
            direction = 0;
        }
    };

    const resetFaceDown = function() {
        direction = 4;
        stop(4);
    }

    // This function speeds up the player.
    const setSpeed = function(desiredSpeed) {
        speed = desiredSpeed;
    };

    const setDefaultSpeed = function() {
        speed = defaultSpeed;
    }

    // This function speeds up the player.
    const getSpeed = function() {
        return speed;
    };

    // This function updates the player depending on his movement.
    // - `time` - The timestamp when this function is called
    const update = function(time) {
        if (direction != 0) {
            let { x, y } = sprite.getXY();

            switch (direction) {
                case 1: x -= speed / 60; break;
                case 2: y -= speed / 60; break;
                case 3: x += speed / 60; break;
                case 4: y += speed / 60; break;
            }

            if (gameArea.isPointInBox(x, y))
                sprite.setXY(x, y);
        }

        sprite.update(time);
    };

    const getColorIdx = function () {
        return idx;
    }
    
    return {
        move: move,
        stop: stop,
        getBoundingBox: sprite.getBoundingBox,
        draw: sprite.draw,
        update: update,
        getXY: sprite.getXY,
        getColorIdx: getColorIdx,
        getSequence: sprite.getSequence,
        setSpeed: setSpeed,
        getSpeed: getSpeed,
        resetFaceDown: resetFaceDown,
        setDefaultSpeed: setDefaultSpeed,
        flashGrey: sprite.flashGrey,
        flash: sprite.flash
    };
};
