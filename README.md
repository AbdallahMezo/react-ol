
# wakecap-ol   
![Version](https://img.shields.io/badge/version-0.0.1-green)  ![enter image description here](https://img.shields.io/badge/Stable-beta-red)  [![CircleCI](https://circleci.com/bb/wakecapteam/wakecap-ol.svg?style=svg)](https://circleci.com/bb/wakecapteam/wakecap-ol)

Functional, composed, extended and react wrapper for OpenLayers

## 🤹 Installation
`npm install <bitbucket repo url>`
## 📦 Usage
You should have a basic knowledge about [openlayers]([https://openlayers.org/](https://openlayers.org/)) , [basic concepts]([https://openlayers.org/en/latest/doc/tutorials/concepts.html](https://openlayers.org/en/latest/doc/tutorials/concepts.html)) and [how it works]([https://openlayers.org/en/latest/doc/quickstart.html](https://openlayers.org/en/latest/doc/quickstart.html)). 
### 🚀  Basic Usage that renders just a map canvas using `osm` raster layers.
```javascript
	import React from 'react'
	import {Map} from 'wakecap-ol`
	import { fromLonLat } from  'ol/proj';

	function DemoMap(){
		return (
			<Map center={fromLonLat([15.124, 14.36])} zoom={4} type="osm" />
		)
	}
```
### ⚡ Rendering a map with features
Currently available features are `marker` and `polygon`
```javascript
	import React from 'react'
	import {Map, Marker, Polygon, Vector} from 'wakecap-ol`
	import { fromLonLat } from  'ol/proj';
		
	const polygonCoordinates = [[15.125, 14.36],
								[15.245, 14.46],
								[15.344, 14.66],
								[15.125, 14.36]]
	function DemoMap(){
		return (
			<Map center={fromLonLat([15.124, 14.36])} zoom={4} type="osm">
				<Vector>
					<Marker position={fromLonLat([15.124, 14.36])}/>
					<Polygon coordinates={fromLonLat(polygonCoordinates)} />
				</Vector>
			</Map>
		)
	}
```
Check the docs below for more `props` and available configurations.
## Options and props
### Components:
### Map
Map component `props` and `options` 

|prop|type| required | default value | options | description |
|--|--|--|--| -- | -- |
| `zoom` |`number`  |`false`  | `3` | `1 - 16` | initial zoom level |
| `center` | `Coordinate` | `false` | `[0, 0]` |  | center point |
| `target` | `HTMLDivElement` | `false` | inner div |  | div for the map to render in |
| `type` | `string` | `false` | `osm` | `osm` or `image` | Raster layer type |

### Vector

@see `ol/layer/Vector`

|prop|type| required | default value | options | description |
|--|--|--|--| -- | -- |
| `source` |`VectorSource`  | `false` | `new VectorSource({})` |  | source of the vector @see `ol/source/VectorSource` |
| `style` | `Style` | `false` | `new Style({})` |  | Style of the vector layer |

### Image
One of the main purposes to create this library is to manage an image map with custom images and projection, so by default this layer applies a [pixel projection](https://openlayers.org/en/latest/apidoc/module-ol_proj_Projection-Projection.html) extented with `width` and `height` provided to the component.

@see `ol/layer/Image`

|prop|type| required | default value | options | description |
|--|--|--|--| -- | -- |
| `src` |`url`  | `true` |  |  | Image source |
| `width` | `number` | `true` |  |  | Image width |
| `height` | `number` | `true` |  |  | Image Height |
| `zoom` | `number` | `false` | `2` | `minZoom - maxZoom` | zoom level | 
| `minZoom` | `number` | `false` | `1` | `1 - 16` | min zoom level |
| `maxZoom` | `number` | `false` | `6` | `1 - 16` | max zoom level |

### Marker
OpenLayers dont have something called marker, but we use `Point` Feature as a marker here
@see `ol/geom/Point`

|prop|type| required | default value | options | description |
|--|--|--|--| -- | -- |
| `position` |`Coordinate`  | `true` |  |  | Position of the marker |
| `color` | `string` | `false` | `rgba(35, 187, 245, 1)` | `HEX` or `RGBA` or `color string` | Color of the marker |
| `icon` | `url` | `false` |  | `png` | If provided it applies as a marker image/icon and no other styles apply |
| `stroke` | `number` | `false` | `2` | `number | stroke width around the marker | 
| `width` | `number` | `false` | `10` | `number` | width of the marker |
| `isDraggable` | `boolean` | `false` | `false` | `true` or `false` | if you want to move the marker on the map |
| `onDragEnd` | `function` | `false` | | `function(newPosition, oldPosition)`| Drag end handler |

### Polygon
@see `ol/geom/Polygon`

|prop|type| required | default value | options | description | 
|--|--|--|--| -- | -- |
| `coordinates` |`Coordinate[][]`  | `true` |  |  | Polygon Coordinates |
| `color` | `string` | `false` | `rgba(35, 187, 245, 1)` | `HEX` or `RGBA` or `color string` | Color of the polygon fill |
| `strokeColor` | `string` | `false` |  | `HEX` or `RGBA` or `color string` | stroke color |
| `strokeWidth` | `number` | `false` | `2` | `number | stroke width around the marker |
| `isDraggable` | `boolean` | `false` | `false` | `true` or `false` | if you want to move the marker on the map |
| `onDragEnd` | `function` | `false` | | `function(coordinates)`| Drag end handler with new polygon coordinates |
| `isEditable` | `boolean` | `false` | `false` | `true` or `false` | if you want to move the marker on the map |
| `onEditEnd` | `function` | `false` | | `function(coordinates)`| Edit end handler with new polygon coordinates |

### Interctions
### Draw
Should be wrapped in `Vector` component
@see `ol/interaction/Draw`

|prop|type| required | default value | options | description | 
|--|--|--|--| -- | -- |
| `source` |`VectorSource`  | `false` | `new VectorSource({})` |  | source of the vector @see `ol/source/VectorSource` |
| `type` | `GeometryType` | `false` | `Polygon` |  | Shape type |
| `onDrawEnd`| `function` | `false` | |  `function(feature, target)` | Draw end handler |
| `allowUpdateDrawnFeatures` | `boolean` | `false` | `false` | `true` or `false` | so you can update features after drawing |
| `onDragEnd` | `function` | `false` | | `function(newPosition, oldPosition)`| Drag end handler if `allowUpdateDrawnFeatures` is enabled |
| `onEditEnd` | `function` | `false` | | `function(coordinates)`| Edit end handler if `allowUpdateDrawnFeatures` is enabled |

### Custom 
### withPixelTransformation
TBD

## TODO
#### Components: 
- Layer
- Popup
- Overlay
#### Interactions: 
- Drag and drop
- Modify
- Translate 

## License
This library is created for [WakeCap](https://wakecap.com)
