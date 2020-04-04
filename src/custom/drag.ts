import { Pointer as PointerInteraction } from 'ol/interaction';

var Drag = /*@__PURE__*/ (function(PointerInteraction) {
    function Drag() {
        // @ts-ignore
        PointerInteraction.call(this, {
            handleDownEvent: handleDownEvent,
            handleDragEvent: handleDragEvent,
            handleMoveEvent: handleMoveEvent,
            handleUpEvent: handleUpEvent
        });

        /**
         * @type {import("../src/ol/coordinate.js").Coordinate}
         * @private
         */
        // @ts-ignore
        this.coordinate_ = null;

        /**
         * @type {string|undefined}
         * @private
         */
        // @ts-ignore
        this.cursor_ = 'pointer';

        /**
         * @type {Feature}
         * @private
         */
        // @ts-ignore
        this.feature_ = null;

        /**
         * @type {string|undefined}
         * @private
         */
        // @ts-ignore
        this.previousCursor_ = undefined;
    }

    if (PointerInteraction) Drag.__proto__ = PointerInteraction;
    Drag.prototype = Object.create(PointerInteraction && PointerInteraction.prototype);
    Drag.prototype.constructor = Drag;

    return Drag;
})(PointerInteraction);

/**
 * @param {import("../src/ol/MapBrowserEvent.js").default} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
function handleDownEvent(evt) {
    var map = evt.map;

    var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
        return feature;
    });

    if (feature) {
        // @ts-ignore
        this.coordinate_ = evt.coordinate;
        // @ts-ignore
        this.feature_ = feature;
    }

    return !!feature;
}

/**
 * @param {import("../src/ol/MapBrowserEvent.js").default} evt Map browser event.
 */
function handleDragEvent(evt) {
    // @ts-ignore
    var deltaX = evt.coordinate[0] - this.coordinate_[0];
    // @ts-ignore
    var deltaY = evt.coordinate[1] - this.coordinate_[1];

    // @ts-ignore
    var geometry = this.feature_.getGeometry();
    geometry.translate(deltaX, deltaY);

    // @ts-ignore
    this.coordinate_[0] = evt.coordinate[0];
    // @ts-ignore
    this.coordinate_[1] = evt.coordinate[1];
}

/**
 * @param {import("../src/ol/MapBrowserEvent.js").default} evt Event.
 */
function handleMoveEvent(evt) {
    // @ts-ignore
    if (this.cursor_) {
        var map = evt.map;
        var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });
        var element = evt.map.getTargetElement();
        if (feature) {
            // @ts-ignore
            if (element.style.cursor != this.cursor_) {
                // @ts-ignore
                this.previousCursor_ = element.style.cursor;
                // @ts-ignore
                element.style.cursor = this.cursor_;
            }
            // @ts-ignore
        } else if (this.previousCursor_ !== undefined) {
            // @ts-ignore
            element.style.cursor = this.previousCursor_;
            // @ts-ignore
            this.previousCursor_ = undefined;
        }
    }
}

/**
 * @return {boolean} `false` to stop the drag sequence.
 */
function handleUpEvent() {
    // @ts-ignore
    this.coordinate_ = null;
    // @ts-ignore
    this.feature_ = null;
    return false;
}

export { Drag };
