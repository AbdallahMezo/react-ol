import React, { useRef, useEffect, useCallback, useContext } from 'react';
import BaseMap from 'ol/Map';
import { View, Feature, Collection } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import 'ol/ol.css';
import { getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import Vector from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Fill, Circle, Stroke, Icon } from 'ol/style';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';
import Overlay from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import uuid from 'uuid';
import { Translate, Modify, Draw } from 'ol/interaction';
import Point from 'ol/geom/Point';
import { Polygon } from 'ol/geom';

/* eslint-disable */
let transform = {};

/** Helmert transformation is a transformation method within a three-dimensional space.
 *	It is frequently used in geodesy to produce distortion-free transformations from one datum to another.
 *	It is composed of scaling o rotation o translation
 *	Least squares is used to solve the problem of determining the parameters.
 *	[X] = [sx] . [cos -sin] + [tx]
 *	[Y]   [sy]   [sin  cos]   [ty]
 *
 *	With the similarity option the scale is the same along both axis ie. sx = sy
 */
transform.Helmert = function(options) {
    if (!options) options = {};
    this.similarity = options.similarity;
    this.matrix = [1, 0, 0, 0, 1, 0];
    this.hasControlPoints = false;
};

/** Calculate the helmert transform with control points.
 * @return {Array.<ol.Coordinate>}: source coords
 * @return {Array.<ol.Coordinate>: projected coords
 */
transform.Helmert.prototype.setControlPoints = function(xy, XY) {
    if (xy.length < 2) {
        this.matrix = [1, 0, 0, 0, 1, 0];
        this.hasControlPoints = false;
    } else {
        if (this.similarity || xy.length < 3) this.matrix = this._similarity(xy, XY);
        else this.matrix = this._helmert(xy, XY);
        this.hasControlPoints = true;
    }
    return this.hasControlPoints;
};

/** Get the rotation of the transform
 * @return {Number}: angle
 */
transform.Helmert.prototype.getRotation = function() {
    return this.a_;
};

/** Get the scale of the transform
 * @return {ol.Coordinate}: scale along x and y axis
 */
transform.Helmert.prototype.getScale = function() {
    return this.sc_;
};

/** Get the rotation of the translation
 * @return {ol.Coordinate}: translation
 */
transform.Helmert.prototype.getTranslation = function() {
    return this.tr_;
};

/** Transform a point
 * @param {ol.Coordinate}: coordinate in the origin datum
 * @return {ol.Coordinate}: coordinate in the destination datum
 */
transform.Helmert.prototype.transform = function(xy) {
    var m = this.matrix;
    return [m[0] * xy[0] + m[1] * xy[1] + m[2], m[3] * xy[0] + m[4] * xy[1] + m[5]];
};

/** Revers transform of a point
 * @param {ol.Coordinate}: coordinate in the destination datum
 * @return {ol.Coordinate}: coordinate in the origin datum
 */
transform.Helmert.prototype.revers = function(xy) {
    var a = this.matrix[0];
    var b = this.matrix[1];
    var c = this.matrix[3];
    var d = this.matrix[4];
    var p = this.matrix[2];
    var q = this.matrix[5];
    return [
        (d * xy[0] - b * xy[1] + b * q - p * d) / (a * d - b * c),
        (-c * xy[0] + a * xy[1] + c * p - a * q) / (a * d - b * c)
    ];
};

/**
Transformee de Helmert au moindre carre :
	Somme ( carre (a*xy + b - XY) ) minimale
	avec A de la forme :
	[a -b]
	[b  a]
**/
transform.Helmert.prototype._similarity = function(xy, XY) {
    if (!xy.length || xy.length != XY.length) {
        console.log('Helmert : Taille des tableaux de points incompatibles');
        return false;
    }
    var i; // Variable de boucle
    var n = XY.length; // nb points de calage
    var a = 1,
        b = 0,
        p = 0,
        q = 0;

    // Barycentre
    var mxy = { x: 0, y: 0 };
    var mXY = { x: 0, y: 0 };
    for (i = 0; i < n; i++) {
        mxy.x += xy[i][0];
        mxy.y += xy[i][1];
        mXY.x += XY[i][0];
        mXY.y += XY[i][1];
    }
    mxy.x /= n;
    mxy.y /= n;
    mXY.x /= n;
    mXY.y /= n;

    // Ecart au barycentre
    var xy0 = [],
        XY0 = [];
    for (i = 0; i < n; i++) {
        xy0.push({ x: xy[i][0] - mxy.x, y: xy[i][1] - mxy.y });
        XY0.push({ x: XY[i][0] - mXY.x, y: XY[i][1] - mXY.y });
    }

    // Resolution
    var SxX, SxY, SyY, SyX, Sx2, Sy2;
    SxX = SxY = SyY = SyX = Sx2 = Sy2 = 0;
    for (i = 0; i < n; i++) {
        SxX += xy0[i].x * XY0[i].x;
        SxY += xy0[i].x * XY0[i].y;
        SyY += xy0[i].y * XY0[i].y;
        SyX += xy0[i].y * XY0[i].x;
        Sx2 += xy0[i].x * xy0[i].x;
        Sy2 += xy0[i].y * xy0[i].y;
    }

    // Coefficients
    a = (SxX + SyY) / (Sx2 + Sy2);
    b = (SxY - SyX) / (Sx2 + Sy2);
    p = mXY.x - a * mxy.x + b * mxy.y;
    q = mXY.y - b * mxy.x - a * mxy.y;

    // la Solution
    this.matrix = [a, -b, p, b, a, q];

    var sc = Math.sqrt(a * a + b * b);
    this.a_ = Math.acos(a / sc);
    if (b > 0) this.a_ *= -1;
    this.sc_ = [sc, sc];
    this.tr_ = [p, q];

    return this.matrix;
};

/**
Transformee de Helmert-Etendue au moindre carre :
	Somme ( carre (a*xy + b - XY) ) minimale
	avec A de la forme :
	[a -b][k 0]
	[b  a][0 h]
**/
transform.Helmert.prototype._helmert = function(xy, XY, poids, tol) {
    if (!xy.length || xy.length != XY.length) {
        console.log('Helmert : Taille des tableaux de points incompatibles');
        return false;
    }
    var i; // Variable de boucle
    var n = xy.length; // nb points de calage
    // Creation de poids par defaut
    if (!poids) poids = [];
    if (poids.length == 0 || n != poids.iGetTaille()) {
        for (i = 0; i < n; i++) poids.push(1.0);
    }

    var a, b, k, h, tx, ty;
    if (!tol) tol = 0.0001;

    // Initialisation (sur une similitude)
    var affine = this._similarity(xy, XY);
    a = affine[0];
    b = -affine[1];
    k = h = Math.sqrt(a * a + b * b);
    a /= k;
    b /= k;
    tx = affine[2];
    ty = affine[5];

    // Barycentre
    var mxy = { x: 0, y: 0 };
    var mXY = { x: 0, y: 0 };
    for (i = 0; i < n; i++) {
        mxy.x += xy[i][0];
        mxy.y += xy[i][1];
        mXY.x += XY[i][0];
        mXY.y += XY[i][1];
    }
    mxy.x /= n;
    mxy.y /= n;
    mXY.x /= n;
    mXY.y /= n;

    // Ecart au barycentre
    var xy0 = [],
        XY0 = [];
    for (i = 0; i < n; i++) {
        xy0.push({ x: xy[i][0] - mxy.x, y: xy[i][1] - mxy.y });
        XY0.push({ x: XY[i][0] - mXY.x, y: XY[i][1] - mXY.y });
    }

    // Variables
    var Sx, Sy, Sxy, SxX, SxY, SyX, SyY;
    Sx = Sy = Sxy = SxX = SxY = SyX = SyY = 0;
    for (i = 0; i < n; i++) {
        Sx += xy0[i].x * xy0[i].x * poids[i];
        Sxy += xy0[i].x * xy0[i].y * poids[i];
        Sy += xy0[i].y * xy0[i].y * poids[i];
        SxX += xy0[i].x * XY0[i].x * poids[i];
        SyX += xy0[i].y * XY0[i].x * poids[i];
        SxY += xy0[i].x * XY0[i].y * poids[i];
        SyY += xy0[i].y * XY0[i].y * poids[i];
    }

    // Iterations
    var dk, dh, dt;
    var A, B, C, D, E, F, G, H;
    var da, db;
    var div = 1e10;

    do {
        A = Sx;
        B = Sy;
        C = k * k * Sx + h * h * Sy;
        D = -h * Sxy;
        E = k * Sxy;
        F = a * SxX + b * SxY - k * Sx;
        G = -b * SyX + a * SyY - h * Sy;
        H = -k * b * SxX + k * a * SxY - h * a * SyX - h * b * SyY;

        //
        dt = (A * B * H - B * D * F - A * E * G) / (A * B * C - B * D * D - A * E * E);
        dk = (F - D * dt) / A;
        dh = (G - E * dt) / A;

        // Probleme de divergence numerique
        if (Math.abs(dk) + Math.abs(dh) > div) break;

        // Nouvelle approximation
        da = a * Math.cos(dt) - b * Math.sin(dt);
        db = b * Math.cos(dt) + a * Math.sin(dt);
        a = da;
        b = db;
        k += dk;
        h += dh;

        div = Math.abs(dk) + Math.abs(dh);
    } while (Math.abs(dk) + Math.abs(dh) > tol);

    // Retour du repere barycentrique
    tx = mXY.x - a * k * mxy.x + b * h * mxy.y;
    ty = mXY.y - b * k * mxy.x - a * h * mxy.y;

    this.a_ = Math.acos(a);
    if (b > 0) this.a_ *= -1;
    if (Math.abs(this.a_) < Math.PI / 8) {
        this.a_ = Math.asin(-b);
        if (a < 0) this.a_ = Math.PI - this.a_;
    }
    this.sc_ = [k, h];
    this.tr_ = [tx, ty];

    // la Solution
    this.matrix = [];
    this.matrix[0] = a * k;
    this.matrix[1] = -b * h;
    this.matrix[2] = tx;
    this.matrix[3] = b * k;
    this.matrix[4] = a * h;
    this.matrix[5] = ty;
    return this.matrix;
};

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var createContext = function (props) { return React.createContext(props); };
//# sourceMappingURL=context.js.map

/**
 * @description Returns previous value, usually created to be used as a container for prev props
 * @param {T} value to be chached
 * @returns {?T}
 */
function usePrevious(value) {
    var previousRef = useRef();
    useEffect(function () {
        previousRef.current = value;
    });
    return previousRef.current;
}
//# sourceMappingURL=hooks.js.map

function getMapLayers(type) {
    if (type === 'osm') {
        return [new TileLayer({ source: new OSM() })];
    }
    return;
}
function getViewOptions(props) {
    var options = {};
    options.zoom = props.zoom ? props.zoom : 3;
    options.center = props.center ? props.center : [0, 0];
    return options;
}
/**
 * @description Generates map options
 * @param {IMapProps} props to generate options from
 * @returns {MapOptions}
 */
function getMapOptions(props) {
    var options = {};
    // Define map view
    options.view = new View(getViewOptions(props));
    // set default map layer
    if (props.type) {
        options.layers = getMapLayers(props.type);
    }
    return options;
}
var MapContext = createContext({});
function Map(props) {
    var mapEl = useRef(null);
    var olMap = useRef();
    var previousProps = usePrevious(props);
    if (!props.children && props.type !== 'osm') {
        throw new Error('Map component should contain at least raster layer');
    }
    /**
     * @description Generates ol Map with custom options
     * @param {MapOptions} options of the map @see {MapOptions}
     */
    function generateMap(options) {
        olMap.current = new BaseMap(options);
        if (mapEl.current) {
            olMap.current.setTarget(props.target || mapEl.current);
        }
    }
    /**
     * @description Memized callback to update map's center if props changed
     * @param {Array<Number>} center new center of the map
     */
    function updateCenter(center) {
        if (olMap.current) {
            olMap.current.getView().animate({ center: center });
        }
    }
    /**
     * @description Memized callback to update map's zoom if props changed
     * @param {Number} zoom new zoom of the map
     */
    var updateZoom = useCallback(function (zoom) {
        if (olMap.current) {
            olMap.current.getView().animate({ zoom: zoom });
        }
    }, []);
    /**
     * @description Component did mount
     */
    useEffect(function () {
        if (mapEl.current) {
            generateMap(getMapOptions(props));
        }
        // eslint-disable-next-line
    }, []);
    /**
     * @description Component did update
     * update zoom when zoom changes
     */
    useEffect(function () {
        if (olMap.current && props.zoom) {
            updateZoom(props.zoom);
        }
    }, [props.zoom, updateZoom]);
    /**
     * @description Component did update
     * update center when center changes
     */
    useEffect(function () {
        if (previousProps) {
            if (previousProps.center !== props.center && props.center) {
                updateCenter(props.center);
            }
        }
    }, [props.center, updateCenter]);
    return (React.createElement("div", { ref: mapEl, style: { width: '100%', height: '100%' } },
        React.createElement(MapContext.Provider, { value: __assign({}, props, { map: olMap.current }) }, props.children)));
}
var useMapContext = function () { return useContext(MapContext); };
//# sourceMappingURL=Map.js.map

/**
 * @description Create an empty context for the image layer
 */
var ImageContext = createContext({});
/**
 * @description Generates the extnet array to be used
 * @param {Number} width to consider in extent
 * @param {Number} height to consider in extent
 * @returns {Array<Number>}
 */
var getExtent = function (width, height) { return [0, 0, width, height]; };
/**
 * @description Gnerate the pixel projection to be used in the image layer
 * @param {Number} width of the image
 * @param {Number} height of the image
 * @returns {ProjectionLike}
 */
function getImageSourceProjection(width, height) {
    return new Projection({
        code: 'pixel',
        units: 'pixels',
        extent: getExtent(width, height)
    });
}
/**
 * @description Generates Image props and `new Static({options from props})` considered
 * as the source of the image
 * @param {IImageProps} props
 * @returns {ImageOptions}
 */
function getImageOptions(props) {
    var options = {};
    // create the static image source
    options.source = new Static({
        url: props.src,
        projection: getImageSourceProjection(props.width, props.height),
        imageExtent: getExtent(props.width, props.height)
    });
    return options;
}
/**
 * @description Generates the `new View()` options to be passed while initializing
 * the new map view based on image layer
 * @param {IImageProps} props
 * @returns {ViewOptions}
 */
function getImageViewOptions(props) {
    /**
     * `ViewOptions`
     * zoom values added by default to 2 and min = 1, max = 6,
     * It can be modified via props
     */
    var options = {
        zoom: props.zoom ? props.zoom : 2,
        minZoom: props.minZoom ? props.minZoom : 1,
        maxZoom: props.maxZoom ? props.maxZoom : 6
    };
    /**
     * Assign projection and center to view options
     */
    options.projection = getImageSourceProjection(props.width, props.height);
    options.center = getCenter(getExtent(props.width, props.height));
    return options;
}
function Image(props) {
    var image = useRef(null);
    var MapContextValues = useMapContext();
    var previousMapContext = usePrevious(MapContextValues);
    var previousImageProps = usePrevious(props);
    /**
     * @description generate image layer and add it to map
     * @param {IImageProps} props
     */
    function addImageToMap(props) {
        // if there is image currently rendered, remove it to not duplicate the layer
        // @see https://openlayers.org/en/v6.1.1/doc/errors/#58
        if (image.current) {
            MapContextValues.map.removeLayer(image.current);
        }
        // Create new Image layer and view
        image.current = new ImageLayer(getImageOptions(props));
        var imageView = new View(getImageViewOptions(props));
        // Fit the image to map extent
        imageView.fit([0, 0, props.width, props.height]);
        // finally adding the layer and view to the map
        MapContextValues.map.addLayer(image.current);
        MapContextValues.map.setView(imageView);
    }
    /**
     * @description Check if image layer should be updated based on props change
     * @param props
     * @param prevProps
     */
    function shouldComponentUpdate(props, prevProps) {
        if (prevProps) {
            return (prevProps.src !== props.src ||
                prevProps.width !== props.width ||
                prevProps.height !== props.height);
        }
        return true;
    }
    /**
     * Image had been Initialized and map is now exists so we start
     * to add the image layer to the map instance alongside with changing the map view
     * to a new view with the pixel projection created for the image
     */
    useEffect(function () {
        /**
         * Map is initialized but image layer cannot have map context
         * which means that the component had been called out side map component
         * `Image` is not `children` to `Map`
         */
        if (MapContextValues && !MapContextValues.map && previousMapContext) {
            throw new Error('Map is not found, Image Layer maybe defined outsite map component');
        }
        if (!shouldComponentUpdate(props, previousImageProps)) {
            return;
        }
        if (MapContextValues.map) {
            addImageToMap(props);
        }
    }, [MapContextValues.map, previousMapContext, props]);
    return (React.createElement(ImageContext.Provider, { value: __assign({}, MapContextValues, { vector: image.current }) },
        React.createElement("div", null, props.children)));
}
//# sourceMappingURL=Image.js.map

var VectorContext = createContext({});
/**
 * @description Generates vector options from component props
 * @param {IVectorLayerProps} props
 * @returns {Options}
 */
function getVectorOptions(props) {
    var options = {};
    options.source = props.source || new VectorSource({ wrapX: false, useSpatialIndex: false });
    options.style = props.style || new Style({});
    options.zIndex = 1;
    if (props.isWebGl && props.webGlStyle) {
        // @ts-ignore
        options.style = props.webGlStyle;
    }
    return options;
}
function VectorLayer(props) {
    var MapContextValues = useMapContext();
    var vector = useRef(null);
    var previousMapContext = usePrevious(MapContextValues);
    function createVectorLayer() {
        if (props.isWebGl) {
            vector.current = new WebGLPointsLayer(getVectorOptions(props));
            return;
        }
        else {
            vector.current = new Vector(getVectorOptions(props));
        }
    }
    /**
     * component did mount
     * @description Initialize vector layer
     */
    useEffect(function () {
        createVectorLayer();
        // eslint-disable-next-line
    }, []);
    /**
     * @description Check map context and add this vector to the map
     */
    useEffect(function () {
        // Check if there is no map context throw an error
        if (MapContextValues && !MapContextValues.map && previousMapContext) {
            throw new Error('Map is not found, Layer maybe defined outsite map component');
        }
        if (MapContextValues.map && previousMapContext && previousMapContext.map) {
            return;
        }
        if (MapContextValues.map && vector.current) {
            MapContextValues.map.addLayer(vector.current);
        }
        //eslint-disable-next-line
    }, [MapContextValues.map, previousMapContext]);
    /**
     * @description return a provider to create vector context with this vector layer
     */
    return (React.createElement("div", null,
        React.createElement(VectorContext.Provider, { value: __assign({}, MapContextValues, { vector: vector.current }) }, props.children)));
}
var useVectorContext = function () { return useContext(VectorContext); };
//# sourceMappingURL=Vector.js.map

/**
 * @description Default Polygon style
 */
var defaultPolygonStyle = new Style({
    fill: new Fill({ color: 'rgba(35, 187, 245, 0.2)' }),
    stroke: new Stroke({
        color: 'rgba(8, 184, 251, 1)',
        width: 2
    })
});
/**
 * @description Default marker style
 */
var defaultMarkerStyle = new Style({
    image: new Circle({
        fill: new Fill({ color: 'rgba(35, 187, 245, 1)' }),
        radius: 10,
        stroke: new Stroke({
            color: 'white',
            width: 2
        })
    })
});
var DEFAULT_COLOR = 'rgba(35, 187, 245, 1)';
function convertHexToRGBA(hex, opacity) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + ", " + opacity + ")";
}
//# sourceMappingURL=styles.js.map

/**
 * @description Generates the tooltip options @see OverlayOptions
 * @param {ITooltipProps} props
 * @param {HTMLDivElement} element
 */
function generateTooltipOptions(props, element) {
    var options = {};
    options.element = element;
    options.offset = [15, 0];
    options.autoPan = props.autoPan;
    options.className = props.className ? props.className : '';
    options.id = props.id ? props.id : '';
    options.position = props.coordinate;
    options.positioning = props.position ? props.position : OverlayPositioning.CENTER_LEFT;
    return options;
}
// Init tooltip context
var TooltipContext = createContext({});
function Tooltip(props) {
    var tooltipEl = useRef(null);
    var tooltip = useRef();
    var map = useMapContext().map;
    /**
     * @description troggle the tooltip
     * @param {Coordinate} coordinate
     */
    function showTooltip(coordinate) {
        if (tooltip.current && tooltipEl.current) {
            tooltip.current.setPosition(coordinate);
        }
    }
    /**
     * @description Toggle the tooltip off
     */
    function hideTooltip() {
        if (tooltip.current) {
            tooltip.current.setPosition(undefined);
        }
    }
    useEffect(function () {
        if (tooltipEl.current && map) {
            tooltipEl.current.innerHTML = props.title;
            tooltip.current = new Overlay(generateTooltipOptions(props, tooltipEl.current));
            map.addOverlay(tooltip.current);
        }
    }, [map]);
    useEffect(function () {
        if (tooltip.current) {
            var tooltipEl_1 = tooltip.current.getElement();
            if (tooltipEl_1) {
                tooltipEl_1.innerHTML = props.title;
            }
        }
    }, [props.title]);
    return (React.createElement("div", { ref: tooltipEl },
        React.createElement(TooltipContext.Provider, { value: { tooltip: tooltip, show: showTooltip, hide: hideTooltip, id: uuid() } }, props.children)));
}
var useToolTip = function () { return useContext(TooltipContext); };
//# sourceMappingURL=Tooltip.js.map

/**
 * @description Generates options for the overlaly
 * @param {IPopupProps} props
 * @param {HTMLDivElement} element
 */
function generatePopupOptions(props, element) {
    var options = {};
    options.className = props.className;
    options.id = props.id;
    options.autoPan = props.autoPan;
    options.element = element;
    options.position = undefined;
    return options;
}
var PopupContext = createContext({});
function Popup(props) {
    var withComponent = props.withComponent;
    var popup = useRef();
    var popupEl = useRef(null);
    var map = useMapContext().map;
    function closePopup() {
        if (popup.current && popupEl.current) {
            popupEl.current.setAttribute('style', 'display:none ');
            popup.current.setPosition(undefined);
        }
    }
    function openPopup(coordinate) {
        if (popup.current && popupEl.current) {
            popupEl.current.setAttribute('style', 'dispaly:block ');
            popup.current.setPosition(coordinate);
        }
    }
    useEffect(function () {
        //  throw error if popup dont have content or component
        if (!props.withComponent && !props.content) {
            throw Error('Popup cannot be empty, it should have content as string or withComponent render function to render custom popup');
        }
        if (popupEl.current && map) {
            popupEl.current.setAttribute('style', 'display:none');
            popup.current = new Overlay(generatePopupOptions(props, popupEl.current));
            map.addOverlay(popup.current);
            if (props.defaultPosition) {
                openPopup(props.defaultPosition);
            }
        }
    }, [map]);
    return (React.createElement("div", { ref: popupEl, className: "ol-popup", style: { display: 'none' } },
        withComponent ? (withComponent(closePopup, openPopup)) : (React.createElement(React.Fragment, null,
            React.createElement("span", { className: "ol-popup-closer", onClick: closePopup }),
            React.createElement("div", { className: "pop-content" }, props.content))),
        React.createElement(PopupContext.Provider, { value: { popup: popup, show: openPopup, hide: closePopup, id: uuid() } }, props.children)));
}
var usePopup = function () { return useContext(PopupContext); };
//# sourceMappingURL=Popup.js.map

function isEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
//# sourceMappingURL=utils.js.map

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

var lodash_throttle = throttle;

/**
 * @description Generate marker styles from component props
 * @param {IMarkerProps} props marker props
 * @returns {Style} style to be applied to the marker
 */
function getMarkerStyles(props) {
    var color = props.color, icon = props.icon, width = props.width;
    var options = {};
    if (icon) {
        options.image = new Icon({ src: icon });
        return new Style(options);
    }
    options.stroke = new Stroke({
        color: props.stroke || DEFAULT_COLOR,
        width: props.strokeWidth || 8
    });
    options.image = new Circle({
        radius: width || 8,
        fill: new Fill({ color: color || DEFAULT_COLOR })
    });
    return new Style(options);
}
function Marker(props) {
    var marker = useRef(null);
    var previousProps = usePrevious(props);
    var VectorContext = useVectorContext();
    var TooltipContext = useToolTip();
    var PopupContext = usePopup();
    var previousVectorContext = usePrevious(VectorContext);
    /**
     * @description Check if marker should be updated based on props
     * @param props
     * @param prevProps
     */
    function shouldMarkerUpdate(props, prevProps) {
        if (prevProps) {
            return isEqual(props.position, prevProps.position);
        }
        return true;
    }
    /**
     * @description Generate marker feature and add it to map
     * @param props
     */
    function addMarkerToMap(props) {
        /**
         * Removes the current marker if exists to prevent add duplicated features
         * @see https://openlayers.org/en/v6.1.1/doc/errors/#58
         */
        if (marker.current) {
            VectorContext.vector.getSource().removeFeature(marker.current);
        }
        marker.current = new Feature({
            // set the position of the marker
            geometry: new Point(props.position)
        });
        marker.current.set('color', props.color);
        // set marker styles
        marker.current.setStyle(getMarkerStyles(props));
        // Add the marker as a feature to vector layer
        VectorContext.vector.getSource().addFeature(marker.current);
    }
    /**
     * @description drag event handler
     * @param {ITranslateEvent} event
     */
    function handleDragEnd(event) {
        // check if callback is passed through props and call it with new and old
        // coordinates
        props.onDragEnd && props.onDragEnd(event.coordinate, event.startCoordinate);
    }
    /**
     * @description Check if marker have a tooltip and shows it
     * @param {MapBrowserEvent} event
     */
    function checkForTooltip(event) {
        var map = VectorContext.map;
        map.forEachFeatureAtPixel(event.pixel, function (feature) {
            if (!feature) {
                return;
            }
            if (feature.get('withTooltip') && feature.get('tooltipId') === TooltipContext.id) {
                // @ts-ignore
                TooltipContext.show(feature.getGeometry().getCoordinates());
                return;
            }
            else {
                return;
            }
        });
    }
    /**
     * @description Creates the tooltip for current marker
     * @param {MapBrowserEvent} event
     */
    function createTooltip(event) {
        TooltipContext.hide();
        if (event.dragging) {
            return;
        }
        var throtteledCheck = lodash_throttle(checkForTooltip, 100, { trailing: true });
        throtteledCheck(event);
        return;
    }
    /**
     * @description Creates popup
     * @param {MapBrowserEvent} event
     */
    function createPopup(event) {
        var map = VectorContext.map;
        // always hide the tooltip on `click` event
        PopupContext.hide();
        // loop throught features and show tooltip for detected feature
        map.forEachFeatureAtPixel(event.pixel, function (feature) {
            if (feature.get('withPopup')) {
                if (feature.get('popupId') === PopupContext.id) {
                    // @ts-ignore
                    PopupContext.show(marker.current.getGeometry().getCoordinates());
                }
                else {
                    PopupContext.hide();
                    return;
                }
                return;
            }
            return;
        });
    }
    /**
     * @description Checks if the marker is draggable and mapcontext updated
     * to apply drag interaction to the marker
     */
    useEffect(function () {
        if (props.isDraggable && VectorContext.map && marker.current) {
            // create translate to bind translatable features to map context interaction
            var translate = new Translate({
                features: new Collection([marker.current])
            });
            // handle dragend
            translate.on('translateend', handleDragEnd);
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(translate);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isDraggable, previousVectorContext]);
    /**
     * @description update the parent vector context if exists and add feature to its
     * source
     */
    useEffect(function () {
        var map = VectorContext.map;
        // check if there is no vector layer throw an error
        if (!shouldMarkerUpdate(props, previousProps)) {
            return;
        }
        if (VectorContext.vector) {
            addMarkerToMap(props);
        }
        // check if marker has tooltip and creates it
        if (TooltipContext.tooltip && map && marker.current) {
            marker.current.set('withTooltip', true);
            marker.current.set('tooltipId', TooltipContext.id);
            map.on('pointermove', createTooltip);
        }
        if (PopupContext.popup && map) {
            if (marker.current) {
                marker.current.set('withPopup', true);
                marker.current.set('popupId', PopupContext.id);
            }
            map.on('click', createPopup);
        }
        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);
    /**
     * @description Check if position changes and apply it to the marker
     * component did update with new poistion
     */
    useEffect(function () {
        if (marker.current && props.position) {
            // set new position
            marker.current.setGeometry(new Point(props.position));
        }
    }, [props.position]);
    /**
     * @description Check if styling changed and apply new styles to the marker
     * component did update with new styles
     */
    useEffect(function () {
        if (marker.current) {
            // set new styles
            marker.current.setStyle(getMarkerStyles(props));
        }
        // eslint-disable-next-line
    }, [props.color, props.icon, props.stroke, props.strokeWidth]);
    return React.createElement("div", null, " ");
}

/**
 * @description Generate polygon styles from component props
 * @param {IPolygonProps} props polygon props
 * @returns {Style} style to be applied to the polygon
 */
function getPolygonStyles(props) {
    var options = {};
    options.fill = new Fill({
        color: props.color
            ? convertHexToRGBA(props.color, props.opacity || 0.3)
            : 'rgba(0, 0, 255, 0.1)'
    });
    options.stroke = new Stroke({
        color: props.strokeColor || 'red',
        width: props.strokeWidth || 2
    });
    return new Style(options);
}
function Polygon$1(props) {
    var polygon = useRef();
    var VectorContext = useVectorContext();
    var previousVectorContext = usePrevious(VectorContext);
    useEffect(function () {
        polygon.current = new Feature({
            geometry: new Polygon(props.coordinates)
        });
        // eslint-disable-next-line
    }, []);
    /**
     * @description Checks if the polygon is draggable and mapcontext updated
     * to apply drag interaction to the polygon
     */
    useEffect(function () {
        if (props.isDraggable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            var translate = new Translate({
                features: new Collection([polygon.current])
            });
            // handle dragend
            translate.on('translateend', function (event) {
                event.stopPropagation();
                // @ts-ignore
                var coordinates = polygon.current.getGeometry().getCoordinates();
                // check if callback is passed through props and call it with new and old
                // coordinates
                props.onDragEnd && props.onDragEnd(coordinates);
            });
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(translate);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isDraggable]);
    /**
     * @description Checks if the polygon is draggable and mapcontext updated
     * to apply drag interaction to the polygon
     */
    useEffect(function () {
        if (props.isEditable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            var modify = new Modify({
                features: new Collection([polygon.current])
            });
            // handle dragend
            modify.on('modifyend', function (event) {
                event.stopPropagation();
                // @ts-ignore
                var coordinates = polygon.current.getGeometry().getCoordinates();
                // check if callback is passed through props and call it with new and old
                // coordinates
                props.onEditEnd && props.onEditEnd(coordinates);
            });
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(modify);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isEditable]);
    /**
     * @description update the parent vector context if exists and add feature to its
     * source
     */
    useEffect(function () {
        // check if there is no vector layer throw an error
        if (VectorContext && !VectorContext.vector && previousVectorContext) {
            throw new Error('Vector layer is not found, Polygon maybe defined without vector layer component');
        }
        if (VectorContext.vector && polygon.current) {
            // set polygon styles
            polygon.current.setStyle(getPolygonStyles(props));
            // Add the polygon as a feature to vector layer
            VectorContext.vector.getSource().addFeature(polygon.current);
        }
        return function () {
            if (polygon.current && VectorContext.vector) {
                VectorContext.vector.getSource().removeFeature(polygon.current);
            }
        };
        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);
    return React.createElement("div", null);
}
//# sourceMappingURL=Polygon.js.map

function DrawInteraction(props) {
    var VectorContext = useVectorContext();
    var MapContext = useMapContext();
    /**
     * @description Return the vector source from props or vector context if exists
     * @param {IDrawInteractionProps} props
     * @returns {?VectorSource}
     */
    function getSourceFromProps(props) {
        if (props.source) {
            return props.source;
        }
        if (VectorContext.vector) {
            return VectorContext.vector.getSource();
        }
        throw Error('No Vector Layers found attached to map, Vector layer is required to draw features');
    }
    /**
     * @description Generates the draw options to be passed to draw interaction
     * @param {IDrawInteractionProps} props
     * @returns {DrawOptions}
     */
    function getDrawOptions(props) {
        // Init options with the default type 'Polygon'
        var options = { type: 'Polygon' };
        if (props.type) {
            options.type = props.type;
        }
        options.source = getSourceFromProps(props);
        return options;
    }
    /**
     * @description Add modify and translate interaction to drawn feature
     * @param {Feature} feature
     */
    function addInteractionsToDrawnFeature(feature) {
        var featureCollection = new Collection([feature]);
        // Create the translate interaction
        var translate = new Translate({
            features: featureCollection
        });
        translate.on('translateend', function (event) {
            event.stopPropagation();
            // @ts-ignore
            var coordinates = feature.getGeometry().getCoordinates();
            // check if callback is passed through props and call it with new and old
            // coordinates
            props.onDragEnd && props.onDragEnd(coordinates);
        });
        // create modify interaction
        var modify = new Modify({
            features: featureCollection
        });
        modify.on('modifyend', function (event) {
            event.stopPropagation();
            // @ts-ignore
            var coordinates = feature.getGeometry().getCoordinates();
            // check if callback is passed through props and call it with new and old
            // coordinates
            props.onEditEnd && props.onEditEnd(coordinates);
        });
        MapContext.map.getInteractions().extend([modify, translate]);
    }
    /**
     * Event handler for draw finish
     * @param {DrawEvent} event
     */
    function handleDrawEnd(event) {
        event.feature.setStyle(defaultPolygonStyle);
        if (props.allowUpdateDrawnFeatures) {
            addInteractionsToDrawnFeature(event.feature);
        }
        if (props.onDrawEnd) {
            props.onDrawEnd && props.onDrawEnd(event.feature, event.target);
        }
    }
    /**
     * @description create a draw interaction and return it to be used
     * @param {IDrawInteractionProps} props
     * @returns {Draw}
     */
    function createDrawInteraction(props) {
        var drawInteraction = new Draw(getDrawOptions(props));
        drawInteraction.on('drawend', handleDrawEnd);
        return drawInteraction;
    }
    /**
     * @description Apply the draw interaction to map
     * Component did mount
     */
    useEffect(function () {
        if (MapContext.map && VectorContext.vector) {
            MapContext.map.addInteraction(createDrawInteraction(props));
        }
        // eslint-disable-next-line
    }, [MapContext.map, VectorContext.vector]);
    return React.createElement(React.Fragment, null);
}
//# sourceMappingURL=draw.js.map

/**
 * inject component with a trasformation object to help transform from pixel to geometry coordinates
 * and reverse
 * @param {Number} width
 * @param {Number} height
 * @param {Array<Coordinate>} controlPoints
 * @returns {React.ComponentType}
 */
function WithPixelTransformation(width, height, controlPoints) {
    // Init Helmert Transformation
    var transformation = new transform.Helmert();
    // set control points to transformation
    transformation.setControlPoints(controlPoints, [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height]
    ]);
    return function (WrapperComponent) {
        return /** @class */ (function (_super) {
            __extends(class_1, _super);
            function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            class_1.prototype.render = function () {
                return React.createElement(WrapperComponent, __assign({}, this.props, { transformation: transformation }));
            };
            return class_1;
        }(React.Component));
    };
}
//# sourceMappingURL=withPixelTransformation.js.map

//# sourceMappingURL=index.js.map

export { transform, Map, Image, Marker, VectorLayer as Vector, Image as ImageLayer, Polygon$1 as Polygon, Tooltip, Popup, DrawInteraction, WithPixelTransformation as withPixelTransformation };
//# sourceMappingURL=index.es.js.map
