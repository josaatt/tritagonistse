Copylet data = [];
let filteredData = [];

function formatDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.length <= 2) return `${dateStr}/2025`;
    
    const date = new Date(dateStr);
    const months = [
        'januari', 'februari', 'mars', 'april', 'maj', 'juni',
        'juli', 'augusti', 'september', 'oktober', 'november', 'december'
    ];
    
    if (dateStr.includes('-')) {
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } else {
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}
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
            <div class="proposition-title">
                ${item.nummer}. ${item.skrivelse}
            </div>
            <div class="proposition-meta">
                <span class="meta-item">
                    <i class="fas fa-building"></i>
                    ${item.departement}
                </span>
                <span class="meta-item">
                    <i class="fas fa-clock"></i>
                    ${item.period}
                </span>
                <span class="meta-item">
                    <span class="date-badge">
                        <i class="fas fa-calendar"></i>
                        ${formatDate(item.datum)}
                    </span>
                </span>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('count').innerHTML = `
        <i class="fas fa-list"></i>
        Visar ${filteredData.length} propositioner
    `;
}

// Exportera till iCalendar
function generateICS() {
    const events = filteredData.map(item => {
        const date = item.datum.includes('-') ? item.datum : `2025-${item.datum}-01`;
        const dateObj = new Date(date);
        // Lägg till en dag för att undvika tidszonsförskjutning
        dateObj.setDate(dateObj.getDate() + 1);
        const endDate = new Date(dateObj);
        endDate.setDate(endDate.getDate() + 1);

        // Formatera datum enligt iCal-standard (YYYYMMDD)
        const startDateStr = dateObj.toISOString().replace(/[-:]/g, '').split('T')[0];
        const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('T')[0];

        return `BEGIN:VEVENT
UID:prop-${item.nummer}-${date}@riksdagen.se
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.[0-9]{3}/, '')}
DTSTART;VALUE=DATE:${startDateStr}
DTEND;VALUE=DATE:${endDateStr}
SUMMARY:Proposition ${item.nummer}: ${item.skrivelse}
DESCRIPTION:${item.skrivelse}\\n\\nDepartement: ${item.departement}\\nPeriod: ${item.period}\\n
CATEGORIES:Propositioner,${item.departement}
STATUS:CONFIRMED
TRANSP:TRANSPARENT
CLASS:PUBLIC
END:VEVENT`;
    }).join('\n');

    const calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Riksdagens propositionskalender//SE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Propositionskalender 2025
X-WR-TIMEZONE:Europe/Stockholm
BEGIN:VTIMEZONE
TZID:Europe/Stockholm
X-LIC-LOCATION:Europe/Stockholm
END:VTIMEZONE
${events}
END:VCALENDAR`;

    const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Propositionskalender_2025.ics';
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
