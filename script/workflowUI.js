window.WorkflowUI = {
    pickedSpot: null,
    pickAction: null,
    arrowSize: {length:10, width:6},
    connectorLineCenterOffset: 24,
    masterFlow: null,
    canvasPadding: 10,
    stepImageWidth: 35,
    stepImageColumnGutter: 35,
    stepImageVertSpace: 35,
    drawCanvasLocation: null,
    drawCanvasCallback: null,
    canvas: null,
    drawLocation: null,
    drawCallback: null,
    dragstart: null,
    ctx: null
}

WorkflowUI.defineCanvas = function(workflow, div) {
    WorkflowUI.masterFlow = workflow;
    WorkflowUI.drawCanvasLocation = div;
    div.innerHTML = "";
    var can = document.createElement("canvas");
    div.appendChild(can);
    can.width = 800;
    can.height = 1200;

    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = can.getBoundingClientRect();
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    can.width = rect.width * dpr;
    can.height = rect.height * dpr;
    this.ctx = can.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    this.ctx.scale(dpr, dpr);


    WorkflowUI.canvas = can;

    can.addEventListener("mousedown", function(event) {
        WorkflowUI.dragstart = {x:event.clientX, y:event.clientY};
        WorkflowUI.canvas.style.cursor = "grabbing";

        var can = WorkflowUI.canvas;
        if (page.wflow.flow.pickedStep != null) WorkflowUI.highlightStep(can, page.wflow.flow.pickedStep, false);
        var rect = can.getBoundingClientRect();
        var x = event.offsetX;// + rect.left;
        var y = event.offsetY;// + rect.top; 

        if (WorkflowUI.pickedSpot != null) {
            WorkflowUI.clearPickedSpot();
        }
        WorkflowUI.pickedSpot = WorkflowUI.rowColForXY(x, y);
        var step = WorkflowUI.stepUnderXY(page.wflow, x, y);
        if (step != null) {
            WorkflowUI.pickedSpot = null;
            if (WorkflowUI.pickAction == null) {
                page.wflow.flow.pickedStep = step;
                WorkflowUI.highlightStep(can, step, true);
                WorkflowUI.masterFlow.dispatchEvent("steppicked", {step:step});
            } else {
                var act = WorkflowUI.pickAction;
                WorkflowUI.masterFlow.dispatchEvent("actioncompleted", {source:page.wflow.flow.pickedStep, step:step, action:act});
                WorkflowUI.pickAction = null;
            }
        } else {
            WorkflowUI.pickAction = null; // Reset any pending actions
            if (WorkflowUI.pickAction != null) {
                WorkflowUI.pickAction = null;
                WorkflowUI.masterFlow.dispatchEvent("actionaborted", {action:WorkflowUI.pickAction});
            }
            page.wflow.flow.pickedStep = null;
            if (event.button == 0) {
                WorkflowUI.markPickedSpot();
                WorkflowUI.masterFlow.dispatchEvent("emptyspotpicked", {spot:WorkflowUI.pickedSpot});
            } else {
                WorkflowUI.masterFlow.dispatchEvent("clear", {});
            }
        }

        
    });
    can.addEventListener("mouseup", function(event) {
        WorkflowUI.dragstart = null;
        WorkflowUI.canvas.style.cursor = "default";
        var msg = "mouseup at " + event.clientX + ", " + event.clientY;
        //debug(msg);
    });
    can.addEventListener("mouseout", function(event) {
        WorkflowUI.dragstart = null;
        WorkflowUI.canvas.style.cursor = "default";
    });
    can.addEventListener("mousemove", function(event) {
        if (WorkflowUI.dragstart == null) return;
        if (page.wflow.flow.pickedStep == null) return;
        var moveX = event.clientX - WorkflowUI.dragstart.x;
        var moveY = event.clientY - WorkflowUI.dragstart.y;
        var moved = false;
        if (moveX > (WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter)) {
            var pre = page.wflow.flow.pickedStep.location.col;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "H", 1);
            if (page.wflow.flow.pickedStep.location.col != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " right");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveX < ((WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter) * -1)) {
            var pre = page.wflow.flow.pickedStep.location.col;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "H", -1);
            if (page.wflow.flow.pickedStep.location.col != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " left");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveY > WorkflowUI.stepImageWidth + 20) {
            var pre = page.wflow.flow.pickedStep.location.row;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "V", 1);
            if (page.wflow.flow.pickedStep.location.row != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moveY < ((WorkflowUI.stepImageWidth + 20) * -1)) {
            var pre = page.wflow.flow.pickedStep.location.row;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "V", -1);
            if (page.wflow.flow.pickedStep.location.row != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moved) {
            WorkflowUI.drawCanvas();
            WorkflowUI.highlightStep(WorkflowUI.canvas, page.wflow.flow.pickedStep, true);
        }
    });

    //can.setAttribute('height', style_height * dpi);
    //can.setAttribute('width', style_width * dpi);
    can.style.border = "1px dotted navy";
    WorkflowUI.drawCanvas();
}

WorkflowUI.drawCanvas = function() {
    workflow = WorkflowUI.masterFlow;
    var ctx = this.ctx;
    ctx.clearRect(0,0,WorkflowUI.canvas.width, WorkflowUI.canvas.height);
    ctx.save();
    ctx.font = "bold italic 24pt Arial";
    ctx.fillStyle = "#191970"; // Back to black
    var xy = ctx.measureText(workflow.flow.name);
    var x = (WorkflowUI.canvas.width / 2) - (xy.width / 2);
    var y = (WorkflowUI.canvasPadding + 24); // Title font size in pixels
    ctx.fillText(workflow.flow.name, x, y);
    ctx.restore();
    for (var id in workflow.flow.steps) {
        var step = workflow.flow.steps[id];
        WorkflowUI.drawStep(WorkflowUI.canvas, step);
        WorkflowUI.drawConnectors(step);
    }
}

WorkflowUI.clearPickedSpot = function() {
    var xy = WorkflowUI.getXYForRowColumn(WorkflowUI.pickedSpot.row, WorkflowUI.pickedSpot.col);
    var ctr = {x:xy.x + (xy.w/2), y:xy.y + (xy.h/2)}
    var ctx = this.ctx; //WorkflowUI.canvas.getContext("2d");
    ctx.clearRect(ctr.x - 5,ctr.y - 5, 10, 10);
}
WorkflowUI.markPickedSpot = function() {
    var xy = WorkflowUI.getXYForRowColumn(WorkflowUI.pickedSpot.row, WorkflowUI.pickedSpot.col);
    var ctr = {x:xy.x + (xy.w/2), y:xy.y + (xy.h/2)}
    var ctx = this.ctx; //WorkflowUI.canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(ctr.x, ctr.y-5);
    ctx.lineTo(ctr.x, ctr.y+5);
    ctx.moveTo(ctr.x-5, ctr.y);
    ctx.lineTo(ctr.x+5, ctr.y);
    ctx.strokeStyle = "red";
    ctx.stroke();
}
WorkflowUI.drawStepShape = function(step, x, y) {
    var ctx = this.ctx;
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var blockColor = null;
    var fillStyle = null;
    if (step.completed) {
        fillStyle = "#90EE90";
        if (wf.canComplete(step, false) != "") {
            blockColor = "#008B8B";
        }
    } else {
        for (var i = 0; i < step.dependsOn.length; i++) {
            var step2 = wf.getStep(step.dependsOn[i]);
            if (!step2.completed) {
                blockColor = "#FF2000";
                break;
            }
        }
        if (blockColor != null) {
            fillStyle = "#A9A9A9";
        } else {
            fillStyle = "#F8F8FF";
        }
        fillStyle = "#F8F8FF";
    }
    if (step.shape == "step") {
        if (fillStyle != null) ctx.fillStyle = fillStyle;
        var h = w;
        h -= 6; // Adjust to leave room above / below
        y += 3;
        var stepSize = h/3;
        ctx.moveTo(x, y+h); // Start at lower left
        ctx.lineTo(x+w-3, y+h); // Bottom ... radius
        ctx.arcTo(x+w,y+h, x+w,y+h-3, 3) // Radius on bottom right
        ctx.lineTo(x+w, y); // Right edge
        ctx.lineTo(x+stepSize+stepSize, y); // Top step
        ctx.lineTo(x+stepSize+stepSize, y+stepSize); // Left on top step
        ctx.lineTo(x+stepSize, y+stepSize); // Top of 2nd step
        ctx.lineTo(x+stepSize, y+stepSize+stepSize); // Left of 2nd step
        ctx.lineTo(x, y+stepSize+stepSize); // Top of 1st step
        ctx.closePath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000"; // black border
        ctx.stroke();
        ctx.fill();
        if (blockColor != null) {
            ctx.beginPath();
            ctx.arc(x + w - (w/3), y + h - (h/3), w/6, 0, 2 * Math.PI);
            ctx.fillStyle = blockColor;
            ctx.fill();        
            ctx.restore();
        }
    } else if (step.shape == "box") {
        if (fillStyle != null) ctx.fillStyle = fillStyle;
        var stepSize = w/2;
        WorkflowUI.roundedRectangle(x, y+3, w-6, w, 3);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000"; // black border
        ctx.stroke();
        ctx.fill();
        if (blockColor != null) {
            ctx.beginPath();
            ctx.arc(x + (w/2), y + (w/2), w/6, 0, 2 * Math.PI);
            ctx.fillStyle = blockColor;
            ctx.fill();        
            ctx.restore();
        }
    } else if (step.shape == "diamond") {
        if (fillStyle != null) ctx.fillStyle = fillStyle;
        ctx.moveTo(x, y+(w/2)); // Left
        ctx.lineTo(x+(w/2), y+w-3); // Bottom
        ctx.lineTo(x+w, y+(w/2)); // Right
        ctx.lineTo(x+(w/2), y+3); // Top
        ctx.closePath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000"; // black border
        ctx.stroke();
        ctx.fill();
        if (blockColor != null) {
            ctx.beginPath();
            ctx.arc(x + (w/2), y + (w/2), w/6, 0, 2 * Math.PI);
            ctx.fillStyle = blockColor;
            ctx.fill();        
            ctx.restore();
        }
    } else if (step.shape == "circle") {
        if (fillStyle != null) ctx.fillStyle = fillStyle;
        var stepSize = w/2;
        ctx.arc(x + (w/2), y + (w/2), (w/2)-2, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000"; // black border
        ctx.stroke();
        ctx.fill();
        if (blockColor != null) {
            ctx.beginPath();
            ctx.arc(x + (w/2), y + (w/2), w/6, 0, 2 * Math.PI);
            ctx.fillStyle = blockColor;
            ctx.fill();        
            ctx.restore();
        }
    }
}
WorkflowUI.drawStep = function(can, step, highlight) {
    if (highlight == undefined) highlight = false;
    var ctx = this.ctx; //can.getContext("2d");
    var w = WorkflowUI.stepImageWidth;
    var xy = WorkflowUI.getXY(step);
    var x = xy.x;
    var y = xy.y;
    ctx.clearRect(xy.x - 10,xy.y - 10, xy.w + 20, xy.h + 20);
    ctx.save();
    ctx.beginPath();
    if (highlight) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "yellow";    
    }
    if (step.shape == undefined) step.shape = "step";
    WorkflowUI.drawStepShape(step, x, y);
    ctx.restore();

    ctx.font = "8pt Arial";
    ctx.fillStyle = "#191970"; // Back to black
    var txtSize = ctx.measureText(step.title);
    var txtLeft = x + (w/2) - (txtSize.width / 2);
    ctx.fillText(step.title, txtLeft, y+w+12);
    ctx.restore();
//    ctx.font = "8pt Arial";
//    ctx.fillStyle = "#000000";
//     var chrCheck = String.fromCharCode(10004);
//     var chrArrow = String.fromCharCode(9660);
//    ctx.fillText(step.resolve_list.length == 0 ? chrCheck : step.resolve_list.length, x-1, y + w - w/3 - 4);
//    ctx.restore();
}


WorkflowUI.drawConnectors = function(step) {
    for (var i = 0; i < step.dependsOn.length; i++) {
        WorkflowUI.drawConnector(WorkflowUI.masterFlow.getStep(step.dependsOn[i]), step);
    }
    for (var i = 0; i < step.dependedOnBy.length; i++) {
        WorkflowUI.drawConnector(step, WorkflowUI.masterFlow.getStep(step.dependedOnBy[i]));
    }
}
WorkflowUI.drawConnector = function(stepA, stepB) {
    var xyA = WorkflowUI.centerOfStep(stepA);
    var xyB = WorkflowUI.centerOfStep(stepB);
    WorkflowUI.drawLineWithArrow(xyA.x, xyA.y, xyB.x, xyB.y, 1, "black", stepA.completed ? "green":"red");
}
WorkflowUI.centerOfStep = function(step) {
    var xy = WorkflowUI.getXY(step);
    xy.x += (WorkflowUI.stepImageWidth / 2);
    xy.y += (WorkflowUI.stepImageWidth / 2);
    return xy;
}
WorkflowUI.drawLineWithArrow = function(x1, y1, x2, y2, thick, clr, arrowColor) {
    var ctx = this.ctx; //WorkflowUI.canvas.getContext("2d");
    var len = WorkflowUI.lineLength(x1, y1, x2, y2);
    var mx = x1 - x2;
    var my = y1 - y2;
    var angle = Math.atan2(my, mx);// * 180 * Math.PI;
    ctx.save();
    ctx.beginPath();
    ctx.translate(x2,y2);
    ctx.rotate(angle);
    ctx.moveTo(WorkflowUI.connectorLineCenterOffset, 0);
    ctx.lineTo(len - WorkflowUI.connectorLineCenterOffset, 0);
    ctx.strokeStyle = clr;
    ctx.lineWidth = thick;
    ctx.stroke();
    ctx.restore();
    // Start the arrow
    ctx.save();
    ctx.beginPath();
    ctx.translate(x2,y2);
    ctx.rotate(angle);
    ctx.moveTo(WorkflowUI.connectorLineCenterOffset+3, 0);
    ctx.lineTo(WorkflowUI.connectorLineCenterOffset+3 + WorkflowUI.arrowSize.length, WorkflowUI.arrowSize.width/2);
    ctx.lineTo(WorkflowUI.connectorLineCenterOffset+3 + WorkflowUI.arrowSize.length, -WorkflowUI.arrowSize.width/2);
    ctx.closePath();
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.restore();
}
WorkflowUI.highlightStep = function(can, step, showHighlight) {
    WorkflowUI.drawStep(can, step, showHighlight);
    WorkflowUI.drawConnectors(step);
}
WorkflowUI.rowColForXY = function(x, y) {
    var col = parseInt(x / (WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter));
    var row = parseInt(y / (WorkflowUI.stepImageWidth + WorkflowUI.stepImageVertSpace));
    return {row:row, col:col};
}
WorkflowUI.getXY = function(step) {
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var x = WorkflowUI.canvasPadding; // Canvas left padding;
    if (step.location.col > 0) {
        x += w * (step.location.col); // add double width
        x += gut * (step.location.col); // add gutter
    }
    var y = WorkflowUI.canvasPadding; // Canvas top padding + first row height
    y += (step.location.row * (w + WorkflowUI.stepImageVertSpace)); // height of step + room for text
    return {x:x, y:y, w:w, h:w}
}
WorkflowUI.getXYForRowColumn = function(row, col) {
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var x = WorkflowUI.canvasPadding; // Canvas left padding;
    if (col > 0) {
        x += w * col; // add double width
        x += gut * col; // add gutter
    }
    var y = WorkflowUI.canvasPadding; // Canvas top padding + first row height
    y += (row * (w + WorkflowUI.stepImageVertSpace)); // height of step + room for text
    return {x:x, y:y, w:w, h:w}
}
WorkflowUI.stepUnderXY = function(wf, x, y) {
    var rslt = null;
    var rc = WorkflowUI.rowColForXY(x, y);
    for (var id in wf.flow.steps) {
        var step = wf.flow.steps[id];
        if (step.location.row == rc.row && step.location.col == rc.col) {
            rslt = step;
            break;
        }
    }
    return rslt;
}
WorkflowUI.drawArrowAtEnd = function(x1, y1, x2, y2, color) {
    var length = WorkflowUI.arrowSize.length;
    var width = WorkflowUI.arrowSize.width;
    var mx = x1 - x2;
    var my = y1 - y2;
    var angle = Math.atan2(my, mx);// * 180 * Math.PI;
    var ctx = this.ctx; //WorkflowUI.canvas.getContext("2d");
    ctx.save();
    ctx.beginPath();
    ctx.translate(x1,y1);
    ctx.rotate(angle);
    ctx.moveTo(-WorkflowUI.connectorLineCenterOffset-3,0);
    ctx.lineTo(-length - WorkflowUI.connectorLineCenterOffset - 3, width/2);
    ctx.lineTo(-length - WorkflowUI.connectorLineCenterOffset - 3, -width/2);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.restore();
}
WorkflowUI.lineLength = function(x1, y1, x2, y2) {
    var a = x1 - x2;
    var b = y1 - y2;
    var c = Math.sqrt( a*a + b*b )
    return c;
}

WorkflowUI.roundedRectangle = function(x, y, h, w, r) {
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); // top
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r - r); // right
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); // bottom
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); // left
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}
