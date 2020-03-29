import React, { useRef, useEffect, useContext, useState } from 'react';
import { getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import { ProjectionLike } from 'ol/proj';
import { useMapContext, IMapContext } from './Map';
import { View } from 'ol';
import { ViewOptions } from 'ol/View';
import { createContext } from '../core/context';
import { usePrevious } from '../custom/hooks';
// eslint-disable-next-line

export type ImageLoadStatus = 'loading' | 'error' | 'ready';
export interface IImageProps {
    src: string;
    width: number;
    height: number;
    children?: React.ReactNode;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    errorMessage?: string | React.ReactElement;
    loadingMessage?: string | React.ReactElement;
    onImageLoad?: (status: ImageLoadStatus) => void;
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
    const previousImageProps = usePrevious(props);
    const [state, setState] = useState<ImageLoadStatus>();

    /**
     * @description generate image layer and add it to map
     * @param {IImageProps} props
     */
    function addImageToMap(props: IImageProps): void {
        // if there is image currently rendered, remove it to not duplicate the layer
        // @see https://openlayers.org/en/v6.1.1/doc/errors/#58
        if (image.current) {
            MapContextValues.map.removeLayer(image.current);
        }

        // create the static image source
        const source = new Static({
            url: props.src,
            projection: getImageSourceProjection(props.width, props.height),
            imageExtent: getExtent(props.width, props.height)
        });

        source.on('imageloadstart', function() {
            setState('loading');
        });
        source.on('imageloadend', function() {
            setState('ready');
            props.onImageLoad && props.onImageLoad('ready');
        });

        source.on('imageloaderror', function() {
            setState('error');
            props.onImageLoad && props.onImageLoad('error');
        });

        // Create new Image layer and view
        image.current = new ImageLayer({ source });
        const imageView = new View(getImageViewOptions(props));

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
    function shouldComponentUpdate(
        props: IImageProps,
        prevProps: IImageProps | undefined
    ): boolean {
        if (!image || !image.current) {
            return true;
        }
        if (prevProps) {
            return (
                prevProps.src !== props.src ||
                prevProps.width !== props.width ||
                prevProps.height !== props.height
            );
        }
        return true;
    }

    /**
     * Image had been Initialized and map is now exists so we start
     * to add the image layer to the map instance alongside with changing the map view
     * to a new view with the pixel projection created for the image
     */
    useEffect((): void => {
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

    function renderImageLayer(): React.ReactNode | string | React.ReactElement {
        if (state === 'loading' && props.loadingMessage) {
            return props.loadingMessage;
        }
        if (state === 'error' && props.errorMessage) {
            return props.errorMessage;
        }
        return props.children;
    }

    return (
        <ImageContext.Provider value={{ ...MapContextValues, vector: image.current }}>
            <div>{renderImageLayer()}</div>
        </ImageContext.Provider>
    );
}

export { Image };

interface IImageContext extends IMapContext {
    imageLayer: ImageLayer;
}

export const useImageContext = (): IImageContext => useContext(ImageContext);
