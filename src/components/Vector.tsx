import React, { useRef, useEffect, useContext } from 'react';
import Vector, { Options } from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useMapContext, IMapContext } from './Map';
import { createContext } from '../core/context';
import { Style } from 'ol/style';
import { usePrevious } from '../custom/hooks';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';
import VectorRenderType from 'ol/layer/VectorRenderType';
import { Translate } from 'ol/interaction';

// eslint-disable-next-line
export interface IVectorLayerProps {
    source?: VectorSource;
    style?: Style;
    children?: React.ReactNode;
    isWebGl?: boolean;
    containerStyle?: React.CSSProperties;
    renderMode?: VectorRenderType;
    withTranslate?: boolean;
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
    if (props.renderMode) {
        options.renderMode = props.renderMode;
    }
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

    function addTranslateToFeatures(): void {
        if (MapContextValues.map && vector.current) {
            const vectorFeatures = vector.current.getSource().getFeaturesCollection();
            console.log('functionaddTranslateToFeatures -> vectorFeatures', vectorFeatures);
            const translateInteraction = new Translate();
            MapContextValues.map.getInteractions().extend([translateInteraction]);
        }
    }

    function checkAndRemoveTranslate(): void {
        MapContextValues.map.getInteractions().forEach(interaction => {
            if (interaction instanceof Translate) {
                MapContextValues.map.removeInteraction(interaction);
            }
        });
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
            console.log('props.withTranslate', props.withTranslate);

            if (props.withTranslate) {
                addTranslateToFeatures();
            } else {
                checkAndRemoveTranslate();
            }

            MapContextValues.map.addLayer(vector.current);
        }
        //eslint-disable-next-line
    }, [MapContextValues.map, previousMapContext]);

    /**
     * @description return a provider to create vector context with this vector layer
     */
    return (
        <div style={props.containerStyle}>
            <VectorContext.Provider value={{ ...MapContextValues, vector: vector.current }}>
                {props.children}
            </VectorContext.Provider>
        </div>
    );
}

export { VectorLayer as Vector };

export interface IVectorContext extends IMapContext {
    vector: Vector;
}

export const useVectorContext = (): IVectorContext => useContext(VectorContext);
