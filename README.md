# Babylon.js Demo

## Getting Started

All steps assume a git and NPM enabled command line or terminal.

1. `cd` to the root directory.
2. Run `npm install` to install all the NPM dependencies.
3. Run `npm run dev` to run the demo. After a moment, your default browser should open to http://localhost:8080, which will display the demo.

## Usage

There are three modes of operation. Extrusion is performed by clicking the "Extrude" button after drawing shapes. The extrusion height is hard coded.

### 1. Draw mode:

Click the "Draw" button to enter draw mode. In draw mode, left-click to add points to the shape, and right-click to complete the shape. Once drawing the shapes is complete, click the "Draw" button again to exit draw mode. To extrude the shapes you have drawn, click the "Extrude" button.

### 2. Move mode:

Click the "Move" button to enter move mode. In move mode, left-click and drag to move the selected shape. Click the "Move" button again to exit move mode.

### 3. Vertex Edit mode:

Click the "Vertex Edit" button to enter vertex edit mode. In vertex edit mode, Right click to select a vertex that you want to modify. A box will appear around the selected vertex. Left-click and drag the box to move the selected vertex. Click the "Vertex Edit" button again to exit vertex edit mode.

## Implementation

### 1. Draw mode:

Draw mode is implemented by adding a `BABYLON.MeshBuilder.ExtrudePolygon` to the scene. The polygon is created by adding points to an array, and then passing that array to the `BABYLON.MeshBuilder.ExtrudePolygon` function. The polygon is created with a height of 0, and then extruded to the desired height when the "Extrude" button is clicked.

### 2. Move mode:

Move mode is implemented by capturing the `onPointerDownObservable` event, and then using the picked point to determine which shape was clicked on. The selected shape is then moved by changing the position according to the mouse movement.

### 3. Vertex Edit mode:

Vertex edit mode is implemented by determining which vertex was clicked on using the `pickWithRay` function. The selected vertex is then moved by changing the position according to the position of the box that appears around the selected vertex.
