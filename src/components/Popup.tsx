import React, { useEffect, useRef, useContext } from 'react';
import { useMapContext } from './Map';
import Overlay, { Options as OverlayOptions, default as OverlayType } from 'ol/Overlay';
import { createContext } from '../core/context';
import { Coordinate } from 'ol/coordinate';
import uuid from 'uuid';
// eslint-disable-next-line
export interface IPopupProps {
    children: React.ReactChild;
    content?: string;
    className?: string;
    id?: string;
    autoPan?: boolean;
    /** render function to render custom component in the popup */
    withComponent?: (closePopup: () => void) => React.ReactElement;
}
/**
 * @description Generates options for the overlaly
 * @param {IPopupProps} props
 * @param {HTMLDivElement} element
 */
function generatePopupOptions(props: IPopupProps, element: any): OverlayOptions {
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
    const { withComponent } = props;
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
        //  throw error if popup dont have content or component
        if (!props.withComponent && !props.content) {
            throw Error(
                'Popup cannot be empty, it should have content as string or withComponent render function to render custom popup'
            );
        }
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
                {withComponent ? (
                    withComponent(closePopup)
                ) : (
                    <>
                        <span className="ol-popup-closer" onClick={closePopup}></span>
                        <div className="pop-content">{props.content}</div>
                    </>
                )}
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
