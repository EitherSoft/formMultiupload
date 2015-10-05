
"use strict";

if (!XMLHttpRequest.prototype.sendAsBinary) {
    XMLHttpRequest.prototype.sendAsBinary = function(sData) {
        var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
        for (var nIdx = 0; nIdx < nBytes; nIdx++) {
            ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
        }
        this.send(ui8Data);
    };
}


function AJAXSubmit(oFormElement) {

    var processForm;

    function ajaxSuccess () {
        removeLoader();
        addMessage(JSON.parse(this.responseText));
    }

    function submitData (oData) {
        /* the AJAX request... */
        var oAjaxReq = new XMLHttpRequest();
        oAjaxReq.submittedData = oData;
        oAjaxReq.onload = ajaxSuccess;
        if (oData.technique === 0) {
            /* method is GET */
            oAjaxReq.open("get", oData.receiver.replace(/(?:\?.*)?$/, oData.segments.length > 0 ? "?" + oData.segments.join("&") : ""), true);
            oAjaxReq.send(null);
        } else {
            /* method is POST */
            oAjaxReq.open("post", oData.receiver, true);
            if (oData.technique === 3) {
                /* enctype is multipart/form-data */
                var sBoundary = "---------------------------" + Date.now().toString(16);
                oAjaxReq.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary + "; charset=utf-8");
                oAjaxReq.sendAsBinary("--" + sBoundary + "\r\n" + oData.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n");
            } else {
                /* enctype is application/x-www-form-urlencoded or text/plain */
                oAjaxReq.setRequestHeader("Content-Type", oData.contentType+ "; charset=utf-8");
                oAjaxReq.send(oData.segments.join(oData.technique === 2 ? "\r\n" : "&"));
            }
        }
    }

    function processStatus (oData) {
        if (oData.status > 0) { return; }
        addLoader();
        submitData(oData);
    }

    function pushSegment (oFREvt) {
        this.owner.segments[this.segmentIdx] += oFREvt.target.result + "\r\n";
        this.owner.status--;
        processStatus(this.owner);
    }

    function plainEscape (sText) {
        /* how should I treat a text/plain form encoding? what characters are not allowed? this is what I suppose...: */
        /* "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2" */
        return sText.replace(/[\s\=\\]/g, "\\$&");
    }

    function SubmitRequest (oTarget) {
        var nFile, sFieldType, oField, oSegmReq, oFile, bIsPost = oTarget.method.toLowerCase() === "post";
        /* console.log("AJAXSubmit - Serializing form..."); */
        this.contentType = bIsPost && oTarget.enctype ? oTarget.enctype : "application\/x-www-form-urlencoded";
        this.technique = bIsPost ? this.contentType === "multipart\/form-data" ? 3 : this.contentType === "text\/plain" ? 2 : 1 : 0;
        this.receiver = oTarget.action;
        this.status = 0;
        this.segments = [];
        var fFilter = this.technique === 2 ? plainEscape : escape;
        for (var nItem = 0; nItem < oTarget.elements.length; nItem++) {
            oField = oTarget.elements[nItem];
            if (!oField.hasAttribute("name")) { continue; }
            sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
            if (sFieldType === "FILE" && oField.files.length > 0) {
                if (this.technique === 3) {
                    /* enctype is multipart/form-data */
                    for (nFile = 0; nFile < oField.files.length; nFile++) {
                        oFile = oField.files[nFile];
                        oSegmReq = new FileReader();
                        /* (custom properties:) */
                        oSegmReq.segmentIdx = this.segments.length;
                        oSegmReq.owner = this;
                        /* (end of custom properties) */
                        oSegmReq.onload = pushSegment;
                        this.segments.push("Content-Disposition: form-data; name=\"" + oField.name + "\"; filename=\""+ oFile.name + "\"\r\nContent-Type: " + oFile.type + "\r\n\r\n");
                        this.status++;
                        oSegmReq.readAsBinaryString(oFile);
                    }
                } else {
                    /* enctype is application/x-www-form-urlencoded or text/plain or method is GET: files will not be sent! */
                    for (nFile = 0; nFile < oField.files.length; this.segments.push(fFilter(oField.name) + "=" + fFilter(oField.files[nFile++].name)));
                }
            } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                /* field type is not FILE or is FILE but is empty */
                this.segments.push(
                    this.technique === 3 ? /* enctype is multipart/form-data */
                    "Content-Disposition: form-data; name=\"" + oField.name + "\"\r\n\r\n" + encodeURIComponent(oField.value) + "\r\n"
                        : /* enctype is application/x-www-form-urlencoded or text/plain or method is GET */
                    fFilter(oField.name) + "=" + fFilter(oField.value)
                );
            }
        }

        processStatus(this);
    }


    function addLoader() {
        var loaderContainer = document.createElement("div");
        loaderContainer.className = 'loader';
        var loader = document.createElement("i");
        loader.className = 'fa fa-spinner fa-pulse';
        loaderContainer.appendChild(loader);
        processForm.appendChild(loaderContainer);
        processForm.className = processForm.className + " processing";
    }

    function removeLoader() {
        var loader = processForm.getElementsByClassName('loader');
        processForm.removeChild(loader[0]);
    }

    function addMessage(response) {
        var oldMessage = processForm.getElementsByClassName('alert');
        if(oldMessage.length) {
            processForm.removeChild(oldMessage[0]);
        }

        var messageContainer = document.createElement("div");
        var messageText = '';

        if(response.success) {
            messageContainer.className = 'alert alert-success';
            messageText = response.success
        }

        if (response.error) {
            var newLine = '';
            if(response.success) { newLine = '<br/>'; }
            messageContainer.className = 'alert alert-danger'
            messageText = messageText + newLine + response.error;
        }
        if(response.success && !response.error) {
            processForm.className = processForm.className + " processed";
        }
        messageContainer.setAttribute("role", "alert");
        messageContainer.innerHTML = '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + messageText;
        processForm.insertBefore(messageContainer, processForm.firstChild);

    }

    function hasClass(element, cls) {
        return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
    }

    oFormElement.setAttribute("action", WPURLS.siteurl + "/ajaxForm.php");
    processForm = oFormElement;
    var submitButton = processForm.getElementsByTagName("button");

    submitButton = submitButton[submitButton.length-1];
    if((' ' + submitButton.className + ' ').indexOf(' ' + 'disabled' + ' ') < 0) {
        new SubmitRequest(oFormElement);
    }

}