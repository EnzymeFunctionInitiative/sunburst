
////////////////////////////////////////////////////////////////////////////////////////////////////
// SUNBURST
//

function AppSunburst(apiId, apiKey, apiExtra, appUnirefVersion, scriptAppDir, hasUniref = false) {
    this.apiId = apiId;
    this.apiKey = apiKey;
    this.apiExtra = apiExtra;
    this.appUnirefVersion = appUnirefVersion;
    this.hasUniref = hasUniref;
    this.scriptAppDir = scriptAppDir;
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
        url: that.scriptAppDir + "/get_tax_data.php",
        data: parms,
        success: function(jsonData) {
            if (typeof(jsonData.valid) !== "undefined" && jsonData.valid == "false") {
                //TODO: handle error
                alert(jsonData.message);
                progress.stop();
                if (typeof onFinishedFn === "function")
                    onFinishedFn();
            } else {
                that.addSunburstFeature(jsonData.data.data);
                progress.stop();
            }
        },
        error: function(jsonData, exception) {
            console.log("AJAX error: " + exception);
            progress.stop();
        }
    });
};


AppSunburst.prototype.addSunburstFeature = function(treeData) {

    var idTypeStr = this.appUnirefVersion ? "UniRef"+this.appUnirefVersion : "UniProt";
    var that = this;
    var Colors = getSunburstColorFn(); // from sunburst_helpers.js

    addParentRef(treeData, null);

    var addCurViewNumSeq = function() {
        if (!that.sbCurrentData)
            return;
        var numUniProt = commify(that.sbCurrentData.numSequences);
        var idStr = that.sbCurrentData.numSequences > 1 ? "IDs" : "ID";
        $("#sunburst-id-nums").text(numUniProt + " " + idTypeStr + " " + idStr + " visible");
    };

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

    var showTaxLevels = function(data) {
        $("#sunburst-chart-levels").empty();
        for (var i = data.depth; i < maxDepth; i++) {
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
        .size("numSpecies")
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


    if (this.appUnirefVersion === 90) {
        $("#sunburst-id-type-uniref90-container").show();
    }
    if (this.appUnirefVersion === 50 || this.hasUniref) {
        $("#sunburst-id-type-uniref50-container").show();
        $("#sunburst-id-type-uniref90-container").show();
    }
    if (this.appUnirefVersion !== false || this.hasUniref) {
        $("#sunburst-type-download-container").show();
    }

    $("#sunburst-download-ids").click(function() {
        var idType = getIdType();
        var ids = getIdsFromTree(that.sbCurrentData, idType);
        console.log(ids);
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

    var form = $('<form method="POST" action="' + that.scriptAppDir + '/get_sunburst_fasta.php"></form>');
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

    //var parms = {
    //    id: that.apiId,
    //    key: that.apiKey,
    //    o: fixedNodeName,
    //    ids: jsIds,
    //    it: idType,
    //    type: "jquery"
    //};

    // html5 type
    //var ajax = new XMLHttpRequest();
    //ajax.onreadystatechange = function() {
    //    if (ajax.readyState === 4 && ajax.status === 200) {
    //        var dummy = document.createElement("a");
    //        var json = JSON.decode(ajax.response);
    //        var blob = base64ToBlob(.data, ajax.response.download.mimetype);
    //        var url = window.URL.createObjectUrl(blob);
    //        dummy.href = url;
    //        dummy.download = ajax.response.download.filename;
    //        dummy.style.display = "none";
    //        dummy.click();
    //        window.URL.revokeObjectUrl(url);
    //    }
    //};
    //ajax.open("POST", that.scriptAppDir + "/get_sunburst_fasta.php");
    //ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    //ajax.responseType = "text";
    //ajax.send(JSON.stringify(parms));
    //ajax.addEventListener("readystatechange", function() {
    //    if (ajax.readyState === XMLHttpRequest.DONE) {
    //        progress.stop();
    //    }
    //});

    // ajax type
    //$.ajax({
    //    type: "POST",
    //    dataType: "json",
    //    url: that.scriptAppDir + "/get_sunburst_fasta.php",
    //    data: parms,
    //    success: function(data) {
    //        //progress.stop();
    //    }
    //});
};


function getIdsFromTree(data, idType) {
    var nextLevel = function(level) {
        var ids = [];
        // Bottom level
        if (typeof level.sequences !== "undefined") {
            for (var i = 0; i < level.sequences.length; i++) {
                var id = idType == "uniref50" ? level.sequences[i].sa50 : (idType == "uniref90" ? level.sequences[i].sa90 : level.sequences[i].seqAcc);
                //ids.push(level.sequences[i].seqAcc);
                ids.push(id);
            }
        } else {
            for (var i = 0; i < level.children.length; i++) {
                var nextIds = nextLevel(level.children[i]);
                for (var j = 0; j < nextIds.length; j++) {
                    ids.push(nextIds[j]);
                }
            }
        }
        return ids;
    };

    var ids = nextLevel(data);
    ids = Array.from(new Set(ids)); // Make unique
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
        while (d.depth > 1)
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
                            <div id="sunburst-id-nums" class="cluster-size cluster-size-sm float-right">
                            </div>
                            <div style="clear: both">
                                Click on a region to zoom into that part of the taxonomic hierarchy.  Clicking on the
                                center circle will zoom out to the next highest level.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div class="mr-auto">
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
                                <div>
                                    <button type="button" class="normal btn btn-default btn-secondary" data-toggle="tooltip" title="Download the UniProt IDs that are visible in the sunburst diagram" id="sunburst-download-ids">Prepare ID Download</button>
                                    <button type="button" class="normal btn btn-default btn-secondary mr-auto" data-toggle="tooltip" title="Download the FASTA sequences that are visible in the sunburst diagram" id="sunburst-download-fasta">Prepare FASTA Download</button>
                                    <!--<button type="button" class="btn btn-default mr-auto" data-toggle="tooltip" title="Download a SVG file of the sunburst diagram" id="sunburst-svg">Download SVG</button>-->
                                </div>
                            </div>
                        </div>
    `;
    this.container.append(block);
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



