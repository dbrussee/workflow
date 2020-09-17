window.WorkflowUI = {
    pickedSpot: null,
    pickAction: null,
    arrowSize: {length:10, width:5},
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

WorkflowUI.drawCanvas = function(workflow, div, callback) {
    if (div != undefined) {
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
            //debug("mousedown at " + event.clientX + ", " + event.clientY);
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
            if (moveX > (WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter)) {
                var pre = WorkflowUI.pickedStep.location.col;
                WorkflowUI.move(WorkflowUI.pickedStep, "H", 1);
                if (WorkflowUI.pickedStep.location.col != pre) {
                    //debug("Moving step " + WorkflowUI.pickedStep.title + " right");
                    WorkflowUI.dragstart.x = event.clientX;
                    WorkflowUI.drawCanvas();
                }
            }
            if (moveX < ((WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter) * -1)) {
                var pre = WorkflowUI.pickedStep.location.col;
                WorkflowUI.move(WorkflowUI.pickedStep, "H", -1);
                if (WorkflowUI.pickedStep.location.col != pre) {
                    //debug("Moving step " + WorkflowUI.pickedStep.title + " left");
                    WorkflowUI.dragstart.x = event.clientX;
                    WorkflowUI.drawCanvas();
                }
            }
            if (moveY > WorkflowUI.stepImageWidth + 20) {
                var pre = WorkflowUI.pickedStep.location.row;
                WorkflowUI.move(WorkflowUI.pickedStep, "V", 1);
                if (WorkflowUI.pickedStep.location.row != pre) {
                    //debug("Moving step " + WorkflowUI.pickedStep.title + " down");
                    WorkflowUI.dragstart.y = event.clientY;
                    WorkflowUI.drawCanvas();
                }
            }
            if (moveY < ((WorkflowUI.stepImageWidth + 20) * -1)) {
                var pre = WorkflowUI.pickedStep.location.row;
                WorkflowUI.move(WorkflowUI.pickedStep, "V", -1);
                if (WorkflowUI.pickedStep.location.row != pre) {
                    //debug("Moving step " + WorkflowUI.pickedStep.title + " down");
                    WorkflowUI.dragstart.y = event.clientY;
                    WorkflowUI.drawCanvas();
                }
            }
           

        });
    
        can.width = 1200;
        can.height = 1200;
        can.style.border = "1px dotted navy";
        div.appendChild(can);
    } else {
        workflow = WorkflowUI.masterFlow;
        div = WorkflowUI.drawCanvasLocation;
        callback = WorkflowUI.drawCanvasCallback;
        var ctx = WorkflowUI.canvas.getContext("2d");
        ctx.clearRect(0,0,WorkflowUI.canvas.width, WorkflowUI.canvas.height);
    }
    // Clear out existing coordinates
    for (var id in workflow.flow.steps) {
        var step = workflow.flow.steps[id];
        step.coords = null;
    }
    for (var id in workflow.flow.steps) {
        var step = workflow.flow.steps[id];
        WorkflowUI.drawConnectors(WorkflowUI.canvas, step);
        WorkflowUI.drawStep(WorkflowUI.canvas, step);
        if (WorkflowUI.pickedStep != null) {
            if (step.id == WorkflowUI.pickedStep.id) {
                WorkflowUI.highlightStep(WorkflowUI.canvas, step, true);
            }
        }
    }
}



WorkflowUI.drawStep = function(can, step) {
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var stepSize = w/3;
    var ctx = can.getContext("2d");
    var xy = WorkflowUI.getXY(step);
    var x = xy.x;
    var y = xy.y;
    WorkflowUI.highlightStep(can, step, false);
    ctx.beginPath();
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
WorkflowUI.drawConnectors = function(can, step, withDependedOnBy) {
    if (withDependedOnBy == undefined) withDependedOnBy = false;
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var ctx = can.getContext("2d");
    for (var i = 0; i < step.dependsOn.length; i++) {
        var step2 = wf.getStep(step.dependsOn[i]);
        // Connect right edge of step2 to left edge of step
        var xy1 = WorkflowUI.getXY(step);
        var xy2 = WorkflowUI.getXY(step2);
        var x1 = xy1.x + WorkflowUI.stepImageWidth / 2;
        var y1 = xy1.y + WorkflowUI.stepImageWidth / 2;
        var x2 = xy2.x + WorkflowUI.stepImageWidth / 2;
        var y2 = xy2.y + WorkflowUI.stepImageWidth / 2;
        var len = WorkflowUI.lineLength(x1, y1, x2, y2);
        var mx = x1 - x2;
        var my = y1 - y2;
        var angle = Math.atan2(my, mx);// * 180 * Math.PI;
        var ctx = WorkflowUI.canvas.getContext("2d");
        ctx.save();
        ctx.beginPath();
        ctx.translate(x2,y2);
        ctx.rotate(angle);
        ctx.moveTo(WorkflowUI.connectorLineCenterOffset, 0);
        ctx.lineTo(len - WorkflowUI.connectorLineCenterOffset, 0);

        ctx.strokeStyle = "grey";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        var color = step2.completed ? "#228B22" : "#FF2000";
        WorkflowUI.drawArrowAtEnd(x1, y1, x2, y2, color);
    }
    for (var i = 0; i < step.dependedOnBy.length; i++) {
        var step2 = wf.getStep(step.dependedOnBy[i]);
        WorkflowUI.drawConnectors(can, step2, false);
    }

}
WorkflowUI.highlightStep = function(can, step, showHighlight) {
    if (showHighlight == undefined) showHighlight = true;
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var ctx = can.getContext("2d");
    var xy = WorkflowUI.getXY(step);
    ctx.beginPath();
    ctx.strokeStyle = (showHighlight ? "yellow" : "white"); // aqua or white
    ctx.lineWidth = (showHighlight ? 3 : 5);
    //ctx.moveTo(xy.x - 3, xy.y + xy.h + 10);
    //ctx.lineTo(xy.x + xy.w + 3, xy.y + xy.h + 10);
    //ctx.strokeStyle = (showHighlight ? "#00FFFF" : "#FFFFFF"); // aqua or white
    //ctx.lineWidth = 15;
    ctx.moveTo(xy.x - 4, xy.y - 4);
    ctx.lineTo(xy.x + xy.w + 4, xy.y - 4);
    ctx.lineTo(xy.x + xy.w + 4, xy.y + xy.h + 4);
    ctx.lineTo(xy.x - 4, xy.y + xy.h + 4);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.font = "8pt Arial";
    ctx.fillStyle = "#000000"; // Back to black
    ctx.fillText(step.title, xy.x, xy.y+xy.w+12);
    ctx.restore();
    WorkflowUI.drawConnectors(can, step, true);
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
WorkflowUI.move = function(step, dir, num) {
    if (dir == "H") {
        step.location.col += num;
        if (step.location.col < 0) step.location.col = 0;
    } else {
        step.location.row += num;
        if (step.location.row < 0) step.location.row = 0;
    }
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
function debug(txt, clear) {
    var div = document.getElementById("locDebug");
    if (clear) {
        div.innerHTML = "";
    } else {
        if (div != undefined) {
            if (div.innerHTML != "") div.innerHTML += "<br>";
        }
    }
    div.innerHTML += txt;
}
