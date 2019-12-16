import React, { useRef, useEffect, useContext } from 'react';
import Vector, { Options } from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useMapContext, IMapContext } from './Map';
import { createContext } from '../core/context';
import { Style } from 'ol/style';
import { usePrevious } from '../custom/hooks';

// eslint-disable-next-line
export interface IVectorLayerProps {
    source?: VectorSource;
    style?: Style;
    children?: React.ReactNode;
}

const VectorContext = createContext({});

/**
 * @description Generates vector options from component props
 * @param {IVectorLayerProps} props
 * @returns {Options}
 */
function getVectorOptions(props: IVectorLayerProps): Options {
    const options: Options = {};

    options.source = props.source || new VectorSource({ wrapX: false });
    options.style = props.style || new Style({});
    options.zIndex = 999;

    return options;
}

function VectorLayer(props: IVectorLayerProps): JSX.Element {
    const MapContextValues = useMapContext();
    const vector = useRef<Vector | null>(null);
    const previousMapContext = usePrevious(MapContextValues);

    /**
     * component did mount
     * @description Initialize vector layer
     */
    useEffect((): void => {
        vector.current = new Vector(getVectorOptions(props));
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
        if (MapContextValues.map && vector.current) {
            MapContextValues.map.addLayer(vector.current);
        }
        //eslint-disable-next-line
    }, [MapContextValues.map, previousMapContext]);

    /**
     * @description return a provider to create vector context with this vector layer
     */
    return (
        <VectorContext.Provider value={{ ...MapContextValues, vector: vector.current }}>
            {props.children}
        </VectorContext.Provider>
    );
}

export default VectorLayer;

export interface IVectorContext extends IMapContext {
    vector: Vector;
}

export const useVectorContext = (): IVectorContext => useContext(VectorContext);
