// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

class NewPropertyManager {
    constructor() {
        this.debugMode = false;
        this.modal = null;
        this.form = null;
        this.isInitialized = false;
        this.draftKey = 'newPropertyDraft';

        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await this.waitForDOMReady();
            await this.waitForDependencies();

            this.setupElements();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupAutoSave();
            this.addNotificationStyles();

            this.isInitialized = true;

        } catch (error) {
            console.error('Fehler bei der Initialisierung:', error);
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

    waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                const hasLocalStorage = typeof loadPropertiesFromStorage === 'function' && 
                                      typeof savePropertiesToStorage === 'function';
                const hasChecklist = typeof getChecklistWEGMitHeiz === 'function';

                if (hasLocalStorage && hasChecklist) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    setupElements() {
        this.modal = document.getElementById('newPropertyModal');
        this.form = document.getElementById('newPropertyForm');

        if (!this.modal || !this.form) {
            console.warn('Modal-Elemente nicht gefunden - werden später initialisiert');
            return;
        }

        const yearInput = document.getElementById('accountingYear');
        if (yearInput && !yearInput.value) {
            yearInput.value = new Date().getFullYear();
        }
    }

    setupEventListeners() {

        const newImmoBtn = document.getElementById('newImmoBtn');
        if (newImmoBtn) {
            newImmoBtn.addEventListener('click', () => this.openModal());
        }

        if (!this.modal || !this.form) return;

        const closeBtn = document.getElementById('closeNewModal');
        const cancelBtn = document.getElementById('cancelNewProperty');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.setupRealtimeValidation();
    }

    setupRealtimeValidation() {
        if (!this.form) return;

        const inputs = this.form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            input.addEventListener('change', () => this.clearFieldError(input));
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isModalOpen()) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.closeModal();
                    break;
                case 'Enter':
                    if (e.ctrlKey && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        if (this.form) {
                            this.form.dispatchEvent(new Event('submit'));
                        }
                    }
                    break;
            }
        });
    }

    setupAutoSave() {
        if (!this.form) return;

        const formFields = this.form.querySelectorAll('input, select, textarea');

        formFields.forEach(field => {
            if (field.type !== 'submit' && field.type !== 'button') {
                field.addEventListener('input', () => this.saveDraft());
                field.addEventListener('change', () => this.saveDraft());
            }
        });
    }

    async openModal() {
        try {

            if (!this.modal || !this.form) {
                this.setupElements();
            }

            if (!this.modal) {
                console.error('Modal nicht gefunden');
                return;
            }

            await this.updatePortfolioDropdown();

            this.loadDraft();

            this.modal.style.display = 'flex';
            this.modal.classList.add('show');

            if (this.form) {
                const firstInput = this.form.querySelector('input:not([readonly]), select');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
            }

            console.log('Modal geöffnet');
        } catch (error) {
            console.error('Fehler beim Öffnen des Modals:', error);
            this.showError('Fehler beim Öffnen des Formulars');
        }
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        this.modal.classList.remove('show');
        this.resetForm();
        this.clearDraft();

        console.log('Modal geschlossen');
    }

    async updatePortfolioDropdown() {
        const portfolioSelect = document.getElementById('propertyPortfolio');

        if (portfolioSelect && window.portfolioManager) {
            try {
                window.portfolioManager.populatePortfolioDropdown(portfolioSelect, 'Standard');
                console.log('Portfolio-Dropdown aktualisiert');
            } catch (error) {
                console.warn('Fehler beim Aktualisieren des Portfolio-Dropdowns:', error);
            }
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        console.log('=== FORM SUBMIT DEBUG ===');

        try {

            const formData = this.collectFormDataDirect();
            console.log('Gesammelte Formulardaten:', formData);

            const validation = this.validateFormData(formData);
            console.log('Validierungsergebnis:', validation);

            if (!validation.isValid) {
                this.showValidationErrors(validation.errors);
                return;
            }

            const propertyData = this.createPropertyObject(formData);
            console.log('Property-Objekt:', propertyData);

            const success = await this.createProperty(propertyData);

            if (success) {
                this.showSuccess('Immobilie erfolgreich erstellt!');
                this.closeModal();
                this.refreshViews();
            } else {
                this.showError('Fehler beim Erstellen der Immobilie');
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten des Formulars:', error);
            this.showError('Ein unerwarteter Fehler ist aufgetreten');
        }
    }

    collectFormDataDirect() {
        const data = {};

        const fields = {
            propertyName: document.getElementById('propertyName'),
            propertyPortfolio: document.getElementById('propertyPortfolio'),
            propertyType: document.getElementById('propertyType'),
            hasHeating: document.getElementById('hasHeating'),
            accountingYear: document.getElementById('accountingYear'),
            accountingPeriod: document.getElementById('accountingPeriod')
        };

        console.log('=== FELDWERTE SAMMELN ===');

        Object.keys(fields).forEach(key => {
            const field = fields[key];
            if (field) {
                data[key] = field.value ? field.value.trim() : '';
                console.log(`${key}: "${data[key]}" (Element gefunden: ${!!field})`);
            } else {
                console.warn(`Feld ${key} nicht gefunden!`);
                data[key] = '';
            }
        });

        return data;
    }

    validateFormData(data) {
        const errors = [];

        console.log('=== VALIDIERUNG STARTET ===');
        console.log('Zu validierende Daten:', data);

        if (!data.propertyName || data.propertyName.length === 0) {
            console.log('❌ Name fehlt');
            errors.push({ field: 'propertyName', message: 'Immobilienname ist erforderlich' });
        } else if (data.propertyName.length < 2) {
            console.log('❌ Name zu kurz');
            errors.push({ field: 'propertyName', message: 'Name muss mindestens 2 Zeichen lang sein' });
        } else if (data.propertyName.length > 100) {
            console.log('❌ Name zu lang');
            errors.push({ field: 'propertyName', message: 'Name darf maximal 100 Zeichen lang sein' });
        } else if (this.isNameDuplicate(data.propertyName)) {
            console.log('❌ Name bereits vorhanden');
            errors.push({ field: 'propertyName', message: 'Eine Immobilie mit diesem Namen existiert bereits' });
        } else {
            console.log('✅ Name OK:', data.propertyName);
        }

        if (!data.propertyPortfolio || data.propertyPortfolio.length === 0) {
            console.log('❌ Portfolio fehlt');
            errors.push({ field: 'propertyPortfolio', message: 'Portfolio ist erforderlich' });
        } else {
            console.log('✅ Portfolio OK:', data.propertyPortfolio);
        }

        if (!data.propertyType || !['WEG', 'MV'].includes(data.propertyType)) {
            console.log('❌ Typ ungültig');
            errors.push({ field: 'propertyType', message: 'Gültiger Immobilientyp ist erforderlich' });
        } else {
            console.log('✅ Typ OK:', data.propertyType);
        }

        if (!data.hasHeating || !['true', 'false'].includes(data.hasHeating)) {
            console.log('❌ Heizung ungültig');
            errors.push({ field: 'hasHeating', message: 'Heizkostenabrechnung muss ausgewählt werden' });
        } else {
            console.log('✅ Heizung OK:', data.hasHeating);
        }

        const year = parseInt(data.accountingYear);
        const currentYear = new Date().getFullYear();
        if (!year || isNaN(year) || year < 2020 || year > currentYear + 5) {
            console.log('❌ Jahr ungültig');
            errors.push({ 
                field: 'accountingYear', 
                message: `Abrechnungsjahr muss zwischen 2020 und ${currentYear + 5} liegen` 
            });
        } else {
            console.log('✅ Jahr OK:', year);
        }

        if (!data.accountingPeriod || data.accountingPeriod.length === 0) {
            console.log('❌ Zeitraum fehlt');
            errors.push({ field: 'accountingPeriod', message: 'Abrechnungszeitraum ist erforderlich' });
        } else if (data.accountingPeriod.length < 5) {
            console.log('❌ Zeitraum zu kurz');
            errors.push({ field: 'accountingPeriod', message: 'Abrechnungszeitraum zu kurz' });
        } else {
            console.log('✅ Zeitraum OK:', data.accountingPeriod);
        }

        console.log(`=== VALIDIERUNG ENDE: ${errors.length} Fehler ===`);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    createPropertyObject(formData) {
        return {
            id: this.generateUniqueId(),
            name: formData.propertyName,
            portfolio: formData.propertyPortfolio,
            type: formData.propertyType,
            hasHeating: formData.hasHeating === 'true',
            accountingYear: parseInt(formData.accountingYear),
            accountingPeriod: formData.accountingPeriod,
            isDemo: false,
            notes: [],
            specialFeatures: [],
            checklist: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    validateField(field) {
        if (!field) return true;

        this.clearFieldError(field);

        const value = field.value ? field.value.trim() : '';
        let error = null;

        switch (field.id) {
            case 'propertyName':
                if (!value) {
                    error = 'Immobilienname ist erforderlich';
                } else if (value.length < 2) {
                    error = 'Name zu kurz (min. 2 Zeichen)';
                } else if (this.isNameDuplicate(value)) {
                    error = 'Name bereits vergeben';
                }
                break;

            case 'propertyPortfolio':
                if (!value) {
                    error = 'Portfolio ist erforderlich';
                }
                break;

            case 'propertyType':
                if (!value) {
                    error = 'Typ ist erforderlich';
                }
                break;

            case 'hasHeating':
                if (!value) {
                    error = 'Heizkostenabrechnung muss ausgewählt werden';
                }
                break;

            case 'accountingYear':
                const year = parseInt(value);
                const currentYear = new Date().getFullYear();
                if (!year || year < 2020 || year > currentYear + 5) {
                    error = `Jahr muss zwischen 2020-${currentYear + 5} liegen`;
                }
                break;

            case 'accountingPeriod':
                if (!value) {
                    error = 'Abrechnungszeitraum ist erforderlich';
                } else if (value.length < 5) {
                    error = 'Zeitraum zu kurz';
                }
                break;
        }

        if (error) {
            this.showFieldError(field, error);
            return false;
        }

        return true;
    }

    isNameDuplicate(name) {
        try {
            const existing = loadPropertiesFromStorage();
            return existing.some(prop => 
                prop.name.toLowerCase().trim() === name.toLowerCase().trim()
            );
        } catch (error) {
            console.warn('Fehler bei Duplikatsprüfung:', error);
            return false;
        }
    }

    async createProperty(propertyData) {
        try {

            propertyData.checklist = this.createInitialChecklist(propertyData.type, propertyData.hasHeating);

            const existing = loadPropertiesFromStorage();
            existing.push(propertyData);
            savePropertiesToStorage(existing);

            console.log('Neue Immobilie erstellt:', propertyData.name);
            return true;
        } catch (error) {
            console.error('Fehler beim Erstellen der Immobilie:', error);
            return false;
        }
    }

    createInitialChecklist(type, hasHeating) {
        try {
            let checklistItems = [];

            if (type === 'WEG') {
                checklistItems = hasHeating ? getChecklistWEGMitHeiz() : getChecklistWEGOhneHeiz();
            } else if (type === 'MV') {
                checklistItems = hasHeating ? getChecklistMVMitHeiz() : getChecklistMVOhneHeiz();
            }

            const checklist = {};
            checklistItems.forEach(item => {
                checklist[item] = {
                    completed: false,
                    specialOption: null
                };
            });

            return checklist;
        } catch (error) {
            console.warn('Fehler beim Erstellen der Checklist:', error);
            return {};
        }
    }

    showValidationErrors(errors) {
        this.clearAllErrors();

        console.log('Zeige Validierungsfehler:', errors);

        errors.forEach(error => {
            const field = document.getElementById(error.field);
            if (field) {
                this.showFieldError(field, error.message);
                console.log(`Fehler für Feld ${error.field} angezeigt:`, error.message);
            } else {
                console.warn(`Feld ${error.field} nicht gefunden für Fehler:`, error.message);
            }
        });

        if (errors.length > 0) {
            const firstErrorField = document.getElementById(errors[0].field);
            if (firstErrorField) {
                firstErrorField.focus();
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    showFieldError(field, message) {
        if (!field) return;

        this.clearFieldError(field);

        field.classList.add('error');
        field.style.borderColor = 'var(--error-color, #e74c3c)';

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.cssText = `
            color: var(--error-color, #e74c3c);
            font-size: 0.75rem;
            margin-top: 0.25rem;
            animation: fadeIn 0.2s ease;
        `;
        errorDiv.textContent = message;

        if (field.parentNode) {
            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(field) {
        if (!field) return;

        field.classList.remove('error');
        field.style.borderColor = '';

        const existingError = field.parentNode?.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    clearAllErrors() {
        if (!this.form) return;

        const errors = this.form.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());

        const errorFields = this.form.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error');
            field.style.borderColor = '';
        });
    }

    resetForm() {
        if (!this.form) return;

        this.form.reset();
        this.clearAllErrors();

        const yearInput = document.getElementById('accountingYear');
        if (yearInput) {
            yearInput.value = new Date().getFullYear();
        }
    }

refreshViews() {
    try {
        console.log('Aktualisiere alle Views nach Immobilienerstellung...');

        if (window.portfolioManager && typeof window.portfolioManager.updatePortfolioFilter === 'function') {
            window.portfolioManager.updatePortfolioFilter();
            window.portfolioManager.refreshPortfolioData();
        }

        const updateFunctions = [
            'updatePropertyCards',
            'renderPropertyCards', 
            'refreshPropertyList',
            'updateSidebarList',
            'updatePropertySidebar',
            'updateStatusCards',
            'refreshStatusOverview',
            'updatePeriodFilter',
            'refreshPeriodSelector',
            'updatePropertyFilter',
            'refreshPropertyFilter'
        ];

        updateFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                try {
                    window[funcName]();
                    console.log(`✅ ${funcName} erfolgreich ausgeführt`);
                } catch (error) {
                    console.warn(`⚠️ Fehler bei ${funcName}:`, error);
                }
            }
        });

        this.dispatchUpdateEvent();

        this.forceRefreshPropertyContainer();

        setTimeout(() => {
            this.performDelayedRefresh();
        }, 100);

        console.log('✅ Views erfolgreich aktualisiert');

    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren der Views:', error);
    }
}

async createProperty(propertyData) {
    try {

        propertyData.checklist = this.createInitialChecklist(propertyData.type, propertyData.hasHeating);

        const existing = loadPropertiesFromStorage();
        existing.push(propertyData);
        savePropertiesToStorage(existing);

        console.log('✅ Neue Immobilie erstellt:', propertyData.name);

        this.dispatchPropertyCreatedEvent(propertyData);

        return true;

    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Immobilie:', error);
        return false;
    }
}

dispatchPropertyCreatedEvent(propertyData) {
    try {
        const detailEvent = new CustomEvent('newPropertyAdded', {
            detail: {
                property: propertyData,
                timestamp: new Date().toISOString()
            }
        });

        document.dispatchEvent(detailEvent);
        console.log('✅ NewPropertyAdded Event mit Daten dispatched');

    } catch (error) {
        console.warn('⚠️ Fehler beim Property-Event:', error);
    }
}

async handleSubmit(event) {
    event.preventDefault();

    console.log('=== FORM SUBMIT DEBUG ===');

    try {
        const formData = this.collectFormDataDirect();
        console.log('Gesammelte Formulardaten:', formData);

        const validation = this.validateFormData(formData);
        console.log('Validierungsergebnis:', validation);

        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }

        const propertyData = this.createPropertyObject(formData);
        console.log('Property-Objekt:', propertyData);

        const success = await this.createProperty(propertyData);

        if (success) {
            this.showSuccess('Immobilie erfolgreich erstellt!');

            this.closeModal();

            this.refreshViews();

            this.performSuccessActions(propertyData);

        } else {
            this.showError('Fehler beim Erstellen der Immobilie');
        }

    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten des Formulars:', error);
        this.showError('Ein unerwarteter Fehler ist aufgetreten');
    }
}

performSuccessActions(propertyData) {
    try {

        if (typeof window.navigateToProperty === 'function') {
            setTimeout(() => {
                window.navigateToProperty(propertyData.id);
            }, 500);
        }

        setTimeout(() => {
            this.highlightNewProperty(propertyData.id);
        }, 300);

        if (typeof window.updatePropertyStatistics === 'function') {
            window.updatePropertyStatistics();
        }

    } catch (error) {
        console.warn('⚠️ Fehler bei Erfolgs-Aktionen:', error);
    }
}

highlightNewProperty(propertyId) {
    try {

        const selectors = [
            `[data-property-id="${propertyId}"]`,
            `#property-${propertyId}`,
            `#prop-${propertyId}`,
            `.property-card[data-id="${propertyId}"]`
        ];

        let propertyElement = null;

        for (const selector of selectors) {
            propertyElement = document.querySelector(selector);
            if (propertyElement) break;
        }

        if (propertyElement) {

            propertyElement.classList.add('newly-created');

            propertyElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

            setTimeout(() => {
                propertyElement.classList.remove('newly-created');
            }, 3000);

            console.log('✅ Neue Immobilie hervorgehoben');
        }

    } catch (error) {
        console.warn('⚠️ Fehler beim Hervorheben:', error);
    }
}

    saveDraft() {
        try {
            const data = this.collectFormDataDirect();
            data.timestamp = Date.now();
            localStorage.setItem(this.draftKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Fehler beim Speichern des Drafts:', error);
        }
    }

    loadDraft() {
        if (!this.form) return;

        try {
            const draft = localStorage.getItem(this.draftKey);
            if (!draft) return;

            const data = JSON.parse(draft);
            const age = Date.now() - (data.timestamp || 0);

            if (age > 3600000) {
                this.clearDraft();
                return;
            }

            Object.keys(data).forEach(key => {
                const field = document.getElementById(key);
                if (field && data[key] && key !== 'timestamp') {
                    field.value = data[key];
                }
            });

            console.log('Draft geladen');
        } catch (error) {
            console.warn('Fehler beim Laden des Drafts:', error);
        }
    }

    clearDraft() {
        try {
            localStorage.removeItem(this.draftKey);
        } catch (error) {
            console.warn('Fehler beim Löschen des Drafts:', error);
        }
    }

    generateUniqueId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `prop_${timestamp}_${random}`;
    }

    isModalOpen() {
        return this.modal && (this.modal.style.display === 'flex' || this.modal.classList.contains('show'));
    }

    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    }

    showError(message) {
        this.showNotification(message, 'error', 5000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle';

        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        const bgColor = type === 'success' ? 'var(--success-color, #27ae60)' :
                       type === 'error' ? 'var(--error-color, #e74c3c)' :
                       'var(--info-color, #3498db)';

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius, 8px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    addNotificationStyles() {
        if (document.getElementById('newPropertyStyles')) return;

        const style = document.createElement('style');
        style.id = 'newPropertyStyles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            .field-error {
                color: var(--error-color, #e74c3c);
                font-size: 0.75rem;
                margin-top: 0.25rem;
                animation: fadeIn 0.2s ease;
            }

            .error {
                border-color: var(--error-color, #e74c3c) !important;

            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        @keyframes pulseHighlight {
            0%, 100% {
                background-color: transparent;
                transform: scale(1);
            }
            50% {
                background-color: var(--success-color, #27ae60);
                transform: scale(1.02);
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .field-error {
            color: var(--error-color, #e74c3c);
            font-size: 0.75rem;
            margin-top: 0.25rem;
            animation: fadeIn 0.2s ease;
        }

        .error {
            border-color: var(--error-color, #e74c3c) !important;
        }

        .newly-created {
            animation: pulseHighlight 1s ease-in-out 3;
            border: 2px solid var(--success-color, #27ae60) !important;
            box-shadow: 0 0 15px rgba(39, 174, 96, 0.3) !important;
            border-radius: var(--border-radius, 8px);
        }

        .newly-created::after {
            content: "✓ Neu erstellt";
            position: absolute;
            top: -10px;
            right: -10px;
            background: var(--success-color, #27ae60);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: bold;
            animation: fadeIn 0.5s ease;
            z-index: 10;
        }

        `;
        document.head.appendChild(style);
    }
}

if (this.debugMode) {
    console.log('Debug-Nachricht');
}

let newPropertyManager;

document.addEventListener('DOMContentLoaded', () => {
    newPropertyManager = new NewPropertyManager();
});

window.openNewPropertyModal = () => {
    if (newPropertyManager) {
        newPropertyManager.openModal();
    }
};

window.closeNewPropertyModal = () => {
    if (newPropertyManager) {
        newPropertyManager.closeModal();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewPropertyManager;
}

window.initializeNewPropertyModule = () => {
    console.log('🚀 Initialisiere NewPropertyModule...');

    if (!window.newPropertyManager) {
        window.newPropertyManager = new NewPropertyManager();
        console.log('✅ NewPropertyManager erstellt');
    } else {
        console.log('ℹ️ NewPropertyManager bereits vorhanden');
    }

    return window.newPropertyManager;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.initializeNewPropertyModule();
    });
} else {

    window.initializeNewPropertyModule();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NewPropertyManager,
        initializeNewPropertyModule: window.initializeNewPropertyModule
    };
}

if (typeof define === 'function' && define.amd) {
    define(['NewPropertyManager'], function() {
        return {
            NewPropertyManager,
            initializeNewPropertyModule: window.initializeNewPropertyModule
        };
    });
}

console.log('📦 NewPropertyModule bereit zur Initialisierung');