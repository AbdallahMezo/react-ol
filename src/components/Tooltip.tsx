import React, { useEffect, useRef, useContext } from 'react';
import Overlay, { Options as OverlayOptions, default as OverlayType } from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import { Coordinate } from 'ol/coordinate';
import { useMapContext } from './Map';
import { createContext } from '../core/context';

export interface ITooltipProps {
    title: string;
    children: React.ReactNode;
    position?: OverlayPositioning;
    id?: string;
    className?: string;
    coordinate?: Coordinate;
    autoPan?: boolean;
}

/**
 * @description Generates the tooltip options @see OverlayOptions
 * @param {ITooltipProps} props
 * @param {HTMLDivElement} element
 */
function generateTooltipOptions(props: ITooltipProps, element: HTMLDivElement): OverlayOptions {
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

// Init tooltip context
const TooltipContext = createContext({});

function Tooltip(props: ITooltipProps): JSX.Element {
    const tooltipEl = useRef<HTMLDivElement>(null);
    const tooltip = useRef<OverlayType>();
    const {map} = useMapContext();

    /**
     * @description troggle the tooltip
     * @param {Coordinate} coordinate
     */
    function showTooltip(coordinate: Coordinate) {
        if (tooltip.current) {
            tooltip.current.setPosition(coordinate)
        }
    }

    /**
     * @description Toggle the tooltip off
     */
    function hideTooltip() {
        if (tooltip.current) {
            tooltip.current.setPosition(undefined)
        }
    }

    useEffect(() => {
        if (tooltipEl.current && map) {
            tooltipEl.current.innerHTML = props.title;
            tooltip.current = new Overlay(generateTooltipOptions(props, tooltipEl.current));
            map.addOverlay(tooltip.current);
        }
    }, [map]);

    useEffect(() => {
        if (tooltip.current) {
            const tooltipEl = tooltip.current.getElement();
            if (tooltipEl) {
                tooltipEl.innerHTML = props.title;
            }
        }
    }, [props.title]);

    return (
        <TooltipContext.Provider value={{ tooltip: tooltip, showTooltip, hideTooltip }}>
            <div ref={tooltipEl}>{props.children}</div>
        </TooltipContext.Provider>
    );
}

export default Tooltip;

export interface IUseTooltip {
    tooltip: {
        current: OverlayType,
    },
    showTooltip: (coordinate: Coordinate) => void;
    hideTooltip: () => void;
}

export const useToolTip = () => useContext(TooltipContext)
