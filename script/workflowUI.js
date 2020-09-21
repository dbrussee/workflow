window.WorkflowUI = {
    pickedSpot: null,
    pickAction: null,
    arrowSize: {length:10, width:6},
    connectorLineCenterOffset: 24,
    pickedStep: null,
    masterFlow: null,
    canvasPadding: 10,
    stepImageWidth: 35,
    stepImageColumnGutter: 50,
    stepImageVertSpace: 40,
    drawCanvasLocation: null,
    drawCanvasCallback: null,
    canvas: null,
    drawLocation: null,
    drawCallback: null,
    dragstart: null
}

WorkflowUI.defineCanvas = function(workflow, div, callback) {
    WorkflowUI.masterFlow = workflow;
    WorkflowUI.drawCanvasLocation = div;
    div.innerHTML = "";
    var can = document.createElement("canvas");

    // Sharpen up the resolution
    //get DPI
    var dpi = window.devicePixelRatio;
    var style_height = getComputedStyle(can).getPropertyValue("height").slice(0, -2);
    //get CSS width
    let style_width = getComputedStyle(can).getPropertyValue("width").slice(0, -2);
    //scale the canvas
    can.setAttribute('height', style_height * dpi);
    can.setAttribute('width', style_width * dpi);


    WorkflowUI.canvas = can;
    can.onmousedown = callback;

    can.addEventListener("mousedown", function(event) {
        WorkflowUI.dragstart = {x:event.clientX, y:event.clientY};
        WorkflowUI.canvas.style.cursor = "grabbing";

        var can = WorkflowUI.canvas;
        if (WorkflowUI.pickedStep != null) WorkflowUI.highlightStep(can, WorkflowUI.pickedStep, false);
        var x = event.offsetX;
        var y = event.offsetY; 
        if (WorkflowUI.pickedSpot != null) {
            WorkflowUI.clearPickedSpot();
        }
        WorkflowUI.pickedSpot = WorkflowUI.rowColForXY(x, y);
        var step = WorkflowUI.stepUnderXY(page.wflow, x, y);
        if (step != null) {
            WorkflowUI.pickedSpot = null;
            if (WorkflowUI.pickAction == null) {
                WorkflowUI.pickedStep = step;
                WorkflowUI.highlightStep(can, step, true);
                WorkflowUI.masterFlow.dispatchEvent("steppicked", {step:step});
            } else {
                var act = WorkflowUI.pickAction;
                WorkflowUI.masterFlow.dispatchEvent("actioncompleted", {source:WorkflowUI.pickedStep, step:step, action:act});
                WorkflowUI.pickAction = null;
            }
        } else {
            WorkflowUI.pickAction = null; // Reset any pending actions
            if (WorkflowUI.pickAction != null) {
                WorkflowUI.pickAction = null;
                WorkflowUI.masterFlow.dispatchEvent("actionaborted", {action:WorkflowUI.pickAction});
            }
            WorkflowUI.pickedStep = null;
            WorkflowUI.markPickedSpot();
            WorkflowUI.masterFlow.dispatchEvent("emptyspotpicked", {spot:WorkflowUI.pickedSpot});
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
        if (WorkflowUI.pickedStep == null) return;
        var moveX = event.clientX - WorkflowUI.dragstart.x;
        var moveY = event.clientY - WorkflowUI.dragstart.y;
        var moved = false;
        if (moveX > (WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter)) {
            var pre = WorkflowUI.pickedStep.location.col;
            WorkflowUI.masterFlow.move(WorkflowUI.pickedStep, "H", 1);
            if (WorkflowUI.pickedStep.location.col != pre) {
                //debug("Moving step " + WorkflowUI.pickedStep.title + " right");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveX < ((WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter) * -1)) {
            var pre = WorkflowUI.pickedStep.location.col;
            WorkflowUI.masterFlow.move(WorkflowUI.pickedStep, "H", -1);
            if (WorkflowUI.pickedStep.location.col != pre) {
                //debug("Moving step " + WorkflowUI.pickedStep.title + " left");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveY > WorkflowUI.stepImageWidth + 20) {
            var pre = WorkflowUI.pickedStep.location.row;
            WorkflowUI.masterFlow.move(WorkflowUI.pickedStep, "V", 1);
            if (WorkflowUI.pickedStep.location.row != pre) {
                //debug("Moving step " + WorkflowUI.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moveY < ((WorkflowUI.stepImageWidth + 20) * -1)) {
            var pre = WorkflowUI.pickedStep.location.row;
            WorkflowUI.masterFlow.move(WorkflowUI.pickedStep, "V", -1);
            if (WorkflowUI.pickedStep.location.row != pre) {
                //debug("Moving step " + WorkflowUI.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moved) {
            WorkflowUI.drawCanvas();
            WorkflowUI.highlightStep(WorkflowUI.canvas, WorkflowUI.pickedStep, true);
        }
    });

    can.width = 1200;
    can.height = 1200;
    can.style.border = "1px dotted navy";
    div.appendChild(can);
    WorkflowUI.drawCanvas();
}

WorkflowUI.drawCanvas = function() {
    workflow = WorkflowUI.masterFlow;
    var ctx = WorkflowUI.canvas.getContext("2d");
    ctx.clearRect(0,0,WorkflowUI.canvas.width, WorkflowUI.canvas.height);
    // Clear out existing coordinates
    for (var id in workflow.flow.steps) {
        var step = workflow.flow.steps[id];
        step.coords = null;
    }
    for (var id in workflow.flow.steps) {
        var step = workflow.flow.steps[id];
        WorkflowUI.drawStep(WorkflowUI.canvas, step);
        WorkflowUI.drawConnectors(step);
    }
}

WorkflowUI.clearPickedSpot = function() {
    var xy = WorkflowUI.getXYForRowColumn(WorkflowUI.pickedSpot.row, WorkflowUI.pickedSpot.col);
    var ctr = {x:xy.x + (xy.w/2), y:xy.y + (xy.h/2)}
    var ctx = WorkflowUI.canvas.getContext("2d");
    ctx.clearRect(ctr.x - 5,ctr.y - 5, 10, 10);
}
WorkflowUI.markPickedSpot = function() {
    var xy = WorkflowUI.getXYForRowColumn(WorkflowUI.pickedSpot.row, WorkflowUI.pickedSpot.col);
    var ctr = {x:xy.x + (xy.w/2), y:xy.y + (xy.h/2)}
    var ctx = WorkflowUI.canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(ctr.x, ctr.y-5);
    ctx.lineTo(ctr.x, ctr.y+5);
    ctx.moveTo(ctr.x-5, ctr.y);
    ctx.lineTo(ctr.x+5, ctr.y);
    ctx.strokeStyle = "red";
    ctx.stroke();
}
WorkflowUI.drawStep = function(can, step, highlight) {
    if (highlight == undefined) highlight = false;
    var ctx = can.getContext("2d");
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var stepSize = w/3;
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
    ctx.moveTo(x, y+w); // Start at lower left
    ctx.lineTo(x+w, y+w); // Bottom
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
    var blockColor = null;
    if (step.completed) {
        ctx.fillStyle = "#90EE90";
        var msg = wf.canComplete(step, false);
        if (msg != "") {
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
            ctx.fillStyle = "#A9A9A9";
        } else {
            ctx.fillStyle = "#F8F8FF";
        }
        ctx.fillStyle = "#F8F8FF";
    }
    ctx.fill();
    ctx.restore();
    ctx.font = "8pt Arial";
    ctx.fillStyle = "#000000"; // Back to black
    ctx.fillText(step.title, x, y+w+12);
    ctx.restore();
    if (blockColor != null) {
        ctx.beginPath();
        ctx.arc(x + w - (w/3), y + w - (w/3), w/6, 0, 2 * Math.PI);
        ctx.fillStyle = blockColor;
        ctx.fill();        
        ctx.restore();
    }
    ctx.font = "8pt Arial";
    ctx.fillStyle = "#000000";
     var chrCheck = String.fromCharCode(10004);
     var chrArrow = String.fromCharCode(9660);
    ctx.fillText(step.resolve_list.length == 0 ? chrCheck : step.resolve_list.length, x-1, y + w - w/3 - 4);
    ctx.restore();
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
    var ctx = WorkflowUI.canvas.getContext("2d");
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
    var ctx = WorkflowUI.canvas.getContext("2d");
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

