/**
    Copyright © 2020 Daniel Adams <msub2official@gmail.com>
    Copyright © 2024 Jonathan Hale <squareys@googlemail.com>

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included
    in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
    THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.
*/

import {Component, Object3D} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/dist/decorators.js';
import {vec3} from 'gl-matrix';

const tempVec = vec3.create();
const tempVec2 = vec3.create();

const AxisY = [0, 1, 0];

/** Smooth locomotion character controller for VR. */
export class SmoothLocomotion extends Component {
    static TypeName = 'smooth-locomotion';
    /** Handedness for VR cursors to accept input only from respective controller */
    @property.enum(['left', 'right'])
    handedness!: number;

    /** Whether this controller rotates or moves the character */
    @property.enum(['move', 'rotate'])
    controlType!: number;

    /** Whether to use thumbstick or touchpad for input */
    @property.enum(['thumbstick', 'touchpad'])
    controlSource!: number;

    /** Player object which is moved */
    @property.object({required: true})
    player!: Object3D;

    /** Head object from which to get movement direction */
    @property.object()
    head!: Object3D | null;

    /** Movement speed, default `1.0` */
    @property.float(1.0)
    moveSpeed = 1.0;

    /** Allow flying (if false, will not move on the Y axis) */
    @property.bool(false)
    allowFly = false;

    /** Incremements to snap to for snap rotation, default `45` */
    @property.int(45)
    snapDegrees = 45;

    justSnapped = false;

    // Cannot snap turn again unless you go below this threshold
    snapDeadzone = 0.8;
    min = -4;
    max = 4;

    grabbing = false;

    update(dt: number) {
        const s = this.engine.xr?.session;
        if (!s) return;

        /* Handle VR input */
        for (let i = 0; i < s.inputSources.length; ++i) {
            const input = s.inputSources[i];
            if (input.hand) continue;
            if (input.handedness == ['left', 'right'][this.handedness]) {
                const gamepad = input.gamepad;
                if (!gamepad) continue;
                if (!gamepad.axes) continue;

                // Gather input from controller
                const xAxis = gamepad.axes[2];
                const yAxis = gamepad.axes[3];
                const gripped =
                    gamepad.buttons &&
                    gamepad.buttons.length >= 2 &&
                    gamepad.buttons[1].pressed;

                // Handle movement and rotation
                if (this.controlType == 0) {
                    this.move(xAxis, yAxis, dt);
                } else if (this.controlType == 1) this.rotate(xAxis);

                // Handle button pressed
                if (gripped && !this.grabbing) {
                    this.grab();
                    this.grabbing = true;
                } else if (this.grabbing) {
                    this.drop();
                    this.grabbing = false;
                }
            }
        }
    }

    move(xAxis: number, yAxis: number, dt: number) {
        const direction = vec3.set(tempVec, xAxis, 0, yAxis);

        this.head?.transformVectorWorld(direction, direction);
        if (!this.allowFly) direction[1] = 0;

        const l = vec3.length(direction);
        /* length of direction is 0, so we have nothing to do */
        if (l == 0) return;
        vec3.scale(direction, direction, dt * this.moveSpeed * (1 / l));

        this.player.translateLocal(direction);
    }

    rotate(xAxis: number) {
        if (!this.head) return;

        /* Snap rotation */
        if (Math.abs(xAxis) > this.snapDeadzone && !this.justSnapped) {
            const lastHeadPos = this.head.getPositionWorld(tempVec);

            this.player.rotateAxisAngleDegLocal(
                AxisY,
                this.snapDegrees * -Math.sign(xAxis)
            );
            this.justSnapped = true;

            const curHeadPos = this.head.getPositionWorld(tempVec2);

            /* Move player such that head stays at same position */
            const newPos = vec3.sub(tempVec, lastHeadPos, curHeadPos);
            this.player.translateLocal(newPos);
        } else if (Math.abs(xAxis) < this.snapDeadzone) {
            this.justSnapped = false;
        }
    }

    grab() {}

    drop() {}
}
