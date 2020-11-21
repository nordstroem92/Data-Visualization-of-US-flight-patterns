class DataSet {
    static ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
    static WEEKDAYS = [1, 2, 3, 4, 5]; // Monday - Friday
    static WEEKENDS = [6, 0]; // Saturday - Sunday
    static AGGREGATION_TYPES = {
        "ALL_DAYS": DataSet.ALL_DAYS,
        "WEEKDAYS": DataSet.WEEKDAYS,
        "WEEKENDS": DataSet.WEEKENDS,
        "HOLIDAYS": [],
        "DAY_OF_WEEK": []
    };
    static DATE_RANGE = {"startDate": null, "endDate": null};
    static GEO_AREA_FILTER = {"geoArea": [], "checkOrigin": false, "checkDestination": false};
    static AGGREGATION = null;

    constructor(fileName) {
        this.lastDateRange = {"startDate": null, "endDate": null};
        this.lastGeoAreaFilter = {"geoArea": [], "checkOrigin": false, "checkDestination": false};
        this.lastIntersected = {"geoArea": null, "dateRange": null};

        this.timeFiltered = null;
        this.geoAreaFiltered = null;
        this.filtered = null;
        this.aggregated = null;


        this.rawData = d3.csv("Data/" + fileName)
            .then(data => {
                const parseDate = d3.utcParse('%Y-%m-%d');
                for (let i = 0; i < data.length; i++) {
                    let d = data[i];
                    d.DATE = parseDate(d.DATE);
                }
                this.year = data[0].DATE.getFullYear();
                return data;
            });


        this.refresh();
    }

    intersectData() {
        if (this.lastIntersected.geoArea === DataSet.GEO_AREA_FILTER && this.lastIntersected.dateRange === DataSet.DATE_RANGE) return;
        this.filtered = intersect(this.timeFiltered, this.geoAreaFiltered);
        this.filtered.then(() => this.lastIntersected = {
            "geoArea": DataSet.GEO_AREA_FILTER,
            "dateRange": DataSet.DATE_RANGE
        });
    }

    aggregateData() {
        let aggregationType = DataSet.AGGREGATION;
        this.intersectData();

        switch (aggregationType) {
            case "ALL_DAYS":
            case "DAY_OF_WEEK":
            case "WEEKDAYS":
            case "WEEKENDS":
                this.aggregated = this.filtered.then(function (data) {
                    let aggregatedData = []
                    for (let i = 0; i < data.length; i++) {
                        let flight = data[i];
                        if (!DataSet.AGGREGATION_TYPES[aggregationType].includes(flight.DATE.getDay())) continue;
                        let flightIndex = listContainsFlight(aggregatedData, flight);
                        if (flightIndex !== -1) aggregatedData[flightIndex].FLIGHTCOUNT += parseInt(flight.FLIGHTCOUNT);
                        else aggregatedData.push({
                            "ORIGIN": flight.ORIGIN,
                            "DESTINATION": flight.DESTINATION,
                            "FLIGHTCOUNT": parseInt(flight.FLIGHTCOUNT)
                        });
                    }
                    return aggregatedData;
                });
                break;
            case "HOLIDAYS":
                throw "Not yet implemented!"
            default:
                throw "INVALID AGGREGATION TYPE: (" + aggregationType + ")!";
        }
    }

    filterByPeriod() {
        let startDate = DataSet.DATE_RANGE.startDate;
        let endDate = DataSet.DATE_RANGE.endDate;
        if (this.lastDateRange.startDate === startDate && this.lastDateRange.endDate === endDate) return;

        startDate.setFullYear(this.year);
        endDate.setFullYear(this.year);

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
        DataSet.AGGREGATION_TYPES.DAY_OF_WEEK = daysOfWeek;
    }

    static setDateRange(dateRange) {
        DataSet.DATE_RANGE = dateRange;
    }

    static setGeoAreaFilter(geoFilter) {
        DataSet.GEO_AREA_FILTER = geoFilter;
    }

    static setAggregationType(aggregationType) {
        DataSet.AGGREGATION = aggregationType;
    }

    getData() {
        return this.aggregated;
    }

    refresh() {
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
                    resolve(this.aggregateData());
                });
            })
            .then(() => {
                return this.getData()
            });
    }
}


// HELPER FUNCTIONS

function intersect(filter1, filter2) {
    return filter1.then(function (data1) {
        return filter2.then(function (data2) {
            return data2.filter(function (d) {
                return data1.includes(d);
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
    DataSet.setAggregationType("WEEKENDS");
    DataSet.setDateRange({"startDate": new Date("2018-08-30"), "endDate": new Date("2018-08-31")});
    DataSet.setGeoAreaFilter({"geoArea": ["DEN", "ORD", "ATL"], "checkOrigin": false, "checkDestination": true});

    let data = new DataSet("flights_2018.csv");
    //data.refresh();
    return data;
}