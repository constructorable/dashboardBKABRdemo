// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

const DEMO_PROPERTY = {
    "id": "11123demo-1",
    "name": "Abteistr. 124 (Demo)",
    "portfolio": "Portfolio 1",
    "type": "MV",
    "hasHeating": true,
    "accountingYear": 2024,
    "accountingPeriod": "01.01.2024 - 31.12.2024",
    "isDemo": true,
    "notes": [
        {
            "id": "demo_note_1",
            "timestamp": "2025-06-20T10:30:00.000Z",
            "text": "Jahresabschluss 2024 vollständig erstellt und archiviert.",
            "author": "Verwalter Schmidt"
        },
        {
            "id": "demo_note_2",
            "timestamp": "2025-06-15T14:20:00.000Z",
            "text": "Heizungsanlage gewartet, neue Umwälzpumpe installiert.",
            "author": "Hausmeister Weber"
        },
        {
            "id": "demo_note_3",
            "timestamp": "2025-06-10T09:15:00.000Z",
            "text": "Eigentümerversammlung für März 2025 geplant.",
            "author": "Buchhalter Müller"
        },
        {
            "id": "demo_note_4",
            "timestamp": "2025-06-05T16:45:00.000Z",
            "text": "Eingangstür repariert, neue Schließanlage installiert.",
            "author": "Hausmeister Weber"
        },
        {
            "id": "demo_note_5",
            "timestamp": "2025-05-28T11:30:00.000Z",
            "text": "Mieterwechsel in Wohnung 2.3 erfolgreich abgewickelt.",
            "author": "Verwalter Schmidt"
        }
    ],
    "specialFeatures": [
        {
            "type": "Tiefgarage",
            "description": "15 Stellplätze mit Stromanschluss für E-Fahrzeuge"
        },
        {
            "type": "Aufzug",
            "description": "Personenaufzug modernisiert 2023, barrierefrei"
        },
        {
            "type": "Balkon/Terrasse",
            "description": "Große Süd-Terrasse mit 25qm und Markise"
        }
    ],
    "checklist": {
        "Verbrauchsrechnungen vorhanden": {
            "completed": true,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Dienstleistungsrechnung vorhanden": {
            "completed": true,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Wartungsrechnung vorhanden": {
            "completed": true,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Heizkostenabrechnung vorhanden": {
            "completed": true,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Buchungen durchgeführt": {
            "completed": true,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Abrechnung erstellt": {
            "completed": false,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Abrechnung dem Eigentümer zur Freigabe geschickt": {
            "completed": false,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Freigabe vom Eigentümer erhalten": {
            "completed": false,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Abrechnung buchen / sollstellen": {
            "completed": false,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        },
        "Abrechnung verschickt": {
            "completed": false,
            "hasSpecialOption": false,
            "specialOptionChecked": false
        }
    },
    "createdAt": "2024-03-15T10:00:00.000Z",
    "updatedAt": "2025-06-21T12:00:00.000Z"
};

function getDemoProperties() {
    return [DEMO_PROPERTY];
}

function initializeDemoData() {
    const demoProperties = getDemoProperties();
    const realProperties = (typeof loadPropertiesFromStorage === 'function')
        ? loadPropertiesFromStorage()
        : [];
    return [...demoProperties, ...realProperties];
}

function isDemoProperty(propertyId) {
    return propertyId && (
        propertyId.startsWith('demo-') || 
        propertyId.includes('11123demo-') ||
        propertyId.includes('demo') ||
        propertyId.startsWith('prop_') && propertyId.includes('demo')  
    );
}

function getRealProperties(allProperties) {
    return allProperties.filter(property => !isDemoProperty(property.id));
}

function getDemoPropertiesOnly(allProperties) {
    return allProperties.filter(property => isDemoProperty(property.id));
}

function getAllDemoProperties() {
    return getDemoProperties();
}

if (typeof window !== 'undefined') {
    window.getAllDemoProperties = getAllDemoProperties;
    window.getDemoProperties = getDemoProperties;
    window.initializeDemoData = initializeDemoData;
    window.isDemoProperty = isDemoProperty;
    window.getRealProperties = getRealProperties;
    window.getDemoPropertiesOnly = getDemoPropertiesOnly;
}

const DEFAULT_PORTFOLIOS = ['Standard', 'Portfolio 1', 'Portfolio 2', 'Portfolio 3'];

function syncDemoDataWithPortfolios() {
    const checkPortfolioManager = () => {
        if (typeof window.portfolioManager !== 'undefined' &&
            typeof window.portfolioManager.getPortfolios === 'function') {

            const portfolioManager = window.portfolioManager;

            DEFAULT_PORTFOLIOS.forEach(portfolio => {
                try {
                    const existingPortfolios = portfolioManager.getPortfolios();
                    if (!existingPortfolios.includes(portfolio)) {
                        portfolioManager.addPortfolio(portfolio, true);
                    }
                } catch (error) {
                    console.log(`Portfolio "${portfolio}" bereits vorhanden`);
                }
            });
        } else {
            setTimeout(checkPortfolioManager, 500);
        }
    };
    checkPortfolioManager();
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(syncDemoDataWithPortfolios, 1500);
});

class NewPropertyManager {
    constructor() {
        this.debugMode = false;
        this.modal = null;
        this.form = null;
        this.isInitialized = false;
        this.draftKey = 'newPropertyDraft';
        this.isReadOnlyMode = false; 
        this.currentProperty = null; 

        this.init();
    }

    async openModalReadOnly(propertyData) {
        try {
            console.log('📖 Öffne Modal im Read-Only Modus für:', propertyData.name);

            this.isReadOnlyMode = true;
            this.currentProperty = propertyData;

            if (!this.modal || !this.form) {
                this.setupElements();
            }

            if (!this.modal) {
                console.error('Modal nicht gefunden');
                return;
            }

            this.configureModalForReadOnly();

            this.loadPropertyDataReadOnly(propertyData);

            this.modal.style.display = 'flex';
            this.modal.classList.add('show', 'read-only-mode');

            this.showDemoNotification();

            console.log('📖 Read-Only Modal geöffnet');

        } catch (error) {
            console.error('Fehler beim Öffnen des Read-Only Modals:', error);
            this.showError('Fehler beim Öffnen der Immobilienansicht');
        }
    }

    configureModalForReadOnly() {
        if (!this.modal || !this.form) return;

        const modalTitle = this.modal.querySelector('.modal-title, h2, h3');
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i class="fas fa-eye"></i>
                ${this.currentProperty?.name || 'Immobilie'} 
                <span class="demo-badge">Demo - Nur Ansicht</span>
            `;
        }

        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.readOnly = true;
            input.disabled = true;
            input.classList.add('read-only');
        });

        const submitBtn = this.form.querySelector('button[type="submit"], .submit-btn, #saveProperty');
        if (submitBtn) {
            submitBtn.style.display = 'none';
        }

        const cancelBtn = this.form.querySelector('#cancelNewProperty, .cancel-btn');
        if (cancelBtn) {
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Schließen';
            cancelBtn.classList.add('close-btn');
        }

        this.addReadOnlyControls();
    }

    addReadOnlyControls() {
        const existingControls = this.modal.querySelector('.read-only-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'read-only-controls';
        controlsDiv.innerHTML = `
            <div class="demo-info">
                <i class="fas fa-info-circle"></i>
                <span>Dies ist eine Demo-Immobilie. Sie können alle Tabs durchsehen, aber keine Änderungen vornehmen.</span>
            </div>
            <div class="read-only-buttons">
                <button type="button" class="btn btn-secondary" id="viewOnlyTabs">
                    <i class="fas fa-tabs"></i> Alle Tabs anzeigen
                </button>
                <button type="button" class="btn btn-primary" id="closeReadOnlyModal">
                    <i class="fas fa-times"></i> Schließen
                </button>
            </div>
        `;

        const modalBody = this.modal.querySelector('.modal-body, .form-container');
        if (modalBody) {
            modalBody.appendChild(controlsDiv);
        }

        this.setupReadOnlyEventListeners();
    }

    setupReadOnlyEventListeners() {
        const closeBtn = document.getElementById('closeReadOnlyModal');
        const tabsBtn = document.getElementById('viewOnlyTabs');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (tabsBtn) {
            tabsBtn.addEventListener('click', () => this.showAllTabs());
        }

        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                if (this.isReadOnlyMode) {
                    e.preventDefault();
                    this.showDemoRestrictionMessage();
                }
            });
        }
    }

    loadPropertyDataReadOnly(propertyData) {
        if (!this.form || !propertyData) return;

        const fieldMappings = {
            'propertyName': propertyData.name,
            'propertyPortfolio': propertyData.portfolio,
            'propertyType': propertyData.type,
            'hasHeating': propertyData.hasHeating ? 'true' : 'false',
            'accountingYear': propertyData.accountingYear,
            'accountingPeriod': propertyData.accountingPeriod
        };

        Object.keys(fieldMappings).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && fieldMappings[fieldId] !== undefined) {
                field.value = fieldMappings[fieldId];
            }
        });

        this.displayAdditionalDemoInfo(propertyData);
    }

    displayAdditionalDemoInfo(propertyData) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'demo-additional-info';
        infoDiv.innerHTML = `
            <h4><i class="fas fa-info-circle"></i> Demo-Immobilie Details</h4>
            <div class="demo-info-grid">
                <div class="info-item">
                    <label>Erstellt am:</label>
                    <span>${new Date(propertyData.createdAt).toLocaleDateString('de-DE')}</span>
                </div>
                <div class="info-item">
                    <label>Letztes Update:</label>
                    <span>${new Date(propertyData.updatedAt).toLocaleDateString('de-DE')}</span>
                </div>
                <div class="info-item">
                    <label>Status:</label>
                    <span class="demo-status">Demo-Immobilie</span>
                </div>
                <div class="info-item">
                    <label>Checklisten-Items:</label>
                    <span>${Object.keys(propertyData.checklist || {}).length} Einträge</span>
                </div>
            </div>
        `;

        const modalBody = this.modal.querySelector('.modal-body, .form-container');
        if (modalBody) {
            modalBody.appendChild(infoDiv);
        }
    }

    showAllTabs() {
        console.log('📑 Zeige alle verfügbaren Tabs für Demo-Property');

        this.closeModal();

        setTimeout(() => {
            this.openDemoTabView(this.currentProperty);
        }, 300);
    }

    openDemoTabView(propertyData) {

        const tabModal = this.createDemoTabModal(propertyData);
        document.body.appendChild(tabModal);

        setTimeout(() => {
            tabModal.style.display = 'flex';
            tabModal.classList.add('show');
        }, 100);
    }

    createDemoTabModal(propertyData) {
        const modal = document.createElement('div');
        modal.className = 'modal demo-tab-modal';
        modal.id = 'demoTabModal';

        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-eye"></i>
                        ${propertyData.name} - Alle Bereiche
                        <span class="demo-badge">Demo-Ansicht</span>
                    </h2>
                    <button type="button" class="close-btn" id="closeDemoTabModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="demo-tabs">
                        <div class="tab-navigation">
                            <button class="tab-btn active" data-tab="basic">
                                <i class="fas fa-home"></i> Grunddaten
                            </button>
                            <button class="tab-btn" data-tab="checklist">
                                <i class="fas fa-tasks"></i> Checkliste
                            </button>
                            <button class="tab-btn" data-tab="documents">
                                <i class="fas fa-folder"></i> Dokumente
                            </button>
                            <button class="tab-btn" data-tab="notes">
                                <i class="fas fa-sticky-note"></i> Notizen
                            </button>
                        </div>
                        <div class="tab-content">
                            <div class="tab-pane active" id="tab-basic">
                                ${this.generateBasicTabContent(propertyData)}
                            </div>
                            <div class="tab-pane" id="tab-checklist">
                                ${this.generateChecklistTabContent(propertyData)}
                            </div>
                            <div class="tab-pane" id="tab-documents">
                                ${this.generateDocumentsTabContent(propertyData)}
                            </div>
                            <div class="tab-pane" id="tab-notes">
                                ${this.generateNotesTabContent(propertyData)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <div class="demo-notice">
                        <i class="fas fa-info-circle"></i>
                        Diese Ansicht zeigt alle verfügbaren Bereiche. In der Vollversion können Sie hier Daten bearbeiten.
                    </div>
                    <button type="button" class="btn btn-primary" id="closeDemoTabs">
                        <i class="fas fa-check"></i> Demo beendet
                    </button>
                </div>
            </div>
        `;

        this.setupDemoTabNavigation(modal);

        return modal;
    }

    generateBasicTabContent(propertyData) {
        return `
            <div class="demo-section">
                <h3>Grundinformationen</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Name:</label>
                        <span>${propertyData.name}</span>
                    </div>
                    <div class="info-item">
                        <label>Portfolio:</label>
                        <span>${propertyData.portfolio}</span>
                    </div>
                    <div class="info-item">
                        <label>Typ:</label>
                        <span>${propertyData.type === 'WEG' ? 'Wohnungseigentümergemeinschaft' : 'Mietverwaltung'}</span>
                    </div>
                    <div class="info-item">
                        <label>Heizkostenabrechnung:</label>
                        <span>${propertyData.hasHeating ? 'Ja' : 'Nein'}</span>
                    </div>
                    <div class="info-item">
                        <label>Abrechnungsjahr:</label>
                        <span>${propertyData.accountingYear}</span>
                    </div>
                    <div class="info-item">
                        <label>Abrechnungszeitraum:</label>
                        <span>${propertyData.accountingPeriod}</span>
                    </div>
                </div>
            </div>
        `;
    }

    generateChecklistTabContent(propertyData) {
        const checklist = propertyData.checklist || {};
        const items = Object.keys(checklist);

        return `
            <div class="demo-section">
                <h3>Checkliste (${items.length} Einträge)</h3>
                <div class="checklist-demo">
                    ${items.slice(0, 5).map(item => `
                        <div class="checklist-item demo">
                            <input type="checkbox" disabled ${checklist[item].completed ? 'checked' : ''}>
                            <span>${item}</span>
                            <span class="status ${checklist[item].completed ? 'completed' : 'pending'}">
                                ${checklist[item].completed ? 'Erledigt' : 'Offen'}
                            </span>
                        </div>
                    `).join('')}
                    ${items.length > 5 ? `
                        <div class="more-items">
                            <i class="fas fa-ellipsis-h"></i>
                            Und ${items.length - 5} weitere Einträge...
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    generateDocumentsTabContent(propertyData) {
        return `
            <div class="demo-section">
                <h3>Dokumente</h3>
                <div class="documents-demo">
                    <div class="document-item demo">
                        <i class="fas fa-file-pdf"></i>
                        <span>Hausgeldabrechnung ${propertyData.accountingYear}.pdf</span>
                        <span class="demo-label">Demo-Dokument</span>
                    </div>
                    <div class="document-item demo">
                        <i class="fas fa-file-excel"></i>
                        <span>Nebenkostenverteilung.xlsx</span>
                        <span class="demo-label">Demo-Dokument</span>
                    </div>
                    <div class="document-item demo">
                        <i class="fas fa-file-word"></i>
                        <span>Protokoll Eigentümerversammlung.docx</span>
                        <span class="demo-label">Demo-Dokument</span>
                    </div>
                </div>
                <div class="demo-note">
                    <i class="fas fa-info-circle"></i>
                    In der Vollversion können hier echte Dokumente hochgeladen und verwaltet werden.
                </div>
            </div>
        `;
    }

    generateNotesTabContent(propertyData) {
        return `
            <div class="demo-section">
                <h3>Notizen</h3>
                <div class="notes-demo">
                    <div class="note-item demo">
                        <div class="note-header">
                            <span class="note-date">${new Date().toLocaleDateString('de-DE')}</span>
                            <span class="note-author">Demo-Benutzer</span>
                        </div>
                        <div class="note-content">
                            Dies ist eine Beispiel-Notiz für die Demo-Immobilie. 
                            Hier können wichtige Informationen und Erinnerungen gespeichert werden.
                        </div>
                    </div>
                    <div class="note-item demo">
                        <div class="note-header">
                            <span class="note-date">${new Date(Date.now() - 86400000).toLocaleDateString('de-DE')}</span>
                            <span class="note-author">Demo-Benutzer</span>
                        </div>
                        <div class="note-content">
                            Weitere Demo-Notiz mit wichtigen Hinweisen zur Verwaltung.
                        </div>
                    </div>
                </div>
                <div class="demo-note">
                    <i class="fas fa-info-circle"></i>
                    In der Vollversion können hier beliebige Notizen erstellt und bearbeitet werden.
                </div>
            </div>
        `;
    }

    setupDemoTabNavigation(modal) {
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabPanes = modal.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetPane = modal.querySelector(`#tab-${targetTab}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }

                console.log(`📑 Wechsel zu Tab: ${targetTab}`);
            });
        });

        const closeBtn = modal.querySelector('#closeDemoTabModal, #closeDemoTabs');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBtn.click();
            }
        });
    }

    showDemoNotification() {
        this.showNotification(
            'Demo-Modus: Sie können alle Bereiche ansehen, aber keine Änderungen vornehmen.',
            'info',
            4000
        );
    }

    showDemoRestrictionMessage() {
        this.showNotification(
            'Diese Aktion ist in der Demo-Version nicht verfügbar.',
            'warning',
            3000
        );
    }

    closeModal() {
        if (!this.modal) return;

        this.modal.style.display = 'none';
        this.modal.classList.remove('show', 'read-only-mode');

        if (this.isReadOnlyMode) {
            this.resetReadOnlyMode();
        } else {
            this.resetForm();
            this.clearDraft();
        }

        console.log('Modal geschlossen');
    }

    resetReadOnlyMode() {
        this.isReadOnlyMode = false;
        this.currentProperty = null;

        if (this.form) {

            const inputs = this.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.readOnly = false;
                input.disabled = false;
                input.classList.remove('read-only');
            });

            const readOnlyControls = this.modal.querySelector('.read-only-controls, .demo-additional-info');
            if (readOnlyControls) {
                readOnlyControls.remove();
            }

            const submitBtn = this.form.querySelector('button[type="submit"], .submit-btn, #saveProperty');
            if (submitBtn) {
                submitBtn.style.display = '';
            }
        }

        const modalTitle = this.modal.querySelector('.modal-title, h2, h3');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-plus"></i> Neue Immobilie erstellen';
        }
    }
}

window.openDemoProperty = (propertyData) => {
    if (window.newPropertyManager) {
        window.newPropertyManager.openModalReadOnly(propertyData);
    } else {
        console.error('NewPropertyManager nicht verfügbar');
    }
};