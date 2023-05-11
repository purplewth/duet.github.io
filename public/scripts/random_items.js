const Banana = function(ctx, x, y) {
    
    // Banana png dimension = 1450 x 944 pixels (horizontal)
    const sequence = { x: 0, y: 0, width: 1450, height: 944, count: 1, timing: 100, loop: true };

    const sprite = Sprite(ctx, x, y);

    sprite.setSequence(sequence)
          .setScale(0.02)
          .setShadowScale({x: 0.75, y: 0.2})
          .useSheet("./src/img/banana.png")

    let birthTime = performance.now();
    const itemIdentifier = 'banana';

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
        update: sprite.update,
        itemIdentifier: itemIdentifier
    };
};

const Ice = function(ctx, x, y) {
    
    // Ice png dimension = 2485 x 2752 pixels (horizontal)
    const sequence = { x: 0, y: 0, width: 2485, height: 2752, count: 1, timing: 100, loop: true };

    const sprite = Sprite(ctx, x, y);

    sprite.setSequence(sequence)
          .setScale(0.012)
          .setShadowScale({x: 0.5, y: 0.3})
          .useSheet("./src/img/ice.png")

    let birthTime = performance.now();
    const itemIdentifier = 'ice';

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
        update: sprite.update,
        itemIdentifier: itemIdentifier
    };
};