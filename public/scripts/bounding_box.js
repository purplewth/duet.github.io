
const BoundingBox = function(ctx, top, left, bottom, right) {

    const path = new Path2D();
    path.rect(left, top, right - left, bottom - top);

    const lowerHalf = new Path2D();
    lowerHalf.rect(left, top + (bottom - top) / 2 - 2, right-left, (bottom-top) / 2 + 2);

    const getTop = function() {
        return top;
    };

    const getLeft = function() {
        return left;
    };

    const getBottom = function() {
        return bottom;
    };

    const getRight = function() {
        return right;
    };

    const getPoints = function() {
        return {
            topLeft: [left, top],
            topRight: [right, top],
            bottomLeft: [left, bottom],
            bottomRight: [right, bottom]
        };
    };

    const isPointInBox = function(x, y) {
        return ctx.isPointInPath(path, x, y);
    };

    const isPointInLowerHalf = function(x,y) {
        return ctx.isPointInPath(lowerHalf, x, y);
    }

    const intersect = function(box) {
        let points = box.getPoints();
        for (const key in points) {
            if (isPointInBox(...points[key]))
                return true;
        }

        points = getPoints();
        for (const key in points) {
            if (box.isPointInBox(...points[key]))
                return true;
        }

        return false;
    };

    const randomPoint = function() {
        const x = left + (Math.random() * (right - left));
        const y = top + (Math.random() * (bottom - top));
        return {x, y};
    };

    return {
        getTop: getTop,
        getLeft: getLeft,
        getBottom: getBottom,
        getRight: getRight,
        getPoints: getPoints,
        isPointInBox: isPointInBox,
        isPointInLowerHalf: isPointInLowerHalf,
        intersect: intersect,
        randomPoint: randomPoint
    };
};
