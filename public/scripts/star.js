const Star = function(ctx, x, y, username) {

    const owner = username;

    // png size: 497*466

    const sequence = {x: 0, y: 0, width: 497, height: 466, count: 1, timing: 100, loop: true }

    const sprite = Sprite(ctx, x, y);

    sprite.setSequence(sequence)
          .setScale(.04)
          .setShadowScale({x: 0, y: 0})
          .useSheet("./src/img/star.png")

    let birthTime = performance.now();

    const getAge = function(now) {
        return now - birthTime;
    };

    const update = function(time, x, y) {
        sprite.setXY(x, y);
        
        /* Update the sprite object */
        sprite.update(time);
    };

    const getOwner = function() {
        return owner;
    }

    return {
        update: update,
        getBoundingBox: sprite.getBoundingBox,
        draw: sprite.draw,
        getXY: sprite.getXY,
        getOwner: getOwner,
        getAge: getAge
    }

}