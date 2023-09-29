import { inject, injectable } from "inversify";
import {
    AbstractUIExtension,
    ActionDispatcher,
    Command,
    CommandExecutionContext,
    CommandReturn,
    CommitModelAction,
    MouseListener,
    SModelElementImpl,
    SModelRootImpl,
    SetUIExtensionVisibilityAction,
    TYPES,
    ViewerOptions,
    getAbsoluteClientBounds,
} from "sprotty";
import { Action } from "sprotty-protocol";
import { DOMHelper } from "sprotty/lib/base/views/dom-helper";
import { matchesKeystroke } from "sprotty/lib/utils/keyboard";
import { DfdOutputPortImpl } from "./ports";
import { DfdNodeImpl } from "./nodes";

import "./outputPortEditUi.css";

@injectable()
export class OutputPortEditUIMouseListener extends MouseListener {
    // State for double click detection.
    private previouslyClicked = false;

    mouseDown(target: SModelElementImpl, _event: MouseEvent): (Action | Promise<Action>)[] {
        if (target instanceof DfdOutputPortImpl) {
            if (this.previouslyClicked) {
                return [
                    SetUIExtensionVisibilityAction.create({
                        extensionId: OutputPortEditUI.ID,
                        visible: true,
                        contextElementsId: [target.id],
                    }),
                ];
            } else {
                this.previouslyClicked = true;
            }
        } else if (this.previouslyClicked) {
            // previouslyClicked => UI might be shown, clicked outside of UI => hide UI
            this.previouslyClicked = false;
            return [
                SetUIExtensionVisibilityAction.create({
                    extensionId: OutputPortEditUI.ID,
                    visible: false,
                    contextElementsId: [target.id],
                }),
            ];
        }

        return [];
    }
}

@injectable()
export class OutputPortEditUI extends AbstractUIExtension {
    static readonly ID = "output-port-edit-ui";

    private port: DfdOutputPortImpl | undefined;
    private availableInputs: HTMLSpanElement = document.createElement("div");
    private behaviorText: HTMLTextAreaElement = document.createElement("textarea");

    constructor(
        @inject(TYPES.IActionDispatcher) private actionDispatcher: ActionDispatcher,
        @inject(TYPES.ViewerOptions) private viewerOptions: ViewerOptions,
        @inject(TYPES.DOMHelper) private domHelper: DOMHelper,
    ) {
        super();
    }

    id(): string {
        return OutputPortEditUI.ID;
    }

    containerClass(): string {
        // The container element gets this class name by the sprotty base class.
        return "output-port-edit-ui";
    }

    protected initializeContents(containerElement: HTMLElement): void {
        containerElement.appendChild(this.availableInputs);
        containerElement.appendChild(this.behaviorText);

        containerElement.classList.add("ui-float");
        this.availableInputs.classList.add("available-inputs");

        this.configureHandlers(containerElement);
    }

    private configureHandlers(containerElement: HTMLElement): void {
        // If the user unfocuses the textarea, save the changes.
        this.behaviorText.addEventListener("blur", () => {
            this.save();
        });

        // Hide/"close this window" when pressing escape and don't save changes in that case.
        containerElement.addEventListener("keydown", (event) => {
            if (matchesKeystroke(event, "Escape")) {
                this.hide();
            }
        });
    }

    protected onBeforeShow(
        containerElement: HTMLElement,
        root: Readonly<SModelRootImpl>,
        ...contextElementIds: string[]
    ): void {
        if (contextElementIds.length !== 1) {
            throw new Error(
                "Expected exactly one context element id which should be the port that shall be shown in the UI.",
            );
        }
        this.port = root.index.getById(contextElementIds[0]) as DfdOutputPortImpl;
        this.setPosition(containerElement);

        const parent = this.port.parent;
        if (!(parent instanceof DfdNodeImpl)) {
            throw new Error("Expected parent to be a DfdNodeImpl.");
        }

        const availableInputNames = parent.getAvailableInputs();
        const countUnavailableDueToMissingName = availableInputNames.filter((name) => name === undefined).length;
        const definedInputNames = availableInputNames.filter((name) => name !== undefined);

        let availableInputsText = "";
        if (definedInputNames.length === 0) {
            availableInputsText = "There are no available inputs.";
        } else {
            availableInputsText = `Available inputs: ${definedInputNames.join(", ")}`;
        }

        if (countUnavailableDueToMissingName > 0) {
            availableInputsText += `\nThere are ${countUnavailableDueToMissingName} available inputs that don't have a named edge and cannot be used.`;
        }
        this.availableInputs.innerText = availableInputsText;

        this.behaviorText.value = this.port.behavior;

        setTimeout(() => {
            containerElement.focus();
        }, 0);
    }

    private setPosition(containerElement: HTMLElement) {
        if (!this.port) {
            return;
        }

        const bounds = getAbsoluteClientBounds(this.port, this.domHelper, this.viewerOptions);
        containerElement.style.left = `${bounds.x}px`;
        containerElement.style.top = `${bounds.y}px`;
    }

    private save(): void {
        if (!this.port) {
            throw new Error("Cannot save without set port.");
        }
        this.actionDispatcher.dispatch(SetDfdOutputPortBehaviorAction.create(this.port.id, this.behaviorText.value));
        this.actionDispatcher.dispatch(CommitModelAction.create());
    }
}

export interface SetDfdOutputPortBehaviorAction extends Action {
    kind: typeof SetDfdOutputPortBehaviorAction.KIND;
    portId: string;
    behavior: string;
}
export namespace SetDfdOutputPortBehaviorAction {
    export const KIND = "setDfdOutputPortBehavior";
    export function create(portId: string, behavior: string): SetDfdOutputPortBehaviorAction {
        return {
            kind: KIND,
            portId,
            behavior,
        };
    }
}

@injectable()
export class SetDfdOutputPortBehaviorCommand extends Command {
    static readonly KIND = SetDfdOutputPortBehaviorAction.KIND;

    constructor(@inject(TYPES.Action) private action: SetDfdOutputPortBehaviorAction) {
        super();
    }

    private oldBehavior: string | undefined;

    execute(context: CommandExecutionContext): CommandReturn {
        const port = context.root.index.getById(this.action.portId) as DfdOutputPortImpl;
        this.oldBehavior = port.behavior;
        port.behavior = this.action.behavior;
        return context.root;
    }

    undo(context: CommandExecutionContext): CommandReturn {
        const port = context.root.index.getById(this.action.portId) as DfdOutputPortImpl;
        if (this.oldBehavior) {
            port.behavior = this.oldBehavior;
        }

        return context.root;
    }

    redo(context: CommandExecutionContext): CommandReturn {
        return this.execute(context);
    }
}
