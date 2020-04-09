import React, { useRef, useEffect } from 'react';
import { Feature, MapBrowserEvent } from 'ol';
import { Translate } from 'ol/interaction';
import Point from 'ol/geom/Point';
import { useVectorContext } from './Vector';
import { Style, Fill, Stroke, Icon, Circle } from 'ol/style';
import { Options } from 'ol/style/Style';
import { usePrevious } from '../custom/hooks';
import { DEFAULT_COLOR } from '../custom/styles';
import { useToolTip } from './Tooltip';
import { usePopup } from './Popup';
import { isEqual } from '../custom/utils';

export interface IMarkerProps {
    position: number[];
    color?: string;
    icon?: string;
    stroke?: string;
    strokeWidth?: number;
    width?: number;
    isDraggable?: boolean;
    disableStyling?: boolean;
    customData?: any;
    onDragEnd?: (coordinate: number[], startCoordinate: number[]) => any;
    updateMarkerLocationOnDrag?: (coordinates: number[]) => boolean;
    children?: React.ReactChild;
}

/**
 * @description Generate marker styles from component props
 * @param {IMarkerProps} props marker props
 * @returns {Style} style to be applied to the marker
 */
function getMarkerStyles(props: IMarkerProps): Style | null {
    const { color, icon, width } = props;

    let options: Options = {};

    if (props.disableStyling) {
        return null;
    }

    if (icon) {
        options.image = new Icon({ src: icon });
        return new Style(options);
    }

    options.stroke = new Stroke({
        color: props.stroke || DEFAULT_COLOR,
        width: props.strokeWidth || 8
    });

    options.image = new Circle({
        radius: width || 8,
        fill: new Fill({ color: color || DEFAULT_COLOR })
    });

    return new Style(options);
}

function Marker(props: IMarkerProps): JSX.Element {
    const marker = useRef<Feature | null>(null);
    const previousProps = usePrevious(props);
    const VectorContext = useVectorContext();
    const TooltipContext = useToolTip();
    const PopupContext = usePopup();
    const previousVectorContext = usePrevious(VectorContext);

    /**
     * @description Check if marker should be updated based on props
     * @param props
     * @param prevProps
     */
    function shouldMarkerUpdate(props: IMarkerProps, prevProps: IMarkerProps | undefined): boolean {
        if (prevProps) {
            return isEqual(props.position, prevProps.position);
        }
        return true;
    }

    /**
     * @description Generate marker feature and add it to map
     * @param props
     */
    function addMarkerToMap(props: IMarkerProps): void {
        marker.current = new Feature({
            // set the position of the marker
            geometry: new Point(props.position)
        });

        if (props.color) {
            marker.current.set('color', props.color);
        }
        // set marker styles
        if (!props.disableStyling) {
            marker.current.setStyle(getMarkerStyles(props));
        }

        if (props.customData) {
            marker.current.set('custom', props.customData);
        }

        // Add the marker as a feature to vector layer
        VectorContext.vector.getSource().addFeature(marker.current);
    }

    /**
     * @description Creates popup
     * @param {MapBrowserEvent} event
     */
    function createPopup(event: MapBrowserEvent): void {
        const { map } = VectorContext;

        // always hide the tooltip on `click` event
        PopupContext.hide();

        // loop throught features and show tooltip for detected feature
        map.forEachFeatureAtPixel(event.pixel, function(feature: Feature) {
            if (feature.get('withPopup')) {
                if (feature.get('popupId') === PopupContext.id) {
                    // @ts-ignore
                    PopupContext.show(marker.current.getGeometry().getCoordinates());
                } else {
                    PopupContext.hide();
                    return;
                }
                return;
            }
            return;
        });
    }

    /**
     * Removes the current marker if exists to prevent add duplicated features
     * @see https://openlayers.org/en/v6.1.1/doc/errors/#58
     */
    function useEffectCleanup() {
        if (VectorContext.vector && marker.current) {
            const source = VectorContext.vector.getSource();
            if (source) {
                source.removeFeature(marker.current);
            }
        }
    }
    /**
     * @description update the parent vector context if exists and add feature to its
     * source
     */
    useEffect((): (() => void) | void => {
        let translate: Translate;
        const { map } = VectorContext;
        // check if there is no vector layer throw an error

        if (!shouldMarkerUpdate(props, previousProps)) {
            return;
        }

        if (VectorContext.vector) {
            addMarkerToMap(props);
        }
        // check if marker has tooltip and creates it
        if (TooltipContext.tooltip && map && marker.current) {
            marker.current.set('withTooltip', true);
            // marker.current.set('tooltipId', TooltipContext.id);

            // map.on('pointermove', createTooltip);
        }

        if (PopupContext.popup && map) {
            if (marker.current) {
                marker.current.set('withPopup', true);
                marker.current.set('popupId', PopupContext.id);
            }
            map.on('click', createPopup);
        }

        return () => {
            if (translate && map) {
                map.removeInteraction(translate);
            }
            useEffectCleanup();
        };

        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);

    /**
     * @description Check if position changes and apply it to the marker
     * component did update with new poistion
     */
    useEffect((): void => {
        if (marker.current && props.position) {
            // set new position
            marker.current.setGeometry(new Point(props.position));
        }
    }, [props.position]);

    /**
     * @description Check if styling changed and apply new styles to the marker
     * component did update with new styles
     */
    useEffect((): void => {
        if (marker.current && !props.disableStyling) {
            // set new styles
            marker.current.setStyle(getMarkerStyles(props));
        }

        // eslint-disable-next-line
    }, [props.color, props.icon, props.stroke, props.strokeWidth]);

    return <div> </div>;
}

export { Marker };
