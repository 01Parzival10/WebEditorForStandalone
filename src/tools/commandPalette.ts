import { injectable, ContainerModule } from "inversify";
import {
    CommandPalette,
    CommandPaletteActionProviderRegistry,
    CommandPaletteKeyListener,
    ICommandPaletteActionProvider,
    RequestExportSvgAction,
    KeyListener,
    KeyTool,
    LabeledAction,
    SModelRoot,
    TYPES,
    Tool,
} from "sprotty";
import { FitToScreenAction, Point } from "sprotty-protocol";
import { EDITOR_TYPES, constructorInject } from "../utils";
import { LogHelloAction } from "../commands/log-hello";

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
            { padding: 40 },
        );

        return [
            new LabeledAction("Fit to Screen", [fitToScreenAction], "layout"),
            new LabeledAction("Export as SVG", [RequestExportSvgAction.create()], "export"),
            new LabeledAction("Log Hello World", [LogHelloAction.create("from command palette hello")], "symbol-event"),
            new LabeledAction("Log Test", [LogHelloAction.create("from command palette test")], "zoom-in"),
            new LabeledAction(
                "Log lorem ipsum",
                [LogHelloAction.create("from command palette lorem ipsum")],
                "type-hierarchy-sub",
            ),
        ];
    }
}

/**
 * This tool registers a key listener that opens the command palette when the user presses
 * the default key combination (Ctrl+Space).
 */
@injectable()
export class CommandPaletteTool implements Tool {
    static ID = "command-palette-tool";

    protected commandPaletteKeyListener: KeyListener = new CommandPaletteKeyListener();
    constructor(@constructorInject(KeyTool) protected keyTool: KeyTool) {}

    get id(): string {
        return CommandPaletteTool.ID;
    }

    enable(): void {
        this.keyTool.register(this.commandPaletteKeyListener);
    }

    disable(): void {
        this.keyTool.deregister(this.commandPaletteKeyListener);
    }
}

export const customCommandPaletteModule = new ContainerModule((bind) => {
    bind(TYPES.ICommandPaletteActionProviderRegistry).to(CommandPaletteActionProviderRegistry).inSingletonScope();
    bind(CommandPalette).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(CommandPalette);
    bind(ServerCommandPaletteActionProvider).toSelf().inSingletonScope();
    bind(TYPES.ICommandPaletteActionProvider).toService(ServerCommandPaletteActionProvider);
    bind(CommandPaletteTool).toSelf().inSingletonScope();
    bind(EDITOR_TYPES.IDefaultTool).toService(CommandPaletteTool);
});
