import React, { useRef, useEffect } from 'react';
import { Style, Fill, Stroke } from 'ol/style';
import { Polygon as BasePolygon } from 'ol/geom';
import { Options as StyleOptions } from 'ol/style/Style';
import { Feature, Collection } from 'ol';
import { useVectorContext } from './Vector';
import { Translate, Modify } from 'ol/interaction';
import { Coordinate } from 'ol/coordinate';
import { usePrevious } from '../custom/hooks';
import { convertHexToRGBA } from '../custom/styles';
export interface IPolygonProps {
    coordinates: Coordinate[][];
    color?: string;
    opacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    isEditable?: boolean;
    isDraggable?: boolean;
    style?: Style | Style[];
    onDragEnd?: (coordinates?: Coordinate[][]) => any;
    onEditEnd?: (coordinates?: Coordinate[][]) => any;
}

/**
 * @description Generate polygon styles from component props
 * @param {IPolygonProps} props polygon props
 * @returns {Style} style to be applied to the polygon
 */
function getPolygonStyles(props: IPolygonProps): Style | Style[] {
    if (props.style) return props.style;
    const options: StyleOptions = {};

    options.fill = new Fill({
        color: props.color
            ? convertHexToRGBA(props.color, props.opacity || 0.3)
            : 'rgba(0, 0, 255, 0.1)'
    });

    options.stroke = new Stroke({
        color: props.strokeColor || 'red',
        width: props.strokeWidth || 2
    });

    return new Style(options);
}

function Polygon(props: IPolygonProps): JSX.Element {
    const polygon = useRef<Feature>();
    const dragInteraction = useRef<Translate>();
    const modifyInteraction = useRef<Modify>();
    const VectorContext = useVectorContext();
    const previousVectorContext = usePrevious(VectorContext);

    useEffect((): void => {
        polygon.current = new Feature({
            geometry: new BasePolygon(props.coordinates)
        });
        // eslint-disable-next-line
    }, []);

    /**
     * @description Checks if the polygon is draggable and mapcontext updated
     * to apply drag interaction to the polygon
     */
    useEffect((): void => {
        if (props.isDraggable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            const translate = new Translate({
                features: new Collection([polygon.current])
            });
            // handle dragend
            translate.on('translateend', function(event: any): void {
                event.stopPropagation();
                // @ts-ignore
                const coordinates = polygon.current.getGeometry().getCoordinates();
                // check if callback is passed through props and call it with new and old
                // coordinates
                props.onDragEnd && props.onDragEnd(coordinates);
            });
            dragInteraction.current = translate;
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(translate);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isDraggable]);

    /**
     * @description Checks if the polygon is draggable and mapcontext updated
     * to apply drag interaction to the polygon
     */
    useEffect((): void => {
        if (props.isEditable && VectorContext.map && polygon.current) {
            // create translate to bind translatable features to map context interaction
            const modify = new Modify({
                features: new Collection([polygon.current])
            });

            // handle dragend
            modify.on('modifyend', function(event): any {
                event.stopPropagation();
                // @ts-ignore
                const coordinates = polygon.current.getGeometry().getCoordinates();
                // check if callback is passed through props and call it with new and old
                // coordinates
                props.onEditEnd && props.onEditEnd(coordinates);
            });

            modifyInteraction.current = modify;
            // bind the interaction to map context
            VectorContext.map.getInteractions().push(modify);
        }
        // eslint-disable-next-line
    }, [VectorContext.map, props.isEditable]);

    /**
     * @description update the parent vector context if exists and add feature to its
     * source
     */
    useEffect((): void | (() => void) => {
        // check if there is no vector layer throw an error
        if (VectorContext && !VectorContext.vector && previousVectorContext) {
            throw new Error(
                'Vector layer is not found, Polygon maybe defined without vector layer component'
            );
        }
        if (VectorContext.vector && polygon.current) {
            // set polygon styles
            polygon.current.setStyle(getPolygonStyles(props));

            // Add the polygon as a feature to vector layer
            VectorContext.vector.getSource().addFeature(polygon.current);
        }
        return () => {
            if (polygon.current && VectorContext.vector) {
                if (VectorContext.vector.getSource().hasFeature(polygon.current)) {
                    VectorContext.vector.getSource().removeFeature(polygon.current);
                }
            }
        };
        // eslint-disable-next-line
    }, [VectorContext.vector, previousVectorContext]);

    /**
     * @description Cleans interactions on component unmount
     */
    useEffect(() => {
        return () => {
            if (VectorContext.map && dragInteraction.current) {
                VectorContext.map.removeInteraction(dragInteraction.current);
            }
            if (VectorContext.map && modifyInteraction.current) {
                VectorContext.map.removeInteraction(modifyInteraction.current);
            }
        };
    }, []);

    return <div></div>;
}

export { Polygon };
