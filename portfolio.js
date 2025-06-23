// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

class PortfolioManager {
    constructor() {
        this.storageKey = 'immobilien_portfolios';
        this.demoPortfoliosKey = 'demo_portfolios_synced';
        this.isInitialized = false;

        this.loadPortfolios();
        this.initEventListeners();
        this.setupGlobalFunctions();

        this.asyncInit();
    }

    loadPortfolios() {
        let portfolios = localStorage.getItem(this.storageKey);
        if (!portfolios) {
            const defaultPortfolios = [
                'Portfolio 1',
                'Portfolio 2',
                'Portfolio 3'
            ];
            this.savePortfolios(defaultPortfolios);
            return defaultPortfolios;
        }
        return JSON.parse(portfolios);
    }

    async asyncInit() {
        try {
            await this.waitForDOMReady();
            this.syncWithDemoData();
            this.addModalStyles();
            this.isInitialized = true;

        } catch (error) {
            console.error('Fehler bei der Portfolio-Initialisierung:', error);
        }
    }

    waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    savePortfolios(portfolios) {
        const uniqueSorted = [...new Set(portfolios)].sort();
        localStorage.setItem(this.storageKey, JSON.stringify(uniqueSorted));
    }

    getPortfolios() {
        return this.loadPortfolios();
    }

    addPortfolio(portfolioName, silent = false) {
        if (!portfolioName || portfolioName.trim() === '') {
            throw new Error('Portfolio-Name darf nicht leer sein');
        }

        const portfolios = this.getPortfolios();
        const trimmedName = portfolioName.trim();

        if (portfolios.includes(trimmedName)) {
            if (!silent) {
                throw new Error('Portfolio existiert bereits');
            }
            return portfolios;
        }

        portfolios.push(trimmedName);
        portfolios.sort(); 
        this.savePortfolios(portfolios);
        this.updateAllPortfolioDropdowns();

        return portfolios;
    }

    editPortfolio(oldName, newName) {
        if (!newName || newName.trim() === '') {
            throw new Error('Portfolio-Name darf nicht leer sein');
        }

        const portfolios = this.getPortfolios();
        const trimmedNewName = newName.trim();

        if (oldName === trimmedNewName) {
            return portfolios; 
        }

        if (portfolios.includes(trimmedNewName)) {
            throw new Error('Portfolio-Name existiert bereits');
        }

        const index = portfolios.indexOf(oldName);
        if (index === -1) {
            throw new Error('Portfolio nicht gefunden');
        }

        portfolios[index] = trimmedNewName;
        portfolios.sort(); 
        this.savePortfolios(portfolios);

        this.updatePortfolioNameInProperties(oldName, trimmedNewName);
        this.updateAllPortfolioDropdowns();

        return portfolios;
    }

    deletePortfolio(portfolioName) {
        if (portfolioName === 'Standard') {
            throw new Error('Das Standard-Portfolio kann nicht gelöscht werden');
        }

        const portfolios = this.getPortfolios();
        const index = portfolios.indexOf(portfolioName);

        if (index === -1) {
            throw new Error('Portfolio nicht gefunden');
        }

        const useCount = this.getPropertyCountForPortfolio(portfolioName);

        if (useCount > 0) {
            throw new Error(`Portfolio wird noch von ${useCount} Immobilie(n) verwendet und kann nicht gelöscht werden`);
        }

        portfolios.splice(index, 1);
        this.savePortfolios(portfolios);
        this.updateAllPortfolioDropdowns();

        return portfolios;
    }

    populatePortfolioDropdown(selectElement, selectedValue = 'Standard') {
        if (!selectElement) {
            console.warn('Portfolio-Dropdown Element nicht gefunden');
            return;
        }

        const portfolios = this.getPortfolios();
        selectElement.innerHTML = '';

        portfolios.forEach(portfolio => {
            const option = document.createElement('option');
            option.value = portfolio;
            option.textContent = portfolio;
            if (portfolio === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });

    }

    updateAllPortfolioDropdowns() {

        const dropdownSelectors = [
            'propertyPortfolio',              
            'editPropertyPortfolioModal',     
            'portfolioFilter'                 
        ];

        dropdownSelectors.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const currentValue = element.value;

                if (id === 'portfolioFilter') {
                    this.updatePortfolioFilter();
                } else {
                    this.populatePortfolioDropdown(element, currentValue);
                }

            }
        });

        document.dispatchEvent(new CustomEvent('portfoliosUpdated', {
            detail: { portfolios: this.getPortfolios() }
        }));
    }

    createPortfolioFilter() {

        const filterControls = document.querySelector('.filter-controls');
        if (!filterControls) {
            console.warn('Filter-Controls Container nicht gefunden');
            return;
        }

        let portfolioFilter = document.getElementById('portfolioFilter');
        if (portfolioFilter) {
            this.updatePortfolioFilter();
            return;
        }

        portfolioFilter = document.createElement('select');
        portfolioFilter.id = 'portfolioFilter';
        portfolioFilter.className = 'filter-select';

        const periodFilter = document.getElementById('periodFilter');
        if (periodFilter && periodFilter.parentNode) {
            periodFilter.parentNode.insertBefore(portfolioFilter, periodFilter.nextSibling);
        } else {
            filterControls.appendChild(portfolioFilter);
        }

        this.updatePortfolioFilter();

        portfolioFilter.addEventListener('change', (e) => {
            if (typeof handleFilterChange === 'function') {
                handleFilterChange(e);
            }
        });

    }

    updatePortfolioFilter() {
        let portfolioFilter = document.getElementById('portfolioFilter');
        if (!portfolioFilter) {
            return; 
        }

        const portfolios = this.getPortfolios();
        const currentValue = portfolioFilter.value || '';

        portfolioFilter.innerHTML = '<option value="">Alle Portfolios</option>';

        portfolios.forEach(portfolio => {
            const option = document.createElement('option');
            option.value = portfolio;
            option.textContent = portfolio;
            if (portfolio === currentValue) {
                option.selected = true;
            }
            portfolioFilter.appendChild(option);
        });
    }

    updatePortfolioNameInProperties(oldName, newName) {
        try {
            const properties = typeof loadPropertiesFromStorage === 'function' ? loadPropertiesFromStorage() : [];
            let updated = false;

            properties.forEach(property => {
                if (property.portfolio === oldName) {
                    property.portfolio = newName;
                    updated = true;
                }
            });

            if (updated && typeof savePropertiesToStorage === 'function') {
                savePropertiesToStorage(properties);
                console.log(`Portfolio-Name in ${properties.filter(p => p.portfolio === newName).length} Immobilien aktualisiert`);
            }
        } catch (error) {
            console.warn('Fehler beim Aktualisieren der Portfolio-Namen in Immobilien:', error);
        }
    }

    getPropertyCountForPortfolio(portfolioName) {
        try {
            let allProperties = [];

            if (typeof loadPropertiesFromStorage === 'function') {
                const realProperties = loadPropertiesFromStorage() || [];
                allProperties = allProperties.concat(realProperties);
            }

            if (typeof window.getDemoProperties === 'function') {
                const demoProperties = window.getDemoProperties() || [];
                allProperties = allProperties.concat(demoProperties);
            }

            const uniqueProperties = allProperties.filter((prop, index, self) => 
                index === self.findIndex(p => p.id === prop.id)
            );

            return uniqueProperties.filter(property => {
                const propertyPortfolio = property.portfolio || 'Standard';
                return propertyPortfolio === portfolioName;
            }).length;
        } catch (error) {
            console.warn('Fehler beim Zählen der Portfolio-Immobilien:', error);
            return 0;
        }
    }

    syncWithDemoData() {

        const currentPortfolios = new Set(this.getPortfolios());
        const discoveredPortfolios = new Set();

        const demoPortfolioNames = [
            'Portfolio 1', 'Portfolio 2', 'Portfolio 3'
        ];

        demoPortfolioNames.forEach(portfolio => discoveredPortfolios.add(portfolio));

        const newPortfolios = Array.from(discoveredPortfolios)
            .filter(portfolio => !currentPortfolios.has(portfolio));

        if (newPortfolios.length > 0) {
            console.log(`${newPortfolios.length} neue Portfolios gefunden:`, newPortfolios);

            const allPortfolios = [...currentPortfolios, ...newPortfolios].sort();
            this.savePortfolios(allPortfolios);

            setTimeout(() => {
                this.updateAllPortfolioDropdowns();
            }, 100);
        }
    }

    createPortfolioModal() {
        const existingModal = document.getElementById('portfolioModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="portfolioModal" class="modal">
                <div class="modal-content portfolio-modal-large">
                    <div class="modal-header">
                        <h2><i class="fas fa-briefcase"></i> Portfolio-Verwaltung</h2>
                        <button class="modal-close" id="closePortfolioModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="portfolio-add-section">
                            <h3><i class="fas fa-plus-circle"></i> Neues Portfolio hinzufügen</h3>
                            <div class="portfolio-form-row">
                                <div class="form-group-inline">
                                    <label for="newPortfolioName">Portfolio-Name:</label>
                                    <input type="text" id="newPortfolioName" placeholder="z.B. Immobilien AG" maxlength="50">
                                    <button type="button" id="addPortfolioBtn" class="btn btn-primary">
                                        <i class="fas fa-plus"></i> Hinzufügen
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="section-divider"></div>
                        <div class="portfolio-table-section">
                            <h3><i class="fas fa-table"></i> Vorhandene Portfolios</h3>
                            <div class="portfolio-table-container">
                                <table class="portfolio-table">
                                    <thead>
                                        <tr>
                                            <th>Portfolio-Name</th>
                                            <th>Anzahl Immobilien</th>
                                            <th>Status</th>
                                            <th>Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody id="portfolioTableBody">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('Portfolio Modal erstellt');
    }

openPortfolioModal() {
    let modal = document.getElementById('portfolioModal');
    if (!modal) {
        this.createPortfolioModal();
        modal = document.getElementById('portfolioModal');
        this.setupPortfolioModalEvents();
    }

    const highestZIndex = this.getHighestModalZIndex();
    const portfolioZIndex = Math.max(highestZIndex + 100, 2000);

    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.zIndex = portfolioZIndex; 
    modal.classList.remove('hidden');
    modal.classList.add('show', 'visible');

    console.log(`Portfolio Modal geöffnet mit z-index: ${portfolioZIndex}`);

    setTimeout(() => {
        this.displayPortfolioList();
    }, 100);
}

getHighestModalZIndex() {
    const modals = document.querySelectorAll('.modal, [class*="modal"]');
    let highestZIndex = 1000;

    modals.forEach(modal => {
        const computedStyle = window.getComputedStyle(modal);
        const zIndex = parseInt(computedStyle.zIndex) || 0;
        if (zIndex > highestZIndex) {
            highestZIndex = zIndex;
        }
    });

    console.log(`Höchster gefundener z-index: ${highestZIndex}`);
    return highestZIndex;
}

closePortfolioModal() {
    const modal = document.getElementById('portfolioModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.style.zIndex = '-1';
        modal.classList.remove('show', 'visible');
        modal.classList.add('hidden');

        console.log('Portfolio Modal geschlossen');
        this.onModalClosed();
    }
}

    displayPortfolioList() {
        const tableBody = document.getElementById('portfolioTableBody');
        if (!tableBody) return;

        const portfolios = this.getPortfolios();
        tableBody.innerHTML = '';

        portfolios.forEach((portfolio) => {
            const useCount = this.getPropertyCountForPortfolio(portfolio);
            const isStandard = portfolio === 'Standard';
            const isInUse = useCount > 0;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.escapeHtml(portfolio)} ${isStandard ? '<span class="standard-badge">Standard</span>' : ''}</td>
                <td>${useCount}</td>
                <td>${isStandard ? 'Geschützt' : isInUse ? 'In Verwendung' : 'Nicht verwendet'}</td>
                <td>
                    ${!isStandard ? `
                        <button class="btn btn-sm btn-secondary edit-portfolio-btn" data-portfolio="${this.escapeHtml(portfolio)}">
                            Bearbeiten
                        </button>
                        <button class="btn btn-sm btn-danger delete-portfolio-btn" data-portfolio="${this.escapeHtml(portfolio)}" ${isInUse ? 'disabled' : ''}>
                            Löschen
                        </button>
                    ` : 'Keine Aktionen'}
                </td>
            `;

            tableBody.appendChild(row);
        });

        this.attachTableEventListeners(tableBody);
    }

    attachTableEventListeners(tableBody) {
        const editButtons = tableBody.querySelectorAll('.edit-portfolio-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const portfolioName = e.currentTarget.dataset.portfolio;
                this.showEditPortfolioDialog(portfolioName);
            });
        });

        const deleteButtons = tableBody.querySelectorAll('.delete-portfolio-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const portfolioName = e.currentTarget.dataset.portfolio;
                this.showDeletePortfolioDialog(portfolioName);
            });
        });
    }

    setupPortfolioModalEvents() {
        const closeBtn = document.getElementById('closePortfolioModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePortfolioModal());
        }

        const addBtn = document.getElementById('addPortfolioBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddPortfolio());
        }

        const nameInput = document.getElementById('newPortfolioName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddPortfolio();
                }
            });
        }

        const modal = document.getElementById('portfolioModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closePortfolioModal();
                }
            });
        }
    }

    handleAddPortfolio() {
        const input = document.getElementById('newPortfolioName');
        const portfolioName = input.value.trim();

        if (!portfolioName) {
            alert('Bitte geben Sie einen Portfolio-Namen ein');
            return;
        }

        try {
            this.addPortfolio(portfolioName);
            input.value = '';
            this.displayPortfolioList();
            this.showMessage('Portfolio erfolgreich hinzugefügt', 'success');
        } catch (error) {
            alert('Fehler: ' + error.message);
        }
    }

    showEditPortfolioDialog(portfolioName) {
        const newName = prompt(`Portfolio-Name bearbeiten:`, portfolioName);

        if (newName === null || newName.trim() === portfolioName) return;

        if (!newName.trim()) {
            alert('Portfolio-Name darf nicht leer sein!');
            return;
        }

        try {
            this.editPortfolio(portfolioName, newName.trim());
            this.displayPortfolioList();
            this.showMessage(`Portfolio "${portfolioName}" wurde zu "${newName.trim()}" umbenannt`, 'success');
        } catch (error) {
            alert('Fehler: ' + error.message);
        }
    }

    showDeletePortfolioDialog(portfolioName) {
        const confirmed = confirm(`Portfolio "${portfolioName}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);

        if (!confirmed) return;

        try {
            this.deletePortfolio(portfolioName);
            this.displayPortfolioList();
            this.showMessage(`Portfolio "${portfolioName}" wurde gelöscht`, 'success');
        } catch (error) {
            alert('Fehler: ' + error.message);
        }
    }

    onModalClosed() {
        document.dispatchEvent(new CustomEvent('portfolioModalClosed'));

        if (this.closeCallback && typeof this.closeCallback === 'function') {
            try {
                this.closeCallback();
                this.closeCallback = null;
            } catch (error) {
                console.warn('Fehler beim Ausführen des Close-Callbacks:', error);
            }
        }
    }

    setCloseCallback(callback) {
        this.closeCallback = callback;
    }

    initEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'portfolioManagementBtn') {
                this.openPortfolioModal();
            }
        });
    }

    setupGlobalFunctions() {
        window.updateAllPortfolioDropdowns = () => this.updateAllPortfolioDropdowns();
        window.getAvailablePortfolios = () => this.getPortfolios();
        window.addPortfolioIfNotExists = (name) => this.addPortfolio(name, true);
    }

addModalStyles() {
    if (document.getElementById('portfolioModalStyles')) return;

    const style = document.createElement('style');
    style.id = 'portfolioModalStyles';
    style.textContent = `

        #portfolioModal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.6) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important; 
        }

        #portfolioModal.hidden {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            z-index: -1 !important;
        }

        #portfolioModal.show {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 9999 !important;
        }

        #portfolioModal .modal-content {
            position: relative !important;
            z-index: 10000 !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
        }

        .portfolio-modal-large {
            max-width: 90vw !important;
            width: 1000px !important;
            margin: 2rem !important;
        }

        .modal:not(#portfolioModal) {
            z-index: 1050 !important;
        }

        .standard-badge {
            background: #ffc107 !important;
            color: #212529 !important;
            padding: 0.2rem 0.4rem !important;
            border-radius: 0.25rem !important;
            font-size: 0.75rem !important;
            margin-left: 0.5rem !important;
        }

        .section-divider {
            height: 1px !important;
            background: #dee2e6 !important;
            margin: 1.5rem 0 !important;
        }

        .portfolio-table {
            width: 100% !important;
            border-collapse: collapse !important;
        }

        .portfolio-table th,
        .portfolio-table td {
            padding: 0.75rem !important;
            border-bottom: 1px solid #dee2e6 !important;
            text-align: left !important;
        }

        .portfolio-table th,
        .portfolio-table td {
            padding: 0 35px 3px 20px !important;
        }

        .portfolio-table th {
            background: #f8f9fa !important;
            font-weight: 600 !important;
        }

        #portfolioModal.show {
            animation: portfolioModalFadeIn 0.3s ease !important;
        }

        @keyframes portfolioModalFadeIn {
            from {
                opacity: 0 !important;
                transform: scale(0.9) !important;
            }
            to {
                opacity: 1 !important;
                transform: scale(1) !important;
            }
        }

        #portfolioModal {
            backdrop-filter: blur(2px) !important;
        }
    `;
    document.head.appendChild(style);
}

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

window.portfolioManager = new PortfolioManager();

function getPortfolioManager() {
    return window.portfolioManager;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.portfolioManager && !window.portfolioManager.isInitialized) {
        setTimeout(() => {
            window.portfolioManager.updateAllPortfolioDropdowns();
            window.portfolioManager.createPortfolioFilter();
        }, 1000);
    }
});