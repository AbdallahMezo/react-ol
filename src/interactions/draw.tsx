import React, { useEffect } from 'react';
import { Draw, Translate, Modify } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import { useVectorContext } from '../components/Vector';
import GeometryType from 'ol/geom/GeometryType';
import { Feature, Collection } from 'ol';
import Target from 'ol/events/Target';
import { DrawEvent, Options as DrawOptions } from 'ol/interaction/Draw';
import { useMapContext } from '../components/Map';
import { defaultPolygonStyle } from '../custom/styles';
import { Coordinate } from 'ol/coordinate';
import { TranslateEvent } from 'ol/interaction/Translate';
import { ModifyEvent } from 'ol/interaction/Modify';

export interface IDrawInteractionProps {
    source?: VectorSource;
    type: GeometryType;
    onDrawEnd?: (feature: Feature, target: Target) => any;
    allowUpdateDrawnFeatures?: boolean;
    onDragEnd?: (coordinates?: Coordinate[][]) => any;
    onEditEnd?: (coordinates?: Coordinate[][]) => any;
}

function DrawInteraction(props: IDrawInteractionProps): JSX.Element {
    const VectorContext = useVectorContext();
    const MapContext = useMapContext();

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

        options.source = getSourceFromProps(props);

        return options;
    }

    // TODO: update interactions with modify and translate for this kind of needs
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
     * Event handler for draw finish
     * @param {DrawEvent} event
     */
    function handleDrawEnd(event: DrawEvent): void {
        event.feature.setStyle(defaultPolygonStyle);
        if (props.allowUpdateDrawnFeatures) {
            addInteractionsToDrawnFeature(event.feature);
        }
        if (props.onDrawEnd) {
            props.onDrawEnd && props.onDrawEnd(event.feature, event.target);
        }
    }

    /**
     * @description create a draw interaction and return it to be used
     * @param {IDrawInteractionProps} props
     * @returns {Draw}
     */
    function createDrawInteraction(props: IDrawInteractionProps): Draw {
        const drawInteraction = new Draw(getDrawOptions(props));
        drawInteraction.on('drawend', handleDrawEnd);
        return drawInteraction;
    }

    /**
     * @description Apply the draw interaction to map
     * Component did mount
     */
    useEffect((): void => {
        if (MapContext.map && VectorContext.vector) {
            MapContext.map.addInteraction(createDrawInteraction(props));
        }

        // eslint-disable-next-line
    }, [MapContext.map, VectorContext.vector]);

    return <></>;
}

export default DrawInteraction;
