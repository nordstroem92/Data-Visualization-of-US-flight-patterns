const ALL_AIRPORTS = ["LAX", "ORD", "JFK", "ATL", "SFO", "EWR", "DFW", "LAS", "DEN", "LGA", "IAD", "MIA", "PHX", "BOS", "SEA", "PHL", "CLT", "IAH", "DTW", "DCA", "MSP", "SLC", "SAN", "MDW", "BWI", "FLL", "STL", "PDX", "MSY", "CVG", "TPA", "BNA", "PIT", "AUS", "SJC", "OAK", "RDU", "MEM", "SAT", "MCI", "HOU", "SNA", "CLE", "DAL", "IND", "ABQ", "MKE", "TUS", "BDL", "BUF", "JAX", "SMF", "OMA", "PVD", "PBI", "SDF", "BHM", "ONT", "DAY", "RSW", "MHT", "MCO", "RFD", "BUR", "GYY", "HPN", "ISP", "LGB", "OXR", "PSP", "SWF","TEB","VNY"];


DataSet.setDaysOfWeek([5]);
DataSet.setDateRange({"startDate": new Date("2018-01-01"), "endDate": new Date("2018-08-31")});
DataSet.setGeoAreaFilter({"geoArea": ALL_AIRPORTS, "checkOrigin": true, "checkDestination": true});

let dataset_1 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2018.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"); 
let dataset_2 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2019.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"); //"Data/US_Covid.csv"
let dataset_3 = new DataSet("https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/flights_2020.csv", "https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv");//"https://raw.githubusercontent.com/nordstroem92/datavisualisering/master/Data/US_Covid.csv"); //"Data/US_Covid.csv");

dataset_1.refresh().then(data => visualization1 = new DaVi("#svg_flights_2018", data));
dataset_2.refresh().then(data => visualization2 = new DaVi("#svg_flights_2019", data));
dataset_3.refresh().then(data => visualization3 = new DaVi("#svg_flights_2020", data));
