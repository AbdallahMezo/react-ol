import React, { useRef, useEffect, useContext } from 'react';
import Overlay, { Options as OverlayOptions, default as OverlayType } from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import { Coordinate } from 'ol/coordinate';
import { useMapContext } from './Map';
import { createContext } from '../core/context';

export interface IOverlayProps {
    children: React.ReactNode;
    position?: OverlayPositioning;
    id?: string;
    className?: string;
    coordinate?: Coordinate;
    autoPan?: boolean;
}

function generateOverlayOptions(props: IOverlayProps, element: HTMLDivElement): OverlayOptions {
    const options: OverlayOptions = {};

    options.element = element;
    options.offset = [15, 0];
    options.autoPan = props.autoPan;
    options.className = props.className ? props.className : '';
    options.id = props.id ? props.id : '';
    options.position = props.coordinate;
    options.positioning = props.position ? props.position : OverlayPositioning.CENTER_LEFT;

    return options;
}

const OverlayContext = createContext({});

function CustomOverlay(props: IOverlayProps): JSX.Element {
    const overlayRef = useRef<OverlayType>();
    const overlayEl = useRef<HTMLDivElement>(null);
    const { map } = useMapContext();

    useEffect(() => {
        if (overlayEl.current && map) {
            overlayRef.current = new Overlay(generateOverlayOptions(props, overlayEl.current));
            map.addOverlay(overlayRef.current);
        }
    }, [map]);

    /**
     * @description troggle the overlay on
     * @param {Coordinate} coordinate
     */
    function showOverlay(coordinate: Coordinate) {
        if (overlayRef.current) {
            overlayRef.current.setPosition(coordinate);
        }
    }

    /**
     * @description Toggle the overlay off
     */
    function hideOverlay() {
        if (overlayRef.current) {
            overlayRef.current.setPosition(undefined);
        }
    }

    return (
        <OverlayContext.Provider value={{ overlay: overlayRef, showOverlay, hideOverlay }}>
            <div ref={overlayEl}>{props.children}</div>
        </OverlayContext.Provider>
    );
}

export default CustomOverlay;

export interface OverlayContext {
    overlay: OverlayType;
    showOverlay: (coordinate: Coordinate) => void;
    hideOverlay: () => void;
}

export const useOverlay = (): OverlayContext => useContext(OverlayContext);
