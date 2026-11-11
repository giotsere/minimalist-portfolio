let airlineData = [];

// Fetch airline catalogue once at page load
fetch('dimensions_lib.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load dimensions_lib.json: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        // Sort alphabetically by airline name
        airlineData = data.sort((a, b) => a.airline.localeCompare(b.airline));
        // Initial render: show all airlines so the page is immediately alive and helpful
        evaluateCompatibility();
    })
    .catch(error => {
        console.error('Error loading airlines library:', error);
        const listElem = document.getElementById("airlines-list");
        if (listElem) {
            listElem.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load airlines dataset. Please refresh or try again.</p></div>`;
        }
    });

let debounceTimer = null;

function handleDimensionInput() {
    clearTimeout(debounceTimer);
    // Instant/near-instant responsive feeling with a small debounce (60ms)
    debounceTimer = setTimeout(() => {
        evaluateCompatibility();
    }, 60);
}

function handleUnitChange() {
    const selectedUnit = document.getElementById("units").value;
    const unitLabels = document.querySelectorAll(".unit-label");
    unitLabels.forEach(el => {
        el.textContent = selectedUnit === "in" ? "in" : "cm";
    });
    evaluateCompatibility();
    renderDirectoryModal(); // update modal units if currently open or cached
}

function convertCentimetersToInches(centimeters) {
    return (centimeters / 2.54).toFixed(1);
}

function convertInchesToCentimeters(inches) {
    return inches * 2.54;
}

function formatDimensions(dims, unit) {
    if (unit === "in") {
        return `${convertCentimetersToInches(dims.height)} × ${convertCentimetersToInches(dims.width)} × ${convertCentimetersToInches(dims.depth)} in`;
    }
    return `${dims.height} × ${dims.width} × ${dims.depth} cm`;
}

function evaluateCompatibility() {
    const selectedUnit = document.getElementById("units") ? document.getElementById("units").value : "cm";
    const heightInput = document.getElementById("height");
    const widthInput = document.getElementById("width");
    const depthInput = document.getElementById("depth");

    const rawH = heightInput ? parseFloat(heightInput.value) : NaN;
    const rawW = widthInput ? parseFloat(widthInput.value) : NaN;
    const rawD = depthInput ? parseFloat(depthInput.value) : NaN;

    const hasH = !isNaN(rawH) && rawH > 0;
    const hasW = !isNaN(rawW) && rawW > 0;
    const hasD = !isNaN(rawD) && rawD > 0;

    let targetH = hasH ? rawH : null;
    let targetW = hasW ? rawW : null;
    let targetD = hasD ? rawD : null;

    // Convert from inches to cm for comparison against JSON cm baseline
    if (selectedUnit === "in") {
        if (targetH !== null) targetH = convertInchesToCentimeters(targetH);
        if (targetW !== null) targetW = convertInchesToCentimeters(targetW);
        if (targetD !== null) targetD = convertInchesToCentimeters(targetD);
    }

    const anyFilterActive = targetH !== null || targetW !== null || targetD !== null;

    // Dynamic filtering: test only the dimensions the user has actually supplied!
    const compatible = airlineData.filter(item => {
        if (targetH !== null && targetH > item.dimensions.height) return false;
        if (targetW !== null && targetW > item.dimensions.width) return false;
        if (targetD !== null && targetD > item.dimensions.depth) return false;
        return true;
    });

    renderAirlineResults(compatible, selectedUnit, anyFilterActive);
}

function renderAirlineResults(compatibleAirlines, unit, isFilteringActive) {
    const container = document.getElementById("airlines-list");
    const summary = document.getElementById("results-summary");
    if (!container) return;

    container.innerHTML = "";

    if (summary) {
        if (isFilteringActive) {
            summary.innerHTML = `<span><strong>${compatibleAirlines.length}</strong> of ${airlineData.length} airlines permit this size</span>`;
        } else {
            summary.innerHTML = `<span>All <strong>${airlineData.length}</strong> supported airlines shown below</span>`;
        }
    }

    if (compatibleAirlines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-suitcase-rolling"></i>
                <p>No airlines found with carry-on allowances matching these dimensions.</p>
                <small>Try smaller dimensions or check checked luggage guidelines.</small>
            </div>
        `;
        return;
    }

    // Search/filter box
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "filter-box";
    searchInput.placeholder = "Filter compatible airlines by name...";
    searchInput.id = "active-search-input";
    searchInput.oninput = filterAirlineList;
    container.appendChild(searchInput);

    const ul = document.createElement("ul");
    ul.className = "airlines-grid";
    ul.id = "airlines-results-list";

    compatibleAirlines.forEach(item => {
        const li = document.createElement("li");
        li.className = "airline-card";
        li.innerHTML = `
            <span class="airline-name">
                <i class="fas fa-check-circle airline-badge"></i>
                <span>${item.airline}</span>
            </span>
            <span class="airline-dimensions">${formatDimensions(item.dimensions, unit)}</span>
        `;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

function filterAirlineList() {
    const input = document.getElementById("active-search-input");
    if (!input) return;
    const term = input.value.trim().toUpperCase();
    const items = document.querySelectorAll("#airlines-results-list .airline-card");

    items.forEach(li => {
        const text = li.querySelector(".airline-name span").textContent.toUpperCase();
        li.style.display = text.includes(term) ? "" : "none";
    });
}

/* Modal Directory Functionality */
function openAllAirlinesModal() {
    const modal = document.getElementById("all-airlines-modal");
    if (modal) {
        modal.style.display = "flex";
        renderDirectoryModal();
        const searchInput = document.getElementById("modal-search");
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
        }
    }
}

function closeAllAirlinesModal() {
    const modal = document.getElementById("all-airlines-modal");
    if (modal) {
        modal.style.display = "none";
    }
}

function renderDirectoryModal() {
    const container = document.getElementById("modal-airlines-container");
    if (!container) return;

    const selectedUnit = document.getElementById("units") ? document.getElementById("units").value : "cm";
    container.innerHTML = "";

    airlineData.forEach(item => {
        const div = document.createElement("div");
        div.className = "airline-card directory-item";
        div.innerHTML = `
            <span class="airline-name"><i class="fas fa-plane"></i> <span>${item.airline}</span></span>
            <span class="airline-dimensions">${formatDimensions(item.dimensions, selectedUnit)}</span>
        `;
        container.appendChild(div);
    });
}

function filterDirectory() {
    const input = document.getElementById("modal-search");
    if (!input) return;
    const term = input.value.trim().toUpperCase();
    const items = document.querySelectorAll("#modal-airlines-container .directory-item");

    items.forEach(item => {
        const name = item.querySelector(".airline-name span").textContent.toUpperCase();
        item.style.display = name.includes(term) ? "" : "none";
    });
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAllAirlinesModal();
    }
});
