function toggleChoropleth() {
    let defaultColor = "rgba(247, 247, 247, 1)";
    let statePaths = d3.selectAll(".choropleth_state").nodes();
    for(let i=0; i< statePaths.length; i++){
        let statePath = statePaths[i];
        if(!statePath.hasAttribute("true_fill")){
            statePath.setAttribute("true_fill", statePath.getAttribute("fill"));
            statePath.setAttribute("fill", defaultColor);
        } else {
            statePath.setAttribute("fill", statePath.getAttribute("true_fill"));
            statePath.removeAttribute("true_fill");
        }
    }
}

let toggleButon = d3.select("#toggleButton")
    .on("click", () => {
        toggleChoropleth();
    });