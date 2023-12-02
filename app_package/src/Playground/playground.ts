import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";
import * as earcut from 'earcut';

class Playground {
    camera: BABYLON.ArcRotateCamera;
    scene: BABYLON.Scene;
    ground: BABYLON.Mesh;
    canvas: HTMLCanvasElement;
    extrudes: BABYLON.Mesh[] = [];
    startingPoint: BABYLON.Nullable<BABYLON.Vector3> = null;
    currentMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;
    shapes: BABYLON.Vector3[][] = [];
    isDrawing = false;
    isMoving = false;
    shapelines: BABYLON.LinesMesh[] = [];
    spheres: BABYLON.Mesh[] = [];

    constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = new BABYLON.Scene(engine);
        this.camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.ground = BABYLON.MeshBuilder.CreateGround("ground1", { width: 20, height: 20 }, this.scene);
        this.CreateScene(engine, canvas);
    }

    public CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement) {
        this.camera.setPosition(new BABYLON.Vector3(2, 4, 10));
        this.camera.attachControl(canvas, true);
        this.camera.upperBetaLimit = Math.PI / 2;

        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 0.5, 0), this.scene);
        light.intensity = 0.7;


        this.ground.visibility = 0.2;
        new BABYLON.AxesViewer(this.scene, 2);

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.getDrawButton());
        advancedTexture.addControl(this.getExtrudeButton());
        advancedTexture.addControl(this.getMoveButton());

        var currentShapePoints: BABYLON.Vector3[] = [];

        this.scene.onPointerUp = (event) => {
            if (this.scene) {
                if (event.button == 0) {
                    if (this.isDrawing) {
                        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                            var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: .1, segments: 16 });
                            sphere.position.x = pickInfo.pickedPoint.x;
                            sphere.position.z = pickInfo.pickedPoint.z;
                            currentShapePoints.push(pickInfo.pickedPoint);
                            this.spheres.push(sphere);
                        }
                    } else {
                        return;
                    }
                } else {
                    if (!this.isDrawing) return;
                    this.drawShape(currentShapePoints, this.scene);
                    if (!this.shapes) this.shapes = [];
                    this.shapes.push(currentShapePoints);
                    currentShapePoints = [];
                }
            }
        };

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isMoving) return;
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedMesh != this.ground) {
                        this.pointerDown(pointerInfo.pickInfo.pickedMesh)
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.pointerUp();
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

    // var getGroundPosition = function () {
    //     var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == ground; });
    //     if (pickinfo.hit) {
    //         return pickinfo.pickedPoint;
    //     }

    //     return null;
    // }
    getGroundPosition() {
        if (this.scene) {
            var pickinfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => { return mesh == this.ground; });
            if (pickinfo && pickinfo.hit) {
                return pickinfo.pickedPoint;
            }
        }

        return null;
    }

    // var pointerDown = function (mesh) {
    //     currentMesh = mesh;
    //     startingPoint = getGroundPosition();
    //     if (startingPoint) { // we need to disconnect camera from canvas
    //         setTimeout(function () {
    //             camera.detachControl(canvas);
    //         }, 0);
    //     }
    // }
    pointerDown(mesh: BABYLON.AbstractMesh) {
        this.currentMesh = mesh;
        this.startingPoint = this.getGroundPosition();
        if (this.startingPoint) { // we need to disconnect camera from canvas
            setTimeout(() => {
                this.camera.detachControl(this.canvas);
            }, 0);
        }
    }

    // var pointerUp = function () {
    //     if (startingPoint) {
    //         camera.attachControl(canvas, true);
    //         startingPoint = null;
    //         return;
    //     }
    // }

    pointerUp() {
        if (this.startingPoint) {
            this.camera.attachControl(this.canvas, true);
            this.startingPoint = null;
            return;
        }
    }

    // var pointerMove = function () {
    //     if (!startingPoint) {
    //         return;
    //     }
    //     var current = getGroundPosition();
    //     if (!current) {
    //         return;
    //     }

    //     var diff = current.subtract(startingPoint);
    //     currentMesh.position.addInPlace(diff);

    //     startingPoint = current;
    // }

    pointerMove() {
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

    drawShape(shape: BABYLON.Vector3[], scene: BABYLON.Scene) {
        shape.push(shape[0]);
        var shapeline = BABYLON.Mesh.CreateLines("sl", shape, scene);
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
        var moveButton = this.CreateUIButton("moveBtn", "Move", "right");
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

    getExtrudeButton(): GUI.Control {
        var extrudeButton = this.CreateUIButton("extrudeBtn", "Extrude", "center");
        extrudeButton.onPointerUpObservable.add(() => {
            if (this.isDrawing || this.isMoving) return;
            if (this.shapes && this.shapes.length > 0) {
                for (const shape of this.shapes) {
                    const extruded = BABYLON.MeshBuilder.ExtrudePolygon("polygon", {
                        shape: shape,
                        depth: 0.5,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE
                    }, this.scene, earcut.default);
                    extruded.position.y = 0.5;
                    if (!this.extrudes) this.extrudes = [];
                    this.extrudes.push(extruded);
                }
                this.shapes = [];
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

        });
        return extrudeButton;
    }

    CreateUIButton(name: string, text: string, position: string): GUI.Button {
        var button = GUI.Button.CreateSimpleButton(name, text);
        button.width = "120px"
        button.height = "60px";
        button.color = "white";
        if (position == "left") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            button.paddingLeft = "10px";
        } else if (position == "center") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
            button.paddingRight = "5px";
            button.paddingLeft = "5px";
        } else if (position == "right") {
            button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
            button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
            button.paddingRight = "10px";
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