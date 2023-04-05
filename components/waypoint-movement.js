import {Component, Type} from '@wonderlandengine/api';
import {vec3} from 'gl-matrix';

/*
Original authors — credit is appreciated but not required:

     2021 — Florian Isikci <florian.isikci@vhiterabbit.com>

 This is free and unencumbered software released into the public domain.
 Anyone is free to copy, modify, publish, use, compile, sell, or distribute
 this software, either in source code form or as a compiled binary, for any
 purpose, commercial or non-commercial, and by any means.

 In jurisdictions that recognize copyright laws, the author or authors of
 this software dedicate any and all copyright interest in the software to
 the public domain. We make this dedication for the benefit of the public
 at large and to the detriment of our heirs and successors. We intend this
 dedication to be an overt act of relinquishment in perpetuity of all
 present and future rights to this software under copyright law.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

export class WaypointMovement extends Component {
    static TypeName = 'waypoint-movement';
    static Properties = {
        /** This object is the container of the waypoints. It should contain children
    with an alphebetically ascending naming (e.g. A, B, C, D, E, F) */
        pathObject: {type: Type.Object},
        /** Movement speed of the object */
        speed: {type: Type.Float, default: 1.0},
        /** Distance in normal space [0, 0.5) after which the objects starts moving on a curve */
        curveDistance: {type: Type.Float, default: 0.1},
    };

    init() {
        this.children = this.pathObject.children.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        this.positions = new Array(this.children.length);
        for (let i = 0; i < this.children.length; i++) {
            this.positions[i] = new Float32Array(3);
            this.children[i].getTranslationWorld(this.positions[i]);
        }
        this.currentPositionIndex = 0;
        this.currentPosition = new Float32Array(3);
        this.lookPosition = new Float32Array(3);
        this.fromPosition = this.positions[0];
        this.toPosition = this.positions[1];
        vec3.sub(this.currentPosition, this.toPosition, this.fromPosition);
        this.fromToLength = vec3.length(this.currentPosition);
        this.currentLength = 0;
        this.up = [0, 1, 0];
        this.quat = new Float32Array(4);
        lookAt(this.quat, this.fromPosition, this.toPosition, this.up);
        this.object.resetTranslationRotation();
        this.object.rotate(this.quat);
        this.object.setTranslationWorld(this.fromPosition);

        this.p0 = new Float32Array(3);
        this.p1 = new Float32Array(3);
        this.p2 = new Float32Array(3);
        this.currentCurveIndex = 0;
        this.curveDistance = Math.max(0.0, Math.min(0.49999, this.curveDistance));
        this.bezFactorMultiplicator = 1 / (2 * this.curveDistance);
        this._setCurvePoints();

        this.onFinalWaypointReachedCallbacks = [];
    }

    /**
     * Adds a function to a callback array which, then calls the function after the final waypoint has been reached.
     * @param  {function} f Function to be added.
     */
    addOnFinalWaypointReachedCallback(f) {
        this.onFinalWaypointReachedCallbacks.push(f);
    }

    /**
     * Removes a function from the callback array for reaching the final waypoint..
     * @param  {function} f Function to be removed.
     */
    removeOnFinalWaypointReachedCallback(f) {
        const index = array.indexOf(f);
        if (index > -1) {
            this.onFinalWaypointReachedCallbacks.splice(index, 1);
        }
    }

    /**
     * Sets the points needed for the next curve
     */
    _setCurvePoints() {
        /*
         * Given points A, B and C for a curve, following points p0, p1 and p2 are set for a bezier curve around the corner of B.
         * which is set for smooth corner movement and depends on the curveDistance(cD) from B.
         * p0 = B + cD * (A-B)
         * p1 = B
         * p2 = B + cD * (C-B)
         */
        vec3.sub(
            this.currentPosition,
            this.positions[this.currentCurveIndex],
            this.positions[this.currentCurveIndex + 1]
        );
        vec3.scale(this.currentPosition, this.currentPosition, this.curveDistance);
        vec3.add(this.p0, this.positions[this.currentCurveIndex + 1], this.currentPosition);

        this.p1 = this.positions[this.currentCurveIndex + 1];

        vec3.sub(
            this.currentPosition,
            this.positions[this.currentCurveIndex + 2],
            this.positions[this.currentCurveIndex + 1]
        );
        vec3.scale(this.currentPosition, this.currentPosition, this.curveDistance);
        vec3.add(this.p2, this.positions[this.currentCurveIndex + 1], this.currentPosition);
    }

    /**
     * Sets the object's path object and configures it.
     * @param  {WL.Object} pathObject [Object containing alphebetically named children]
     */
    setPathObject(pathObject) {
        this.pathObject = pathObject;
        this.children = this.pathObject.children.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        this.positions = new Array(this.children.length);
        for (let i = 0; i < this.children.length; i++) {
            this.positions[i] = new Float32Array(3);
            this.children[i].getTranslationWorld(this.positions[i]);
        }
        this.currentPositionIndex = 0;
        this.currentCurveIndex = 0;
        this.currentLength = 0;
        this._setCurvePoints();

        this.fromPosition = this.positions[0];
        this.toPosition = this.positions[1];
        vec3.sub(this.currentPosition, this.toPosition, this.fromPosition);
        this.fromToLength = vec3.length(this.currentPosition);
    }

    update(dt) {
        this.currentLength += dt * this.speed;
        // factor indicates the percentage of how much of a given distance between two points has already been traversed
        let factor = this.currentLength / this.fromToLength;
        // Check if it is the curve point, if it is, don't increment the index of curves
        if (factor > 0.5 && this.currentPositionIndex != this.positions.length - 1) {
            this.incrementCurveIndex = true;
        }
        // Check for wether the curve should start (limit set by this.curveDistance) or a straight lerp should occur
        if (
            Math.abs(factor - Math.round(factor)) < this.curveDistance &&
            !(this.currentPositionIndex == this.children.length - 2 && factor > 0.5) &&
            !(this.currentPositionIndex == 0 && factor < 0.5)
        ) {
            // Determines the position on the bezier curve around the corner from factor, which moves from 0.9 to 0.1 after passing the middle point
            let bezFactor =
                (factor - Math.round(factor) + this.curveDistance) *
                this.bezFactorMultiplicator;
            vec3.bezier(
                this.currentPosition,
                this.p0,
                this.p1,
                this.p1,
                this.p2,
                bezFactor
            );
            // position ahead of the object on the path, determines the looking direction
            vec3.bezier(
                this.lookPosition,
                this.p0,
                this.p1,
                this.p1,
                this.p2,
                bezFactor + 0.01
            );
        } else {
            if (
                this.incrementCurveIndex &&
                factor < 0.5 &&
                factor > this.curveDistance &&
                this.currentCurveIndex != this.positions.length - 3
            ) {
                this.currentCurveIndex++;
                this.incrementCurveIndex = false;
                this._setCurvePoints();
            }
            vec3.lerp(this.currentPosition, this.fromPosition, this.toPosition, factor);
            // position ahead of the object on the path, determines the looking direction
            vec3.lerp(this.lookPosition, this.fromPosition, this.toPosition, factor + 0.01);
        }

        // Movement and rotation to calculated position/direction
        this.object.resetTranslationRotation();
        lookAt(this.quat, this.currentPosition, this.lookPosition, this.up);
        this.object.rotate(this.quat);
        this.object.setTranslationWorld(this.currentPosition);

        // Checks wether the waypoint has been passed
        if (this.currentLength > this.fromToLength) {
            this.start = false;
            this.currentPositionIndex++;
            // Checks if the final waypoint has been reached
            if (this.currentPositionIndex == this.children.length - 1) {
                this.currentPositionIndex = 0;
                this.currentCurveIndex = 0;
                this._setCurvePoints();
                this.incrementCurveIndex = false;
                this.onFinalWaypointReachedCallbacks.forEach((f) => f());
            }
            this.fromPosition = this.positions[this.currentPositionIndex];
            this.toPosition = this.positions[this.currentPositionIndex + 1];
            vec3.sub(this.currentPosition, this.toPosition, this.fromPosition);
            this.fromToLength = vec3.length(this.currentPosition);
            this.currentLength = 0;
        }
    }
}

// lookAt function will be replaced by an internal function in the future.
const lookAt = (function () {
    let forwardTemp = new Float32Array(3);
    let temp = new Float32Array(3);
    let dotTemp = 0;

    let vector = new Float32Array(3);
    let vector2 = new Float32Array(3);
    let vector3 = new Float32Array(3);

    return function (quaternion, sourcePoint, destPoint, up) {
        if (!up) {
            up = [0, 1, 0];
        }

        vec3.sub(forwardTemp, destPoint, sourcePoint);
        vec3.normalize(forwardTemp, forwardTemp);

        dotTemp = vec3.dot(up, forwardTemp);

        vec3.scale(temp, forwardTemp, dotTemp);

        vec3.sub(up, up, temp);
        vec3.normalize(up, up);

        vec3.normalize(vector, forwardTemp);
        vec3.cross(vector2, up, vector);
        vec3.cross(vector3, vector, vector2);
        let m00 = vector2[0];
        let m01 = vector2[1];
        let m02 = vector2[2];
        let m10 = vector3[0];
        let m11 = vector3[1];
        let m12 = vector3[2];
        let m20 = vector[0];
        let m21 = vector[1];
        let m22 = vector[2];

        let num8 = m00 + m11 + m22;
        if (num8 > 0.0) {
            let num = Math.sqrt(num8 + 1.0);
            quaternion[3] = num * 0.5;
            num = 0.5 / num;
            quaternion[0] = (m12 - m21) * num;
            quaternion[1] = (m20 - m02) * num;
            quaternion[2] = (m01 - m10) * num;
            return quaternion;
        }
        if (m00 >= m11 && m00 >= m22) {
            let num7 = Math.sqrt(1.0 + m00 - m11 - m22);
            let num4 = 0.5 / num7;
            quaternion[0] = 0.5 * num7;
            quaternion[1] = (m01 + m10) * num4;
            quaternion[2] = (m02 + m20) * num4;
            quaternion[3] = (m12 - m21) * num4;
            return quaternion;
        }
        if (m11 > m22) {
            let num6 = Math.sqrt(1.0 + m11 - m00 - m22);
            let num3 = 0.5 / num6;
            quaternion[0] = (m10 + m01) * num3;
            quaternion[1] = 0.5 * num6;
            quaternion[2] = (m21 + m12) * num3;
            quaternion[3] = (m20 - m02) * num3;
            return quaternion;
        }
        let num5 = Math.sqrt(1.0 + m22 - m00 - m11);
        let num2 = 0.5 / num5;
        quaternion[0] = (m20 + m02) * num2;
        quaternion[1] = (m21 + m12) * num2;
        quaternion[2] = 0.5 * num5;
        quaternion[3] = (m01 - m10) * num2;

        return quaternion;
    };
})();
