
let visualization1 = new DaVi("#svg_flights_2018", DaVi.urls.flights_2018);

function update(){
    DataSet.setAggregationType("WEEKENDS");
    DataSet.setDateRange({"startDate": new Date("2018-01-30"), "endDate": new Date("2018-5-30")});
    DataSet.setGeoAreaFilter({"geoArea": ["DEN", "MIA", "PHL", "LAX", "ORD", "SLC", "SAN", "ATL"], "checkOrigin": false, "checkDestination": true});

    let data = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2018.csv");
    data.refresh().then(data => visualization1.updateMap(data))
}