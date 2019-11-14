'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var BaseMap = _interopDefault(require('ol/Map'));
var ol = require('ol');
var TileLayer = _interopDefault(require('ol/layer/Tile'));
var OSM = _interopDefault(require('ol/source/OSM'));
require('ol/ol.css');
var extent = require('ol/extent');
var ImageLayer = _interopDefault(require('ol/layer/Image'));
var Projection = _interopDefault(require('ol/proj/Projection'));
var Static = _interopDefault(require('ol/source/ImageStatic'));
var Vector = _interopDefault(require('ol/layer/Vector'));
var VectorSource = _interopDefault(require('ol/source/Vector'));
var style = require('ol/style');
var interaction = require('ol/interaction');
var Point = _interopDefault(require('ol/geom/Point'));
var geom = require('ol/geom');

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

var createContext = function (props) { return React__default.createContext(props); };

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
    options.view = new ol.View(getViewOptions(props));
    // set default map layer
    if (props.type) {
        options.layers = getMapLayers(props.type);
    }
    return options;
}
var MapContext = createContext({});
function Map(props) {
    var mapEl = React.useRef(null);
    var olMap = React.useRef();
    if (!props.children) {
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
    var updateCenter = React.useCallback(function (center) {
        if (olMap.current) {
            olMap.current.getView().animate({ center: center });
        }
    }, []);
    /**
     * @description Memized callback to update map's zoom if props changed
     * @param {Number} zoom new zoom of the map
     */
    var updateZoom = React.useCallback(function (zoom) {
        if (olMap.current) {
            olMap.current.getView().animate({ zoom: zoom });
        }
    }, []);
    /**
     * @description Component did mount
     */
    React.useEffect(function () {
        if (mapEl.current) {
            generateMap(getMapOptions(props));
        }
        // eslint-disable-next-line
    }, []);
    /**
     * @description Component did update
     * update zoom when zoom changes
     */
    React.useEffect(function () {
        if (olMap.current && props.zoom) {
            updateZoom(props.zoom);
        }
    }, [props.zoom, updateZoom]);
    /**
     * @description Component did update
     * update center when center changes
     */
    React.useEffect(function () {
        if (olMap.current && props.center) {
            updateCenter(props.center);
        }
    }, [props.center, updateCenter]);
    return (React__default.createElement(MapContext.Provider, { value: __assign({}, props, { map: olMap.current }) },
        React__default.createElement("div", { ref: mapEl, style: { width: '100%', height: '100%' } }, props.children)));
}
var useMapContext = function () { return React.useContext(MapContext); };

/**
 * @description Returns previous value, usually created to be used as a container for prev props
 * @param {T} value to be chached
 * @returns {?T}
 */
function usePrevious(value) {
    var previousRef = React.useRef();
    React.useEffect(function () {
        previousRef.current = value;
    });
    return previousRef.current;
}

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
    options.center = extent.getCenter(getExtent(props.width, props.height));
    return options;
}
function Image(props) {
    var image = React.useRef(null);
    var MapContextValues = useMapContext();
    var previousMapContext = usePrevious(MapContextValues);
    /**
     * Initialize the image layer
     * component did mount
     */
    React.useEffect(function () {
        image.current = new ImageLayer(getImageOptions(props));
        // eslint-disable-next-line
    }, []);
    /**
     * Image had been Initialized and map is now exists so we start
     * to add the image layer to the map instance alongside with changing the map view
     * to a new view with the pixel projection created for the image
     */
    React.useEffect(function () {
        if (MapContextValues && !MapContextValues.map && previousMapContext) {
            throw new Error('Map is not found, Image Layer maybe defined outsite map component');
        }
        if (MapContextValues.map && image.current) {
            var imageView = new ol.View(getImageViewOptions(props));
            MapContextValues.map.addLayer(image.current);
            MapContextValues.map.setView(imageView);
        }
        // eslint-disable-next-line
    }, [MapContextValues.map, previousMapContext]);
    return (React__default.createElement(ImageContext.Provider, { value: __assign({}, MapContextValues, { vector: image.current }) }, props.children));
}

var VectorContext = createContext({});
/**
 * @description Generates vector options from component props
 * @param {IVectorLayerProps} props
 * @returns {Options}
 */
function getVectorOptions(props) {
    var options = {};
    options.source = props.source || new VectorSource({ wrapX: false });
    options.style = props.style || new style.Style({});
    options.zIndex = 999;
    return options;
}
function VectorLayer(props) {
    var MapContextValues = useMapContext();
    var vector = React.useRef(null);
    var previousMapContext = usePrevious(MapContextValues);
    /**
     * component did mount
     * @description Initialize vector layer
     */
    React.useEffect(function () {
        vector.current = new Vector(getVectorOptions(props));
        // eslint-disable-next-line
    }, []);
    /**
     * @description Check map context and add this vector to the map
     */
    React.useEffect(function () {
        // Check if there is no map context throw an error
        if (MapContextValues && !MapContextValues.map && previousMapContext) {
            throw new Error('Map is not found, Layer maybe defined outsite map component');
        }
        if (MapContextValues.map && vector.current) {
            MapContextValues.map.addLayer(vector.current);
        }
        //eslint-disable-next-line
    }, [MapContextValues.map, previousMapContext]);
    /**
     * @description return a provider to create vector context with this vector layer
     */
    return (React__default.createElement(VectorContext.Provider, { value: __assign({}, MapContextValues, { vector: vector.current }) }, props.children));
}
var useVectorContext = function () { return React.useContext(VectorContext); };

/**
 * @description Default Polygon style
 */
var defaultPolygonStyle = new style.Style({
    fill: new style.Fill({ color: 'rgba(35, 187, 245, 0.2)' }),
    stroke: new style.Stroke({
        color: 'rgba(8, 184, 251, 1)',
        width: 2
    })
});
/**
 * @description Default marker style
 */
var defaultMarkerStyle = new style.Style({
    image: new style.Circle({
        fill: new style.Fill({ color: 'rgba(35, 187, 245, 1)' }),
        radius: 10,
        stroke: new style.Stroke({
            color: 'white',
            width: 2
        })
    })
});
var DEFAULT_COLOR = 'rgba(35, 187, 245, 1)';

/**
 * @description Generate marker styles from component props
 * @param {IMarkerProps} props marker props
 * @returns {Style} style to be applied to the marker
 */
function getMarkerStyles(props) {
    var color = props.color, icon = props.icon, stroke = props.stroke, width = props.width;
    var options = {};
    if (icon) {
        options.image = new style.Icon({ src: icon });
        return new style.Style(options);
    }
    options.stroke = new style.Stroke({ color: stroke || DEFAULT_COLOR });
    options.image = new style.Circle({
        radius: width || 8,
        fill: new style.Fill({ color: color || DEFAULT_COLOR })
    });
    return new style.Style(options);
}
function Marker(props) {
    var marker = React.useRef(null);
    var VectorContext = useVectorContext();
    var previousVectorContext = usePrevious(VectorContext);
    function handleDragEnd(event) {
        // check if callback is passed through props and call it with new and old
        // coordinates
        props.onDragEnd && props.onDragEnd(event.coordinate, event.startCoordinate);
    }
    /**
     * component did mount
     * @description Initialize the marker
     */
    React.useEffect(function () {
        //  init the marker
        marker.current = new ol.Feature({
            // set the position of the marker
            geometry: new Point(props.position)
        });
        // eslint-disable-next-line
    }, []);
    /**
     * @description Checks if the marker is draggable and mapcontext updated
     * to apply drag interaction to the marker
     */
    React.useEffect(function () {
        if (props.isDraggable && VectorContext.map && marker.current) {
            // create translate to bind translatable features to map context interaction
            var translate = new interaction.Translate({
                features: new ol.Collection([marker.current])
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
    React.useEffect(function () {
        // check if there is no vector layer throw an error
        if (VectorContext && !VectorContext.vector && previousVectorContext) {
            throw new Error('Vector layer is not found, Marker maybe defined without vector layer component');
        }
        if (VectorContext.vector && marker.current) {
            // set marker styles
            marker.current.setStyle(getMarkerStyles(props));
            // Add the marker as a feature to vector layer
            VectorContext.vector.getSource().addFeature(marker.current);
        }
        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);
    /**
     * @description Check if position changes and apply it to the marker
     * component did update with new poistion
     */
    React.useEffect(function () {
        if (marker.current && props.position) {
            // set new position
            marker.current.setGeometry(new Point(props.position));
        }
    }, [props.position]);
    /**
     * @description Check if styling changed and apply new styles to the marker
     * component did update with new styles
     */
    React.useEffect(function () {
        if (marker.current) {
            // set new styles
            marker.current.setStyle(getMarkerStyles(props));
        }
        // eslint-disable-next-line
    }, [props.color, props.icon, props.stroke, props.stroke]);
    return React__default.createElement(React__default.Fragment, null);
}

/**
 * @description Generate polygon styles from component props
 * @param {IPolygonProps} props polygon props
 * @returns {Style} style to be applied to the polygon
 */
function getPolygonStyles(props) {
    var options = {};
    options.fill = new style.Fill({ color: props.color || 'rgba(0, 0, 255, 0.1)' });
    options.stroke = new style.Stroke({
        color: props.strokeColor || 'red',
        width: props.strokeWidth || 2
    });
    return new style.Style(options);
}
function Polygon(props) {
    var polygon = React.useRef();
    var VectorContext = useVectorContext();
    var previousVectorContext = usePrevious(VectorContext);
    React.useEffect(function () {
        polygon.current = new ol.Feature({
            geometry: new geom.Polygon(props.coordinates)
        });
        // eslint-disable-next-line
    }, []);
    /**
     * @description Checks if the polygon is draggable and mapcontext updated
     * to apply drag interaction to the polygon
     */
    React.useEffect(function () {
        if (props.isDraggable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            var translate = new interaction.Translate({
                features: new ol.Collection([polygon.current])
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
    React.useEffect(function () {
        if (props.isEditable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            var modify = new interaction.Modify({
                features: new ol.Collection([polygon.current])
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
    React.useEffect(function () {
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
        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);
    return React__default.createElement(React__default.Fragment, null);
}

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
    // TODO: update interactions with modify and translate for this kind of needs
    /**
     * @description Add modify and translate interaction to drawn feature
     * @param {Feature} feature
     */
    function addInteractionsToDrawnFeature(feature) {
        var featureCollection = new ol.Collection([feature]);
        // Create the translate interaction
        var translate = new interaction.Translate({
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
        var modify = new interaction.Modify({
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
        var drawInteraction = new interaction.Draw(getDrawOptions(props));
        drawInteraction.on('drawend', handleDrawEnd);
        return drawInteraction;
    }
    /**
     * @description Apply the draw interaction to map
     * Component did mount
     */
    React.useEffect(function () {
        if (MapContext.map && VectorContext.vector) {
            MapContext.map.addInteraction(createDrawInteraction(props));
        }
        // eslint-disable-next-line
    }, [MapContext.map, VectorContext.vector]);
    return React__default.createElement(React__default.Fragment, null);
}

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
                return React__default.createElement(WrapperComponent, __assign({}, this.props, { transformation: transformation }));
            };
            return class_1;
        }(React__default.Component));
    };
}

exports.transform = transform;
exports.Map = Map;
exports.Image = Image;
exports.Marker = Marker;
exports.Vector = VectorLayer;
exports.ImageLayer = Image;
exports.Polygon = Polygon;
exports.DrawInteraction = DrawInteraction;
exports.withPixelTransformation = WithPixelTransformation;
//# sourceMappingURL=index.js.map
