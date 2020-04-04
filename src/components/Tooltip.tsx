import React, { useEffect, useRef, useContext } from 'react';
import Overlay, { Options as OverlayOptions, default as OverlayType } from 'ol/Overlay';
import OverlayPositioning from 'ol/OverlayPositioning';
import { Coordinate } from 'ol/coordinate';
import { useMapContext } from './Map';
import { createContext } from '../core/context';
import uuid from 'uuid';
export interface ITooltipProps {
    title: string;
    children: React.ReactNode;
    component?: React.ReactElement;
    position?: OverlayPositioning;
    id?: string;
    className?: string;
    coordinate?: Coordinate;
    autoPan?: boolean;
    offset?: number[];
}

/**
 * @description Generates the tooltip options @see OverlayOptions
 * @param {ITooltipProps} props
 * @param {HTMLDivElement} element
 */
function generateTooltipOptions(props: ITooltipProps, element: HTMLDivElement): OverlayOptions {
    const options: OverlayOptions = {};

    options.element = element;
    options.offset = props.offset ? props.offset : [15, 0];
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
    const { map } = useMapContext();

    /**
     * @description troggle the tooltip
     * @param {Coordinate} coordinate
     */
    function showTooltip(coordinate: Coordinate) {
        if (tooltip.current && tooltipEl.current) {
            tooltip.current.setPosition(coordinate);
        }
    }

    /**
     * @description Toggle the tooltip off
     */
    function hideTooltip() {
        if (tooltip.current) {
            tooltip.current.setPosition(undefined);
        }
    }

    function useEffectCleanup(): void {
        if (map && tooltip.current) {
            map.removeOverlay(tooltip.current);
        }
    }

    useEffect(() => {
        if (tooltipEl.current && map) {
            if (!props.component) {
                tooltipEl.current.innerHTML = props.title;
            }
            tooltip.current = new Overlay(generateTooltipOptions(props, tooltipEl.current));
            map.addOverlay(tooltip.current);
        }
        return useEffectCleanup;
    }, [map]);

    useEffect(() => {
        if (tooltip.current) {
            const tooltipEl = tooltip.current.getElement();
            if (tooltipEl && !props.component) {
                tooltipEl.innerHTML = props.title;
            }
        }
    }, [props.title]);

    return (
        <div ref={tooltipEl}>
            {props.component && props.component}
            <TooltipContext.Provider
                value={{ tooltip: tooltip, show: showTooltip, hide: hideTooltip, id: uuid() }}
            >
                {props.children}
            </TooltipContext.Provider>
        </div>
    );
}

export { Tooltip };

export interface IUseTooltip {
    tooltip: {
        current: OverlayType;
    };
    show: (coordinate: Coordinate) => void;
    hide: () => void;
}

export const useToolTip = () => useContext(TooltipContext);
