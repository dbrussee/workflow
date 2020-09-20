var Workflow = function(name) {
    this.drawLocation = null;
    this.drawCallback = null;
    this.activeStep = null;
    this.flow = {
        name: name,
        steps: {}
    }
    var eventTarget = document.createTextNode(null); // Dummy target for events
    // Pass EventTarget interface calls to DOM EventTarget object
    this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
    this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
    this.dispatchEvent = function(enam, detail) {
        eventTarget.dispatchEvent(new CustomEvent(enam, {detail:detail}));
    }

    this.addEventListener("linkadded", function(e) {
        WorkflowUI.drawConnector(e.detail.blockedByStep, e.detail.blockedStep);
    })

    return this;
}
var WorkflowStep = function(workflow, title, desc) {
    this.id = workflow.flow.stepsList.length;
    this.title = title;
    this.desc = desc;
    this.completed = false;
    this.comment = "";
    this.dependsOn = []; // List of steps I depend on
    this.dependedOnBy = []; // List of steps depending on me
    return this;
}
Workflow.prototype.getStep = function(step) {
    if (step == undefined) return;
    if (typeof(step) == "object") {
        return step;
    } else {
        return this.flow.steps["S" + step];
    }
}
Workflow.prototype.addStep = function(title, desc) {
    var step = new WorkflowStep(this, title, desc);
    this.flow.steps[step.id] = step;
    this.flow.stepsList.push(step.id);
    return step;
}
Workflow.prototype.setBlock = function(blockedStep, blockedByStep) {
    var rslt = this.setStepLink(blockedStep, blockedByStep);
    if (rslt.error == "") this.dispatchEvent("blockadded", rslt);
    return rslt;
}
Workflow.prototype.setBlockedBy = function(blockingStep, blockedStep) {
    var rslt = this.setStepLink(blockedStep, blockingStep);
    if (rslt.error == "") this.dispatchEvent("blockbyadded", rslt);
    return rslt;
}
Workflow.prototype.setStepLink = function(blockedStep, blockedByStep) {
    WorkflowUI.dragstart = null; // Stop dragging
    blockedStep = this.getStep(blockedStep);
    blockedByStep = this.getStep(blockedByStep);
    var msg = "";
    if (blockedStep == undefined && this.activeStep == null) {
        msg = "No step to act on provided";
    } else if (blockedStep.id == blockedByStep.id) {
        msg = "Cant block yourself.";
    } else {
        if (blockedByStep == undefined) {
            // Assume we are adding a block to the "active" step
            blockedByStep = blockedStep;
            blockedStep = this.activeStep;
        }
        if (blockedStep.dependsOn.includes(blockedByStep.id)) {
            msg = "Already set";
        } else if (blockedStep.dependedOnBy.includes(blockedByStep.id)) {
            msg = "Cant block and be blocked by the same step";
        } else {
            blockedStep.dependsOn.push(blockedByStep.id);
            blockedByStep.dependedOnBy.push(blockedStep.id);
            this.dispatchEvent("linkadded", {blockedStep:blockedStep, blockedByStep:blockedByStep});
        }
    }
    // Let user respond
    var rslt = {error:msg, blockedStep:blockedStep, blockedByStep:blockedByStep};
    return rslt;
}
Workflow.prototype.setDependsLinks = function() {
    for (var i = 0; i < arguments.length; i+=2) {
        var tStep = this.getStep(arguments[i]);
        var oStep = this.getStep(arguments[i+1]);
        if (!tStep.dependsOn.includes(oStep.id)) {
            tStep.dependsOn.push(oStep.id);
        }
        if (!oStep.dependedOnBy.includes(tStep.id)) {
            oStep.dependedOnBy.push(tStep.id);
        }
    }
}
Workflow.prototype.setComplete = function(step, comment, setAsComplete) {
    if (setAsComplete == undefined) setAsComplete = true;
    if (comment == undefined || comment == null || comment == "") comment = (setAsComplete ? "Completed" : "");
    var thisStep = this.getStep(step);
    var msg = this.canComplete(thisStep, setAsComplete);
    if (msg == "") {
        thisStep.completed = setAsComplete;
        thisStep.comment = comment;
    }
    return msg;
}
Workflow.prototype.canComplete = function(step, setAsComplete) {
    if (setAsComplete == undefined) setAsComplete = true;
    var thisStep = this.getStep(step);
    if (setAsComplete) {
        var cnt = 0;
        for (var depnum = 0; depnum < thisStep.dependsOn.length; depnum++) {
            var depStep = this.getStep(thisStep.dependsOn[depnum]);
            if (!depStep.completed) cnt++;
        }
        if (cnt > 0) {
            if (cnt == 1) {
                return "One step that this one depends on is not completed.";            
            } else {
                return cnt + " steps that this one depends on are not completed.";            
            }
        }
    } else {
        var cnt = 0;
        for (var depnum = 0; depnum < thisStep.dependedOnBy.length; depnum++) {
            var depStep = this.getStep(thisStep.dependedOnBy[depnum]);
            if (depStep.completed) cnt++;
        }
        if (cnt > 0) {
            if (cnt == 1) {
                return "One step that requires this one to be done is already marked complete.";
            } else {
                return cnt + " steps that require this one to be done are already marked completed.";
            }
        } 
    }
    return "";
}
Workflow.prototype.toggleComplete = function(step, comment) {
    var thisStep = this.getStep(step);
    return this.setComplete(thisStep, comment, !thisStep.completed);
}
Workflow.prototype.highlightStep = function(step, highlight) {
    WorkflowUI.highlightStep(WorkflowUI.canvas, step, highlight);
}
Workflow.prototype.move = function(step, dir, num) {
    if (dir == "H") {
        step.location.col += num;
        if (step.location.col < 0) step.location.col = 0;
    } else {
        step.location.row += num;
        if (step.location.row < 0) step.location.row = 0;
    }
}
Workflow.prototype.createStep = function(row, col) {
    if (row == undefined) { // Used pick location instead
        row = WorkflowUI.pickedSpot.row;
        col = WorkflowUI.pickedSpot.col;
    }
    var nextNum = 0;
    while (this.flow.steps.hasOwnProperty("S" + nextNum)) {nextNum++}
    var obj = {
        id: nextNum,
        title: 'New Step #' + nextNum,
        desc: 'New Step #' + nextNum,
        location: {col:col, row:row},
        result:null, completed:false, dependsOn:[], dependedOnBy:[],
        comment:'', resolve_list:[]
    }
    this.flow.steps["S" + nextNum] = obj;
    WorkflowUI.drawCanvas(page.wflow);
    WorkflowUI.highlightStep(WorkflowUI.canvas, obj, true);
    WorkflowUI.pickedStep = obj;
    WorkflowUI.masterFlow.dispatchEvent("steppicked", {step:obj});
}
Workflow.prototype.deleteStep = function(step) {
    if (step == undefined) step = WorkflowUI.pickedStep;
    if (step == null) return;
    for (var i = 0; i < step.dependsOn.length; i++) {
        var other = page.wflow.getStep(step.dependsOn[i]);
        for (var j = 0; j < other.dependedOnBy.length; j++) {
            if (other.dependedOnBy[j] == step.id) {
                other.dependedOnBy.splice(j--,1); // Remove that item
                break;
            }
        }
    }
    for (var i = 0; i < step.dependedOnBy.length; i++) {
        var other = page.wflow.getStep(step.dependedOnBy[i]);
        for (var j = 0; j < other.dependsOn.length; j++) {
            if (other.dependsOn[j] == step.id) {
                other.dependsOn.splice(j--,1); // Remove that item
                break;
            }
        }
    }
    delete this.flow.steps["S" + step.id];
    if (WorkflowUI.pickedStep.id == step.id) WorkflowUI.pickedStep = null;
    WorkflowUI.drawCanvas();
    this.dispatchEvent("stepdeleted", {id:step.id});
}
