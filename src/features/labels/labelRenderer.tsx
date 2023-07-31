/** @jsx svg */
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { Hoverable, IActionDispatcher, SShapeElement, TYPES, svg } from "sprotty";
import { calculateTextWidth, constructorInject } from "../../utils";
import { LabelAssignment, LabelTypeRegistry } from "./labelTypeRegistry";
import { DeleteLabelAssignmentAction } from "./commands";
import { ContainsDfdLabels } from "./elementFeature";

@injectable()
export class DfdNodeLabelRenderer {
    constructor(
        @constructorInject(LabelTypeRegistry) private readonly labelTypeRegistry: LabelTypeRegistry,
        @constructorInject(TYPES.IActionDispatcher) private readonly actionDispatcher: IActionDispatcher,
    ) {}

    renderSingleNodeLabel(
        node: ContainsDfdLabels & SShapeElement & Hoverable,
        label: LabelAssignment,
        x: number,
        y: number,
    ): VNode {
        const labelType = this.labelTypeRegistry.getLabelType(label.labelTypeId);
        const labelTypeValue = labelType?.values.find((value) => value.id === label.labelTypeValueId);
        if (!labelType || !labelTypeValue) {
            return <g />;
        }

        const text = `${labelType.name}: ${labelTypeValue.text}`;
        const width = calculateTextWidth(text, "5pt sans-serif") + 8;
        const xLeft = x - width / 2;
        const xRight = x + width / 2;
        const height = 10;
        const radius = height / 2;

        const deleteLabelHandler = () => {
            const action = DeleteLabelAssignmentAction.create(node, label);
            this.actionDispatcher.dispatch(action);
        };

        return (
            <g class-node-label={true}>
                <rect x={xLeft} y={y} width={width} height={height} rx={radius} ry={radius} />
                <text x={node.bounds.width / 2} y={y + 7.25}>
                    {text}
                </text>
                {
                    // Put a x button to delete the element on the right upper edge
                    node.hoverFeedback ? (
                        <g class-label-delete={true} on={{ click: deleteLabelHandler }}>
                            <circle cx={xRight} cy={y} r={radius * 0.8}></circle>
                            <text x={xRight} y={y + 2}>
                                x
                            </text>
                        </g>
                    ) : (
                        <g />
                    )
                }
            </g>
        );
    }

    renderNodeLabels(node: ContainsDfdLabels & SShapeElement & Hoverable, baseY: number, labelSpacing = 12): VNode {
        return (
            <g>
                {node.labels.map((label, i) => {
                    const x = node.bounds.width / 2;
                    const y = baseY + i * labelSpacing;
                    return this.renderSingleNodeLabel(node, label, x, y);
                })}
            </g>
        );
    }
}
