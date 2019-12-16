import React from 'react';
import { Coordinate } from 'ol/coordinate';
import Transform from '../core/transform';

/**
 * inject component with a trasformation object to help transform from pixel to geometry coordinates
 * and reverse
 * @param {Number} width
 * @param {Number} height
 * @param {Array<Coordinate>} controlPoints
 * @returns {React.ComponentType}
 */
function WithPixelTransformation(
    width: number,
    height: number,
    controlPoints: Coordinate[]
): (WrapperComponent: React.ComponentType<any>) => React.ComponentType {
    // Init Helmert Transformation
    const transformation = new Transform.Helmert();

    // set control points to transformation
    transformation.setControlPoints(controlPoints, [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height]
    ]);

    return function(WrapperComponent: React.ComponentType<any>): React.ComponentType {
        return class extends React.Component {
            render(): JSX.Element {
                return <WrapperComponent {...this.props} transformation={transformation} />;
            }
        };
    };
}

export default WithPixelTransformation;
