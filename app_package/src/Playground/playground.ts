import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";

class Playground {
    static shapes: any;
    static isDrawing = false;
    static camera: BABYLON.ArcRotateCamera;

    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        var scene = new BABYLON.Scene(engine);
        this.camera = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(90), BABYLON.Tools.ToRadians(65), 20, BABYLON.Vector3.Zero(), scene);
        this.camera.attachControl(canvas, true);
        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        var ground = BABYLON.MeshBuilder.CreateGround("ground1", { width: 20, height: 20 }, scene);
        ground.visibility = 0.2;
        new BABYLON.AxesViewer(scene, 2);

        var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        advancedTexture.addControl(this.createDrawButton(canvas));

        var currentShapePoints: BABYLON.Vector3[] = [];
        scene.onPointerUp = (event) => {
            if (!Playground.isDrawing) return;
            if (event.button == 0) {
                const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
                if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
                    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: .1, segments: 16 });
                    sphere.position.x = pickInfo.pickedPoint.x;
                    sphere.position.z = pickInfo.pickedPoint.z;
                    currentShapePoints.push(pickInfo.pickedPoint);
                }
            } else {
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

    static createDrawButton(canvas: HTMLCanvasElement): GUI.Control {
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
}

export function CreatePlaygroundScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
    return Playground.CreateScene(engine, canvas);
}
