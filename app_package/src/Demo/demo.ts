import "@babylonjs/loaders";
import earcut from 'earcut';
import { ArcRotateCamera, Scene, Mesh, Nullable, Vector3, AbstractMesh, LinesMesh, StandardMaterial, Engine, MeshBuilder, HemisphericLight, AxesViewer, PointerEventTypes, Matrix, VertexBuffer, Color3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Button } from "@babylonjs/gui";

class Demo {
    camera: ArcRotateCamera;
    scene: Scene;
    ground: Mesh;
    canvas: HTMLCanvasElement;
    extrudedMeshes: Mesh[] = [];
    startingPoint: Nullable<Vector3> = null;
    currentMesh: Nullable<AbstractMesh> = null;
    shapes: Vector3[][] = [];
    isDrawing = false;
    isMoving = false;
    isVertexEditing = false;
    shapelines: LinesMesh[] = [];
    spheres: Mesh[] = [];
    currentShapePoints: Vector3[] = [];
    dragBox: Nullable<Mesh> = null;
    dragBoxMat: StandardMaterial | null = null;
    currentPickedMesh: AbstractMesh | undefined;
    fidx: number | undefined;
    xIndexes: number[] = [];
    zIndexes: number[] = [];

    constructor(engine: Engine, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = new Scene(engine);
        this.camera = new ArcRotateCamera("camera", 0, 0, 0, new Vector3(0, 0, 0), this.scene);
        this.ground = MeshBuilder.CreateGround("ground", { width: 60, height: 60 }, this.scene);
        this.createScene(engine, canvas);
    }

    createScene(engine: Engine, canvas: HTMLCanvasElement) {
        this.camera.setPosition(new Vector3(6, 12, 30));
        this.camera.attachControl(canvas, true);
        this.camera.upperBetaLimit = Math.PI / 2;

        var light = new HemisphericLight("light", new Vector3(3, 1.5, 0), this.scene);
        light.intensity = 0.7;


        this.ground.visibility = 0.2;
        new AxesViewer(this.scene, 3);

        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.getDrawButton());
        advancedTexture.addControl(this.getExtrudeButton());
        advancedTexture.addControl(this.getMoveButton());
        advancedTexture.addControl(this.getVertexEditButton());

        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 2) {
                        this.addDragBox();
                    }
                    else if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedMesh != this.ground) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh)
                    }
                    break;
                case PointerEventTypes.POINTERUP:
                    this.pointerUp(pointerInfo.event);
                    break;
                case PointerEventTypes.POINTERMOVE:
                    this.pointerMove();
                    break;
            }
        });
    }

    addDragBox() {
        if (!this.isVertexEditing) return;
        this.disposeDragBox();
        var ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, Matrix.Identity(), this.camera);
        var pickingInfo = this.scene.pickWithRay(ray);
        if (!!pickingInfo && !!pickingInfo.pickedMesh && pickingInfo.pickedMesh != this.ground) {
            this.xIndexes = [];
            this.zIndexes = [];
            this.currentPickedMesh = pickingInfo.pickedMesh;
            var wMatrix = pickingInfo.pickedMesh.computeWorldMatrix(true);
            pickingInfo.pickedMesh.isPickable = true;
            var positions = pickingInfo.pickedMesh.getVerticesData(VertexBuffer.PositionKind);
            var indices = pickingInfo.pickedMesh.getIndices();
            this.dragBox = Mesh.CreateBox("dragBox", 0.15, this.scene);
            var vertexPoint = Vector3.Zero();
            this.fidx = pickingInfo.faceId
            var minDist = Infinity;
            var dist = 0;
            var hitPoint = pickingInfo.pickedPoint;
            var idx = 0;
            var boxPosition = Vector3.Zero();
            if (!indices || !positions || !hitPoint) return;
            for (var i = 0; i < 3; i++) {
                idx = indices[3 * this.fidx + i]
                vertexPoint.x = positions[3 * idx];
                var initX = positions[3 * idx];
                vertexPoint.y = positions[3 * idx + 1];
                var initY = positions[3 * idx + 1];
                vertexPoint.z = positions[3 * idx + 2];
                var initZ = positions[3 * idx + 2];
                Vector3.TransformCoordinatesToRef(vertexPoint, wMatrix, vertexPoint);
                dist = vertexPoint.subtract(hitPoint).length();
                if (dist < minDist) {
                    boxPosition = vertexPoint.clone();
                    vertexPoint.x = initX;
                    vertexPoint.z = initZ;
                    minDist = dist;
                }
            }
            this.dragBox.position = boxPosition;
            for (var i = 0; i < positions.length; i++) {
                if (positions[i] == vertexPoint.x) {
                    this.xIndexes.push(i);
                }
                if (positions[i] == vertexPoint.z) {
                    this.zIndexes.push(i);
                }
            }

            this.dragBoxMat = new StandardMaterial("dragBoxMat", this.scene);
            this.dragBoxMat.diffuseColor = new Color3(1.4, 3, 0.2);
            this.dragBox.material = this.dragBoxMat;
        }
    }

    public getScene(): Scene {
        return this.scene;
    }

    getPosition(ground: boolean = true) {
        if (this.scene) {
            var pickinfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
                return ground ? mesh == this.ground : true;
            });
            if (pickinfo && pickinfo.hit && pickinfo.pickedPoint) {
                if (pickinfo.pickedPoint.y < 0) {
                    pickinfo.pickedPoint.y = 0;
                }
                return pickinfo.pickedPoint;
            }
        }

        return null;
    }

    pointerDown(mesh: AbstractMesh) {
        if (this.isMoving) {
            this.currentMesh = mesh;

            const moveMaterial = new StandardMaterial("moveMaterial", this.scene);
            moveMaterial.diffuseColor = new Color3(1, 1, 0);

            this.currentMesh.material = moveMaterial;
            this.startingPoint = this.getPosition();

            // Disconnecting the camera from canvas
            if (this.startingPoint) {
                setTimeout(() => {
                    this.camera.detachControl(this.canvas);
                }, 0);
            }
        } else if (this.isVertexEditing && this.dragBox) {
            const moveMaterial = new StandardMaterial("moveMaterial", this.scene);
            moveMaterial.diffuseColor = new Color3(1, 1, 0);
            this.dragBox.material = moveMaterial;
            this.startingPoint = this.getPosition(false);
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
                        var sphere = MeshBuilder.CreateSphere("pointSphere", { diameter: .2, segments: 16 });
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
        } else if (this.isVertexEditing) {
            if (this.startingPoint) {
                this.camera.attachControl(this.canvas, true);
                if (this.dragBox) {
                    this.dragBox.material = this.dragBoxMat;
                }
                this.startingPoint = null;
                this.disposeDragBox();
            }
        }
    }

    pointerMove() {
        if (this.isMoving) {
            if (!this.startingPoint || !this.currentMesh) {
                return;
            }
            var current = this.getPosition();
            if (!current) {
                return;
            }

            var diff = current.subtract(this.startingPoint);
            this.currentMesh.position.addInPlace(diff);

            this.startingPoint = current;
        } else if (this.isVertexEditing) {
            if (!this.startingPoint || !this.dragBox) {
                return;
            }

            var current = this.getPosition(false);
            if (!current || !this.currentPickedMesh || (!this.fidx && this.fidx != 0)) {
                return;
            }

            var diff = current.subtract(this.startingPoint);
            this.dragBox.position.addInPlace(diff);

            this.startingPoint = current;

            var positions = this.currentPickedMesh.getVerticesData(VertexBuffer.PositionKind);
            var indices = this.currentPickedMesh.getIndices();

            if (!positions || !indices) {
                return;
            }

            for (var i = 0; i < this.xIndexes.length; i++) {
                positions[this.xIndexes[i]] = current.x;
            }

            for (var i = 0; i < this.zIndexes.length; i++) {
                positions[this.zIndexes[i]] = current.z;
            }

            this.currentPickedMesh.updateVerticesData(VertexBuffer.PositionKind, positions);
        }
    }

    drawShape(scene: Scene) {
        this.currentShapePoints.push(this.currentShapePoints[0]);
        var shapeline = Mesh.CreateLines("sl", this.currentShapePoints, scene);
        shapeline.color = Color3.Green();
        this.shapelines.push(shapeline);
    }

    getDrawButton(): Control {
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

    getMoveButton(): Control {
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

    getVertexEditButton(): Control {
        var vertexEditButton = this.CreateUIButton("vertexEditBtn", "Vertex Edit", "right");
        vertexEditButton.onPointerUpObservable.add(() => {
            if (this.isDrawing || this.isMoving) return;
            if (vertexEditButton.textBlock) {
                if (this.isVertexEditing) {
                    vertexEditButton.background = "green";
                    vertexEditButton.textBlock.text = "Vertex Edit";
                    this.disposeDragBox();
                    if (this.extrudedMeshes && this.extrudedMeshes.length > 0) {
                        for (const extrudedMesh of this.extrudedMeshes) {
                            extrudedMesh.material = null;
                        }
                        this.isVertexEditing = false;
                    }
                } else {
                    vertexEditButton.background = "red";
                    vertexEditButton.textBlock.text = "Stop";
                    this.isVertexEditing = true;
                }
            }
        });
        return vertexEditButton;
    }

    disposeDragBox() {
        if (this.dragBox) {
            this.dragBox.dispose();
            this.dragBox = null;
        }
    }

    getExtrudeButton(): Control {
        var extrudeButton = this.CreateUIButton("extrudeBtn", "Extrude", "top");
        extrudeButton.onPointerUpObservable.add(() => {
            if (this.isDrawing || this.isMoving) return;
            if (this.shapes && this.shapes.length > 0) {
                for (const shape of this.shapes) {
                    const extrudedMesh = MeshBuilder.ExtrudePolygon("polygon", {
                        shape: shape,
                        depth: 1.5,
                        sideOrientation: Mesh.DOUBLESIDE,
                        updatable: true,
                        wrap: true
                    }, this.scene, earcut.default);
                    extrudedMesh.position.y = 1.5;
                    extrudedMesh.convertToFlatShadedMesh();
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

    CreateUIButton(name: string, text: string, position: string): Button {
        var button = Button.CreateSimpleButton(name, text);
        button.width = "120px"
        button.height = "60px";
        button.color = "white";
        if (position == "left") {
            button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            button.left = "10px";
        } else if (position == "center") {
            button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        } else if (position == "right") {
            button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            button.paddingRight = "10px";
        } else if (position == "top") {
            button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            button.top = "10px";
        }
        button.paddingBottom = "10px";
        button.cornerRadius = 20;
        button.background = "green";
        return button;
    }
}

export function CreateDemoScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
    return new Demo(engine, canvas).getScene();
}