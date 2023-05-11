const Coin = function(ctx, x, y) {
    
    const sequence = { x: 0, y:  0, width: 16, height: 16, count: 5, timing: 200, loop: true };

    const sprite = Sprite(ctx, x, y);

    sprite.setSequence(sequence)
          .setScale(2)
          .setShadowScale({x: 0.75, y: 0.2})
          .useSheet("./src/img/coin.png")

    // 80*16 pixels. Update if necessary.

    let birthTime = performance.now();

    const getAge = function(now) {
        return now - birthTime;
    };

    const randomize = function(area) {
        const {x, y} = area.randomPoint();
        sprite.setXY(x, y);
    };

    return {
        getXY: sprite.getXY,
        setXY: sprite.setXY,
        getAge: getAge,
        getBoundingBox: sprite.getBoundingBox,
        randomize: randomize,
        draw: sprite.draw,
        update: sprite.update
    };
};