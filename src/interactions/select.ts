import { default as olSelect, Options } from 'ol/interaction/Select';
import { click, pointerMove } from 'ol/events/condition';

export function getSelectInteraction(type: 'click' | 'hover'): olSelect {
    const options: Options = {};

    options.condition = type === 'click' ? click : pointerMove;

    return new olSelect(options);
}
