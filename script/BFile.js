if (B == undefined) B = {}
B.File = function(container, onFileReady) {
    this.container = container;
    this.file = null;
    this.file_input = document.createElement("input");
    this.file_input.id = "BFileButton";
    this.file_input.type = "file";
    this.file_input.accept = ".flow";
    this.file_input.style.display = "none";
    this.callback = onFileReady;
    this.file_input.addEventListener('change', (event) => {
        this.file = event.target.files[0];
        this.callback(this.file);
    });
    container.appendChild(this.file_input);

    //var lbl = document.createElement("label");
    //lbl.htmlFor = "BFileButton";
    var btn = document.createElement("button");
    btn.innerHTML = "Open File...";
    btn.onclick = function() {document.getElementById("BFileButton").click();}
    //lbl.appendChild(btn);
    container.appendChild(btn);

    this.reader = new FileReader();
    this.readerCallback = null;
    this.reader.addEventListener('load', (event) => {
        this.readerCallback(event.target.result);
    });

}
B.File.prototype.getText = function(callback) {
    if (this.file == null) return null;
    this.readerCallback = callback;
    this.reader.readAsText(this.file);
}
