import React, { useRef, useEffect, useContext } from 'react';
import Vector, { Options } from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useMapContext, IMapContext } from './Map';
import { createContext } from '../core/context';
import { Style } from 'ol/style';
import { usePrevious } from '../custom/hooks';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';

// eslint-disable-next-line
export interface IVectorLayerProps {
    source?: VectorSource;
    style?: Style;
    children?: React.ReactNode;
    isWebGl?: boolean;
    /** `LiteralStyles`
     */
    webGlStyle?: any;
}

const VectorContext = createContext({});

/**
 * @description Generates vector options from component props
 * @param {IVectorLayerProps} props
 * @returns {Options}
 */
function getVectorOptions(props: IVectorLayerProps): Options {
    const options: Options = {};

    options.source = props.source || new VectorSource({ wrapX: false, useSpatialIndex: false });
    options.style = props.style || new Style({});
    options.zIndex = 1;
    if (props.isWebGl && props.webGlStyle) {
        // @ts-ignore
        options.style = props.webGlStyle;
    }

    return options;
}

function VectorLayer(props: IVectorLayerProps): JSX.Element {
    const MapContextValues = useMapContext();
    const vector = useRef<Vector | null>(null);
    const previousMapContext = usePrevious(MapContextValues);

    function createVectorLayer(): void {
        if (props.isWebGl) {
            vector.current = new WebGLPointsLayer(getVectorOptions(props));
            return;
        } else {
            vector.current = new Vector(getVectorOptions(props));
        }
    }

    /**
     * component did mount
     * @description Initialize vector layer
     */
    useEffect((): (() => void) => {
        createVectorLayer();
        return (): void => {
            if (vector.current && MapContextValues.map) {
                MapContextValues.map.removeLayer(vector.current);
            }
        };
        // eslint-disable-next-line
    }, []);

    /**
     * @description Check map context and add this vector to the map
     */
    useEffect((): void => {
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
    return (
        <div>
            <VectorContext.Provider value={{ ...MapContextValues, vector: vector.current }}>
                {props.children}
            </VectorContext.Provider>
        </div>
    );
}

export default VectorLayer;

export interface IVectorContext extends IMapContext {
    vector: Vector;
}

export const useVectorContext = (): IVectorContext => useContext(VectorContext);
