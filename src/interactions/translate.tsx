import React, { useRef, useEffect } from 'react';
import Translate, { TranslateEvent } from 'ol/interaction/Translate';
import { useMapContext } from '../components/Map';

export interface TranslateInteractionProps {
    onDragEnd: (event: TranslateEvent) => void;
    children: React.ReactChildren;
}

function TranslateInteraction(props: TranslateInteractionProps) {
    const { map } = useMapContext();
    const translate = useRef<Translate>();

    function generateTranslate(): void {
        const translateInteraction = new Translate();
        translate.current = translateInteraction;
        map.getInteractions().extend([translateInteraction]);
        translateInteraction.on('translateend', props.onDragEnd);
    }

    function cleanup(): void {
        console.log('functioncleanup -> translate.current', translate.current);
        if (translate.current) {
            map.removeInteraction(translate.current);
            map.getInteractions();
        }
    }

    useEffect(() => {
        generateTranslate();
        return cleanup;
    }, []);

    return <div>{props.children}</div>;
}

export { TranslateInteraction };
