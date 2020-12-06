let processedData = new Promise(resolve => {
    resolve(DataSet.readSum(2020));
});

let lastSelection = null;

const DateFormat = d3.timeFormat("%d %b");


// set the dimensions and margins of the graph
let margin = {top: 20, right: 20, bottom: 50, left: 70},
    width2 = 960 - margin.left - margin.right,
    height2 = 100 - margin.top - margin.bottom

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
let svg2 = d3.select("body").append("svg")
    .attr("width", width2 + margin.left + margin.right)
    .attr("height", height2 + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

let x = d3.scaleTime().range([0, width2]);
let y = d3.scaleLinear().range([height2, 0]);

// define the line
let valueline = d3.line()
    .x(function(d) {return x(d.DATE);})
    .y(function(d) {return y(+d.FLIGHTCOUNT);});

let brush = d3.brushX()
    .extent([[0, 0], [width2, height2]])
    .on("brush end", brushed);


// Get the data
processedData.then(function(data) {

    // Scale the range of the data
    let dataRangeX = d3.extent(data, function(d) { return d.DATE; })
    let dataRangeY = [0, d3.max(data, function(d) { return +d.FLIGHTCOUNT + 1000; })];

    // set the ranges

    x.domain(dataRangeX).clamp(true);
    y.domain(dataRangeY);

    // Add the valueline path.
    svg2.append("path")
        .data([data])
        .attr("class", "line")
        .attr("d", valueline);

    // Add the x Axis
    svg2.append("g")
        .attr("transform", "translate(0," + height2 + ")")
        .call(d3.axisBottom(x));

    // Add the y Axis
    svg2.append("g")
        .call(d3.axisLeft(y));

    svg2.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    let dateRangeText = svg2.append("g")
        .attr("id", "buttons_group")
        .attr("transform", "translate(" + 0 + "," + 0 + ")");

    lastSelection = x.range();

    dateRangeText.append("text")
        .attr("id", "displayDates")
        .text(function () {
            return DateFormat(dataRangeX[0]) + " - " + DateFormat(dataRangeX[1])
        })
        .style("text-anchor", "start")
        .attr("transform", "translate(" + 0 + "," + (height2 + margin.top + margin.bottom/2) + ")");

    let updateButton = d3.select("#updateButton")
        .text("Update Data")
        .on("click", () => new Promise(resolve => resolve(updateViews())));
});

function updateViews(){
    let dates = getSelectedDates();
    let geoSettings = getGeoSettings();
    geoSettings["geoArea"] = getSelectedAirportCodes();

    DataSet.setDateRange({"startDate": dates[0], "endDate": dates[1]});
    DataSet.setDaysOfWeek(getSelectedDaysOfWeek());
    DataSet.setGeoAreaFilter(geoSettings);

    let update = new Promise(resolve => {
        resolve(dataset_1.refresh().then(data => visualization1.updateMap(data)));
        resolve(dataset_2.refresh().then(data => visualization2.updateMap(data)));
        resolve(dataset_3.refresh().then(data => visualization3.updateMap(data)));
    });

    update.then(() => {
        updateSelectedClasses();
    });
}

function brushed() {
    let s = d3.event.selection || x.range();
    updateDisplayDates();
}

function getSelectedDates() {
    let selection = d3.event.selection;
    if(selection == null) {
        if(lastSelection == null) return x.range().map(x.invert);
        selection = lastSelection;
    }
    let inverted = selection.map(x.invert);
    return inverted;
}

function updateDisplayDates() {
    let selection = d3.event.selection;
    if (selection != null){
        lastSelection = selection;
    }
    else {
        selection = lastSelection;
        d3.select(".brush").call(brush.move, lastSelection)
    };

    let selectedDates = getSelectedDates();

    // update the text that shows the range of displayed dates
    let localBrushDateStart = DateFormat(selectedDates[0]),
        localBrushDateEnd = DateFormat(selectedDates[1]);

    // Update start and end dates in upper right-hand corner
    d3.select("#displayDates")
        .text(localBrushDateStart + " - " + localBrushDateEnd);
};

function getSelectedDaysOfWeek() {
    let selected = [];
    d3.select("#days_of_week").selectAll("input").nodes().forEach((input) => {
        if(input.checked) selected.push(+input.id);
    });
    return selected;
}

function getGeoSettings() {
    let selected = {};
    d3.select("#geo_options").selectAll("input").nodes().forEach((input) => {
        selected[input.id] = input.checked;
    });
    return selected;
}

