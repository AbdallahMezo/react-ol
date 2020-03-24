import React from 'react';
import { Coordinate } from 'ol/coordinate';
/**
 * inject component with a trasformation object to help transform from pixel to geometry coordinates
 * and reverse
 * @param {Number} width
 * @param {Number} height
 * @param {Array<Coordinate>} controlPoints
 * @returns {React.ComponentType}
 */
declare function WithPixelTransformation(width: number, height: number, controlPoints: Coordinate[]): (WrapperComponent: React.ComponentType<any>) => React.ComponentType;
export default WithPixelTransformation;
