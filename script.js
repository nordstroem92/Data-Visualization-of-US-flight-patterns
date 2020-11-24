let pull_input = d3.select("#pull");

pull_input.on("mouseup", function(){
    charge =  this.value;
    drawFlights(airports, flights, charge, link);
} );

let link_input = d3.select("#link");

link_input.on("mouseup", function(){
    link =  this.value;
    drawFlights(airports, flights, charge, link);
} );

