import { Style, Fill, Circle, Stroke } from 'ol/style';

/**
 * @description Default Polygon style
 */
export const defaultPolygonStyle = new Style({
    fill: new Fill({ color: 'rgba(35, 187, 245, 0.2)' }),
    stroke: new Stroke({
        color: 'rgba(8, 184, 251, 1)',
        width: 2
    })
});

/**
 * @description Default marker style
 */
export const defaultMarkerStyle = new Style({
    image: new Circle({
        fill: new Fill({ color: 'rgba(35, 187, 245, 1)' }),
        radius: 10,
        stroke: new Stroke({
            color: 'white',
            width: 2
        })
    })
});

export const DEFAULT_COLOR = 'rgba(35, 187, 245, 1)';

export function convertHexToRGBA(hex: string, opacity: number) {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r},${g},${b}, ${opacity})`;
}
