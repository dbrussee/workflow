window.WorkflowUI = {
    masterFlow: null,
    stepImageWidth: 25,
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
    var y = 10;
    var columns = [{"x":10, "y":y}, {"x":10 + WorkflowUI.stepImageWidth * 2 + WorkflowUI.stepImageColumnGutter, "y":y}]
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        var col = 0;
        if (step.dependsOn.length > 0) col = 1;
        var yOffset = WorkflowUI.drawStep(can, step, columns[col].x, columns[col].y);
        step.coords = {"x":columns[col].x, "y":columns[col].y, "x2":columns[col].x + WorkflowUI.stepImageWidth, "y2":columns[col].y + yOffset};
        yOffset += 5; // Gap
        columns[col].y += yOffset;
    }
    for (var stepnum = 0; stepnum < workflow.flow.stepsList.length; stepnum++) {
        var step = workflow.flow.steps[workflow.flow.stepsList[stepnum]];
        WorkflowUI.drawConnectors(can, step);
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

WorkflowUI.drawStep = function(can, step, x, y) {
    var workflow = WorkflowUI.masterFlow;
    var fullWidth = WorkflowUI.stepImageWidth;
    var stepSize = fullWidth/3;
    var ctx = can.getContext("2d");
    step.drawPath = ctx.beginPath();
    ctx.moveTo(x, y+fullWidth); // Start at lower left
    ctx.lineTo(x+fullWidth, y+fullWidth); // Bottom
    ctx.lineTo(x+fullWidth, y); // Right edge
    ctx.lineTo(x+stepSize+stepSize, y); // Top step
    ctx.lineTo(x+stepSize+stepSize, y+stepSize); // Left on top step
    ctx.lineTo(x+stepSize, y+stepSize); // Top of 2nd step
    ctx.lineTo(x+stepSize, y+stepSize+stepSize); // Left of 2nd step
    ctx.lineTo(x, y+stepSize+stepSize); // Top of 1st step
    //ctx.lineTo(x, y+fullWidth); // Left of 1st step
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.stroke();
    var blocked = false;
    if (step.completed) {
        ctx.fillStyle = "#90EE90";
        var msg = workflow.canComplete(step, false);
        if (msg != "") {
            blocked = true
        }
    } else {
        for (var i = 0; i < step.dependsOn.length; i++) {
            var step2 = workflow.getStep(step.dependsOn[i]);
            if (!step2.completed) {
                blocked = true;
                break;
            }
        }
        if (blocked) {
            ctx.fillStyle = "#A9A9A9";
        } else {
            ctx.fillStyle = "#F8F8FF";
        }
        ctx.fillStyle = "#F8F8FF";
    }
    ctx.fill();
    ctx.font = "8pt Arial";
    ctx.fillStyle = "#000000"; // Back to black
    ctx.fillText(step.title, x, y+fullWidth+12);
    ctx.restore();
    if (blocked) {
        ctx.beginPath();
        ctx.arc(x + fullWidth - (fullWidth/3), y + fullWidth - (fullWidth/3), fullWidth/6, 0, 2 * Math.PI);
        ctx.fillStyle = "#FF0000";
        ctx.fill();        
        ctx.restore();
    }

    return fullWidth + 12; // Height of step diagram
}
WorkflowUI.drawConnectors = function(can, step) {
    var wf = WorkflowUI.masterFlow;
    var fullWidth = WorkflowUI.stepImageWidth;
    var ctx = can.getContext("2d");
    for (var i = 0; i < step.dependsOn.length; i++) {
        var step2 = wf.getStep(step.dependsOn[i]);
        // Connect right edge of step2 to left edge of step
        ctx.beginPath();
        ctx.moveTo(step.coords.x - 5, step.coords.y + (WorkflowUI.stepImageWidth/2));
        ctx.lineTo(step2.coords.x + WorkflowUI.stepImageWidth + 5, step2.coords.y + (WorkflowUI.stepImageWidth/2));
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
