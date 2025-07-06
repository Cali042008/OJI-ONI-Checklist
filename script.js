document.addEventListener('DOMContentLoaded', () => {
    // Referințe către elementele DOM
    const tableBody = document.getElementById('problems-table-body');
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIcon = themeToggleButton.querySelector('i');
    const searchInput = document.getElementById('search-input');
    const yearFilter = document.getElementById('year-filter');
    const classFilter = document.getElementById('class-filter');

    // NOU: Referințe pentru elementele de progres
    const ojiProgressText = document.getElementById('oji-progress-text');
    const ojiProgressFill = document.getElementById('oji-progress-fill');
    const oniProgressText = document.getElementById('oni-progress-text');
    const oniProgressFill = document.getElementById('oni-progress-fill');

    let allProblems = []; // Va stoca lista curată de probleme
    const storagePrefix = 'roalgo-checklist-';

    // --- LOGICA PENTRU TEMĂ (Light/Dark) ---
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

    themeToggleButton.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        localStorage.setItem('theme', newTheme);
    });

    // --- LOGICA PRINCIPALĂ ---

    // Funcție pentru a actualiza barele de progres
    function updateProgressBars() {
        const totalOJI = allProblems.filter(p => p.etapa_scurta === 'OJI').length;
        const totalONI = allProblems.filter(p => p.etapa_scurta === 'ONI').length;

        let solvedOJI = 0;
        let solvedONI = 0;

        allProblems.forEach(problem => {
            const problemId = storagePrefix + problem.kilonova;
            if (localStorage.getItem(problemId) === 'true') {
                if (problem.etapa_scurta === 'OJI') {
                    solvedOJI++;
                } else if (problem.etapa_scurta === 'ONI') {
                    solvedONI++;
                }
            }
        });

        const ojiPercentage = totalOJI > 0 ? (solvedOJI / totalOJI) * 100 : 0;
        const oniPercentage = totalONI > 0 ? (solvedONI / totalONI) * 100 : 0;

        ojiProgressText.textContent = `${solvedOJI} / ${totalOJI}`;
        ojiProgressFill.style.width = `${ojiPercentage}%`;
        
        oniProgressText.textContent = `${solvedONI} / ${totalONI}`;
        oniProgressFill.style.width = `${oniPercentage}%`;
    }

    // Funcție pentru a popula dropdown-urile de filtre
    function populateFilters(problems) {
        const years = [...new Set(problems.map(p => p.an))].sort((a, b) => b - a);
        const classes = [...new Set(problems.map(p => p.clasa_str))];
        const classOrder = ['V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI-XII', 'XI', 'XII'];
        classes.sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b));

        years.forEach(year => { if (year > 0) { const option = document.createElement('option'); option.value = year; option.textContent = year; yearFilter.appendChild(option); } });
        classes.forEach(cls => { if (cls) { const option = document.createElement('option'); option.value = cls; option.textContent = cls; classFilter.appendChild(option); } });
    }

    // Funcție pentru a afișa problemele în tabel, pe baza filtrelor curente
    function renderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedYear = yearFilter.value;
        const selectedClass = classFilter.value;

        const filteredProblems = allProblems.filter(problem => {
            const matchesSearch = problem.nume.toLowerCase().includes(searchTerm);
            const matchesYear = selectedYear === 'all' || String(problem.an) === selectedYear;
            const matchesClass = selectedClass === 'all' || problem.clasa_str === selectedClass;
            return matchesSearch && matchesYear && matchesClass;
        });
        
        tableBody.innerHTML = '';
        if (filteredProblems.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nicio problemă nu corespunde filtrelor selectate.</td></tr>`;
            return;
        }

        filteredProblems.forEach(problem => {
            const row = document.createElement('tr');
            const problemId = storagePrefix + problem.kilonova;
            const isSolved = localStorage.getItem(problemId) === 'true';

            // --- AICI ESTE MODIFICAREA ---
            // Am eliminat complet logica pentru butonul "Sugerează"
            let solutionHtml = problem.solutie_roalgo_reala
                ? `<a href="${problem.solutie_roalgo_reala}" class="solution-link" target="_blank" rel="noopener noreferrer">Soluție</a>`
                : `<span class="not-available">N/A</span>`;

            row.innerHTML = `
                <td class="status-col"><input type="checkbox" data-id="${problemId}" ${isSolved ? 'checked' : ''}></td>
                <td><a href="${problem.kilonova}" target="_blank" rel="noopener noreferrer">${problem.nume}</a></td>
                <td>${problem.etapa_scurta}</td>
                <td>${problem.an || 'N/A'}</td>
                <td>${problem.clasa_str || 'N/A'}</td>
                <td>${solutionHtml}</td>
            `;
            
            if (isSolved) row.classList.add('solved');
            tableBody.appendChild(row);
        });
    }

    // Funcție principală care încarcă și filtrează datele inițial
    async function main() {
        try {
            const response = await fetch('./probleme_finale_verificate.json');
            if (!response.ok) throw new Error(`Eroare la încărcare: ${response.statusText}`);
            const rawProblems = await response.json();
            
            allProblems = rawProblems.filter(problem => {
                const source = problem.sursa || '';
                const isOJI = /^OJI(\s|:|$)/.test(source);
                const isONI = /^ONI(\s|:|$)/.test(source);
                if (isOJI) problem.etapa_scurta = 'OJI';
                if (isONI) problem.etapa_scurta = 'ONI';
                return isOJI || isONI;
            });
            
            populateFilters(allProblems);
            renderTable();
            updateProgressBars();

        } catch (error) {
            console.error('A apărut o eroare:', error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Nu am putut încărca lista de probleme.</td></tr>`;
        }
    }
    
    // Adăugarea de "ascultători" pentru evenimente
    tableBody.addEventListener('change', event => {
        if (event.target.type === 'checkbox') {
            const checkbox = event.target;
            const problemId = checkbox.dataset.id;
            const row = checkbox.closest('tr');
            if (checkbox.checked) {
                localStorage.setItem(problemId, 'true');
                row.classList.add('solved');
            } else {
                localStorage.removeItem(problemId);
                row.classList.remove('solved');
            }
            updateProgressBars();
        }
    });

    // Filtrele vor re-afișa tabelul
    searchInput.addEventListener('input', renderTable);
    yearFilter.addEventListener('change', renderTable);
    classFilter.addEventListener('change', renderTable);
    
    // Pornim totul!
    main();
});