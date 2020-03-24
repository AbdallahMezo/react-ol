import React from 'react';
import { default as MapType } from 'ol/Map';
import 'ol/ol.css';
export interface IMapProps {
    children: React.ReactNode;
    zoom?: number;
    center?: number[];
    target?: HTMLDivElement;
    type?: 'osm' | 'image';
    containerStyle?: React.CSSProperties;
}
declare function Map(props: IMapProps): JSX.Element;
export default Map;
export interface IMapContext {
    map: MapType;
}
export declare const useMapContext: () => IMapContext;
