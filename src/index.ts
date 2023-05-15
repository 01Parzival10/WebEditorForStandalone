import "reflect-metadata";

import "sprotty/css/sprotty.css";
import "./page.css";

import {
    FunctionNode,
    FunctionNodeSchema,
    FunctionNodeView,
    IONode,
    IONodeSchema,
    IONodeView,
    StorageNode,
    StorageNodeSchema,
    StorageNodeView,
    ArrowEdgeView,
} from "./views";
import { Container, ContainerModule, inject, injectable } from "inversify";
import { Action, SEdge as SEdgeSchema, SGraph as SGraphSchema, SNode as SNodeSchema } from "sprotty-protocol";
import {
    ConsoleLogger,
    LocalModelSource,
    LogLevel,
    MouseListener,
    SEdge,
    SGraph,
    SGraphView,
    SModelElement,
    TYPES,
    boundsModule,
    configureModelElement,
    defaultModule,
    labelEditModule,
    labelEditUiModule,
    modelSourceModule,
    moveModule,
    routingModule,
    selectModule,
    undoRedoModule,
    updateModule,
    viewportModule,
    zorderModule,
} from "sprotty";
import { toolsModules } from "./tools/tool-manager";
import { commandsModule } from "./commands/commands";

// Setup the Dependency Injection Container.
// This includes all used nodes, edges, listeners, etc. for sprotty.
const dataFlowDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    bind(TYPES.ModelSource).to(LocalModelSource).inSingletonScope();
    bind(DroppableMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(DroppableMouseListener);
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.log);
    const context = { bind, unbind, isBound, rebind };
    configureModelElement(context, "graph", SGraph, SGraphView);
    configureModelElement(context, "node:storage", StorageNode, StorageNodeView);
    configureModelElement(context, "node:function", FunctionNode, FunctionNodeView);
    configureModelElement(context, "node:input-output", IONode, IONodeView);
    configureModelElement(context, "edge", SEdge, ArrowEdgeView);
});

@injectable()
class DroppableMouseListener extends MouseListener {
    @inject(TYPES.ModelSource) modelSource?: LocalModelSource;

    override dragOver(_target: SModelElement, event: DragEvent): (Action | Promise<Action>)[] {
        event.preventDefault();
        return [];
    }

    override drop(_target: SModelElement, event: DragEvent): (Action | Promise<Action>)[] {
        const nodeDataString = event.dataTransfer?.getData("text/plain");
        const nodeData: SNodeSchema = nodeDataString ? JSON.parse(nodeDataString) : undefined;
        if (!nodeData) {
            return [];
        }

        modelSource.getViewport().then((viewport) => {
            if (!nodeData.size) {
                nodeData.size = {
                    width: 10,
                    height: 10,
                };
            }

            const adjust = (offset: number, size: number) => {
                return offset / viewport.zoom - size / 2;
            };
            nodeData.position = {
                x: viewport.scroll.x + adjust(event.offsetX, nodeData.size.width),
                y: viewport.scroll.y + adjust(event.offsetY, nodeData.size.height),
            };
            modelSource.addElements([nodeData]);
        });

        return [];
    }
}

// Load the above defined module with all the used modules from sprotty.
const container = new Container();
// container.load(
//     defaultModule, modelSourceModule, boundsModule, buttonModule,
//     commandPaletteModule, contextMenuModule, decorationModule, edgeEditModule,
//     edgeLayoutModule, expandModule, exportModule, fadeModule,
//     hoverModule, labelEditModule, labelEditUiModule, moveModule,
//     openModule, routingModule, selectModule, undoRedoModule,
//     updateModule, viewportModule, zorderModule, graphModule,
//     dataFlowDiagramModule
// );
container.load(
    // Sprotty modules
    defaultModule,
    modelSourceModule,
    boundsModule,
    viewportModule,
    moveModule,
    routingModule,
    selectModule,
    updateModule,
    zorderModule,
    undoRedoModule,
    labelEditModule,
    labelEditUiModule,

    // Custom modules
    dataFlowDiagramModule,
    ...toolsModules,
    commandsModule,
);

// Construct the diagram graph state that should be shown.
const graph: SGraphSchema = {
    type: "graph",
    id: "root",
    children: [
        {
            type: "node:storage",
            id: "storage01",
            text: "Database",
            position: { x: 100, y: 100 },
            size: { width: 60, height: 30 },
        } as StorageNodeSchema,
        {
            type: "node:function",
            id: "function01",
            text: "System",
            position: { x: 200, y: 200 },
            size: { width: 50, height: 50 },
        } as FunctionNodeSchema,
        {
            type: "node:input-output",
            id: "input01",
            text: "Customer",
            position: { x: 325, y: 205 },
            size: { width: 70, height: 40 },
        } as IONodeSchema,

        {
            type: "edge",
            id: "edge01",
            sourceId: "storage01",
            targetId: "function01",
        } as SEdgeSchema,
        {
            type: "edge",
            id: "edge02",
            sourceId: "function01",
            targetId: "input01",
        } as SEdgeSchema,
    ],
};

// Load the graph into the model source and display it inside the DOM.
// Unless overwritten this will load the graph into the DOM element with the id "sprotty".
const modelSource = container.get<LocalModelSource>(TYPES.ModelSource);
modelSource
    .setModel(graph)
    .then(() => console.log("Sprotty model set."))
    .catch((reason) => console.error(reason));
