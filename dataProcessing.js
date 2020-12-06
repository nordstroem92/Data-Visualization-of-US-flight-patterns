class DataSet {
    static DATE_RANGE = {"startDate": null, "endDate": null};
    static GEO_AREA_FILTER = {"geoArea": [], "checkOrigin": false, "checkDestination": false};
    static DAYS_OF_WEEK = []
    static parseDate = d3.timeParse('%Y-%m-%d');

    constructor(fileName) {
        this.lastDateRange = {"startDate": null, "endDate": null};
        this.lastGeoAreaFilter = {"geoArea": [], "checkOrigin": false, "checkDestination": false};
        this.lastIntersected = {"geoArea": null, "dateRange": null, "dayOfWeek": null};
        this.lastDayOfWeekFilter = [];

        this.timeFiltered = null;
        this.geoAreaFiltered = null;
        this.dayOfWeekFiltered = null;
        this.filtered = null;
        this.aggregated = null;


        //this.rawData = d3.csv("Data/" + fileName)
        this.rawData = d3.csv(fileName)
            .then(data => {
                for (let i = 0; i < data.length; i++) {
                    let d = data[i];
                    d.DATE = DataSet.parseDate(d.DATE);
                }
                this.year = data[0].DATE.getFullYear();
                return data;
            });


        this.refresh();
    }

    intersectData() {
        if (this.lastIntersected.geoArea === DataSet.GEO_AREA_FILTER &&
        this.lastIntersected.dateRange === DataSet.DATE_RANGE &&
        this.lastIntersected.dayOfWeek === DataSet.DAYS_OF_WEEK) return;

        this.filtered = intersect(this.timeFiltered, this.geoAreaFiltered);
        this.filtered = intersect(this.dayOfWeekFiltered, this.filtered)
        this.filtered.then(() => this.lastIntersected = {
            "geoArea": DataSet.GEO_AREA_FILTER,
            "dateRange": DataSet.DATE_RANGE,
            "daysOfWeek": DataSet.DAYS_OF_WEEK
        });
    }

    aggregateData() {
        this.intersectData();

        this.aggregated = this.filtered.then(function (data) {
            let aggregatedData = []
            for (let i = 0; i < data.length; i++) {
                let flight = data[i];
                let flightIndex = listContainsFlight(aggregatedData, flight);
                if (flightIndex !== -1) aggregatedData[flightIndex].FLIGHTCOUNT += +flight.FLIGHTCOUNT;
                else aggregatedData.push({
                    "ORIGIN": flight.ORIGIN,
                    "DESTINATION": flight.DESTINATION,
                    "FLIGHTCOUNT": +flight.FLIGHTCOUNT
                });
            }
            return aggregatedData;
        });
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
            let aggregatedData = []
            let totalFlights = 0;
            let maxFlightCount = 0;
            for (let i = 0; i < data.length; i++) {
                let flight = data[i];

                if(startDate.getFullYear() !== year || endDate.getFullYear() !== year) console.log(console.log(startDate, endDate));

                let dateFilter = flight.DATE >= startDate && flight.DATE <= endDate;
                let dayOfWeekFilter = days.includes(flight.DATE.getDay())
                let geoFilter = () => {
                    if (checkOrigin && checkDestination) return (geoArea.includes(flight.ORIGIN) && geoArea.includes(flight.DESTINATION));
                    if (checkOrigin) return geoArea.includes(flight.ORIGIN);
                    if (checkDestination) return geoArea.includes(flight.DESTINATION);
                    return true;
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
            return [aggregatedData, totalFlights, maxFlightCount];
        });
        return this.aggregated;
    }

    filterByPeriod() {
        let startDate = DataSet.DATE_RANGE.startDate;
        let endDate = DataSet.DATE_RANGE.endDate;
        startDate.setFullYear(this.year);
        endDate.setFullYear(this.year);

        if (this.lastDateRange.startDate === startDate && this.lastDateRange.endDate === endDate) return;

        this.timeFiltered = this.rawData.then(data => data.filter(d => d.DATE >= startDate && d.DATE <= endDate));
        this.rawData.then(() => this.lastDateRange = {"startDate": startDate, "endDate": endDate});
    }

    filterByGeo() {
        let geoArea = DataSet.GEO_AREA_FILTER.geoArea;
        let checkOrigin = DataSet.GEO_AREA_FILTER.checkOrigin;
        let checkDestination = DataSet.GEO_AREA_FILTER.checkDestination;
        if (this.lastGeoAreaFilter.geoArea === geoArea && this.lastGeoAreaFilter.checkOrigin === checkOrigin && this.lastGeoAreaFilter.checkDestination === checkDestination) return;

        if (!checkOrigin && !checkDestination) return this.rawData;
        this.geoAreaFiltered = this.rawData.then(function (data) {
            return data.filter(function (d) {
                if (checkOrigin && checkDestination) return (geoArea.includes(d.ORIGIN) && geoArea.includes(d.DESINTAION));
                if (checkOrigin) return geoArea.includes(d.ORIGIN);
                return geoArea.includes(d.DESTINATION);
            });
        });
        this.lastGeoAreaFilter = {
            "geoArea": DataSet.GEO_AREA_FILTER.geoArea,
            "checkOrigin": DataSet.GEO_AREA_FILTER.checkOrigin,
            "checkDestination": DataSet.GEO_AREA_FILTER.checkDestination
        };
    }

    filterByDayOfWeek() {
        let days = DataSet.DAYS_OF_WEEK;
        if (this.lastDayOfWeekFilter === days) return;

        this.dayOfWeekFiltered = this.rawData.then(function (data) {
            return data.filter(function (flight) {
                return days.includes(flight.DATE.getDay())
            });
        });
        this.lastDayOfWeekFilter = days;
    }

    getAreaFilteredDate() {
        return this.geoAreaFiltered;
    }

    getTimeFilteredData() {
        return this.timeFiltered;
    }

    getRawData() {
        return this.rawData;
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

    refresh_old() {
        return this.rawData
            .then(() => {
                return new Promise((resolve) => {
                    resolve(this.filterByPeriod());
                });
            })
            .then(() => {
                return new Promise((resolve) => {
                    resolve(this.filterByGeo());
                });
            })
            .then(() => {
                return new Promise((resolve) => {
                    resolve(this.filterByDayOfWeek());
                });
            })
            .then(() => {
                return new Promise((resolve) => {
                    resolve(this.aggregateData());
                });
            })
            .then(() => {
                return this.getData()
            });
    }

    getFlightCount(){
        return this.rawData.then(function (data) {
            let aggregatedData = {};
            let asList = []
            for (let i = 0; i < data.length; i++) {
                let flight = data[i];
                let time = flight.DATE.getTime();
                if(aggregatedData.hasOwnProperty(time)) aggregatedData[time] += +flight.FLIGHTCOUNT;
                else aggregatedData[time] = +flight.FLIGHTCOUNT;
            }

            let keys = Object.keys(aggregatedData);
            for(let i = 0; i < keys.length; i++){
                let key = keys[i];
                asList.push({
                    "DATE": new Date(+key),
                    "FLIGHTCOUNT": aggregatedData[key]
                });
            }
            asList.sort((a, b) => {
                return a.DATE - b.DATE;
            })
            //return asList;

            let contents = "DATE, FLIGHTCOUNT\n"
            for(let i = 0; i < asList.length; i++){
                contents += asList[i].DATE.getTime() + "," + asList[i].FLIGHTCOUNT + "\n"
            }
            return contents;

        });
    }

    static readSum(year){
        //return d3.csv("Data/sum_flights_" + year + ".csv").then((data) => {
        return d3.csv("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/sum_flights_" + year + ".csv").then((data) => { //Jeg får stadig CORS errors med lokale filer :-(
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

