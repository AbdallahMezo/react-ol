/// <reference types="react" />
export interface IMarkerProps {
    position: number[];
    color?: string;
    icon?: string;
    stroke?: string;
    width?: number;
    isDraggable?: boolean;
    onDragEnd?: (coordinate: number[], startCoordinate: number[]) => any;
}
declare function Marker(props: IMarkerProps): JSX.Element;
export default Marker;
