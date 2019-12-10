import React, { useRef, useEffect } from 'react';
import { Feature, Collection } from 'ol';
import { Translate } from 'ol/interaction';
import Point from 'ol/geom/Point';
import { useVectorContext } from './Vector';
import { Style, Fill, Stroke, Icon, Circle } from 'ol/style';
import { Options } from 'ol/style/Style';
import { TranslateEvent } from 'ol/interaction/Translate';
import { usePrevious } from '../custom/hooks';
import { DEFAULT_COLOR } from '../custom/styles';

export interface IMarkerProps {
    position: number[];
    color?: string;
    icon?: string;
    stroke?: string;
    width?: number;
    isDraggable?: boolean;
    onDragEnd?: (coordinate: number[], startCoordinate: number[]) => any;
}

interface ITranslateEvent extends TranslateEvent {
    startCoordinate: number[];
}

/**
 * @description Generate marker styles from component props
 * @param {IMarkerProps} props marker props
 * @returns {Style} style to be applied to the marker
 */
function getMarkerStyles(props: IMarkerProps): Style {
    const { color, icon, stroke, width } = props;

    let options: Options = {};

    if (icon) {
        options.image = new Icon({ src: icon });
        return new Style(options);
    }

    options.stroke = new Stroke({ color: stroke || DEFAULT_COLOR });

    options.image = new Circle({
        radius: width || 8,
        fill: new Fill({ color: color || DEFAULT_COLOR })
    });

    return new Style(options);
}

function Marker(props: IMarkerProps): JSX.Element {
    const marker = useRef<Feature | null>(null);
    const VectorContext = useVectorContext();
    const previousVectorContext = usePrevious(VectorContext);

    function handleDragEnd(event: ITranslateEvent): void {
        // check if callback is passed through props and call it with new and old
        // coordinates
        props.onDragEnd && props.onDragEnd(event.coordinate, event.startCoordinate);
    }

    /**
     * component did mount
     * @description Initialize the marker
     */
    useEffect((): void => {
        //  init the marker
        marker.current = new Feature({
            // set the position of the marker
            geometry: new Point(props.position)
        });
        // eslint-disable-next-line
    }, []);

    /**
     * @description Checks if the marker is draggable and mapcontext updated
     * to apply drag interaction to the marker
     */
    useEffect((): void => {
        if (props.isDraggable && VectorContext.map && marker.current) {
            // create translate to bind translatable features to map context interaction
            const translate = new Translate({
                features: new Collection([marker.current])
            });
            // handle dragend
            translate.on('translateend', handleDragEnd);
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(translate);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isDraggable, previousVectorContext]);

    /**
     * @description update the parent vector context if exists and add feature to its
     * source
     */
    useEffect((): void => {
        // check if there is no vector layer throw an error
        if (VectorContext && !VectorContext.vector && previousVectorContext) {
            throw new Error(
                'Vector layer is not found, Marker maybe defined without vector layer component'
            );
        }
        if (VectorContext.vector && marker.current) {
            // set marker styles
            marker.current.setStyle(getMarkerStyles(props));

            // Add the marker as a feature to vector layer
            VectorContext.vector.getSource().addFeature(marker.current);
        }
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
        if (marker.current) {
            // set new styles
            marker.current.setStyle(getMarkerStyles(props));
        }
        // eslint-disable-next-line
    }, [props.color, props.icon, props.stroke, props.stroke]);

    return <></>;
}

export default Marker;
