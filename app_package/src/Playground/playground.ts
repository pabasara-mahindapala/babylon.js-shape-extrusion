import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";
import * as earcut from 'earcut';

class Playground {
    static shapes: any;
    static isDrawing = false;
    static isExtruding = false;
    static camera: BABYLON.ArcRotateCamera;

    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        var scene = new BABYLON.Scene(engine);

        // camera
        var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), scene);
        camera.setPosition(new BABYLON.Vector3(0, 0, 10));
        camera.attachControl(canvas, true);
        // lights

        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 0.5, 0), scene);
        light.intensity = 0.7;

        var ground = BABYLON.MeshBuilder.CreateGround("ground1", { width: 20, height: 20 }, scene);
        ground.visibility = 0.2;
        new BABYLON.AxesViewer(scene, 2);

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.createDrawButton());
        advancedTexture.addControl(this.createExtrudeButton());

        var currentShapePoints: BABYLON.Vector3[] = [];
        scene.onPointerUp = (event) => {

            if (event.button == 0) {
                if (Playground.isDrawing) {
                    const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: .1, segments: 16 });
                        sphere.position.x = pickInfo.pickedPoint.x;
                        sphere.position.z = pickInfo.pickedPoint.z
                        currentShapePoints.push(pickInfo.pickedPoint);
                    }
                } else if (Playground.isExtruding) {
                    if (this.shapes && this.shapes.length > 0) {
                        var shape = this.shapes[this.shapes.length - 1];
                        var path = [
                            new BABYLON.Vector3(0, 0, 0),
                            new BABYLON.Vector3(0, 2, 0), // Adjust the height based on your needs
                        ];

                        // var extruded = BABYLON.MeshBuilder.ExtrudeShape("extrudedShape", { shape: shape, path: path }, scene);
                        // var extruded = BABYLON.MeshBuilder.ExtrudePolygon("extrudedShape", { shape: shape, depth: 2 }, scene, e);
                        const extruded = BABYLON.MeshBuilder.ExtrudePolygon("polygon", {shape:shape, depth: 2, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene, earcut.default);

                        extruded.position.y = 1;
                    }
                }
                else {
                    return;
                }
            } else {
                if (!Playground.isDrawing) return;
                this.drawShape(currentShapePoints, scene);
                if (!this.shapes) this.shapes = [];
                this.shapes.push(currentShapePoints);
                currentShapePoints = [];
            }
        };

        return scene;
    }

    static drawShape(shape: BABYLON.Vector3[], scene: BABYLON.Scene) {
        shape.push(shape[0]);
        var shapeline = BABYLON.Mesh.CreateLines("sl", shape, scene);
        shapeline.color = BABYLON.Color3.Green();
    }

    static createDrawButton(): GUI.Control {
        var drawButton = GUI.Button.CreateSimpleButton("drawBtn", "Draw");
        drawButton.width = "120px"
        drawButton.height = "60px";
        drawButton.color = "white";
        drawButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        drawButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        drawButton.paddingRight = "10px";
        drawButton.paddingBottom = "10px";
        drawButton.cornerRadius = 20;
        drawButton.background = "green";
        drawButton.onPointerUpObservable.add(function () {
            if (Playground.isExtruding) return;
            if (drawButton.textBlock) {
                if (Playground.isDrawing) {
                    drawButton.background = "green";
                    drawButton.textBlock.text = "Draw";
                    Playground.isDrawing = false;
                } else {
                    drawButton.background = "red";
                    drawButton.textBlock.text = "Stop";
                    Playground.isDrawing = true;
                }
            }
        });
        return drawButton;
    }

    static createExtrudeButton(): GUI.Control {
        var extrudeButton = GUI.Button.CreateSimpleButton("extrudeBtn", "Extrude");
        extrudeButton.width = "120px"
        extrudeButton.height = "60px";
        extrudeButton.color = "white";
        extrudeButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        extrudeButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        extrudeButton.paddingRight = "10px";
        extrudeButton.paddingBottom = "10px";
        extrudeButton.cornerRadius = 20;
        extrudeButton.background = "green";
        extrudeButton.onPointerUpObservable.add(function () {
            if (Playground.isDrawing) return;
            if (extrudeButton.textBlock) {
                if (Playground.isExtruding) {
                    extrudeButton.background = "green";
                    extrudeButton.textBlock.text = "Extrude";
                    Playground.isExtruding = false;
                } else {
                    extrudeButton.background = "red";
                    extrudeButton.textBlock.text = "Stop";
                    Playground.isExtruding = true;
                }
            }
        });
        return extrudeButton;
    }
}

export function CreatePlaygroundScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    return Playground.CreateScene(engine, canvas);
}


// var mat = new BABYLON.StandardMaterial("mat1", scene);
// mat.alpha = 1.0;
// mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1.0);
// mat.backFaceCulling = false;
// var path = [BABYLON.Vector3.Zero(), new BABYLON.Vector3(1, 0, 0)];
// var extruded = BABYLON.Mesh.ExtrudeShape("extruded", shape, path, 1, 0, 0, scene);

// extruded.material = mat;