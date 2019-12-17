import React, { useEffect, useRef, useContext } from 'react';
import { useMapContext } from './Map';
import Overlay, { Options as OverlayOptions, default as OverlayType } from 'ol/Overlay';
import { createContext } from '../core/context';
import { Coordinate } from 'ol/coordinate';
import uuid from 'uuid';
// eslint-disable-next-line
export interface IPopupProps {
    children: React.ReactChild;
    content: string;
    className?: string;
    id?: string;
    autoPan?: boolean;
}
/**
 * @description Generates options for the overlaly
 * @param {IPopupProps} props
 * @param {HTMLDivElement} element
 */
function generatePopupOptions(props: IPopupProps, element: HTMLDivElement): OverlayOptions {
    const options: OverlayOptions = {};

    options.className = props.className;
    options.id = props.id;
    options.autoPan = props.autoPan;
    options.element = element;
    options.position = undefined;

    return options;
}

const PopupContext = createContext({});

function Popup(props: IPopupProps): JSX.Element {
    const popup = useRef<OverlayType>();
    const popupEl = useRef<HTMLDivElement>(null);

    const { map } = useMapContext();

    function closePopup() {
        if (popup.current) {
            popup.current.setPosition(undefined);
        }
    }

    function triggerPopup(coordinate: Coordinate | undefined): void {
        if (popup.current) {
            popup.current.setPosition(coordinate);
        }
    }

    useEffect(() => {
        if (popupEl.current && map) {
            popup.current = new Overlay(generatePopupOptions(props, popupEl.current));
            map.addOverlay(popup.current);
        }
    }, [map]);

    return (
        <PopupContext.Provider
            value={{ popup: popup, show: triggerPopup, hide: closePopup, id: uuid() }}
        >
            <div ref={popupEl} className="ol-popup">
                <span className="ol-popup-closer" onClick={closePopup}></span>
                <div className="pop-content">{props.content}</div>
                {props.children}
            </div>
        </PopupContext.Provider>
    );
}

export default Popup;

export interface IPopupContext {
    popup: OverlayType;
    show: (coordinate: Coordinate) => void;
    hide: () => void;
}

export const usePopup = () => useContext(PopupContext);
