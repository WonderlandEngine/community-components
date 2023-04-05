![wonderland-engine-logo](img/wle-logo-horizontal-reversed.png)

# Community Components

Custom JavaScript components created by the Community!

## How to use

Instructions on how to use components from this repository.

### NPM package

If you already have a git repository set up for your Wonderland Engine
project, this method allows easily updating later.

~~~
npm i --save @wonderlandengine/community-components
~~~

## Documentation

## controller

**Author:** [@msub2](https://github.com/msub2)

Smooth locomotion character controller for VR.

| Param | Type | Description |
|---|---|---|
| handedness | Enum | Handedness for VR cursors to accept input only from respective controller |
| controlType | Enum | Whether this controller rotates or moves the character |
| controlSource | Enum | Whether to use thumbstick or touchpad for input |
| player | Object | Player object which is moved |
| head | Object | Head/Left eye object from which to get movement direction |
| head2 | Object | Right eye object from which to get movement direction |
| moveSpeed | Float | Movement speed, default `1.0` |
| allowFly | Bool | Allow flying (if false, will not move on the Y axis) |
| rotationType | Enum | Whether to rotate smoothly or snap in `snapDegrees` increments |
| snapDegrees | Int | Incremements to snap to when `rotationType` is `"snap"`, default `45` |

## line-connection

**Author:** [@Squareys](https://github.com/squareys)

Draw a line between two objects by scaling a mesh (e.g. a cube) and rotating it accordingly.

| Param | Type | Description |
|---|---|---|
| targetA | Object | Object from which to draw the line |
| targetB | Object | Object to which to draw the line |
| lengthPercentage | Float | How much of the length between the objects to span |
| thickness | Float | Thickness of the line, default `0.05` |

**Requirements:**

 - Expects a mesh component attached to the same object

## waypoint-movement

**Author:** [@Srile](https://github.com/srile)

Moves an object along a path made up of multiple points.

| Param | Type | Description |
|---|---|---|
| pathObject | Object | Container of the waypoints. The position of its children indicate the points. |
| speed | Float | Movement speed of the object |
| curveDistance | Float | Distance in normal space [0, 0.5) after which the objects starts moving on a curve (used for smooth corners) |

**Callbacks**
 - `addOnFinalWaypointReachedCallback(f)`/`removeOnFinalWaypointReachedCallback(f)` can be used for function callback registration and are fired when the object reaches the end destination.

**Requirements:**

 - pathObject's children are sorted by alphebetical ascending naming (e.g. A, B, C, D, E, F, ...)

**Notes**

 - `lookAt` will be replaced with a native function in the future.
