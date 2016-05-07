
/** @license
 JSON Formatter | MIT License
 Copyright 2012 Callum Locke
 Permission is hereby granted, free of charge, to any person obtaining a copy of
 this software and associated documentation files (the "Software"), to deal in
 the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do
 so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

/*jshint eqeqeq:true, forin:true, strict:true */
/*global chrome, console */

var JsonFormatEntrance = (function () {

    "use strict";

    var jfContent,
        pre,
        jfStyleEl,
        slowAnalysisTimeout,
        port = JsonFormatDealer,
        startTime = +(new Date()),
        domReadyTime,
        isJsonTime,
        exitedNotJsonTime,
        displayedFormattedJsonTime
        ;

    // Add listener to receive response from BG when ready
    var dealTheMsg = function (msg) {
        // console.log('Port msg received', msg[0], (""+msg[1]).substring(0,30)) ;

        switch (msg[0]) {
            case 'NOT JSON' :
                pre.style.display = "";
                // console.log('Unhidden the PRE') ;
                jfContent.innerHTML = '<span class="x-json-tips">JSON不合法，请检查：</span>';
                exitedNotJsonTime = +(new Date());
                break;

            case 'FORMATTING' :
                isJsonTime = +(new Date());

                // Clear the slowAnalysisTimeout (if the BG worker had taken longer than 1s to respond with an answer to whether or not this is JSON, then it would have fired, unhiding the PRE... But now that we know it's JSON, we can clear this timeout, ensuring the PRE stays hidden.)
                clearTimeout(slowAnalysisTimeout);

                // Create toggleFormat button
                var buttonFormatted = document.createElement('button'),
                    buttonCollapseAll = document.createElement('button');
                buttonFormatted.id = 'buttonFormatted';
                buttonFormatted.innerText = '格式化';
                buttonFormatted.classList.add('selected');
                buttonCollapseAll.id = 'buttonCollapseAll';
                buttonCollapseAll.innerText = '折叠所有';

                var plainOn = false;
                buttonFormatted.addEventListener('click', function () {
                    // When formatted button clicked...
                    if (plainOn) {
                        plainOn = false;
                        pre.style.display = "none";
                        jfContent.style.display = "";
                        $(this).text('元数据');
                    }else{
                        plainOn = true;
                        pre.style.display = "";
                        jfContent.style.display = "none";
                        $(this).text('格式化');
                    }

                    $(this).parent().find('button').removeClass('selected');
                    $(this).addClass('selected');
                }, false);

                buttonCollapseAll.addEventListener('click', function () {
                    // 如果内容还没有格式化过，需要再格式化一下
                    if(plainOn) {
                        buttonFormatted.click();
                    }
                    // When collapaseAll button clicked...
                    if (!plainOn) {
                        if(buttonCollapseAll.innerText == '折叠所有'){
                            buttonCollapseAll.innerText = '展开所有';
                            collapse(document.getElementsByClassName('objProp'));
                        }else{
                            buttonCollapseAll.innerText = '折叠所有';
                            expand(document.getElementsByClassName('objProp'));
                        }

                        $(this).parent().find('button').removeClass('selected');
                        $(this).addClass('selected');
                    }
                }, false);


                // Attach event handlers
                document.addEventListener('click', generalClick, false);


                break;

            case 'FORMATTED' :
                // Insert HTML content
                jfContent.innerHTML = msg[1];

                displayedFormattedJsonTime = +(new Date());

                break;

            default :
                throw new Error('Message not understood: ' + msg[0]);
        }
    };

    var lastKvovIdGiven = 0;

    function collapse(elements) {
        var el, i, blockInner, count;

        for (i = elements.length - 1; i >= 0; i--) {
            el = elements[i];
            el.classList.add('collapsed');


            // Add a count of the number of child properties/items (if not already done for this item)
            if (!el.id) {
                el.id = 'kvov' + (++lastKvovIdGiven);

                // Find the blockInner
                blockInner = el.firstElementChild;
                while (blockInner && !blockInner.classList.contains('blockInner')) {
                    blockInner = blockInner.nextElementSibling;
                }
                if (!blockInner)
                    continue;

                // See how many children in the blockInner
                count = blockInner.children.length;

                // Generate comment text eg "4 items"
                var comment = count + (count === 1 ? ' item' : ' items');
                // Add CSS that targets it
                jfStyleEl.insertAdjacentHTML(
                    'beforeend',
                    '\n#kvov' + lastKvovIdGiven + '.collapsed:after{color: #aaa; content:" // ' + comment + '"}'
                );
            }
        }
    }

    function expand(elements) {
        for (var i = elements.length - 1; i >= 0; i--)
            elements[i].classList.remove('collapsed');
    }

    var mac = navigator.platform.indexOf('Mac') !== -1,
        modKey;
    if (mac)
        modKey = function (ev) {
            return ev.metaKey;
        };
    else
        modKey = function (ev) {
            return ev.ctrlKey;
        };

    function generalClick(ev) {

        if (ev.which === 1) {
            var elem = ev.target;

            if (elem.className === 'e') {
                // It's a click on an expander.

                ev.preventDefault();

                var parent = elem.parentNode,
                    div = jfContent,
                    prevBodyHeight = document.body.offsetHeight,
                    scrollTop = document.body.scrollTop,
                    parentSiblings
                    ;

                // Expand or collapse
                if (parent.classList.contains('collapsed')) {
                    // EXPAND
                    if (modKey(ev))
                        expand(parent.parentNode.children);
                    else
                        expand([parent]);
                }
                else {
                    // COLLAPSE
                    if (modKey(ev))
                        collapse(parent.parentNode.children);
                    else
                        collapse([parent]);
                }

                // Restore scrollTop somehow
                // Clear current extra margin, if any
                div.style.marginBottom = 0;

                // No need to worry if all content fits in viewport
                if (document.body.offsetHeight < window.innerHeight) {
                    // console.log('document.body.offsetHeight < window.innerHeight; no need to adjust height') ;
                    return;
                }

                // And no need to worry if scrollTop still the same
                if (document.body.scrollTop === scrollTop) {
                    // console.log('document.body.scrollTop === scrollTop; no need to adjust height') ;
                    return;
                }

                // The body has got a bit shorter.
                // We need to increase the body height by a bit (by increasing the bottom margin on the jfContent div). The amount to increase it is whatever is the difference between our previous scrollTop and our new one.

                // Work out how much more our target scrollTop is than this.
                var difference = scrollTop - document.body.scrollTop + 8; // it always loses 8px; don't know why

                // Add this difference to the bottom margin
                //var currentMarginBottom = parseInt(div.style.marginBottom) || 0 ;
                div.style.marginBottom = difference + 'px';

                // Now change the scrollTop back to what it was
                document.body.scrollTop = scrollTop;

                return;
            }
        }
    }

    var postMessage = function (msg) {
        dealTheMsg(msg);
    };

    var disconnect = function () {
    };

    var format = function (jsonStr) {

        // Send the contents of the PRE to the BG script
        // Add jfContent DIV, ready to display stuff
        jfContent = document.getElementById('jfContent');
        if (!jfContent) {
            jfContent = document.createElement('div');
            jfContent.id = 'jfContent';
            document.body.appendChild(jfContent);
        }
        jfContent.style.display = '';

        pre = document.getElementById('jfContent_pre');
        if (!pre) {
            pre = document.createElement('pre');
            pre.id = 'jfContent_pre';
            document.body.appendChild(pre);
        }
        pre.innerHTML = JSON.stringify(JSON.parse(jsonStr),null,4);
        pre.style.display = "none";

        jfStyleEl = document.getElementById('jfStyleEl');
        if (!jfStyleEl) {
            jfStyleEl = document.createElement('style');
            document.head.appendChild(jfStyleEl);
        }

        // Post the contents of the PRE
        port.postMessage({
            type:"SENDING TEXT",
            text:jsonStr,
            length:jsonStr.length
        });

    };

    var clear = function () {
        try {
            jfContent.innerHTML = '';
            pre.innerHTML = '';
        } catch (e) {

        }
    };

    return {
        format:format,
        clear:clear,
        postMessage:postMessage,
        disconnect:disconnect
    }
})();
