/**
    Copyright © 2020 Daniel Adams <msub2official@gmail.com>

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

/// <reference path="../deploy/wonderland.js" />

/** Smooth locomotion character controller for VR. */
WL.registerComponent('smooth-locomotion', {
    /** Handedness for VR cursors to accept input only from respective controller */
    handedness: { type: WL.Type.Enum, values: ['left', 'right'], default: 'left' },
    /** Whether this controller rotates or moves the character */
    controlType: { type: WL.Type.Enum, values: ['move', 'rotate'], default: 'move' },
    /** Whether to use thumbstick or touchpad for input */
    controlSource: { type: WL.Type.Enum, values: ['thumbstick', 'touchpad'], default: 'thumbstick' },
    /** Player object which is moved */
    player: { type: WL.Type.Object, default: null },
    /** Head/Left eye object from which to get movement direction */
    head: { type: WL.Type.Object, default: null },
    /** Right eye object from which to get movement direction */
    head2: { type: WL.Type.Object, default: null },
    /** Movement speed, default `1.0` */
    moveSpeed: { type: WL.Type.Float, default: 1 },
    /** Allow flying (if false, will not move on the Y axis) */
    allowFly: { type: WL.Type.Bool, default: false },
    /** Whether to rotate smoothly or snap in `snapDegrees` increments */
    rotationType: { type: WL.Type.Enum, values: ['snap', 'smooth'], default: 'snap' },
    /** Incremements to snap to when `rotationType` is `"snap"`, default `45` */
    snapDegrees: { type: WL.Type.Int, default: 45 }
},
    {
        init: function() {
            //Rotation
            this.justSnapped = false;
            this.snapDeadzone = .8; //Cannot snap turn again unless you go below this threshold

            //Interacting
            this.collider = this.object.getComponent("collision");
            this.grabControls = this.object.getComponent("grabbing-controls");

            //Movement limits for now
            this.min = -4;
            this.max = 4;
        },
        start: function () {
            //Start
        },
        update: function(dt) {
            let s = WL.xrSession;
            if (!s) return;

            //Handle input
            for (let i = 0; i < s.inputSources.length; ++i) {
                let input = s.inputSources[i];
                if (input.handedness == ['left', 'right'][this.handedness]) {
                    let gamepad = input.gamepad;
                    if (!gamepad) continue;

                    //Gather input from controller
                    let xAxis = this.controlSource == "thumbstick" ? gamepad.axes[0] : gamepad.axes[2];
                    let yAxis = this.controlSource == "thumbstick" ? gamepad.axes[1] : gamepad.axes[3];
                    let gripped = gamepad.buttons[1].pressed;

                    //Handle movement and rotation
                    if (this.controlType == 0) {
                        this.move(xAxis, yAxis, dt);
                    }
                    else if (this.controlType == 1)
                        this.rotate(xAxis, dt);

                    if(!this.grabControls) continue;
                    //Handle button presses
                    if(gripped) {
                        this.grabControls.grab();
                    } else {
                        this.grabControls.drop();
                    }
                }
            }
        },
        move: function(xAxis, yAxis, dt) {
            let direction = [xAxis, 0, yAxis];

            glMatrix.vec3.normalize(direction, direction);
            glMatrix.vec3.scale(direction, direction, dt*this.moveSpeed);
            glMatrix.vec3.transformQuat(direction, direction, this.head.transformWorld);        
            if (!this.allowFly) direction[1] = 0;
            this.player.translate(direction);

            //TODO: Either implement collision or clamp world translation
        },
        rotate: function(xAxis, dt) {
            if (this.rotationType == 0) { //Snap
                if (Math.abs(xAxis) == 1 && !this.justSnapped) {
                    let lastHeadPos = [0, 0, 0];
                    this.head.transformWorld;
                    this.head.getTranslationWorld(lastHeadPos);
                    //console.log("lastHeadPos: " + lastHeadPos);

                    //let lastHeadPos = this.getHeadPos();

                    this.player.rotateAxisAngleDeg([0, 1, 0], this.snapDegrees * -xAxis);
                    this.justSnapped = true;

                    this.head2.transformWorld;
                    let currentHeadPos = [0, 0, 0];
                    this.head.getTranslationWorld(currentHeadPos);
                    //console.log("currentHeadPos: "  + currentHeadPos);

                    //let currentHeadPos = this.getHeadPos();

                    let newPos = [0, 0, 0];
                    glMatrix.vec3.sub(newPos, lastHeadPos, currentHeadPos);
                    //console.log("newPos: " + newPos);

                    this.player.translate(newPos);
                }
                else if (Math.abs(xAxis) < .8) {
                    this.justSnapped = false;
                }
            }
            else if (this.rotationType == 1) { //Smooth
                //TODO: Smooth
            }
        },
        getHeadPos: function() {
            let left = [0, 0, 0];
            this.head.getTranslationWorld(left);
            let right = [0, 0, 0];
            this.head2.getTranslationWorld(right);
            let center = [0, 0, 0];
            glMatrix.vec3.add(center, left, right);
            glMatrix.vec3.scale(center, center, .5);
            return center;
        },
        clamp: function (input, min, max) {
            return (input < min) ? min : (input > max) ? max : input;
        },
        grab: function () {
            if (this.currentInteractable.parent) {
                const invParent = glMatrix.quat2.create();
                glMatrix.quat2.invert(invParent, this.currentInteractable.parent.transformWorld);

                // Apply inverted parent to this objects world transform
                glMatrix.quat2.multiply(this.currentInteractable.transformLocal, invParent, this.object.transformWorld);
            } else {
                this.currentInteractable.transformLocal.set(this.object.transformWorld);
            }
            this.currentInteractable.setDirty();
            return;
        }
    }
);
