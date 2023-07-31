import { injectable } from "inversify";
import {
    ICommandPaletteActionProvider,
    RequestExportSvgAction,
    LabeledAction,
    SModelRoot,
    EnableToolsAction,
    CommitModelAction,
} from "sprotty";
import { FitToScreenAction, Point } from "sprotty-protocol";
import { EdgeCreationTool } from "../features/toolPalette/edgeCreationTool";
import { LoadDiagramAction } from "../features/serialize/load";
import { FIT_TO_SCREEN_PADDING } from "../utils";
import { SaveDiagramAction } from "../features/serialize/save";
import { LoadDefaultDiagramAction } from "../features/serialize/loadDefaultDiagram";

import "@vscode/codicons/dist/codicon.css";
import "sprotty/css/command-palette.css";
import "./commandPalette.css";

/**
 * Provides possible actions for the command palette.
 */
@injectable()
export class ServerCommandPaletteActionProvider implements ICommandPaletteActionProvider {
    async getActions(
        root: Readonly<SModelRoot>,
        _text: string,
        _lastMousePosition?: Point,
        _index?: number,
    ): Promise<LabeledAction[]> {
        const fitToScreenAction = FitToScreenAction.create(
            root.children.map((child) => child.id), // Fit screen to all children
            { padding: FIT_TO_SCREEN_PADDING },
        );
        const commitAction = CommitModelAction.create();

        return [
            new LabeledAction("Fit to Screen", [fitToScreenAction], "layout"),
            new LabeledAction("Create new edge", [EnableToolsAction.create([EdgeCreationTool.ID])], "link"),
            new LabeledAction("Save diagram as JSON", [SaveDiagramAction.create("diagram.json")], "save"),
            new LabeledAction("Load diagram from JSON", [LoadDiagramAction.create(), commitAction], "go-to-file"),
            new LabeledAction("Export as SVG", [RequestExportSvgAction.create()], "export"),
            new LabeledAction("Load default diagram", [LoadDefaultDiagramAction.create(), commitAction], "clear-all"),
        ];
    }
}