class DataSet {
    static DATE_RANGE = {"startDate": null, "endDate": null};
    static GEO_AREA_FILTER = {"geoArea": [], "checkOrigin": false, "checkDestination": false};
    static DAYS_OF_WEEK = []
    static parseDate = d3.timeParse('%Y-%m-%d');

    constructor(flightFileName, coronaFileName) {
        this.aggregated = null;


        //this.rawData = d3.csv("Data/" + fileName)
        this.rawData = d3.csv(flightFileName)
            .then(data => {
                return new Promise((resolve, reject) => {
                    for (let i = 0; i < data.length; i++) {
                        let d = data[i];
                        d.DATE = DataSet.parseDate(d.DATE);
                    }
                    this.year = data[0].DATE.getFullYear();
                    resolve(data);
                });
            }).then(flightData => {
                return new Promise((resolve, reject) => {
                    d3.csv(coronaFileName)
                        .then(data => {
                            for (let i = 0; i < data.length; i++) {
                                let d = data[i];
                                d.DATE = new Date(+d.DATE);
                            }
                            resolve([flightData, data]);
                        });
                });
            });

        this.refresh();
    }


    filterByAll() {
        let startDate = new Date(DataSet.DATE_RANGE.startDate.getTime());
        let endDate = new Date(DataSet.DATE_RANGE.endDate.getTime());
        startDate.setFullYear(this.year);
        endDate.setFullYear(this.year);
        let year = this.year;

        let days = DataSet.DAYS_OF_WEEK;

        let geoArea = DataSet.GEO_AREA_FILTER.geoArea;
        let checkOrigin = DataSet.GEO_AREA_FILTER.checkOrigin;
        let checkDestination = DataSet.GEO_AREA_FILTER.checkDestination;

        this.aggregated = this.rawData.then(function (data) {
            let flightData = data[0];
            let coronaData = data[1];

            let aggregatedData = [];
            let coronaAggregatedData = [];
            let totalFlights = 0;
            let maxFlightCount = 0;
            for (let i = 0; i < flightData.length; i++) {
                let flight = flightData[i];
                let checkCorona = i < coronaData.length;
                let corona = checkCorona ? coronaData[i] : null;

                let dateFilter = flight.DATE >= startDate && flight.DATE <= endDate;
                let coronaDateFilter = checkCorona && corona.DATE >= startDate && corona.DATE <= endDate;

                let dayOfWeekFilter = days.includes(flight.DATE.getDay());
                let coronaDayOfWeekFilter = checkCorona && days.includes(corona.DATE.getDay());

                let geoFilter = () => {
                    if (checkOrigin && checkDestination) return (geoArea.includes(flight.ORIGIN) && geoArea.includes(flight.DESTINATION));
                    if (checkOrigin) return geoArea.includes(flight.ORIGIN);
                    if (checkDestination) return geoArea.includes(flight.DESTINATION);
                    return true;
                }

                if(coronaDateFilter && coronaDayOfWeekFilter){
                    let coronaIndex = listContainsState(coronaAggregatedData, corona);
                    if (coronaIndex !== -1) {
                        coronaAggregatedData[coronaIndex].DEATHS += +corona.NEW_DEATHS;
                    }
                    else coronaAggregatedData.push({
                        "STATE": corona.STATE,
                        "DEATHS": +corona.NEW_DEATHS
                    });
                }

                if(!(dateFilter && dayOfWeekFilter && geoFilter())) continue;

                totalFlights += +flight.FLIGHTCOUNT;
                let flightVal = +flight.FLIGHTCOUNT;

                let flightIndex = listContainsFlight(aggregatedData, flight);
                if (flightIndex !== -1) {
                    aggregatedData[flightIndex].FLIGHTCOUNT += +flight.FLIGHTCOUNT;
                    flightVal = aggregatedData[flightIndex].FLIGHTCOUNT;
                }
                else aggregatedData.push({
                    "ORIGIN": flight.ORIGIN,
                    "DESTINATION": flight.DESTINATION,
                    "FLIGHTCOUNT": +flight.FLIGHTCOUNT
                });
                if(flightVal > maxFlightCount) maxFlightCount = +flightVal;
            }

            for(let i = 0; i < coronaData.length; i++){

            }

            return [[aggregatedData, totalFlights, maxFlightCount], coronaAggregatedData];
        });
        return this.aggregated;
    }

    static setDaysOfWeek(daysOfWeek) {
        DataSet.DAYS_OF_WEEK = daysOfWeek;
    }

    static setDateRange(dateRange) {
        DataSet.DATE_RANGE = dateRange;
    }

    static setGeoAreaFilter(geoFilter) {
        DataSet.GEO_AREA_FILTER = geoFilter;
    }

    getData() {
        return this.aggregated;
    }

    refresh() {
        return this.rawData
            .then(() => {
                return new Promise((resolve) => {
                    resolve(this.filterByAll());
                });
            })
            .then(() => {
                return this.getData()
            });
    }

    static readSum(year){
        return d3.csv("Data/sum_flights_" + year + ".csv").then((data) => {
        //return d3.csv("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/sum_flights_" + year + ".csv").then((data) => { //Jeg får stadig CORS errors med lokale filer :-(
            for (let i = 0; i < data.length; i++) {
                data[i].DATE = new Date(+data[i].DATE);
            }
            return data;
        })
    }

}


// HELPER FUNCTIONS
function intersect(filter1, filter2) {
    return filter1.then(function (data1) {
        return filter2.then(function (data2) {
            return data2.filter((d2) => {
                return data1.includes(d2);
            });
        });
    });
}

function listContainsState(list, state) {
    for (let i = 0; i < list.length; i++) {
        let curState = list[i];
        if (curState.STATE === state.STATE) return i;
    }
    return -1;
}

function listContainsFlight(list, flight) {
    for (let i = 0; i < list.length; i++) {
        let curFlight = list[i];
        if (curFlight.ORIGIN === flight.ORIGIN && curFlight.DESTINATION === flight.DESTINATION) return i;
    }
    return -1;
}


function test() {
    DataSet.setDaysOfWeek([1, 2, 3, 4, 5, 6, 0]) // all days
    DataSet.setDateRange({"startDate": new Date("2018-08-30"), "endDate": new Date("2018-08-31")});
    DataSet.setGeoAreaFilter({"geoArea": ["DEN", "ORD", "ATL"], "checkOrigin": false, "checkDestination": true});

    let data = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2018.csv");
    data.refresh();
    return data;
}

