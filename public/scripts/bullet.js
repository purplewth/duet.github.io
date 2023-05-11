const Bullet = function(ctx, x, y, idx, direction, scale=1) {

    const colorIdx = idx;

    const bulletScale = scale;

    // png size: 1147 * 1920 pixels (vertical)
    // png size: 1920 * 1147 pixels (horizontal)

    const sequences = {
        moveLeft: {x: 0, y: 0, width: 1920, height: 1147, count: 1, timing: 100, loop: true },
        moveUp: {x: 0, y: 0, width: 1147, height: 1920, count: 1, timing: 100, loop: true },
        moveRight: {x: 0, y: 0, width: 1920, height: 1147, count: 1, timing: 100, loop: true },
        moveDown: {x: 0, y: 0, width: 1147, height: 1920, count: 1, timing: 100, loop: true },
    }

    const sprite = Sprite(ctx, x, y);

    // This is the moving direction, which can be a number from 0 to 3:
    // - `0` - moving to the left
    // - `1` - moving u
    // - `2` - moving to the right
    // - `3` - moving down
    if (direction >= 0 && direction <= 3) {
        switch (direction) {
            case 0: sprite.setSequence(sequences.moveLeft); sprite.useSheet("./src/img/"+idx + "-bullet-left.png"); break;
            case 1: sprite.setSequence(sequences.moveUp); sprite.useSheet("./src/img/"+idx + "-bullet-up.png"); break;
            case 2: sprite.setSequence(sequences.moveRight); sprite.useSheet("./src/img/"+idx + "-bullet-right.png"); break;
            case 3: sprite.setSequence(sequences.moveDown); sprite.useSheet("./src/img/"+idx + "-bullet-down.png"); break;
        }
    }

    sprite.setScale(.02 * bulletScale)
          .setShadowScale({x: 0.75, y: .2})

    let speed = 600;

    const update = function(time) {
        if (direction >= 0 && direction <= 3) {
            let { x, y } = sprite.getXY();

            switch (direction) {
                case 0: x -= speed / 60; break;
                case 1: y -= speed / 60; break;
                case 2: x += speed / 60; break;
                case 3: y += speed / 60; break;
            }
            sprite.setXY(x, y);
        }

        /* Update the sprite object */
        sprite.update(time);
    };

    const getColorIdx = function() {
        return colorIdx;
    }

    return {
        update: update,
        getBoundingBox: sprite.getBoundingBox,
        draw: sprite.draw,
        getColorIdx: getColorIdx,
        getXY: sprite.getXY
    }

}