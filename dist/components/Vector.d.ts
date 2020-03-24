import React from 'react';
import Vector from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { IMapContext } from './Map';
import { Style } from 'ol/style';
export interface IVectorLayerProps {
    source?: VectorSource;
    style?: Style;
    children?: React.ReactNode;
    isWebGl?: boolean;
    /** `LiteralStyles`
     */
    webGlStyle?: any;
}
declare function VectorLayer(props: IVectorLayerProps): JSX.Element;
export default VectorLayer;
export interface IVectorContext extends IMapContext {
    vector: Vector;
}
export declare const useVectorContext: () => IVectorContext;
