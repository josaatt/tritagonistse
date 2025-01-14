let data = [];
let filteredData = [];

// Ladda data när sidan laddas
fetch('propforteckning.json')
    .then(response => response.json())
    .then(json => {
        data = processData(json);
        filteredData = data;
        updateUI();
        populateDepartments();
    })
    .catch(error => console.error('Error loading data:', error));

// Processera JSON data till platt struktur
function processData(jsonData) {
    return jsonData.flatMap(dept => {
        const beforeSummer = dept.riksdagsbehandling_fore_sommaren.map(item => ({
            ...item,
            departement: dept.departement,
            period: 'Före sommaren'
        }));
        const afterSummer = dept.riksdagsbehandling_efter_sommaren.map(item => ({
            ...item,
            departement: dept.departement,
            period: 'Efter sommaren'
        }));
        return [...beforeSummer, ...afterSummer];
    });
}

// Fyll i departement-dropdown
function populateDepartments() {
    const departments = [...new Set(data.map(item => item.departement))].sort();
    const select = document.getElementById('department');
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
}

// Uppdatera filtrerad data
function filterData() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const department = document.getElementById('department').value;
    const period = document.getElementById('period').value;

    filteredData = data.filter(item => {
        const matchesSearch = !searchTerm || 
            item.skrivelse.toLowerCase().includes(searchTerm) ||
            item.departement.toLowerCase().includes(searchTerm);
        const matchesDepartment = !department || item.departement === department;
        const matchesPeriod = !period || item.period === period;
        return matchesSearch && matchesDepartment && matchesPeriod;
    });

    updateUI();
}

// Uppdatera UI med filtrerad data
function updateUI() {
    const container = document.getElementById('propositions');
    container.innerHTML = '';

    filteredData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'proposition';
        div.innerHTML = `
            <div class="proposition-title">${item.nummer}. ${item.skrivelse}</div>
            <div class="proposition-meta">${item.departement} • ${item.datum} • ${item.period}</div>
        `;
        container.appendChild(div);
    });

    document.getElementById('count').textContent = `Visar ${filteredData.length} propositioner`;
}

// Exportera till iCalendar
function generateICS() {
    const events = filteredData.map(item => {
        const date = item.datum.includes('-') ? item.datum : `2025-${item.datum}-01`;
        return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${date.replace(/-/g, '')}
SUMMARY:${item.nummer}. ${item.skrivelse}
DESCRIPTION:Departement: ${item.departement}\\nPeriod: ${item.period}
END:VEVENT`;
    }).join('\n');

    const calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Propositionskalender//SE
${events}
END:VCALENDAR`;

    const blob = new Blob([calendar], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'propositioner.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Lägg till event listeners
document.getElementById('search').addEventListener('input', filterData);
document.getElementById('department').addEventListener('change', filterData);
document.getElementById('period').addEventListener('change', filterData);
document.getElementById('export').addEventListener('click', generateICS);
