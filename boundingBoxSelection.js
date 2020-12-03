let div = document.getElementById('selectionBox'), x1 = 0, y1 = 0, x2 = 0, y2 = 0;
let buttonHeld = false;
let MINIMUM_BOUNDING_BOX_SIZE = 2;
let selectedAirports = new Set();
let bboxSelection = [];

//setupOnClick();

function reCalc() {
    let x3 = Math.min(x1,x2); //Smaller X
    let x4 = Math.max(x1,x2); //Larger X
    let y3 = Math.min(y1,y2); //Smaller Y
    let y4 = Math.max(y1,y2); //Larger Y
    div.style.left = x3 + 'px';
    div.style.top = y3 + 'px';
    div.style.width = x4 - x3 + 'px';
    div.style.height = y4 - y3 + 'px';
    return [x4-x3, y4-y3];
}

onmousedown = function(e) {
    buttonHeld = true;
    x1 = e.pageX; //Set the initial X
    y1 = e.pageY; //Set the initial Y
    reCalc();
};

function setupOnClick() {
    console.log("click setup")
    let circles = d3.selectAll("circle.airport").nodes();
    for(let i=0; i<circles.length; i++){
        let circle = circles[i];
        circle.onclick = () => {
            console.log("clicky")
            if(selectedAirports.has(circle)) selectedAirports.delete(circle);
            let circleSelection = d3.select(circle);
            circleSelection.classed("selected", !circleSelection.classed("selected"));
        }
    }
}

onmousemove = function(e) {
    setClass(d3.selectAll("circle.airport").nodes(), "temp-selection", false);
    x2 = e.pageX;
    y2 = e.pageY;
    let size = reCalc();
    if(!buttonHeld || !size[0] >=MINIMUM_BOUNDING_BOX_SIZE || !size[1] >= MINIMUM_BOUNDING_BOX_SIZE) return ;

    div.hidden = 0;
    bboxSelection = getAirportsInSelection();
    setClass(bboxSelection, "temp-selection", true);
};

onmouseup = function(e) {
    buttonHeld = false;
    div.hidden = 1;
    for(let i=0; i<bboxSelection.length; i++){
        let node = bboxSelection[i];
        selectedAirports.add(node);
        d3.select(node).classed("selected", true);
    }
    bboxSelection = [];
    setClass(d3.selectAll("circle.airport").nodes(), "temp-selection", false);
};

function setClass(nodes, className, enable){
    for(let i = 0; i<nodes.length; i++){
        let node = nodes[i];
        d3.select(node).classed(className, enable);
    }
}

function getAirportsInSelection(){
    let inBox = [];
    let selection = getSelectionBox();
    let circles = d3.selectAll("circle.airport").nodes();

    for(let i = 0; i<circles.length; i++){
        let circle = circles[i];
        let c = getCenterOfCircle(circle);
        let xRequirement = c[0] >= selection[0] && c[0] <= selection[1];
        let yRequirement = c[1] >= selection[2] && c[1] <= selection[3];
        if(xRequirement && yRequirement) inBox.push(circle);
    }

    return inBox;
}

function getSelectionBox(){
    let bbox = div.getBoundingClientRect();
    let x1 = bbox.x;
    let x2 = x1 + bbox.width;
    let y1 = bbox.y;
    let y2 = y1 + bbox.height;
    return [x1, x2, y1, y2];
}

function getCenterOfCircle(circle) {
    let bbox = circle.getBoundingClientRect();
    let radius = bbox.width/2;
    let cx = bbox.x + radius;
    let cy = bbox.y + radius;
    return [cx, cy];
}

function getSelectedAirportCodes() {
    let codes = [];
    let airports = Array.from(selectedAirports);
    for(let i=0; i<airports.length; i++){
        let airport = airports[i];
        let name = airport.id;
        codes.push(name);
    }
    return codes;
}
