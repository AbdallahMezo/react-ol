import React, { useEffect, useRef, useCallback } from 'react';
import { Draw, Translate, Modify } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import { useVectorContext } from '../components/Vector';
import GeometryType from 'ol/geom/GeometryType';
import { Feature, Collection } from 'ol';
import { DrawEvent, Options as DrawOptions } from 'ol/interaction/Draw';
import { useMapContext } from '../components/Map';
import { defaultPolygonStyle, convertHexToRGBA } from '../custom/styles';
import { Coordinate } from 'ol/coordinate';
import { TranslateEvent } from 'ol/interaction/Translate';
import { ModifyEvent } from 'ol/interaction/Modify';
import { Style, Fill, Stroke } from 'ol/style';
import CircleStyle from 'ol/style/Circle';

export interface IDrawInteractionProps {
    source?: VectorSource;
    type: GeometryType;
    onDrawEnd?: (feature: Feature, target: DrawEvent) => any;
    allowUpdateDrawnFeatures?: boolean;
    onDragEnd?: (coordinates?: Coordinate[][]) => any;
    onEditEnd?: (coordinates?: Coordinate[][]) => any;
    discardDrawenFeature?: boolean;
    drawingColor?: string;
    isDisabled?: boolean;
}

function DrawInteraction(props: IDrawInteractionProps): JSX.Element {
    const VectorContext = useVectorContext();
    const MapContext = useMapContext();
    const drawRef = useRef<Draw>();

    function getPolygonStyle(color: string): Style {
        return new Style({
            fill: new Fill({
                color: convertHexToRGBA(color, 0.3)
            }),
            stroke: new Stroke({
                color: convertHexToRGBA(color, 0.5),
                width: 2
            }),
            image: new CircleStyle({
                radius: 5,
                fill: new Fill({
                    color: '#0199ff'
                }),
                stroke: new Stroke({
                    color: '#fff',
                    width: 1
                })
            })
        });
    }

    /**
     * @description Return the vector source from props or vector context if exists
     * @param {IDrawInteractionProps} props
     * @returns {?VectorSource}
     */
    function getSourceFromProps(props: IDrawInteractionProps): VectorSource | undefined {
        if (props.source) {
            return props.source;
        }
        if (VectorContext.vector) {
            return VectorContext.vector.getSource();
        }
        throw Error(
            'No Vector Layers found attached to map, Vector layer is required to draw features'
        );
    }

    /**
     * @description Generates the draw options to be passed to draw interaction
     * @param {IDrawInteractionProps} props
     * @returns {DrawOptions}
     */
    function getDrawOptions(props: IDrawInteractionProps): DrawOptions {
        // Init options with the default type 'Polygon'
        const options: DrawOptions = { type: 'Polygon' as GeometryType };

        if (props.type) {
            options.type = props.type;
        }

        if (props.drawingColor) {
            options.style = getPolygonStyle(props.drawingColor);
        }

        options.source = getSourceFromProps(props);

        return options;
    }

    /**
     * @description Add modify and translate interaction to drawn feature
     * @param {Feature} feature
     */
    function addInteractionsToDrawnFeature(feature: Feature): void {
        const featureCollection = new Collection([feature]);

        // Create the translate interaction
        const translate = new Translate({
            features: featureCollection
        });

        translate.on('translateend', function(event: TranslateEvent): void {
            event.stopPropagation();
            // @ts-ignore
            const coordinates = feature.getGeometry().getCoordinates();
            // check if callback is passed through props and call it with new and old
            // coordinates
            props.onDragEnd && props.onDragEnd(coordinates);
        });

        // create modify interaction
        const modify = new Modify({
            features: featureCollection
        });

        modify.on('modifyend', function(event: ModifyEvent): void {
            event.stopPropagation();
            // @ts-ignore
            const coordinates = feature.getGeometry().getCoordinates();
            // check if callback is passed through props and call it with new and old
            // coordinates
            props.onEditEnd && props.onEditEnd(coordinates);
        });

        MapContext.map.getInteractions().extend([modify, translate]);
    }

    /**
     * Event handler for start drawing
     * @param {DrawEvent} event
     */
    const handleDrawStart = useCallback(
        (event: DrawEvent): void => {
            if (props.drawingColor) {
                event.feature.setStyle(getPolygonStyle(props.drawingColor));
            }
        },
        [props.drawingColor]
    );

    /**
     * Event handler for draw finish
     * @param {DrawEvent} event
     */
    const handleDrawEnd = useCallback(
        (event: DrawEvent): void => {
            event.feature.setStyle(
                props.drawingColor ? getPolygonStyle(props.drawingColor) : defaultPolygonStyle
            );

            if (props.allowUpdateDrawnFeatures) {
                addInteractionsToDrawnFeature(event.feature);
            }

            if (props.onDrawEnd) {
                props.onDrawEnd && props.onDrawEnd(event.feature, event);
            }

            if (props.discardDrawenFeature) {
                const vectorSource = VectorContext.vector.getSource();
                if (vectorSource) {
                    vectorSource.removeFeature(event.feature);
                }
            }
        },
        [props.drawingColor, props.onDrawEnd, props.allowUpdateDrawnFeatures]
    );

    /**
     * @description create a draw interaction and return it to be used
     * @param {IDrawInteractionProps} props
     * @returns {Draw}
     */
    function createDrawInteraction(props: IDrawInteractionProps): Draw {
        const drawInteraction = new Draw(getDrawOptions(props));

        drawInteraction.on('drawend', handleDrawEnd);

        drawInteraction.on('drawstart', handleDrawStart);

        return drawInteraction;
    }

    /**
     * @description add draw interaction to map
     */
    function addDrawToMap(): void {
        if (MapContext.map && VectorContext.vector) {
            const drawInteraction = createDrawInteraction(props);
            if (props.isDisabled) {
                drawInteraction.setActive(false);
            }
            drawRef.current = drawInteraction;
            MapContext.map.addInteraction(drawInteraction);
        }
    }

    /**
     * @description Apply the draw interaction to map
     * Component did mount
     */
    useEffect((): (() => void) => {
        addDrawToMap();

        return (): void => {
            if (drawRef.current && MapContext.map) {
                MapContext.map.removeInteraction(drawRef.current);
            }
        };
        // eslint-disable-next-line
    }, [MapContext.map, VectorContext.vector]);

    useEffect(() => {
        if (props.isDisabled && drawRef.current) {
            drawRef.current.setActive(false);
        }
        if (!props.isDisabled && drawRef.current) {
            drawRef.current.setActive(true);
        }
    }, [props.isDisabled]);

    useEffect(() => {
        if (props.drawingColor && drawRef.current) {
            drawRef.current.on('drawstart', handleDrawStart);
            drawRef.current.on('drawend', handleDrawEnd);
        }
    }, [props.drawingColor]);

    return <></>;
}

export default DrawInteraction;
