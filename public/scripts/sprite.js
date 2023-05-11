
const Sprite = function(ctx, x, y) {
    const sheet = new Image();

    let sequence = { x: 0, y: 0, width: 20, height: 20, count: 1, timing: 0, loop: false };

    let index = 0;

    let scale = 1;

    let shadowScale = { x: 1, y: 0.25 };

    let lastUpdate = 0;

    let flashGreyFlag = false;
    let flashFlag = false;

    const useSheet = function(spriteSheet) {
        sheet.src = spriteSheet;
        return this;
    };

    const isReady = function() {
        return sheet.complete && sheet.naturalHeight != 0;
    };

    const getXY = function() {
        return {x, y};
    };

    const setXY = function(xvalue, yvalue) {
        [x, y] = [xvalue, yvalue];
        return this;
    };

    const setSequence = function(newSequence) {
        sequence = newSequence;
        index = 0;
        lastUpdate = 0;
        return this;
    };

    const setScale = function(value) {
        scale = value;
        return this;
    };

    const setShadowScale = function(value) {
        shadowScale = value;
        return this;
    };

    const getDisplaySize = function() {
        const scaledWidth  = sequence.width * scale;
        const scaledHeight = sequence.height * scale;
        return {width: scaledWidth, height: scaledHeight};
    };

    const getBoundingBox = function() {
        const size = getDisplaySize();

        const top = y - size.height / 2;
        const left = x - size.width / 2;
        const bottom = y + size.height / 2;
        const right = x + size.width / 2;

        return BoundingBox(ctx, top, left, bottom, right);
    };

    const getSequence = function() {
        return sequence;
    }

    const drawShadow = function() {
        /* Save the settings */
        ctx.save();

        const size = getDisplaySize();

        const shadowWidth  = size.width * shadowScale.x;
        const shadowHeight = size.height * shadowScale.y;

        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(x, y + size.height / 2,
                    shadowWidth / 2, shadowHeight / 2, 0, 0, 2 * Math.PI);
        ctx.fill();

        /* Restore saved settings */
        ctx.restore();
    };

    const drawSprite = function() {
        /* Save the settings */
        ctx.save();

        /* Get the display size of the sprite */
        const size = getDisplaySize();

        ctx.imageSmoothingEnabled = false;
        const location = getXY();

        if (flashGreyFlag) {
            ctx.filter = "grayscale(1)";
        }

        if (flashFlag) {
            ctx.filter = "brightness(4)";
        }
        
        ctx.drawImage(sheet, sequence.x+index*sequence.width, sequence.y, sequence.width, sequence.height,
            location.x - size.width/2, location.y - size.height/2, size.width, size.height);

        /* Restore saved settings */
        ctx.restore();
    };

    const draw = function() {
        if (isReady()) {
            drawShadow();
            drawSprite();
        }
        return this;
    };

    const update = function(time) {
        if (lastUpdate == 0) lastUpdate = time;

        if (time - lastUpdate >= sequence.timing){
            index++;
            if (index >= sequence.count){
                if (sequence.loop == true){
                    index = 0;
                }
                else {
                    index = sequence.count-1;
                }
            };
            lastUpdate = time;
        };

        return this;
    };

    const flashGrey = function(duration) {
        flashGreyFlag = true;
        setTimeout(
            () => flashGreyFlag = false,
            duration
        )
    }

    const flash = function(duration) {
        const intervalID = setInterval(() => {
            flashFlag = !flashFlag;
        }, 100);

        setTimeout(() => {
            clearInterval(intervalID);
            flashFlag = false;
        }, duration);
    }

    return {
        useSheet,
        getXY,
        setXY,
        setSequence,
        setScale,
        setShadowScale,
        getDisplaySize,
        getBoundingBox,
        getSequence,
        isReady,
        draw,
        update,
        flashGrey,
        flash,
    };
};
