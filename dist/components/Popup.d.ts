import React from 'react';
import { default as OverlayType } from 'ol/Overlay';
import { Coordinate } from 'ol/coordinate';
export interface IPopupProps {
    children: React.ReactChild;
    content?: string;
    className?: string;
    id?: string;
    autoPan?: boolean;
    defaultPosition?: Coordinate | undefined;
    /** render function to render custom component in the popup */
    withComponent?: (closePopup: () => void, openPopup: (coordinate: Coordinate | undefined) => void) => React.ReactElement;
}
declare function Popup(props: IPopupProps): JSX.Element;
export default Popup;
export interface IPopupContext {
    popup: OverlayType;
    show: (coordinate: Coordinate) => void;
    hide: () => void;
}
export declare const usePopup: () => any;
