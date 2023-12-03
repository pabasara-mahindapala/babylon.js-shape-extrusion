import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";
import * as earcut from 'earcut';

class Playground {
    camera: BABYLON.ArcRotateCamera;
    scene: BABYLON.Scene;
    ground: BABYLON.Mesh;
    canvas: HTMLCanvasElement;
    extrudedMeshes: BABYLON.Mesh[] = [];
    startingPoint: BABYLON.Nullable<BABYLON.Vector3> = null;
    currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;
    shapes: BABYLON.Vector3[][] = [];
    isDrawing = false;
    isMoving = false;
    isVertexEditing = false;
    shapelines: BABYLON.LinesMesh[] = [];
    spheres: BABYLON.Mesh[] = [];
    currentShapePoints: BABYLON.Vector3[] = [];
    dragBoxes: BABYLON.Mesh[] = [];

    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = new BABYLON.Scene(engine);
        this.camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 60, height: 60 }, this.scene);
        this.CreateScene(engine, canvas);
    }

    public CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.camera.setPosition(new BABYLON.Vector3(6, 12, 30));
        this.camera.attachControl(canvas, true);
        this.camera.upperBetaLimit = Math.PI / 2;

        var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(3, 1.5, 0), this.scene);
        light.intensity = 0.7;


        this.ground.visibility = 0.2;
        new BABYLON.AxesViewer(this.scene, 3);

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.getDrawButton());
        advancedTexture.addControl(this.getExtrudeButton());
        advancedTexture.addControl(this.getMoveButton());
        advancedTexture.addControl(this.getVertexEditButton());

        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 2) {
                        if (!this.isVertexEditing) break;

                        var ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, BABYLON.Matrix.Identity(), this.camera);
                        var hit = this.scene.pickWithRay(ray);
                        if (hit && hit.pickedMesh && hit.pickedMesh != this.ground) {
                            var wMatrix = hit.pickedMesh.computeWorldMatrix(true);
                            var wireframeMaterial = new BABYLON.StandardMaterial("wireframeMaterial", this.scene);
                            wireframeMaterial.wireframe = true;
                            hit.pickedMesh.material = wireframeMaterial;
                            hit.pickedMesh.isPickable = true;
                            var positions = hit.pickedMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                            var indices = hit.pickedMesh.getIndices();
                            var dragBox = BABYLON.Mesh.CreateBox("dragBox", 0.15, this.scene);
                            var vertexPoint = BABYLON.Vector3.Zero();
                            var fidx = hit.faceId
                            var minDist = Infinity;
                            var dist = 0;
                            var hitPoint = hit.pickedPoint;
                            var idx = 0;
                            var boxPosition = BABYLON.Vector3.Zero();
                            if (!indices || !positions || !hitPoint) break;
                            for (var i = 0; i < 3; i++) {
                                idx = indices[3 * fidx + i]
                                vertexPoint.x = positions[3 * idx];
                                vertexPoint.y = positions[3 * idx + 1];
                                vertexPoint.z = positions[3 * idx + 2];
                                BABYLON.Vector3.TransformCoordinatesToRef(vertexPoint, wMatrix, vertexPoint);
                                dist = vertexPoint.subtract(hitPoint).length();
                                if (dist < minDist) {
                                    boxPosition = vertexPoint.clone();
                                    minDist = dist;
                                }
                            }
                            dragBox.position = boxPosition;
                            var dragBoxMat = new BABYLON.StandardMaterial("dragBoxMat", this.scene);
                            dragBoxMat.diffuseColor = new BABYLON.Color3(1.4, 3, 0.2);
                            dragBox.material = dragBoxMat;
                            this.dragBoxes.push(dragBox);
                        }
                    }
                    else if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedMesh != this.ground) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh)
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.pointerUp(pointerInfo.event);
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.pointerMove();
                    break;
            }
        });
    }

    public getScene(): BABYLON.Scene {

        return this.scene;
    }
    getGroundPosition() {
        if (this.scene) {
            var pickinfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => { return mesh == this.ground; });
            if (pickinfo && pickinfo.hit) {
                return pickinfo.pickedPoint;
            }
        }

        return null;
    }
    pointerDown(mesh: BABYLON.AbstractMesh) {
        if (this.isMoving) {
            this.currentMesh = mesh;

            const moveMaterial = new BABYLON.StandardMaterial("moveMaterial", this.scene);
            moveMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);

            this.currentMesh.material = moveMaterial;
            this.startingPoint = this.getGroundPosition();
            // Disconnecting the camera from canvas
            if (this.startingPoint) {
                setTimeout(() => {
                    this.camera.detachControl(this.canvas);
                }, 0);
            }
        }
    }

    pointerUp(event: PointerEvent) {

        if (this.isMoving) {
            if (this.startingPoint) {
                this.camera.attachControl(this.canvas, true);
                if (this.currentMesh) {
                    this.currentMesh.material = null;
                }
                this.startingPoint = null;
                return;
            }
        } else if (this.isDrawing) {
            if (event.button == 0) {
                if (this.isDrawing) {
                    const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        var sphere = BABYLON.MeshBuilder.CreateSphere("pointSphere", { diameter: .2, segments: 16 });
                        sphere.position.x = pickInfo.pickedPoint.x;
                        sphere.position.z = pickInfo.pickedPoint.z;
                        this.currentShapePoints.push(pickInfo.pickedPoint);
                        this.spheres.push(sphere);
                    }
                } else {
                    return;
                }
            } else if (event.button == 2) {
                if (!this.isDrawing) return;
                this.drawShape(this.scene);
                if (!this.shapes) this.shapes = [];
                this.shapes.push(this.currentShapePoints);
                this.currentShapePoints = [];
            }
        }
    }

    pointerMove() {
        if (this.isMoving) {
            if (!this.startingPoint || !this.currentMesh) {
                return;
            }
            var current = this.getGroundPosition();
            if (!current) {
                return;
            }

            var diff = current.subtract(this.startingPoint);
            this.currentMesh.position.addInPlace(diff);

            this.startingPoint = current;
        }
    }

    drawShape(scene: BABYLON.Scene) {
        this.currentShapePoints.push(this.currentShapePoints[0]);
        var shapeline = BABYLON.Mesh.CreateLines("sl", this.currentShapePoints, scene);
        shapeline.color = BABYLON.Color3.Green();
        this.shapelines.push(shapeline);
    }

    getDrawButton(): GUI.Control {
        var drawButton = this.CreateUIButton("drawBtn", "Draw", "left");
        drawButton.onPointerUpObservable.add(() => {
            if (this.isMoving) return;
            if (drawButton.textBlock) {
                if (this.isDrawing) {
                    drawButton.background = "green";
                    drawButton.textBlock.text = "Draw";
                    this.isDrawing = false;
                } else {
                    drawButton.background = "red";
                    drawButton.textBlock.text = "Stop";
                    this.isDrawing = true;
                }
            }
        });
        return drawButton;
    }

    getMoveButton(): GUI.Control {
        var moveButton = this.CreateUIButton("moveBtn", "Move", "center");
        moveButton.onPointerUpObservable.add(() => {
            if (this.isDrawing) return;
            if (moveButton.textBlock) {
                if (this.isMoving) {
                    moveButton.background = "green";
                    moveButton.textBlock.text = "Move";
                    this.isMoving = false;
                } else {
                    moveButton.background = "red";
                    moveButton.textBlock.text = "Stop";
                    this.isMoving = true;
                }
            }
        });
        return moveButton;
    }

    getVertexEditButton(): GUI.Control {
        var vertexEditButton = this.CreateUIButton("vertexEditBtn", "Vertex Edit", "right");
        vertexEditButton.onPointerUpObservable.add(() => {
            if (this.isDrawing || this.isMoving) return;
            if (vertexEditButton.textBlock) {
                if (this.isVertexEditing) {
                    vertexEditButton.background = "green";
                    vertexEditButton.textBlock.text = "Vertex Edit";
                    this.disposeDragBoxes();
                    this.isVertexEditing = false;
                } else {
                    vertexEditButton.background = "red";
                    vertexEditButton.textBlock.text = "Stop";
                    this.isVertexEditing = true;
                }
            }
        });
        return vertexEditButton;
    }

    disposeDragBoxes() {
        if (this.dragBoxes && this.dragBoxes.length > 0) {
            for (const dragBox of this.dragBoxes) {
                dragBox.dispose();
            }
            this.dragBoxes = [];
        }
    }

    getExtrudeButton(): GUI.Control {
        var extrudeButton = this.CreateUIButton("extrudeBtn", "Extrude", "top");
        extrudeButton.onPointerUpObservable.add(() => {
            if (this.isDrawing || this.isMoving) return;
            if (this.shapes && this.shapes.length > 0) {
                for (const shape of this.shapes) {
                    const extrudedMesh = BABYLON.MeshBuilder.ExtrudePolygon("polygon", {
                        shape: shape,
                        depth: 1.5,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        // updatable: true
                    }, this.scene, earcut.default);
                    extrudedMesh.position.y = 1.5;
                    if (!this.extrudedMeshes) this.extrudedMeshes = [];
                    this.extrudedMeshes.push(extrudedMesh);
                }
                this.shapes = [];
                this.disposeDrawingCues();
            }

        });
        return extrudeButton;
    }

    disposeDrawingCues() {
        if (this.shapelines && this.shapelines.length > 0) {
            for (const shapeline of this.shapelines) {
                shapeline.dispose();
            }
            this.shapelines = [];
        }
        if (this.spheres && this.spheres.length > 0) {
            for (const sphere of this.spheres) {
                sphere.dispose();
            }
            this.spheres = [];
        }
    }

    CreateUIButton(name: string, text: string, position: string): GUI.Button {
        var button = GUI.Button.CreateSimpleButton(name, text);
        button.width = "120px"
        button.height = "60px";
        button.color = "white";
        if (position == "left") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            button.left = "10px";
        } else if (position == "center") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        } else if (position == "right") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
            button.paddingRight = "10px";
        } else if (position == "top") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            button.top = "10px";
        }
        button.paddingBottom = "10px";
        button.cornerRadius = 20;
        button.background = "green";
        return button;
    }
}

export function CreatePlaygroundScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    return new Playground(engine, canvas).getScene();
}