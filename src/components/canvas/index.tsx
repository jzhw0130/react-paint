import React from "react";
import {Paper} from "@material-ui/core";
import "./index.less";
import {useEffect} from "react";
import {useRef} from "react";
import {LineWidthType, ShapeOutlineType, ShapeToolType, ToolType} from "../../util/toolType";
import {FC} from "react";
import {useState} from "react";
import {Pen, Tool, Eraser, ColorExtract, ColorFill} from "../../util/tool";
import Shape from "../../util/tool/shape";
import {useContext} from "react";
import {DispatcherContext} from "../../context";
import {CLEAR_EVENT, REDO_EVENT, UNDO_EVENT} from "../../util/dispatcher/event";
import SnapShot from "../../util/snapshot";
import Snapshot from "../../util/snapshot";

interface CanvasProps {
    toolType: ToolType;
    shapeType: ShapeToolType;
    shapeOutlineType: ShapeOutlineType;
    lineWidthType: LineWidthType;
    mainColor: string;
    subColor: string;
    setColor: (value: string) => void;
}

const Canvas: FC<CanvasProps> = (props) => {
    const {toolType, lineWidthType, mainColor, subColor, setColor, shapeType, shapeOutlineType} = props;
    const [tool, setTool] = useState<Tool>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dispatcherContext = useContext(DispatcherContext);
    const [snapshot] = useState<SnapShot>(new Snapshot());

    useEffect(() => {
        switch (toolType) {
            case ToolType.PEN:
                setTool(new Pen());
                break;
            case ToolType.ERASER:
                setTool(new Eraser());
                break;
            case ToolType.COLOR_EXTRACT:
                setTool(new ColorExtract(setColor));
                break;
            case ToolType.COLOR_FILL:
                setTool(new ColorFill());
                break;
            case ToolType.SHAPE:
                setTool(new Shape(shapeType, shapeOutlineType === ShapeOutlineType.DOTTED));
                break;
            default:
                break;
        }
    }, [toolType, shapeType]);

    useEffect(() => {
        if (tool instanceof Shape) {
            tool.isDashed = shapeOutlineType === ShapeOutlineType.DOTTED;
        }
    }, [shapeOutlineType]);

    useEffect(() => {
        switch (lineWidthType) {
            case LineWidthType.THIN:
                Tool.lineWidthFactor = 1;
                break;
            case LineWidthType.MIDDLE:
                Tool.lineWidthFactor = 2;
                break;
            case LineWidthType.BOLD:
                Tool.lineWidthFactor = 3;
                break;
            case LineWidthType.MAXBOLD:
                Tool.lineWidthFactor = 4;
                break;
            default:
                break;
        }
    }, [lineWidthType]);

    useEffect(() => {
        Tool.mainColor = mainColor;
    }, [mainColor]);

    useEffect(() => {
        Tool.subColor = subColor;
    }, [subColor]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.height = canvas.clientHeight;
            canvas.width = canvas.clientWidth;
            Tool.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

            // 初始化，将画布绘制成白色底，否则提取颜色会变成黑色
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                snapshot.add(ctx.getImageData(0, 0, canvas.width, canvas.height));
            }

            // 注册清空画布事件
            const dispatcher = dispatcherContext.dispatcher;
            const callback = () => {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            };
            dispatcher.on(CLEAR_EVENT, callback);

            // 注册画布前进事件
            const forward = () => {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const imageData = snapshot.forward();
                    if (imageData) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.putImageData(imageData, 0, 0);
                    }
                }
            };
            dispatcher.on(REDO_EVENT, forward);

            // 注册画布后退事件
            const back = () => {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const imageData = snapshot.back();
                    if (imageData) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.putImageData(imageData, 0, 0);
                    }
                }
            };
            dispatcher.on(UNDO_EVENT, back);

            return () => {
                dispatcher.off(CLEAR_EVENT, callback);
            };
        }
    }, [canvasRef]);

    const onMouseDown = (event: MouseEvent) => {
        if (tool) {
            tool.onMouseDown(event);
        }
    };

    const onMouseMove = (event: MouseEvent) => {
        if (tool) {
            tool.onMouseMove(event);
        }
    };

    const onMouseUp = (event: MouseEvent) => {
        if (tool) {
            tool.onMouseUp(event);

            // 存储canvas剪影
            snapshot.add(Tool.ctx.getImageData(0, 0, Tool.ctx.canvas.width, Tool.ctx.canvas.height));
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener("mousedown", onMouseDown);
            canvas.addEventListener("mousemove", onMouseMove);
            canvas.addEventListener("mouseup", onMouseUp);

            return () => {
                canvas.removeEventListener("mousedown", onMouseDown);
                canvas.removeEventListener("mousemove", onMouseMove);
                canvas.removeEventListener("mouseup", onMouseUp);
            };
        }
    }, [canvasRef, onMouseDown, onMouseMove, onMouseUp]);

    return (
        <div className="canvas">
            <Paper className="paper">
                <canvas ref={canvasRef} />
            </Paper>
        </div>
    );
};

export default Canvas;
