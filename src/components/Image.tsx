import React, { useRef, useEffect, useContext } from 'react';
import { getCenter } from 'ol/extent';
import ImageLayer, { Options as ImageOptions } from 'ol/layer/Image';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import { ProjectionLike } from 'ol/proj';
import { useMapContext, IMapContext } from './Map';
import { View } from 'ol';
import { ViewOptions } from 'ol/View';
import { createContext } from '../core/context';
import { usePrevious } from '../custom/hooks';
// eslint-disable-next-line
export interface IImageProps {
	src: string;
	width: number;
	height: number;
	children?: React.ReactNode;
	zoom?: number;
	minZoom?: number;
	maxZoom?: number;
}

/**
 * @description Create an empty context for the image layer
 */
const ImageContext = createContext({});

/**
 * @description Generates the extnet array to be used
 * @param {Number} width to consider in extent
 * @param {Number} height to consider in extent
 * @returns {Array<Number>}
 */
const getExtent = (width: number, height: number): number[] => [0, 0, width, height];

/**
 * @description Gnerate the pixel projection to be used in the image layer
 * @param {Number} width of the image
 * @param {Number} height of the image
 * @returns {ProjectionLike}
 */
function getImageSourceProjection(width: number, height: number): ProjectionLike {
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
function getImageOptions(props: IImageProps): ImageOptions {
	const options: ImageOptions = {};

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
function getImageViewOptions(props: IImageProps): ViewOptions {
	/**
	 * `ViewOptions`
	 * zoom values added by default to 2 and min = 1, max = 6,
	 * It can be modified via props
	 */
	const options: ViewOptions = {
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

function Image(props: IImageProps): JSX.Element {
	const image = useRef<ImageLayer | null>(null);
	const MapContextValues = useMapContext();
	const previousMapContext = usePrevious(MapContextValues);

	/**
	 * Initialize the image layer
	 * component did mount
	 */
	useEffect((): void => {
		image.current = new ImageLayer(getImageOptions(props));
		// eslint-disable-next-line
	}, []);

	/**
	 * Image had been Initialized and map is now exists so we start
	 * to add the image layer to the map instance alongside with changing the map view
	 * to a new view with the pixel projection created for the image
	 */
	useEffect((): void => {
		if (MapContextValues && !MapContextValues.map && previousMapContext) {
			throw new Error('Map is not found, Image Layer maybe defined outsite map component');
		}
		if (MapContextValues.map && image.current) {
			const imageView = new View(getImageViewOptions(props));
			MapContextValues.map.addLayer(image.current);
			MapContextValues.map.setView(imageView);
		}
		// eslint-disable-next-line
	}, [MapContextValues.map, previousMapContext]);

	return (
		<ImageContext.Provider value={{ ...MapContextValues, vector: image.current }}>
			{props.children}
		</ImageContext.Provider>
	);
}

export default Image;

interface IImageContext extends IMapContext {
	imageLayer: ImageLayer;
}

export const useImageContext = (): IImageContext => useContext(ImageContext);
