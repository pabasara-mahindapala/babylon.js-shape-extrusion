import { Engine } from "@babylonjs/core";
import { CreateDemoScene as CreateDemoScene } from "./Demo/demo";

export interface InitializeBabylonAppOptions {
    canvas: HTMLCanvasElement;
    assetsHostUrl?: string;
}

export function initializeBabylonApp(options: InitializeBabylonAppOptions) {
    if (options.assetsHostUrl) {
        console.log("Assets host URL: " + options.assetsHostUrl!);
    } else {
        console.log("No assets host URL provided");
    }

    const canvas = options.canvas;
    const engine = new Engine(canvas);
    const scene = CreateDemoScene(engine, canvas);
    engine.runRenderLoop(() => {
        scene.render();
    });
    window.addEventListener("resize", () => {
        engine.resize();
    });
}

