const ALL_AIRPORTS = ["LAX", "ORD", "JFK", "ATL", "SFO", "EWR", "DFW", "LAS", "DEN", "LGA", "IAD", "MIA", "PHX", "BOS", "SEA", "PHL", "CLT", "IAH", "DTW", "DCA", "MSP", "SLC", "SAN", "MDW", "BWI", "FLL", "STL", "PDX", "MSY", "CVG", "TPA", "BNA", "PIT", "AUS", "SJC", "OAK", "RDU", "MEM", "SAT", "MCI", "HOU", "SNA", "CLE", "DAL", "IND", "ABQ", "MKE", "TUS", "BDL", "BUF", "JAX", "SMF", "OMA", "PVD", "PBI", "SDF", "BHM", "ONT", "DAY", "RSW", "MHT", "MCO", "RFD", "BUR", "GYY", "HPN", "ISP", "LGB", "OXR", "PSP", "SWF","TEB","VNY"];

document.getElementById("loader").style.display = "block";

DataSet.setDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
DataSet.setDateRange({"startDate": new Date("2018-01-01"), "endDate": new Date("2018-08-31")});
DataSet.setGeoAreaFilter({"geoArea":ALL_AIRPORTS, "checkOrigin": true, "checkDestination": true});

let dataset_1 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2018.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv");
let dataset_2 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2019.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"); //"https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"
let dataset_3 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2020.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv");//"https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"); //"Data/US_Covid.csv");

dataset_1.refresh().then(data => visualization1 = new DaVi("#svg_flights_2018", data));
dataset_2.refresh().then(data => visualization2 = new DaVi("#svg_flights_2019", data));
dataset_3.refresh().then(data => visualization3 = new DaVi("#svg_flights_2020", data));

let dateBrush_1 = new DateBrush(2018, false);
let dateBrush_2 = new DateBrush(2019, false);
let dateBrush_3 = new DateBrush(2020, true);
DateBrush.brushesList =  [dateBrush_1, dateBrush_2, dateBrush_3];
DateBrush.lastDictator = dateBrush_3;


//NOTE: Look at 26 Jun - 10 Jul, noticable differences (if looking at specific days of week, make sure length is of period is appropriate)
// for example, looking only at fridays, period should have the same amount of each day in it, but since different dates fall on different days across the 3 years picking numbers divisible by 7 is highly advised