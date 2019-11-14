/// <reference types="react" />
import VectorSource from 'ol/source/Vector';
import GeometryType from 'ol/geom/GeometryType';
import { Feature } from 'ol';
import Target from 'ol/events/Target';
import { Coordinate } from 'ol/coordinate';
export interface IDrawInteractionProps {
    source?: VectorSource;
    type: GeometryType;
    onDrawEnd?: (feature: Feature, target: Target) => any;
    allowUpdateDrawnFeatures?: boolean;
    onDragEnd?: (coordinates?: Coordinate[][]) => any;
    onEditEnd?: (coordinates?: Coordinate[][]) => any;
}
declare function DrawInteraction(props: IDrawInteractionProps): JSX.Element;
export default DrawInteraction;
