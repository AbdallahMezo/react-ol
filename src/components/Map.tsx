import React, { useRef, useEffect, useCallback, useContext } from 'react';
import BaseMap, { default as MapType } from 'ol/Map';
import { MapOptions } from 'ol/PluggableMap';
import { View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { createContext } from '../core/context';
import { ViewOptions } from 'ol/View';

import 'ol/ol.css';
import { usePrevious } from '../custom/hooks';

export interface IMapProps {
    children: React.ReactNode;
    zoom?: number;
    center?: number[];
    target?: HTMLDivElement;
    type?: 'osm' | 'image';
    containerStyle?: React.CSSProperties;
}

function getMapLayers(type: IMapProps['type']): MapOptions['layers'] {
    if (type === 'osm') {
        return [new TileLayer({ source: new OSM() })];
    }
    return;
}

function getViewOptions(props: IMapProps): ViewOptions {
    const options: ViewOptions = {};

    options.zoom = props.zoom ? props.zoom : 3;
    options.center = props.center ? props.center : [0, 0];

    return options;
}

/**
 * @description Generates map options
 * @param {IMapProps} props to generate options from
 * @returns {MapOptions}
 */
function getMapOptions(props: IMapProps): MapOptions {
    let options: MapOptions = {};

    // Define map view
    options.view = new View(getViewOptions(props));

    // set default map layer
    if (props.type) {
        options.layers = getMapLayers(props.type);
    }

    return options;
}

const MapContext = createContext({});

function Map(props: IMapProps): JSX.Element {
    const mapEl = useRef<HTMLDivElement>(null);
    const olMap = useRef<MapType>();
    const previousProps = usePrevious(props);

    if (!props.children && props.type !== 'osm') {
        throw new Error('Map component should contain at least raster layer');
    }

    /**
     * @description Generates ol Map with custom options
     * @param {MapOptions} options of the map @see {MapOptions}
     */
    function generateMap(options: MapOptions): void {
        olMap.current = new BaseMap(options);
        if (mapEl.current) {
            olMap.current.setTarget(props.target || mapEl.current);
        }
    }

    /**
     * @description Memized callback to update map's center if props changed
     * @param {Array<Number>} center new center of the map
     */
    function updateCenter(center: number[]): void {
        if (olMap.current) {
            olMap.current.getView().animate({ center });
        }
    }

    /**
     * @description Memized callback to update map's zoom if props changed
     * @param {Number} zoom new zoom of the map
     */
    const updateZoom = useCallback(function(zoom: number): void {
        if (olMap.current) {
            olMap.current.getView().animate({ zoom });
        }
    }, []);

    /**
     * @description Component did mount
     */
    useEffect((): void => {
        if (mapEl.current) {
            generateMap(getMapOptions(props));
        }
        // eslint-disable-next-line
    }, []);

    /**
     * @description Component did update
     * update zoom when zoom changes
     */
    useEffect((): void => {
        if (olMap.current && props.zoom) {
            updateZoom(props.zoom);
        }
    }, [props.zoom, updateZoom]);

    /**
     * @description Component did update
     * update center when center changes
     */
    useEffect((): void => {
        if (previousProps) {
            if (previousProps.center !== props.center && props.center) {
                updateCenter(props.center);
            }
        }
    }, [props.center, updateCenter]);

    return (
        <div ref={mapEl} style={{ width: '100%', height: '100%', ...props.containerStyle }}>
            <MapContext.Provider value={{ ...props, map: olMap.current }}>
                {props.children}
            </MapContext.Provider>
        </div>
    );
}

export { Map };

export interface IMapContext {
    map: MapType;
}

export const useMapContext = (): IMapContext => useContext(MapContext);
