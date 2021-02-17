/** Draw a line between two objects by scaling a mesh (e.g. a cube) and rotating it accordingly. */
WL.registerComponent('line-connection', {
    /** Object from which to draw the line */
    targetA: {type: WL.Type.Object},
    /** Object to which to draw the line */
    targetB: {type: WL.Type.Object},
    /** How much of the length between the objects to span */
    lengthPercentage: {type: WL.Type.Float, default: 1.0},
    /** Thickness of the line, default `0.05` */
    thickness: {type: WL.Type.Float, default: 0.05}
}, {
    init: function() {
        if(!this.targetA) {
            console.warn('targetA on "line-connection" not set, deactivating');
            this.active = false;
            return;
        }
        if(!this.targetB) {
            console.warn('targetB on "line-connection" not set, deactivating');
            this.active = false;
            return;
        }

        this.diff = new Float32Array(3);
        this.dir = new Float32Array(3);
        this.posA = new Float32Array(3);
        this.posB = new Float32Array(3);
        this.invParent = new Float32Array(8);
    },
    start: function() {
        this.mesh = this.object.getComponent('mesh');
        if(!this.mesh) {
            console.warn('no mesh component found for "line-connection", deactivating');
            this.active = false;
            return;
        }
    },
    update: function(dt) {
        this.targetA.getTranslationWorld(this.posA);
        this.targetB.getTranslationWorld(this.posB);
        glMatrix.vec3.sub(this.diff, this.posB, this.posA);
        glMatrix.vec3.scale(this.diff, this.diff, 0.5);

        let dist = glMatrix.vec3.length(this.diff);
        this.object.resetTransform();
        this.object.scale([this.thickness, this.lengthPercentage*dist, this.thickness]);

        glMatrix.quat2.conjugate(this.invParent, this.object.parent.transformWorld);

        glMatrix.vec3.normalize(this.dir, this.diff);
        glMatrix.quat.rotationTo(this.object.transformLocal, [0, 1, 0], this.dir);
        glMatrix.vec3.add(this.diff, this.posA, this.diff);
        this.object.translate(this.diff);

        glMatrix.quat2.mul(this.object.transformLocal, this.invParent, this.object.transformLocal);
    },
});
