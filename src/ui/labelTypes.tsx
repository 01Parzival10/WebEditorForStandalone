import { AbstractUIExtension, IActionDispatcher, TYPES } from "sprotty";
import { ContainerModule, injectable } from "inversify";
import { constructorInject, generateRandomSprottyId } from "../utils";
import {
    LABEL_ASSIGNMENT_MIME_TYPE,
    LabelAssignment,
    LabelType,
    LabelTypeRegistry,
    LabelTypeValue,
} from "../labelTypes";

import "./labelTypes.css";
import { DeleteLabelTypeAction, DeleteLabelTypeValueAction } from "../commands/labelTypes";

@injectable()
export class LabelTypeUI extends AbstractUIExtension {
    constructor(
        @constructorInject(LabelTypeRegistry) private readonly labelTypeRegistry: LabelTypeRegistry,
        @constructorInject(TYPES.IActionDispatcher) private readonly actionDispatcher: IActionDispatcher,
    ) {
        super();
        labelTypeRegistry.onUpdate(() => this.reRender());
    }

    static readonly ID = "label-type-ui";

    id(): string {
        return LabelTypeUI.ID;
    }

    containerClass(): string {
        return LabelTypeUI.ID;
    }

    private reRender(): void {
        // Remove all children
        this.containerElement.innerHTML = "";
        // Re-render
        this.initializeContents(this.containerElement);
    }

    protected initializeContents(containerElement: HTMLElement): void {
        containerElement.classList.add("ui-float");
        this.labelTypeRegistry.getLabelTypes().forEach((labelType) => {
            containerElement.appendChild(this.renderLabelType(labelType));
        });

        // Render add button for whole label type
        const addButton = document.createElement("button");
        addButton.innerHTML = '<span class="codicon codicon-add"></span> Label Type';
        addButton.onclick = () => {
            const labelType: LabelType = {
                id: generateRandomSprottyId(),
                name: "",
                values: [
                    {
                        id: generateRandomSprottyId(),
                        text: "Value",
                    },
                ],
            };
            this.labelTypeRegistry.registerLabelType(labelType);

            // Select the text input element of the new label type to allow entering the name
            const inputElement: HTMLElement | null = this.containerElement.querySelector(
                `.label-type-${labelType.id} input`,
            );
            inputElement?.focus();
        };
        containerElement.appendChild(addButton);
    }

    private renderLabelType(labelType: LabelType): HTMLElement {
        const labelTypeElement = document.createElement("div");
        labelTypeElement.classList.add("label-type");
        labelTypeElement.classList.add(`label-type-${labelType.id}`);

        const labelTypeNameInput = document.createElement("input");
        labelTypeNameInput.value = labelType.name;
        labelTypeNameInput.placeholder = "Label Type Name";
        labelTypeNameInput.classList.add("label-type-name");

        this.dynamicallySetInputSize(labelTypeNameInput);

        labelTypeNameInput.onchange = () => {
            labelType.name = labelTypeNameInput.value;
        };

        labelTypeElement.appendChild(labelTypeNameInput);

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = '<span class="codicon codicon-trash"></span>';
        deleteButton.onclick = () => {
            this.actionDispatcher.dispatch(DeleteLabelTypeAction.create(this.labelTypeRegistry, labelType.id));
        };
        labelTypeElement.appendChild(deleteButton);

        labelType.values.forEach((possibleValue) => {
            labelTypeElement.appendChild(this.renderLabelTypeValue(labelType, possibleValue));
        });

        // Add + button
        const addButton = document.createElement("button");
        addButton.classList.add("label-type-value-add");
        addButton.innerHTML = '<span class="codicon codicon-add"></span> Value';
        addButton.onclick = () => {
            const labelValue: LabelTypeValue = {
                id: generateRandomSprottyId(),
                text: "",
            };
            labelType.values.push(labelValue);

            // Insert label type last but before the button
            const newValueElement = this.renderLabelTypeValue(labelType, labelValue);
            labelTypeElement.insertBefore(newValueElement, labelTypeElement.lastChild);

            // Select the text input element of the new value to allow entering the value
            newValueElement.querySelector("input")?.focus();
        };
        labelTypeElement.appendChild(addButton);

        return labelTypeElement;
    }

    private renderLabelTypeValue(labelType: LabelType, labelTypeValue: LabelTypeValue): HTMLElement {
        const valueElement = document.createElement("div");
        valueElement.classList.add("label-type-value");

        const valueInput = document.createElement("input");
        valueInput.value = labelTypeValue.text;
        valueInput.placeholder = "Value";
        this.dynamicallySetInputSize(valueInput);

        valueInput.onchange = () => {
            labelTypeValue.text = valueInput.value;
            this.labelTypeRegistry.labelTypeChanged();
        };

        // Allow dragging to create a label assignment
        valueInput.draggable = true;
        valueInput.ondragstart = (event) => {
            const assignment: LabelAssignment = {
                labelTypeId: labelType.id,
                labelTypeValueId: labelTypeValue.id,
            };
            const assignmentJson = JSON.stringify(assignment);
            event.dataTransfer?.setData(LABEL_ASSIGNMENT_MIME_TYPE, assignmentJson);
        };

        valueElement.appendChild(valueInput);

        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = '<span class="codicon codicon-trash"></span>';
        deleteButton.onclick = () => {
            this.actionDispatcher.dispatch(
                DeleteLabelTypeValueAction.create(this.labelTypeRegistry, labelType.id, labelTypeValue.id),
            );
        };
        valueElement.appendChild(deleteButton);
        return valueElement;
    }

    /**
     * Sets and dynamically updates the size property of the passed input element.
     * When the text is zero the width is set to the placeholder length to make place for it.
     * When the text is changed the size gets updated with the keyup event.
     * @param inputElement the html dom input element to set the size property for
     */
    private dynamicallySetInputSize(inputElement: HTMLInputElement): void {
        const factor = 0.8;
        const rawSize = inputElement.value.length || inputElement.placeholder.length;
        inputElement.size = Math.round(rawSize * factor);

        inputElement.onkeyup = () => {
            const rawSize = inputElement.value.length || inputElement.placeholder.length;
            inputElement.size = Math.round(rawSize * factor);
        };
    }
}

export const labelTypeUiModule = new ContainerModule((bind) => {
    bind(LabelTypeUI).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(LabelTypeUI);
});
