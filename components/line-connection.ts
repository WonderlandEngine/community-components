import {Component, MeshComponent, Object3D, Type} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/dist/decorators';
import {quat, quat2, vec3} from 'gl-matrix';

const tempVec = vec3.create();
const tempQuat = quat.create();

const AxisY = [0, 1, 0];

/** Draw a line between two objects by scaling a mesh (e.g. a cube) and rotating it accordingly. */
export class LineConnection extends Component {
    static TypeName = 'line-connection';

    /** Object from which to draw the line */
    @property.object({required: true})
    targetA!: Object3D;

    /** Object to which to draw the line */
    @property.object({required: true})
    targetB!: Object3D;

    /** How much of the length between the objects to span */
    @property.float(1.0)
    lengthPercentage = 1.0;

    /** Thickness of the line, default `0.05` */
    @property.float(0.05)
    thickness = 0.05;

    diff = new Float32Array(3);
    dir = new Float32Array(3);
    posA = new Float32Array(3);
    posB = new Float32Array(3);
    invParent = new Float32Array(8);

    mesh!: null | MeshComponent;

    start() {
        this.mesh = this.object.getComponent('mesh');
        if (!this.mesh) {
            console.warn('no mesh component found for "line-connection", deactivating');
            this.active = false;
            return;
        }
    }

    update(dt: number) {
        this.targetA.getPositionWorld(this.posA);
        this.targetB.getPositionWorld(this.posB);

        vec3.sub(this.diff, this.posB, this.posA);
        vec3.scale(this.diff, this.diff, 0.5);

        const dist = vec3.length(this.diff);
        vec3.set(tempVec, this.thickness, this.lengthPercentage * dist, this.thickness);
        this.object.setScalingLocal(tempVec);

        vec3.scale(this.dir, this.diff, 1 / dist);
        quat.rotationTo(tempQuat, AxisY, this.dir);
        this.object.setRotationWorld(tempQuat);

        vec3.add(this.diff, this.posA, this.diff);
        this.object.setPositionWorld(this.diff);
    }
}
