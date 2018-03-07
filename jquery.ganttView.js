/*
jQuery.ganttView v.0.8.8
Copyright (c) 2010 JC Grubbs - jc.grubbs@devmynd.com
MIT License Applies
*/

/*
Options
-----------------
showWeekends: boolean
data: object
cellWidth: number
cellHeight: number
slideWidth: number
groupBySeries: boolean
groupById: boolean
groupByIdDrawAllTitles: boolean
dataUrl: string
behavior: {
    clickable: boolean,
    draggable: boolean,
    resizable: boolean,
    onClick: function,
    onDrag: function,
    onResize: function
}
*/

(function (jQuery) {

    jQuery.fn.ganttView = function () {
        var args = Array.prototype.slice.call(arguments);
        
        if (args.length == 1 && typeof(args[0]) == "object") {
            build.call(this, args[0]);
        }
        
        if (args.length == 2 && typeof(args[0]) == "string") {
            handleMethod.call(this, args[0], args[1]);
        }
    };
    
    function build(options) {
        var els = this;
        var defaults = {
            showWeekends: true,
            dateChunks: 1, //default to day
            cellWidth: 21,
            cellHeight: 31,
            slideWidth: 400,
            groupBySeries: false,
            groupById: false,
            groupByIdDrawAllTitles: false,
            vHeaderWidth: 100,
            behavior: {
                clickable: true,
                draggable: true,
                resizable: true
            }
        };
        
        var opts = jQuery.extend(true, defaults, options);

        if (opts.data) {
            opts.data.forEach(function (feature) {
                if (feature.series) {
                    let prevEnd;
                    feature.series.forEach(function (item) {
                        if (!prevEnd) {
                            prevEnd = Date.parse(item.end);
                        }
                        else if (item.start < prevEnd) {
                            var start = Date.parse(item.start);
                            var end = Date.parse(item.end);
                            var timeDiff = prevEnd - start;

                            item.start = prevEnd;
                            item.end = new Date(end.getTime() + timeDiff);

                            prevEnd = end;
                        }
                    });
                }
            });

            build();
        } else if (opts.dataUrl) {
            jQuery.getJSON(opts.dataUrl, function (data) { opts.data = data; build(); });
        }
        
        function build() {
            var minDays = Math.floor((opts.slideWidth / opts.cellWidth)  + 5);
            var startEnd = DateUtils.getBoundaryDatesFromData(opts.data, minDays);
            opts.start = startEnd[0];
            opts.end = startEnd[1];

            els.each(function () {
                var container = jQuery(this);
                var div = jQuery("<div>", { "class": "ganttview" });

                new Chart(div, opts).render();

                container.append(div);

                var w = jQuery("div.ganttview-vtheader", container).outerWidth() +
                        jQuery("div.ganttview-slide-container", container).outerWidth();

                container.css("width", (w + 2) + "px");

                new Behavior(container, opts).apply();
            });
        }
    }

    function handleMethod(method, value) {
        if (method == "setSlideWidth") {
            var div = $("div.ganttview", this);
            div.each(function () {
                var vtWidth = $("div.ganttview-vtheader", div).outerWidth();
                $(div).width(vtWidth + value + 1);
                $("div.ganttview-slide-container", this).width(value);
            });
        }
    }

    var Chart = function(div, opts) {

        function render() {

            addVtHeader(div, opts.data, opts.cellHeight, opts.groupBySeries, opts.groupById, opts.groupByIdDrawAllTitles);

            var slideDiv = jQuery("<div>", {
                "class": "ganttview-slide-container",
                "css": { "width": opts.slideWidth + "px" }
            });
            
            dates = getDates(opts.start, opts.end);

            addHzHeader(slideDiv, dates, opts.dateChunks, opts.cellWidth);
            addGrid(slideDiv, opts.data, dates, opts.dateChunks, opts.cellWidth, opts.cellHeight, opts.showWeekends, opts.groupBySeries, opts.groupById, opts.groupByIdDrawAllTitles);
            addBlockContainers(slideDiv, opts.data, opts.cellHeight, opts.groupBySeries, opts.groupById, opts.groupByIdDrawAllTitles);
            addBlocks(slideDiv, opts.data, opts.dateChunks, opts.cellWidth, opts.cellHeight, opts.start, opts.groupBySeries, opts.groupById, opts.groupByIdDrawAllTitles);
            div.append(slideDiv);
            applyLastClass(div.parent());
        }
        
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Creates a 3 dimensional array [year][month][day] of every day 
        // between the given start and end dates
        function getDates(start, end) {
            var dates = [];
            dates[start.getFullYear()] = [];
            dates[start.getFullYear()][start.getMonth()] = [start]
            var last = start;

            while (last.compareTo(end) == -1) {
                var next = last.clone().addDays(1);
                if (!dates[next.getFullYear()]) { dates[next.getFullYear()] = []; }

                if (!dates[next.getFullYear()][next.getMonth()]) { 
                    dates[next.getFullYear()][next.getMonth()] = []; 
                }

                dates[next.getFullYear()][next.getMonth()].push(next);
                last = next;
            }

            return dates;
        }

        function addVtHeader(div, data, cellHeight, groupBySeries, groupById, groupByIdDrawAllTitles) {
            var listId = {};
            var rowIdx = 1;
            var headerDiv = jQuery("<div>", { "class": "ganttview-vtheader" });
            for (var i = 0; i < data.length; i++)
            {
                if(groupBySeries)
                {
                    var id = "" + data[i].id;
                    if(groupById && id.length > 0)
                    {
                       if(typeof listId[ id ] == "undefined")
                       {
                            var itemDiv = jQuery("<div>", { "class": "ganttview-vtheader-item" });
                            itemDiv.append(jQuery("<div>", {
                                "class": "ganttview-vtheader-item-name",
                                "css": { "height": cellHeight + "px" }
                            }).append(data[i].name));
                            var seriesDiv = jQuery("<div>", { "class": "ganttview-vtheader-series" });
                            var serieNames = new Array();
                            for (var j = 0; j < data[i].series.length; j++)
                            {
                                serieNames.push(data[i].series[j].name);
                            }
                            seriesDiv.append(jQuery("<div>", { "class": "ganttview-vtheader-series-name" }).append(serieNames.join(', ')));
                            itemDiv.append(seriesDiv);
                            headerDiv.append(itemDiv);

                            listId[ id ] = rowIdx;

                            rowIdx ++;
                        }
                        else
                        {
                            if(groupByIdDrawAllTitles)
                            {
                                var localCellHeight = cellHeight;
                                var itemDiv = headerDiv.children(':nth-child('+listId[ id ]+')');
                                localCellHeight = cellHeight * (itemDiv.find('.ganttview-vtheader-item-name > br').length + 1);
                                itemDiv.find('.ganttview-vtheader-item-name').append('<br />'+data[i].name).css('height', localCellHeight);

                                var serieNames = new Array();
                                for (var j = 0; j < data[i].series.length; j++)
                                {
                                    serieNames.push(data[i].series[j].name);
                                }

                                itemDiv.find('.ganttview-vtheader-series-name').append('<br />'+serieNames.join(', ')).css('height', localCellHeight);
                            }
                        }
                    }
                    else
                    {
                        var itemDiv = jQuery("<div>", { "class": "ganttview-vtheader-item" });
                        itemDiv.append(jQuery("<div>", {
                            "class": "ganttview-vtheader-item-name",
                            "css": { "height": cellHeight + "px" }
                        }).append(data[i].name));
                        var seriesDiv = jQuery("<div>", { "class": "ganttview-vtheader-series" });
                        var serieNames = new Array();
                        for (var j = 0; j < data[i].series.length; j++)
                        {
                            serieNames.push(data[i].series[j].name);
                        }
                        seriesDiv.append(jQuery("<div>", { "class": "ganttview-vtheader-series-name" }).append(serieNames.join(', ')));
                        itemDiv.append(seriesDiv);
                        headerDiv.append(itemDiv);
                    }
                }
                else
                {
                    var itemDiv = jQuery("<div>", { "class": "ganttview-vtheader-item" });
                    itemDiv.append(jQuery("<div>", {
                        "class": "ganttview-vtheader-item-name",
                        "css": { "height": (data[i].series.length * cellHeight) + "px" }
                    }).append(data[i].name));
                    var seriesDiv = jQuery("<div>", { "class": "ganttview-vtheader-series" });
                    for (var j = 0; j < data[i].series.length; j++)
                    {
                        seriesDiv.append(jQuery("<div>", { "class": "ganttview-vtheader-series-name" })
                            .append(data[i].series[j].name));
                    }
                    itemDiv.append(seriesDiv);
                    headerDiv.append(itemDiv);
                }
            }
            div.append(headerDiv);
        }

        function addHzHeader(div, dates, dateChunks, cellWidth) {
            var headerDiv = jQuery("<div>", { "class": "ganttview-hzheader" });
            var monthsDiv = jQuery("<div>", { "class": "ganttview-hzheader-months" });
            var daysDiv = jQuery("<div>", { "class": "ganttview-hzheader-days" });
            var chunksDiv = jQuery("<div>", { "class": "ganttview-hzheader-chunks" });
            var totalW = 0;

            for (var y in dates) {
                mCount = 0;
                dates[y].forEach(function (m) {
                    var w = m.length * cellWidth * dateChunks;
                    totalW = totalW + w;
                    monthsDiv.append(jQuery("<div>", {
                        "class": "ganttview-hzheader-month",
                        "css": { "width": (w - 1) + "px" }
                    }).append(monthNames[mCount] + "/" + y));

                    dCount = 1;

                    m.forEach(function (d) {
                        daysDiv.append(jQuery("<div>", { 
                            "class": "ganttview-hzheader-day",
                            "css": { "width": (cellWidth*dateChunks - 1) + "px" }
                        }).append(dCount));

                        if(dateChunk > 1){
                            let hourMark = Math.parseInt(24/dateChunk);

                            for(var dateChunk=0; dateChunk < dateChunks; ++dateChunk){
                                if (dateChunk%hourMark != 0){
                                    chunksDiv.append(jQuery("<div>", {
                                        "class": "ganttview-hzheader-chunk",
                                        "css": { "width": (cellWidth) + "px" }
                                    }) )
                                }
                                else {
                                    chunksDiv.append(jQuery("<div>", {
                                        "class": "ganttview-hzheader-chunk",
                                        "css": { "width": (cellWidth) + "px" }
                                    }).append(dateChunk));
                                }
                            }
                        }

                        ++dCount;
                    })
                    ++mCount;
                })
            }

            monthsDiv.css("width", totalW + "px");
            daysDiv.css("width", totalW + "px");
            chunksDiv.css("width", totalW + "px");
            headerDiv.append(monthsDiv).append(daysDiv).append(chunksDiv);
            div.append(headerDiv);
        }

        function addGrid(div, data, dates, dateChunks, cellWidth, cellHeight, showWeekends, groupBySeries, groupById, groupByIdDrawAllTitles) {
            var gridDiv = jQuery("<div>", { "class": "ganttview-grid" });
            var rowDiv = jQuery("<div>", { "class": "ganttview-grid-row" }).css('height', cellHeight);
            for (var y in dates) {
                for (var m in dates[y]) {
                    for (var d in dates[y][m]) {
                        let isWeekendBool = showWeekends && DateUtils.isWeekend(dates[y][m][d]);
                        
                        for (var dateChunk = 0; dateChunk < dateChunks; ++dateChunk){
                            var cellDiv = jQuery("<div>", { "class": "ganttview-grid-row-cell" });
                            if (isWeekendBool) { 
                                cellDiv.addClass("ganttview-weekend"); 
                            }
                            rowDiv.append(cellDiv);
                        }
                    }
                }
            }

            var rowIdx = 1;
            var listId = {};
            var w = jQuery("div.ganttview-grid-row-cell", rowDiv).length * cellWidth;
            rowDiv.css("width", w + "px");
            gridDiv.css("width", w + "px");
            for (var i = 0; i < data.length; i++)
            {
                if(groupBySeries)
                {
                    var id = "" + data[i].id;
                    if(groupById && id.length > 0)
                    {
                       if(typeof listId[ id ] === 'undefined')
                       {
                           gridDiv.append(rowDiv.clone());

                           listId[ id ] = {index: rowIdx, cnt: 0};

                           rowIdx ++;
                       }
                       else
                       {
                         if(groupByIdDrawAllTitles)
                         {
                           listId[ id ].cnt ++;
                           var itemRowDiv = gridDiv.children(':nth-child('+listId[ id ].index+')');
                           itemRowDiv.css('height', listId[ id ].cnt * cellHeight);
                           }
                       }
                   }
                   else
                   {
                       gridDiv.append(rowDiv.clone());
                   }
               }
               else
               {
                    for (var j = 0; j < data[i].series.length; j++)
                    {
                        gridDiv.append(rowDiv.clone());
                    }
                }
            }
            div.append(gridDiv);
        }

        function addBlockContainers(div, data, cellHeight, groupBySeries, groupById, groupByIdDrawAllTitles) {
            var rowIdx = 1;
            var listId = {};
            var blocksDiv = jQuery("<div>", { "class": "ganttview-blocks" });
            for (var i = 0; i < data.length; i++)
            {
                if(groupBySeries)
                {
                    var id = "" + data[i].id;
                    if(groupById && id.length > 0)
                    {
                        if(typeof listId[ id ] === 'undefined')
                        {
                            blocksDiv.append(jQuery("<div>", { "class": "ganttview-block-container" }));                         
                            listId[ id ] = {index: rowIdx, cnt: 0};
                            rowIdx ++;
                        }

                        else
                        {
                            if(groupByIdDrawAllTitles)
                            {
                                listId[ id ].cnt ++;
                                var itemBlockDiv = blocksDiv.children(':nth-child('+listId[ id ].index+')');
                                itemBlockDiv.css('height', listId[ id ].cnt * cellHeight - 3);
                            }
                        }
                    }

                    else
                    {
                        blocksDiv.append(jQuery("<div>", { "class": "ganttview-block-container" }));
                    }
                }
                else
                {
                    for (var j = 0; j < data[i].series.length; j++)
                    {
                        blocksDiv.append(jQuery("<div>", { "class": "ganttview-block-container" }));
                    }
                }
            }
            div.append(blocksDiv);
        }

        function addBlocks(div, data, dateChunks, cellWidth, cellHeight, start, groupBySeries, groupById, groupByIdDrawAllTitles) {
            var listId = {};
            var rows = jQuery("div.ganttview-blocks div.ganttview-block-container", div);
            var rowIdx = 0;

            for (var i = 0; i < data.length; i++)
            {
                if(groupBySeries)
                {
                    var id = "" + data[i].id;
                    if(groupById && id.length > 0)
                    {
                       if(typeof listId[ id ] == "undefined")
                        {
                            for (var j = 0; j < data[i].series.length; j++)
                            {
                                var series = data[i].series[j];
                                var size = (DateUtils.daysBetween(series.start, series.end) + 1) * dateChunks;
                                var offset = DateUtils.daysBetween(start, series.start)*dateChunks;
                                var block = jQuery("<div>", {
                                  "class": "ganttview-block",
                                  "title": series.name + ", " + size/dateChunks + " hrs",
                                  "css": {
                                      "height": (parseInt(jQuery(rows[rowIdx]).css('height'), 10) - 4) + "px",
                                      "width": ((size * cellWidth) - 9) + "px",
                                      "margin-left": ((offset * cellWidth) + 3) + "px",
                                      "top": 0
                                    }
                                });
                                addBlockData(block, data[i], series);
                                if (data[i].series[j].color) {
                                    block.css("background-color", data[i].series[j].color);
                                }
                                block.append(jQuery("<div>", { "class": "ganttview-block-text" }).text(size/dateChunks));
                                jQuery(rows[rowIdx]).append(block);
                            }

                            listId[ id ] = rowIdx;

                            rowIdx = rowIdx + 1;
                        }
                        else
                        {
                            for (var j = 0; j < data[i].series.length; j++)
                            {
                                var series = data[i].series[j];
                                var size = (DateUtils.daysBetween(series.start, series.end) + 1) * dateChunks;
                                var offset = DateUtils.daysBetween(start, series.start)*dateChunks;
                                var block = jQuery("<div>", {
                                  "class": "ganttview-block",
                                  "title": series.name + ", " + size/dateChunks + " days",
                                  "css": {
                                      "height": (parseInt(jQuery(rows[ listId[ id ] ]).css('height'), 10) - 4) + "px",
                                      "width": ((size * cellWidth) - 9) + "px",
                                      "margin-left": ((offset * cellWidth) + 3) + "px",
                                      "top": 0
                                    }
                                });
                                addBlockData(block, data[i], series);
                                if (data[i].series[j].color) {
                                    block.css("background-color", data[i].series[j].color);
                                }
                                block.append(jQuery("<div>", { "class": "ganttview-block-text" }).text(size/dateChunks));
                                jQuery(rows[ listId[ id ] ]).append(block);
                            }
                        }
                    }
                    else
                    {
                        for (var j = 0; j < data[i].series.length; j++)
                        {
                            var series = data[i].series[j];
                            var size = (DateUtils.daysBetween(series.start, series.end) + 1) * dateChunks;
                            var offset = DateUtils.daysBetween(start, series.start)*dateChunks;
                            var block = jQuery("<div>", {
                              "class": "ganttview-block",
                              "title": series.name + ", " + size/dateChunks + " days",
                              "css": {
                                  "height": (parseInt(jQuery(rows[rowIdx]).css('height'), 10) - 4) + "px",
                                  "width": ((size * cellWidth) - 9) + "px",
                                  "margin-left": ((offset * cellWidth) + 3) + "px",
                                  "top": 0,
                              }
                            });
                            addBlockData(block, data[i], series);
                            if (data[i].series[j].color) {
                                block.css("background-color", data[i].series[j].color);
                            }
                            block.append(jQuery("<div>", { "class": "ganttview-block-text" }).text(size/dateChunks));
                            jQuery(rows[rowIdx]).append(block);
                        }
                        rowIdx = rowIdx + 1;
                    }
                }
                else
                {
                    for (var j = 0; j < data[i].series.length; j++)
                    {
                        var series = data[i].series[j];
                        var size = DateUtils.daysBetween(series.start, series.end) + 1;
                        var offset = DateUtils.daysBetween(start, series.start);
                        var block = jQuery("<div>", {
                            "class": "ganttview-block",
                            "title": series.name + ", " + size + " days",
                            "css": {
                                "height": (parseInt(jQuery(rows[rowIdx]).css('height'), 10) - 4) + "px",
                                "width": ((size * cellWidth) - 9) + "px",
                                "margin-left": ((offset * cellWidth) + 3) + "px",
                                "top": "0px"
                            }
                        });
                        addBlockData(block, data[i], series);
                        if (data[i].series[j].color) {
                            block.css("background-color", data[i].series[j].color);
                        }
                        block.append(jQuery("<div>", { "class": "ganttview-block-text" }).text(size));
                        jQuery(rows[rowIdx]).append(block);
                        rowIdx = rowIdx + 1;
                    }
                }
            }
        }

        function addBlockData(block, data, series) {
            // This allows custom attributes to be added to the series data objects
            // and makes them available to the 'data' argument of click, resize, and drag handlers
            var blockData = { id: data.id, name: data.name };
            jQuery.extend(blockData, series);
            block.data("block-data", blockData);
        }

        function applyLastClass(div) {
            jQuery("div.ganttview-grid-row div.ganttview-grid-row-cell:last-child", div).addClass("last");
            jQuery("div.ganttview-hzheader-days div.ganttview-hzheader-day:last-child", div).addClass("last");
            jQuery("div.ganttview-hzheader-months div.ganttview-hzheader-month:last-child", div).addClass("last");
        }
            
        return {
            render: render
        };
    }

    var Behavior = function (div, opts) {

        function apply() {

            if (opts.behavior.clickable) { 
                bindBlockClick(div, opts.behavior.onClick); 
            }
            
            if (opts.behavior.resizable) { 
                bindBlockResize(div, opts.dateChunks, opts.cellWidth, opts.start, opts.behavior.onResize); 
            }
            
            if (opts.behavior.draggable) { 
                bindBlockDrag(div, opts.dateChunks, opts.cellWidth, opts.start, opts.behavior.onDrag); 
            }
        }

        function bindBlockClick(div, callback) {
            jQuery("div.ganttview-block", div).live("click", function () {
                if (callback) { callback(jQuery(this).data("block-data")); }
            });
        }
        
        function bindBlockResize(div, dateChunks, cellWidth, startDate, callback) {
            jQuery("div.ganttview-block", div).resizable({
                grid: cellWidth, 
                handles: "e",
                stop: function () {
                    var block = jQuery(this);

                    var container = jQuery("div.ganttview-slide-container", div);
                    var scroll = container.scrollLeft();
                    var offset = block.offset().left - container.offset().left - 1 + scroll;

                    updateDataAndPosition(offset, block, dateChunks, cellWidth, startDate);
                    if (callback) { callback(block.data("block-data")); }
                }
            });
        }
        
        function bindBlockDrag(div, dateChunks, cellWidth, startDate, callback) {
            jQuery("div.ganttview-block", div).draggable({
                axis: "x", 
                grid: [cellWidth, cellWidth],
                stop: function () {
                    var block = jQuery(this);

                    console.log(this);

                    var container = jQuery("div.ganttview-slide-container", div);
                    var scroll = container.scrollLeft();
                    var offset = block.offset().left - container.offset().left - 1 + scroll;

                    updateDataAndPosition(offset, block, dateChunks, cellWidth, startDate);
                    if (callback) { callback(block.data("block-data")); }
                }
            });
        }
        
        function updateDataAndPosition(offset, block, dateChunks, cellWidth, startDate) {
            var parent = block[0].parentElement;
            var childElementCount = parent.childElementCount;
            var index;

            let i=0;

            while (!index && i<childElementCount){
                if(parent.childNodes[i] == block[0]){
                    index = i;
                }
                ++i;
            }

            // console.log(block);

            // Set new start date
            var dayInMS = 86400000;
            var chunkInMS = dayInMS/dateChunks;

            var chunksFromStart = Math.round(offset / cellWidth);
            var newStart = new Date(startDate.getTime() + (chunksFromStart*chunkInMS));

            // Set new end date
            var width = block.outerWidth();
            var chunksFromStartToEnd = parseInt(width / cellWidth);
            var newEnd = new Date(newStart.clone().getTime() + (chunksFromStartToEnd*chunkInMS));

            //updateDataAndPosition for next element in series
            //nextSibling, nextElementSibling, 
            //offsetParent.childNodes, offsetParent.children, offsetParent.lastChild, offsetParent.lastElementChild
            //parentElement.childNodes, parentElement.children, parentElement.lastChild, parentElement.lastElementChild
            //parentNode.childNodes, parentNode.children, parentNode.lastChild, parentNode.lastElementChild

            block.data("block-data").start = newStart;
            block.data("block-data").end = newEnd;

            jQuery("div.ganttview-block-text", block).text(chunksFromStartToEnd/dateChunks + 1);

            

            //if previousSibling update?
            //if nextSibling
            if(index < childElementCount-1){
                // var newBlock = block.clone();
                // newBlock[0] = block.parent().children()[index+1];
                // newBlock.context = block.parent().children()[index+1];

                // var parents = ["offsetParent", "parentElement", "parentNode"];
                // var children = ["childNodes", "children"];
                // var lastChildren = ["lastChild", "lastElementChild"];

                // var updatedChild = 
                updateDataAndPosition(offset + width, jQuery(block.parent().children()[index+1]), dateChunks, cellWidth, newEnd);

                // for (var p in parents) {
                //     for (var c in children) {
                //         parent[parents[p]][children[c]][index + 1] = updatedChild[0];
                //         block.context[parents[p]][children[c]][index + 1] = updatedChild[0];
                //     }

                //     for (var lc in lastChildren){
                //         parent[parents[p]][lastChildren[lc]] = updatedChild[0][parents[p]][lastChildren[lc]];
                //         block.context[parents[p]][lastChildren[lc]] = updatedChild[0][parents[p]][lastChildren[lc]];
                //     }
                // }
            }
            while (index > 1){
                --index;
                // var newBlock = block.clone();
                // newBlock[0] = block.parent().children()[index+1];
                // newBlock.context = block.parent().children()[index+1];

                // var parents = ["offsetParent", "parentElement", "parentNode"];
                // var children = ["childNodes", "children"];
                // var lastChildren = ["lastChild", "lastElementChild"];

                // var updatedChild = 
                //updateDataAndPosition(offset + width, jQuery(block.parent().children()[index]), dateChunks, cellWidth, newEnd);

                // for (var p in parents) {
                //     for (var c in children) {
                //         parent[parents[p]][children[c]][index + 1] = updatedChild[0];
                //         block.context[parents[p]][children[c]][index + 1] = updatedChild[0];
                //     }

                //     for (var lc in lastChildren){
                //         parent[parents[p]][lastChildren[lc]] = updatedChild[0][parents[p]][lastChildren[lc]];
                //         block.context[parents[p]][lastChildren[lc]] = updatedChild[0][parents[p]][lastChildren[lc]];
                //     }
                // }
            }

            var parentChildren = block.parent().children();

            // for(i=0; i<parentChildren.length; ++i){
            //     // Set new end date
            //     console.log(parentChildren[i]);
            //     var newBlock = block.clone();
            //     newBlock[0] = parentChildren[i];
            //     newBlock.context = parentChildren[i];

            //     var width = newBlock.outerWidth();
            //     var chunksFromStart = parseInt(width / cellWidth);
            //     var newEnd = new Date(newStart.clone().getTime() + (chunksFromStart*chunkInMS));

            //     parentChildren[i].data("block-data").start = newStart;
            //     parentChildren[i].data("block-data").end = newEnd;

            //     jQuery("div.ganttview-block-text", parentChildren[i]).text(chunksFromStart/dateChunks + 1);

            //     // Remove top and left properties to avoid incorrect block positioning,
            //     // set position to relative to keep blocks relative to scrollbar when scrolling
            //     parentChildren[i].css("top", "0").css("left", "")
            //     .css("position", "absolute").css("margin-left", offset + "px");

            //     newStart = newEnd;
            // }

            // Remove top and left properties to avoid incorrect block positioning,
            // set position to relative to keep blocks relative to scrollbar when scrolling
            block.css("top", "0").css("left", "0")
            .css("position", "absolute").css("margin-left", offset + "px");

            // return block;
        }

        return {
            apply: apply    
        };
    }

    var ArrayUtils = {

        contains: function (arr, obj) {
            var has = false;

            for (var i = 0; i < arr.length; i++) { 
                if (arr[i] == obj) { has = true; } 
            }

            return has;
        }
    };

    var DateUtils = {

        daysBetween: function (start, end) {
            if (!start || !end) { return 0; }
            start = Date.parse(start); end = Date.parse(end);
            if (start.getYear() == 1901 || end.getYear() == 8099) { return 0; }
            var count = 0, date = start.clone();
            while (date.compareTo(end) == -1) { count = count + 1; date.addDays(1); }
            return count;
        },

        isWeekend: function (date) {
            return date.getDay() % 6 == 0;
        },

        getBoundaryDatesFromData: function (data, minDays) {
            var minStart = new Date(); maxEnd = new Date();
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < data[i].series.length; j++) {
                    var start = Date.parse(data[i].series[j].start);
                    var end = Date.parse(data[i].series[j].end)
                    if (i == 0 && j == 0) { minStart = start; maxEnd = end; }
                    if (minStart.compareTo(start) == 1) { minStart = start; }
                    if (maxEnd.compareTo(end) == -1) { maxEnd = end; }
                }
            }

            // Insure that the width of the chart is at least the slide width to avoid empty
            // whitespace to the right of the grid
            if (DateUtils.daysBetween(minStart, maxEnd) < minDays) {
                maxEnd = minStart.clone().addDays(minDays);
            }
            
            return [minStart, maxEnd];
        }
    };

})(jQuery);
