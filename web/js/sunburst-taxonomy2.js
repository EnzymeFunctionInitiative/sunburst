
////////////////////////////////////////////////////////////////////////////////////////////////////
// SUNBURST
//



//function AppSunburst(apiId, apiKey, apiExtra, appUniRefVersion, scriptApp, hasUniRef = false) {
function AppSunburst(params) {
    // Used for 
    this.apiId                 =    typeof params.apiId !== "undefined"                 ? params.apiId : 0;
    this.apiKey                =    typeof params.apiKey !== "undefined"                ? params.apiKey : "";
    this.apiExtra              =    typeof params.apiExtra === "object"                 ? params.apiExtra : [];
    this.appUniRefVersion      =    typeof params.appUniRefVersion !== "undefined"      ? params.appUniRefVersion : "";
    this.appPrimaryIdTypeText  =    typeof params.appPrimaryIdTypeText !== "undefined"  ? params.appPrimaryIdTypeText : "";
    this.appPostSunburstTextFn =    typeof params.appPostSunburstTextFn === "function"  ? params.appPostSunburstTextFn : null;
    this.hasUniRef             =    typeof params.hasUniRef === "boolean"               ? params.hasUniRef : false;
    this.scriptApp             =    typeof params.scriptApp === "string"                ? params.scriptApp : "";
    this.fastaApp              =    typeof params.fastaApp === "string"                 ? params.fastaApp : "";
}


function addParentRef(treeData, theParent) {
    treeData.theParent = theParent;
    if (typeof treeData.children !== "undefined") {
        for (var i = 0; i < treeData.children.length; i++) {
            addParentRef(treeData.children[i], treeData);
        }
    }
}


AppSunburst.prototype.addSunburstFeatureAsync = function(onFinishedFn) {
    var that = this;

    var progress = new Progress($("#sunburst-progress-loader"));
    progress.start();
    var parms = {id: this.apiId, key: this.apiKey};
    for (var i = 0; i < this.apiExtra.length; i++) {
        parms[this.apiExtra[i][0]] = this.apiExtra[i][1];
    }
    $.ajax({
        dataType: "json",
        url: that.scriptApp,
        data: parms,
        success: function(jsonData) {
            if (typeof(jsonData.valid) !== "undefined" && jsonData.valid == "false") {
                //TODO: handle error
                alert(jsonData.message);
                progress.stop();
            } else {
                that.addSunburstFeature(jsonData.data.data);
                progress.stop();
                if (typeof onFinishedFn === "function")
                    onFinishedFn(that);
            }
        },
        error: function(jsonData, exception) {
            console.log("AJAX error: " + exception);
            progress.stop();
        }
    });
};


AppSunburst.prototype.addSunburstFeature = function(treeData) {

    var idTypeStr = this.appUniRefVersion ? "UniRef"+this.appUniRefVersion : this.appPrimaryIdTypeText;
    var that = this;
    var Colors = getSunburstColorFn(); // from sunburst_helpers.js

    addParentRef(treeData, null);

    var maxDepth = 9;
    var depthMap = {
        0 : [ "Root",   "Superkingdom", "Kingdom",  "Phylum",   "Class",    "Order",    "Family",   "Genus",    "Species" ],
        1 : [           "Superkingdom", "Kingdom",  "Phylum",   "Class",    "Order",    "Family",   "Genus",    "Species" ], 
        2 : [                           "Kingdom",  "Phylum",   "Class",    "Order",    "Family",   "Genus",    "Species" ], 
        3 : [                                       "Phylum",   "Class",    "Order",    "Family",   "Genus",    "Species" ], 
        4 : [                                                   "Class",    "Order",    "Family",   "Genus",    "Species" ], 
        5 : [                                                               "Order",    "Family",   "Genus",    "Species" ], 
        6 : [                                                                           "Family",   "Genus",    "Species" ], 
        7 : [                                                                                       "Genus",    "Species" ], 
        8 : [                                                                                                   "Species" ], 
    };
    var levelsColorFn = getColorForSunburstLevelFn();

    var addCurViewNumSeq = function() {
        if (!that.sbCurrentData)
            return;
        var numUniprot = 0;
        var idStr = that.sbCurrentData.nq > 1 ? "IDs" : "ID";
        if (that.hasUniRef) {
            var numIds = computeVisibleIds(that.sbCurrentData);
            numUniprot = commify(numIds.uniprot);
            numUniRef90 = commify(numIds.uniref90);
            numUniRef50 = commify(numIds.uniref50);
            theText = numUniprot + " UniProt, " + numUniRef90 + " UniRef90, " + numUniRef50 + " UniRef50 IDs";
        } else {
            numUniprot = commify(that.sbCurrentData.nq); // nq = numSequences
            theText = numUniprot + " " + idTypeStr + " " + idStr + "";
        }
        $("#sunburst-id-nums").text(theText);
        var rankText = "";
        if (that.sbCurrentData.d > 0)
            rankText = depthMap[that.sbCurrentData.d][0] + ": " + that.sbCurrentData.node;
        $("#sunburst-rank").text(rankText);
    };

    var showTaxLevels = function(data) {
        $("#sunburst-chart-levels").empty();
        for (var i = data.d; i < maxDepth; i++) {
            var theColor = levelsColorFn(data, i-1);
            var theLevel = depthMap[i][0];
            $("#sunburst-chart-levels").append('<div style="background-color: ' + theColor + '" class="sunburst-level">' + theLevel + '</div>');
        }
    };

    that.sbRootData = treeData;
    that.sbCurrentData = treeData;
    addCurViewNumSeq();
    showTaxLevels(treeData);
    var sb = Sunburst()
        .width(600)
        .height(600)
        .data(treeData)
        .label("node")
        .size("ns") // ns = numSpecies
        .color(Colors)
        .excludeRoot(true)
        //.color((d, parent) => color(parent ? parent.data.name : null))
        //.tooltipContent((d, node) => `Size: <i>${node.value}</i>`)
        (document.getElementById("sunburst-chart"));
    sb.onClick(function(data) {
        if (!data)
            return;
        that.sbCurrentData = data;
        addCurViewNumSeq();
        sb.focusOnNode(data);
        showTaxLevels(data);
    });

    this.sbDownloadFile = null;
    var makeTextFile = function(text) {
        var data = new Blob([text], {type: 'text/plain'});
    
        // If we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        if (that.sbDownloadFile !== null) {
          window.URL.revokeObjectURL(that.sbDownloadFile);
        }
    
        that.sbDownloadFile = window.URL.createObjectURL(data);
    
        return that.sbDownloadFile;
    };


    if (this.appUniRefVersion === 90) {
        $("#sunburst-id-type-uniref90-container").show();
    }
    if (this.appUniRefVersion === 50 || this.hasUniRef) {
        $("#sunburst-id-type-uniref50-container").show();
        $("#sunburst-id-type-uniref90-container").show();
    }
    if (this.appUniRefVersion !== 0 || this.hasUniRef) {
        $("#sunburst-type-download-container").show();
    }

    if (this.appPostSunburstTextFn !== null) {
        $("#sunburst-download-text").append(this.appPostSunburstTextFn());
        $("#sunburst-download-text-container").show();
    }

    $("#sunburst-download-ids").click(function() {
        var idType = getIdType();
        var ids = getIdsFromTree(that.sbCurrentData, idType);
        var fname = that.apiId + "_";
        for (var i = 0; i < that.apiExtra.length; i++) {
            if (typeof that.apiExtra[i].name !== "undefined")
                fname += that.apiExtra[i].name + "_";
        }
        if (idType != "uniref")
            fname += idType + "_";
        fname += fixNodeName(that.sbCurrentData.node) + ".txt";
        var text = ids.join("\r\n");
        $("#sunburst-download-link").attr("download", fname);
        $("#sunburst-download-link").attr("href", makeTextFile(text));
        $("#sunburst-download-link")[0].click();
    });
    $("#sunburst-download-fasta").click(function() {
        that.getDownloadWarningFn();
    });
};
AppSunburst.prototype.getDownloadWarningFn = function() {
    var that = this;
    $("#sunburst-fasta-download").dialog({
        resizeable: false,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
            "Continue": function() {
                that.sunburstDownloadFasta();
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }
        }
    });
};
function fixNodeName(str) {
    return str.replace(/[^a-z0-9]/gi, "_");
}
function getIdType() {
    return $("input[name='sunburstIdType']:checked").val();
}
AppSunburst.prototype.getIdType = function() {
    return getIdType();
};


AppSunburst.prototype.getCurrentNode = function() {
    var node = this.sbCurrentData;
    var nodeInfo = {
        id: node.id,
        name: node.node,
        idType: this.getIdType(),
    };
    return nodeInfo;
};

function setupSvgDownload() {
    var svg = $("#sunburst-chart svg")[0];
    $("#sunburst-svg").click(function() {
        var svgData = svg.outerHTML;
        var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
        var svgUrl = URL.createObjectURL(svgBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = svgUrl;
        downloadLink.download = "newesttree.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
}


AppSunburst.prototype.sunburstDownloadFasta = function() {
    var that = this;

    //var progress = new Progress($("#sunburst-progress-loader"));
    //progress.start();

    var idType = getIdType();
    var ids = getIdsFromTree(that.sbCurrentData, idType);
    var fixedNodeName = fixNodeName(that.sbCurrentData.node)
    var jsIds = JSON.stringify(ids);

    var form = $('<form method="POST" action="' + that.fastaApp + '"></form>');
    form.append($('<input name="id" type="hidden">').val(that.apiId));
    form.append($('<input name="key" type="hidden">').val(that.apiKey));
    form.append($('<input name="o" type="hidden">').val(fixedNodeName));
    form.append($('<input name="ids" type="hidden">').val(jsIds));
    form.append($('<input name="it" type="hidden">').val(idType));
    for (var i = 0; i < this.apiExtra.length; i++) {
        var obj = this.apiExtra[i];
        var fas = $('<input name="' + obj.apiKey + '" type="hidden">').val(obj.value);
        form.append(fas);
    }
    $("body").append(form);

    //$("#sunburst-download-btn").hide();

    form.submit();
    setTimeout(function() {
        //progress.stop();
    }, 1000);

};


function computeVisibleIds(data) {
    var rawIds = getIdsFromTree(data);
    var ids = {uniprot: 0, uniref90: 0, uniref50: 0};
    ids.uniref50 = Array.from(new Set(rawIds.uniref50)).length;
    ids.uniref90 = Array.from(new Set(rawIds.uniref90)).length;
    ids.uniprot = Array.from(new Set(rawIds.uniprot)).length;
    return ids;
}


function getIdsFromTree(data, idType = "") {
    var nextLevel = function(level) {
        var ids = {uniprot: [], uniref90: [], uniref50: []};
        // Bottom level
        // When we fix the legacy problem, only look for level.seq, not level.s
        if (typeof level.s !== "undefined")
            level.seq = level.s;
        if (typeof level.seq !== "undefined") {
            for (var i = 0; i < level.seq.length; i++) {
                ids.uniref50.push(level.seq[i].sa50);
                ids.uniref90.push(level.seq[i].sa90);
                ids.uniprot.push(level.seq[i].sa); //sa = seqAcc
                //var id = idType == "uniref50" ? level.seq[i].sa50 : (idType == "uniref90" ? level.seq[i].sa90 : level.seq[i].sa); //sa = seqAcc
                //ids.push(level.seq[i].sa);
                //ids.push(id);
            }
        } else {
            for (var i = 0; i < level.children.length; i++) {
                var nextIds = nextLevel(level.children[i]);
                for (var j = 0; j < nextIds.uniprot.length; j++) {
                    ids.uniprot.push(nextIds.uniprot[j]);
                    ids.uniref50.push(nextIds.uniref50[j]);
                    ids.uniref90.push(nextIds.uniref90[j]);
                }
            }
        }
        return ids;
    };

    var ids = nextLevel(data);
    if (idType) {
        if (idType == "uniref50")
            ids = ids.uniref50;
        else if (idType == "uniref90")
            ids = ids.uniref90;
        else
            ids = ids.uniprot;
        ids = Array.from(new Set(ids)); // Make unique
    }
    return ids;
}

function triggerDownload (imgURI) {
  var evt = new MouseEvent('click', {
    view: window,
    bubbles: false,
    cancelable: true
  });

  var a = document.createElement('a');
  a.setAttribute('download', 'MY_COOL_IMAGE.png');
  a.setAttribute('href', imgURI);
  a.setAttribute('target', '_blank');

  a.dispatchEvent(evt);
}

function commify(num) {
    return parseInt(num).toLocaleString();
}

// PUBLIC
function getColorForSunburstLevelFn() {
    var getKingdom = function (d) {
        // Root
        if (!d)
            return "";
        // Kingdom
        if (!d.theParent)
            return d.node;
        while (d.d > 1) // d.d ==== d.depth
           d = d.theParent;
        return d.node;
    };
    
    // From the sunbursts on http://pfam.xfam.org/
    var Colors = getColorList();

    var getColor = getColorFn(7);

    return function(d, depth) { // data object
        var K = getKingdom(d);
        // Root
        if (!K)
            return "gray";
        else if (K == "Root")
            return "white";
        if (typeof Colors[K] !== "undefined")
            return getColor(Colors[K], depth);
        else
            return "gray";
    };
}

function base64ToBlob(base64, mimetype, slicesize) {
    if (!window.atob || !window.Uint8Array) {
        // The current browser doesn't have the atob function. Cannot continue
        return null;
    }
    mimetype = mimetype || '';
    slicesize = slicesize || 512;
    var bytechars = atob(base64);
    var bytearrays = [];
    for (var offset = 0; offset < bytechars.length; offset += slicesize) {
        var slice = bytechars.slice(offset, offset + slicesize);
        var bytenums = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            bytenums[i] = slice.charCodeAt(i);
        }
        var bytearray = new Uint8Array(bytenums);
        bytearrays[bytearrays.length] = bytearray;
    }
    return new Blob(bytearrays, {type: mimetype});
}
















AppSunburst.prototype.attachToContainer = function(containerId) {
    this.container = $("#"+containerId);

    this.addSunburstDownloadWarning();
    this.addSunburstContainer();
    this.addSunburstDownloadDialogs();
    this.enableImageDownloadLinks();
};


AppSunburst.prototype.addSunburstDownloadWarning = function() {
    var block = `
        <div id="sunburst-fasta-download" title="Download Warning" style="display: none">
            <p>
                <span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>
                This download may take a long time.
            </p>
        </div>
    `;
    this.container.append(block);
}


AppSunburst.prototype.addSunburstContainer = function() {
    var block = `
                        <div class="modal-body text-center modal-sunburst" id="sunburst-chart-container" style="display: flex">
                            <div id="sunburst-chart" style="display: inline-block">
                            </div>
                            <div style="display: inline-block; align-self: flex-end" id="sunburst-chart-levels">
                            </div>
                            <div id="sunburst-progress-loader" class="progress-loader progress-loader-sm" style="display: none">
                                <i class="fas fa-spinner fa-spin"></i>
                            </div>
                        </div>
                        <div>
                            <div id="sunburst-rank" class="cluster-size cluster-size-sm">
                            </div>
                            <div id="sunburst-id-nums" class="cluster-size cluster-size-sm">
                            </div>
                            <div style="clear: both">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div class="mr-auto">
                                <div id="sunburst-download-text-container" style="display: none">
                                    <hr class="light">
                                    <div id="sunburst-download-text"></div>
                                </div>
                                <hr class="light">
                                <div class="p-2" id="sunburst-type-download-container" style="display: none">
                                    ID type: 
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="sunburstIdType" id="sunburst-id-type-uniprot" value="uniprot" checked>
                                        <label class="form-check-label" for="sunburst-id-type-uniprot">UniProt</label>
                                    </div>
                                    <div class="form-check form-check-inline" style="display: none" id="sunburst-id-type-uniref90-container">
                                        <input class="form-check-input" type="radio" name="sunburstIdType" id="sunburst-id-type-uniref90" value="uniref90">
                                        <label class="form-check-label" for="sunburst-id-type-uniref90">UniRef90</label>
                                    </div>
                                    <div class="form-check form-check-inline" style="display: none" id="sunburst-id-type-uniref50-container">
                                        <input class="form-check-input" type="radio" name="sunburstIdType" id="sunburst-id-type-uniref50" value="uniref50">
                                        <label class="form-check-label" for="sunburst-id-type-uniref50">UniRef50</label>
                                    </div>
                                </div>
                                <div id="sunburst-id-action-container">
                                    <button type="button" class="normal btn btn-default btn-secondary" data-toggle="tooltip" title="Download the UniProt IDs that are visible in the sunburst diagram" id="sunburst-download-ids">Prepare ID Download</button>
                                    <button type="button" class="normal btn btn-default btn-secondary mr-auto" data-toggle="tooltip" title="Download the FASTA sequences that are visible in the sunburst diagram" id="sunburst-download-fasta">Prepare FASTA Download</button>
                                    <button type="button" class="normal btn btn-default btn-secondary mr-auto" data-toggle="tooltip" title="Download PNG of the sunburst diagram" id="sunburst-download-png">Download PNG</button>
                                    <button type="button" class="normal btn btn-default btn-secondary mr-auto" data-toggle="tooltip" title="Download SVG of the sunburst diagram" id="sunburst-download-svg">Download SVG</button>
                                </div>
                            </div>
                        </div>
    `;
    this.container.append(block);
};


AppSunburst.prototype.addTransferAction = function(id, text, title, action) {
    if (typeof this.sbCurrentData.id === "undefined") {
        return;
    }

    var btn = $('<button type="button" class="normal btn btn-default btn-secondary mr-auto" data-toggle="tooltip" title="' + title + '" id="' + id + '">' + text + '</button>');
    btn.click(action);
    $("#sunburst-id-action-container").append(btn);
};


AppSunburst.prototype.addSunburstDownloadDialogs = function() {
    var block = `
            <div id="sunburst-download-modal" class="modal-body" style="display: none" tabindex="-1" role="dialog" style="margin-top: 200px">
                <div>
                    <h5 style="">Preparing Downloads</h5>
                    <button type="button" class="btn btn-primary" id="sunburst-download-btn"><a href="" id="sunburst-download-link">Download List</a></button><br><br>
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
            </div>
    `;
    this.container.append(block);
};

// Create an invisible download link and "click" it to trigger download
//   getData: function, either createPNG or createSVG
//   filename: what to set the link.download attribute to
AppSunburst.prototype.downloadPNG = function(renderPromise, filename) {
    renderPromise().then(dataURL => {
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        downloadLink.download = filename;
        downloadLink.click();
        downloadLink.remove();
    });
}

AppSunburst.prototype.downloadSVG = function(getData, filename) {
        const downloadLink = document.createElement('a');
        downloadLink.href = getData();
        downloadLink.download = filename;
        downloadLink.click();
        downloadLink.remove();
}

// Connect buttons for image download to downloadImage function
AppSunburst.prototype.enableImageDownloadLinks = function() {
    // create link for PNG - needs to be clicked twice to work for some reason
    const pngDownloadButton = document.getElementById("sunburst-download-png");
    pngDownloadButton.onclick = this.downloadPNG.bind(this, this.createPNG.bind(this), "taxonomy.png");

    // create link for SVG
    const svgDownloadButton = document.getElementById("sunburst-download-svg");
    svgDownloadButton.onclick = this.downloadSVG.bind(this, this.createSVG.bind(this), "taxonomy.svg");

}

// adjust some metadata & styling on a copy of the SVG before preparing for download
AppSunburst.prototype.fixSVG = function() {
    // The SVG created by the sunburst.js library uses some outdated attributes.
    // this function updates them, but also crucially adds a <style> section which
    // helps render the text properly. The stylesheet included here was pulled out
    // of the minified version of the library at 
    // https://github.com/EnzymeFunctionInitiative/sunburst/blob/main/web/js/sunburst-chart.min.js
    //
    // This is a hacky solution and it would be better to fix the library to properly include
    // the stylesheet
    const svgDoc = $("#sunburst-chart svg")[0];
    const svg = svgDoc.cloneNode(true);
    svg.removeAttribute("style");
    // svg.setAttribute("fill", "None");
    svg.setAttribute("width", "600px");
    svg.setAttribute("height", "600px");
    // https://stackoverflow.com/a/27077840
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // add the missing stylesheet if it is not there
    svgStyle = document.createElement("style");
    svgStyle.innerHTML = 
    `text {font-family: sans-serif;font-size: 12px;dominant-baseline: middle;text-anchor: middle;pointer-events: none;fill: #222;}.text-contour {fill: none;stroke: white;stroke-width: 5;stroke-linejoin: round;}.main-arc {stroke-width: 1px;}.hidden-arc {fill: none;}`;
    svg.prepend(svgStyle)
    return svg;
}

// convert SVG element into XML string
AppSunburst.prototype.serializeSVG = function() {
    // update some fields in the SVG definition to make it render correctly, see above
    const svg = this.fixSVG();

    // turns the embedded SVG object into a regular string
    svgData = new XMLSerializer().serializeToString(svg);
    // svgData = svgData.replace("xlink:href", "href");
    return svgData;
}

// convert serialized SVG element from XML to data URL
AppSunburst.prototype.createSVG = function() {
    // base64 encodes serialized version of SVG and prepends a header so that
    // browswers know what to do with it

    // Data header for a svg image: 
    const dataHeader = 'data:image/svg+xml;base64,';
    const imgBase64 = dataHeader + btoa(this.serializeSVG());

    return imgBase64;
}

// render a PNG of the diagram using a hidden HTML canvas element
AppSunburst.prototype.createPNG = function() {
    // uses an HTML canvas to convert the base64-encoded SVG into a PNG
    // result is a base64 encoded string which broswers know how to download 
    // into an image file
    const imgBase64 = this.createSVG();

    // store in an img to supply to the canvas
    const tempImg = new Image();
    tempImg.src = imgBase64;

    // use an html canvas to convert base64 encoded svg to PNG
    const svg = $("#sunburst-chart svg")[0];
    const canvas = document.createElement('canvas');
    canvas.width = 600//svg.clientWidth;
    canvas.height = 600//svg.clientHeight;
    ctx = canvas.getContext('2d');
    const renderPromise = new Promise((resolve) => {
        tempImg.onload = () => {
            ctx.drawImage(tempImg, 0, 0);
            const dataURL = canvas.toDataURL("image/png", 1)
            resolve(dataURL);
        };
        tempImg.remove();
        canvas.remove();
    });
    return renderPromise;
};
