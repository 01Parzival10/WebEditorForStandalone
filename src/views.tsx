/** @jsx svg */
import { Point, SNode as SNodeSchema, angleOfPoint, toDegrees } from "sprotty-protocol";
import {
    svg,
    IView,
    SNode,
    RenderingContext,
    PolylineEdgeViewWithGapsOnIntersections,
    SEdge,
    ELLIPTIC_ANCHOR_KIND,
    editLabelFeature,
    IViewArgs,
    WithEditableLabel,
    isEditableLabel,
} from "sprotty";
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import "./views.css";

export interface DFDNodeSchema extends SNodeSchema {
    text: string;
}

export class RectangularDFDNode extends SNode {
    static readonly DEFAULT_FEATURES = [...SNode.DEFAULT_FEATURES, editLabelFeature];

    text: string = "";
}

export class CircularDFDNode extends RectangularDFDNode {
    override get anchorKind() {
        return ELLIPTIC_ANCHOR_KIND;
    }
}

@injectable()
export class StorageNodeView implements IView {
    render(node: Readonly<RectangularDFDNode>, _context: RenderingContext): VNode {
        const width = node.size.width;
        const height = node.size.height;
        return (
            <g class-sprotty-node={true} class-storage={true}>
                <line x1="0" y1="0" x2={width} y2="0" />
                <text x={width / 2} y={height / 2 + 5}>
                    {node.text}
                </text>
                <line x1="0" y1={height} x2={width} y2={height} />
                {/* This transparent rect exists only to make this element easily selectable.
                    Without this you would need click the text or exactly hit one of the lines.
                    With this rect you can click anywhere between the two lines to select it.
                    This is especially important when there is no text given or it is short. */}
                <rect x="0" y="0" width={width} height={height} class-select-rect={true} />
            </g>
        );
    }
}

@injectable()
export class FunctionNodeView implements IView {
    render(node: Readonly<CircularDFDNode>, _context: RenderingContext): VNode {
        const radius = Math.min(node.size.width, node.size.height) / 2;
        return (
            <g class-sprotty-node={true} class-function={true}>
                <circle r={radius} cx={radius} cy={radius} />
                <text x={radius} y={radius + 5}>
                    {node.text}
                </text>
            </g>
        );
    }
}

@injectable()
export class IONodeView implements IView {
    render(node: Readonly<RectangularDFDNode>, _context: RenderingContext): VNode {
        const width = node.size.width;
        const height = node.size.height;

        return (
            <g class-sprotty-node={true} class-io={true}>
                <rect x="0" y="0" width={width} height={height} />
                <text x={width / 2} y={height / 2 + 5}>
                    {node.text}
                </text>
            </g>
        );
    }
}

export class ArrowEdge extends SEdge implements WithEditableLabel {
    get editableLabel() {
        const label = this.children.find((element) => element.type === "label");
        if (label && isEditableLabel(label)) {
            return label;
        }

        return undefined;
    }
}

@injectable()
export class ArrowEdgeView extends PolylineEdgeViewWithGapsOnIntersections {
    /**
     * Renders an arrow at the end of the edge.
     */
    protected override renderAdditionals(edge: SEdge, segments: Point[], context: RenderingContext): VNode[] {
        const additionals = super.renderAdditionals(edge, segments, context);
        const p1 = segments[segments.length - 2];
        const p2 = segments[segments.length - 1];
        const arrow = (
            <path
                class-sprotty-edge={true}
                class-arrow={true}
                d="M 0.5,0 L 10,-4 L 10,4 Z"
                transform={`rotate(${toDegrees(angleOfPoint({ x: p1.x - p2.x, y: p1.y - p2.y }))} ${p2.x} ${
                    p2.y
                }) translate(${p2.x} ${p2.y})`}
            />
        );
        additionals.push(arrow);
        return additionals;
    }

    /**
     * Renders the edge line.
     * In contrast to the default implementation that we override here,
     * this implementation makes the edge line 10px shorter at the end to make space for the arrow without any overlap.
     */
    protected renderLine(_edge: SEdge, segments: Point[], _context: RenderingContext, _args?: IViewArgs): VNode {
        const firstPoint = segments[0];
        let path = `M ${firstPoint.x},${firstPoint.y}`;
        for (let i = 1; i < segments.length; i++) {
            const p = segments[i];
            if (i === segments.length - 1) {
                // Make edge line 10px shorter to make space for the arrow
                const prevP = segments[i - 1];
                const dx = p.x - prevP.x;
                const dy = p.y - prevP.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const ratio = (length - 10) / length;
                path += ` L ${prevP.x + dx * ratio},${prevP.y + dy * ratio}`;
            } else {
                // Lines between points in between are not shortened
                path += ` L ${p.x},${p.y}`;
            }
        }
        return <path d={path} />;
    }
}
