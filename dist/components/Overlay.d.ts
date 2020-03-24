import React from 'react';
import { default as OverlayType } from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import { Coordinate } from 'ol/coordinate';
export interface IOverlayProps {
    children: React.ReactNode;
    position?: OverlayPositioning;
    id?: string;
    className?: string;
    coordinate?: Coordinate;
    autoPan?: boolean;
}
declare function CustomOverlay(props: IOverlayProps): JSX.Element;
export default CustomOverlay;
export interface OverlayContext {
    overlay: OverlayType;
    showOverlay: (coordinate: Coordinate) => void;
    hideOverlay: () => void;
}
export declare const useOverlay: () => OverlayContext;
