import React from 'react';
export interface IMarkerProps {
    position: number[];
    color?: string;
    icon?: string;
    stroke?: string;
    strokeWidth?: number;
    width?: number;
    isDraggable?: boolean;
    onDragEnd?: (coordinate: number[], startCoordinate: number[]) => any;
    children?: React.ReactChild;
}
declare function Marker(props: IMarkerProps): JSX.Element;
export default Marker;
