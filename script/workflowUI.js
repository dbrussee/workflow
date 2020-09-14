window.WorkflowUI = {
    masterFlow: null,
    canvasPadding: 10,
    stepImageWidth: 35,
    stepImageColumnGutter: 60,
    drawPlaygroundLocation: null,
    drawPlaygroundCallback: null,
    drawPlaygroundCanvas: null,
    drawLocation: null,
    drawCallback: null
}

WorkflowUI.drawPlayground = function(workflow, div, callback) {
    WorkflowUI.masterFlow = workflow;
    if (div != undefined) {
        WorkflowUI.drawPlaygroundLocation = div;
        WorkflowUI.drawPlaygroundCallback = callback;
    } else {
        div = WorkflowUI.drawPlaygroundLocation;
        callback = WorkflowUI.drawPlaygroundCallback;
    }
    // Clear out existing coordinates
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        step.coords = null;
    }
    div.innerHTML = "";
    var can = document.createElement("canvas");
    WorkflowUI.drawPlaygroundCanvas = can;
    can.onclick = callback;
    can.width = 600;
    can.height = 350;
    can.style.border = "1px dotted navy";
    div.appendChild(can);
    /*
    var columns = [[],[],[]]
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        var col = 0;
        if (step.dependsOn.length > 0) {
            for (var depnum = 0; depnum < step.dependsOn.length; depnum++){
                var dstep = workflow.getStep(step.dependsOn[depnum]);
                var dcol = dstep.location.col + 1; // add 1 for testing
                if (dcol > col) col = dcol;
            }
            while (columns.length < col) {
                columns.push([]);
            }
        };
        step.location = {"col":col, "row":columns[col].length}
        columns[col].push(step.id);
    }
    */
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        WorkflowUI.drawConnectors(can, step);
        WorkflowUI.drawStep(can, step);
    }
}

WorkflowUI.draw = function(workflow, div, callback) {
    WorkflowUI.masterFlow = workflow;
    WorkflowUI.drawLocation = div;
    WorkflowUI.drawCallback = callback;
    WorkflowUI.redraw(workflow);
}
WorkflowUI.redraw = function() {
    var workflow = WorkflowUI.masterFlow;
    var tbl = document.createElement("table");
    tbl.className = "workflow_table";
    var tr = tbl.insertRow();
    tr.className = "workflow_table_header";
    var th = document.createElement("th");
    th.colSpan = 8;
    th.innerHTML = "Workflow: " + workflow.flow.name;
    tr.appendChild(th);
    tr = tbl.insertRow();
    tr.className = "workflow_table_header";
    th = document.createElement("th");
    th.innerHTML = "ID"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Title"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Desc"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Done"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Status"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Blocking"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Blocked By"; tr.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = "Comment"; tr.appendChild(th);

    
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        tr = tbl.insertRow();
        tr.dataset.workflowid = step.id;
        tr.className = "workflow_table_datarow";
        if (WorkflowUI.drawCallback != undefined && WorkflowUI.drawCallback != null) tr.onclick = WorkflowUI.drawCallback;
        var td;
        td = tr.insertCell(); td.innerHTML = step.id;
        td = tr.insertCell(); td.innerHTML = step.title;
        td = tr.insertCell(); td.innerHTML = step.desc;
        var countBlocking = 0;
        if (!step.completed) {
            countBlocking = step.dependedOnBy.length;
        }
        var countBlockedBy = "";
        for (var linknum = 0; linknum < step.dependsOn.length; linknum++) {
            var otherStep = workflow.flow.steps[step.dependsOn[linknum]];
            if (!otherStep.completed) {
                countBlockedBy++;
            }
        }
        var status = "";
        if (countBlockedBy == 0) {
            if (step.completed) {
                tr.className += " done";
                if (step.resolve_list.length == 0) {
                    status = "Done";
                } else {
                    status = step.result;
                }
            } else {
                status = "Ready";
            }
        } else {
            status = "Blocked";
        }
        td = tr.insertCell(); td.innerHTML = (step.completed ? "Y":"N");
        td = tr.insertCell(); td.innerHTML = status;
        if (status == "Blocked") td.className = "blocked";
        td = tr.insertCell(); td.innerHTML = (countBlocking == 0 ? "" : countBlocking == 1 ? "1 Step" : countBlocking + " Steps");
        td = tr.insertCell(); td.innerHTML = (countBlockedBy == 0 ? "" : countBlockedBy == 1 ? "1 Step" : countBlockedBy + " Steps");
        td = tr.insertCell(); td.innerHTML = step.comment;
    }

    WorkflowUI.drawLocation.innerHTML = "";
    WorkflowUI.drawLocation.appendChild(tbl);
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000"; // black border
    ctx.stroke();
    ctx.restore();
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
                blockColor = "#F08080";
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
}
WorkflowUI.drawConnectors = function(can, step) {
    var wf = WorkflowUI.masterFlow;
    var w = WorkflowUI.stepImageWidth;
    var gut = WorkflowUI.stepImageColumnGutter;
    var ctx = can.getContext("2d");
    for (var i = 0; i < step.dependsOn.length; i++) {
        var step2 = wf.getStep(step.dependsOn[i]);
        // Connect right edge of step2 to left edge of step
        var xy1 = WorkflowUI.getXY(step);
        var xy2 = WorkflowUI.getXY(step2);
        var x1 = 0;
        var x2 = 0;
        var y1 = 0;
        var y2 = 0;
        if (xy1.x == xy2.x) { // Same row
            if (xy1.y < xy2.y) { // I am above my depend step
                x1 = xy1.x + w/2; // H Center
                y1 = xy1.y + w + 5; // V Bottom
                x2 = xy2.x + w/2; // H Center
                y2 = xy2.y - 5; // V Top
            } else { // Below or on top of
                x1 = xy1.x + w/2; // H Center
                y1 = xy1.y - 5; // V Bottom
                x2 = xy2.x + w/2; // H Center
                y2 = xy2.y + w + 5; // V Bottom
            }
        } else { // Different row
            if (xy1.x < xy2.x) { // I am left of the depend
                x1 = xy1.x + w + 5; // H Left
                y1 = xy1.y + w/2 + 5; // V Center
                x2 = xy2.x - 5; // H Right
                y2 = xy2.y + w/2 + 5; // V Center
            } else { // Right or on top of
                x1 = xy1.x - 5; // H Left
                y1 = xy1.y + w/2 + 5; // V Center
                x2 = xy2.x + w + 5; // H Right
                y2 = xy2.y + w/2 + 5; // V Center
            }
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.arc(x2, y2, 2, 0, 2 * Math.PI);
        if (step2.completed) {
            ctx.strokeStyle = "#228B22";
        } else {
            ctx.strokeStyle = "#F08080";
        }
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
    }
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
    y += (step.location.row * (w + 25)); // height of step + room for text
    return {x:x, y:y}
}
WorkflowUI.stepUnderXY = function(wf, x, y) {
    var w = WorkflowUI.stepImageWidth;
    for (var stepnum = 0; stepnum < wf.flow.stepsList.length; stepnum++) {
        var step = wf.flow.steps[page.wflow.flow.stepsList[stepnum]];
        var xy = WorkflowUI.getXY(step);
        if (x >= xy.x) {
            if (x <= xy.x + w) {
                if (y >= xy.y) {
                    if (y <= xy.y + w) {
                        return step;
                    }
                }
            }
        }
    }
    return null;
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