import React from 'react';
import ImageLayer from 'ol/layer/Image';
import { IMapContext } from './Map';
export interface IImageProps {
    src: string;
    width: number;
    height: number;
    children?: React.ReactNode;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
}
declare function Image(props: IImageProps): JSX.Element;
export default Image;
interface IImageContext extends IMapContext {
    imageLayer: ImageLayer;
}
export declare const useImageContext: () => IImageContext;
