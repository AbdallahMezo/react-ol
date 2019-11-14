/// <reference types="react" />
import { Coordinate } from 'ol/coordinate';
export interface IPolygonProps {
    coordinates: Coordinate[][];
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    isEditable?: boolean;
    isDraggable?: boolean;
    onDragEnd?: (coordinates?: Coordinate[][]) => any;
    onEditEnd?: (coordinates?: Coordinate[][]) => any;
}
declare function Polygon(props: IPolygonProps): JSX.Element;
export default Polygon;
