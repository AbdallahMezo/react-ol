import React from 'react';

export function findChild(children: any, childType: any): any {
    let found: any;
    let childrenArr = React.Children.toArray(children);
    for (let i = 0; i < childrenArr.length; i++) {
        let child: any = childrenArr[i];
        if (child.type == childType) {
            found = child;
            break;
        }
    }
    return found;
}
