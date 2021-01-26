class DateBrush {

    constructor(year, textEnabled) {
        this.processedData = new Promise(resolve => {
            resolve(DataSet.readSum(year));
        });

        this.year = year;

        this.lastSelection = null;

        this.dontMove = false;

        this.DateFormat = d3.timeFormat("%d %b");


        let margin = {top: 20, right: 20, bottom: 50, left: 70},
            width2 = 480 - margin.left - margin.right,
            height2 = 100 - margin.top - margin.bottom

        let svg2 = d3.select("#datebrush-container").append("svg")
            .attr("width", width2 + margin.left + margin.right)
            .attr("height", height2 + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        this.x = d3.scaleTime().range([0, width2]);
        this.y = d3.scaleLinear().range([height2, 0]);

        let valueline = d3.line()
            .x((d) => {return this.x(d.DATE);})
            .y((d) => {return this.y(+d.FLIGHTCOUNT);});

        this.brush = d3.brushX()
            .extent([[0, 0], [width2, height2]])
            .on("brush end", this.brushed);


        this.processedData.then((data) => {

            // Scale the range of the data
            let dataRangeX = d3.extent(data, function(d) { return d.DATE; })
            let dataRangeY = [0, d3.max(data, function(d) { return +d.FLIGHTCOUNT + 1000; })];

            // set the ranges

            this.x.domain(dataRangeX).clamp(true);
            this.y.domain(dataRangeY);

            // Add the valueline path.
            svg2.append("path")
                .data([data])
                .attr("class", "line")
                .attr("d", valueline);

            // Add the x Axis
            svg2.append("g")
                .attr("transform", "translate(0," + height2 + ")")
                .call(d3.axisBottom(this.x));

            // Add the y Axis
            svg2.append("g")
                .call(d3.axisLeft(this.y)
                    .ticks(0));

            this.dontMove = true;
            this.brushG = svg2.append("g")
                .attr("class", "brush")
                .attr("class", "brush_" + year)
                .call(this.brush)
                .call(this.brush.move, this.x.range());
            this.dontMove = false;

            this.lastSelection = this.x.range();

            let updateButton = d3.select("#updateButton")
                .text("Update Data")
                .on("click", () => {
                    console.log("clicked update!");
                    document.getElementById("loader").style.display = "block";
                    new Promise(resolve => {
                        setTimeout(() => {
                            console.log("starting")
                            resolve(DateBrush.updateViews());
                        }, 50);
                    });
                });

            if(!textEnabled) return;

            let dateRangeText = svg2.append("g")
                .attr("id", "buttons_group")
                .attr("transform", "translate(" + 0 + "," + 0 + ")");


            dateRangeText.append("text")
                .attr("id", "displayDates")
                .text(() => {
                    return this.DateFormat(dataRangeX[0]) + " - " + this.DateFormat(dataRangeX[1])
                })
                .style("text-anchor", "start")
                .attr("transform", "translate(" + 0 + "," + (height2 + margin.top + margin.bottom/2) + ")");


        });


    }

    getBrush = () => {
        return this.brush;
    }

    brushed = () => {
        if(this.dontMove) return;
        this.updateDisplayDates();
    }

    getSelectedDates = () => {
        if(d3.event == null){
            if(this.lastSelection == null) return this.x.range().map(x.invert);
            return this.lastSelection.map(this.x.invert);
        }
        let selection = d3.event.selection;
        if(selection == null) {
            if(this.lastSelection == null) return this.x.range().map(x.invert);
            selection = this.lastSelection;
        }
        let inverted = selection.map(this.x.invert);
        return inverted;
    }

    updateDisplayDates = () => {
        let selection = d3.event.selection;
        if (selection != null){
            this.lastSelection = selection;
        }
        else {
            selection = this.lastSelection;
            d3.select(".brush").call(this.brush.move, this.lastSelection)
        };

        let selectedDates = this.getSelectedDates();

        // update the text that shows the range of displayed dates
        let localBrushDateStart = this.DateFormat(selectedDates[0]),
            localBrushDateEnd = this.DateFormat(selectedDates[1]);

        // Update start and end dates in upper right-hand corner
        d3.select("#displayDates")
            .text(localBrushDateStart + " - " + localBrushDateEnd);
        DateBrush.moveBrushes(this);
    }


    static brushesList = [];
    static lastDictator = null;

    static moveBrushes(dictator) {
        let selectedDates = dictator.getSelectedDates();
        this.lastDictator = dictator;

        for(let i=0; i<this.brushesList.length; i++){
            let brushObj = this.brushesList[i];
            if(brushObj === dictator) continue;
            selectedDates[0].setFullYear(brushObj.year);
            selectedDates[1].setFullYear(brushObj.year);
            let first = brushObj.x(selectedDates[0]);
            let second = brushObj.x(selectedDates[1]);
            let range = [Math.min(first, second), Math.max(first, second)];
            brushObj.dontMove = true;
            let brush = brushObj.getBrush();

            d3.select(".brush_" + brushObj.year).call(brush.move, range);
            brushObj.dontMove = false;
        }
    }


    static getSelectedDaysOfWeek() {
        let selected = [];
        d3.select("#days_of_week").selectAll("input").nodes().forEach((input) => {
            if(input.checked) selected.push(+input.id);
        });
        return selected;
    }

    static getGeoSettings() {
        let selected = {};
        d3.select("#geo_options").selectAll("input").nodes().forEach((input) => {
            selected[input.id] = input.checked;
        });
        return selected;
    }

    static updateViews(){

        let dates = this.lastDictator.getSelectedDates();
        let geoSettings = this.getGeoSettings();
        geoSettings["geoArea"] = getSelectedAirportCodes();

        DataSet.setDateRange({"startDate": dates[0], "endDate": dates[1]});
        DataSet.setDaysOfWeek(this.getSelectedDaysOfWeek());
        DataSet.setGeoAreaFilter(geoSettings);

        let update = new Promise(resolve => {
            dataset_1.refresh().then(data => {
                let maxFlightCount = data[0][2];
                let totalFlights = data[0][1];
                minMaxFlightcount = Number.MAX_SAFE_INTEGER;
                minMaxFlightcount = Math.min(totalFlights/maxFlightCount, minMaxFlightcount);
                dataset_2.refresh().then(data2 => {
                    let maxFlightCount2 = data2[0][2];
                    let totalFlights2 = data2[0][1];
                    minMaxFlightcount = Math.min(totalFlights2/maxFlightCount2, minMaxFlightcount);
                    resolve(dataset_3.refresh().then(data3 => {
                        let maxFlightCount3 = data3[0][2];
                        let totalFlights3 = data3[0][1];
                        minMaxFlightcount = Math.min(totalFlights3/maxFlightCount3, minMaxFlightcount);

                        console.log(data)
                        console.log(data2)
                        console.log(data3)
                        visualization1.updateMap(data, minMaxFlightcount);
                        visualization2.updateMap(data2, minMaxFlightcount);
                        visualization3.updateMap(data3, minMaxFlightcount);
                    }));
                });
            });
            resolve(dataset_1.refresh().then(data => visualization1.updateMap(data)));
            resolve(dataset_2.refresh().then(data => visualization2.updateMap(data)));
            resolve(dataset_3.refresh().then(data => visualization3.updateMap(data)));
        });

        update.then(() => {
            updateSelectedClasses();
        });
    }

}