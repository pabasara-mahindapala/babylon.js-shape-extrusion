import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";
import * as earcut from 'earcut';

class Playground {
    static shapes: BABYLON.Vector3[][];
    static isDrawing = false;
    static camera: BABYLON.ArcRotateCamera;
    static scene: BABYLON.Scene;
    static extrudes: BABYLON.Mesh[];

    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        this.scene = new BABYLON.Scene(engine);

        // camera
        var camera = new BABYLON.ArcRotateCamera("camera1", 0, 0, 0, new BABYLON.Vector3(0, 0, 0), this.scene);
        camera.setPosition(new BABYLON.Vector3(2, 4, 10));
        camera.attachControl(canvas, true);
        // lights

        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 0.5, 0), this.scene);
        light.intensity = 0.7;

        var ground = BABYLON.MeshBuilder.CreateGround("ground1", { width: 20, height: 20 }, this.scene);
        ground.visibility = 0.2;
        new BABYLON.AxesViewer(this.scene, 2);

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.getDrawButton());
        advancedTexture.addControl(this.getExtrudeButton());

        var currentShapePoints: BABYLON.Vector3[] = [];
        this.scene.onPointerUp = (event) => {

            if (event.button == 0) {
                if (Playground.isDrawing) {
                    const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
                    if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                        var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: .1, segments: 16 });
                        sphere.position.x = pickInfo.pickedPoint.x;
                        sphere.position.z = pickInfo.pickedPoint.z
                        currentShapePoints.push(pickInfo.pickedPoint);
                    }
                } else {
                    return;
                }
            } else {
                if (!Playground.isDrawing) return;
                this.drawShape(currentShapePoints, this.scene);
                if (!this.shapes) this.shapes = [];
                this.shapes.push(currentShapePoints);
                currentShapePoints = [];
            }
        };

        return this.scene;
    }

    static drawShape(shape: BABYLON.Vector3[], scene: BABYLON.Scene) {
        shape.push(shape[0]);
        var shapeline = BABYLON.Mesh.CreateLines("sl", shape, scene);
        shapeline.color = BABYLON.Color3.Green();
    }

    static getDrawButton(): GUI.Control {
        var drawButton = this.CreateUIButton("drawBtn", "Draw", "left");
        drawButton.onPointerUpObservable.add(function () {
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

    static getExtrudeButton(): GUI.Control {
        var extrudeButton = this.CreateUIButton("extrudeBtn", "Extrude", "center");
        extrudeButton.onPointerUpObservable.add(function () {
            if (Playground.isDrawing) return;
            if (Playground.shapes && Playground.shapes.length > 0) {
                for (const shape of Playground.shapes) {
                    const extruded = BABYLON.MeshBuilder.ExtrudePolygon("polygon", {
                        shape: shape,
                        depth: 0.5,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE
                    }, Playground.scene, earcut.default);
                    extruded.position.y = 0.5;
                    if (!Playground.extrudes) Playground.extrudes = [];
                    Playground.extrudes.push(extruded);
                }
            }

        });
        return extrudeButton;
    }

    static CreateUIButton(name: string, text: string, position: string): GUI.Button {
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
        }
        button.paddingBottom = "10px";
        button.cornerRadius = 20;
        button.background = "green";
        return button;
    }
}

export function CreatePlaygroundScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    return Playground.CreateScene(engine, canvas);
}