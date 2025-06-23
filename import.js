// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

const IMPORT_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, 
    supportedVersions: ['1.0'],
    allowedExtensions: ['.json']
};

function importData(jsonData, options = {}) {
    try {
        const {
            mergeWithExisting = false,
            skipDemoData = true,
            validateStructure = true,
            createBackup = true
        } = options;

        if (createBackup) {
            const backupKey = `import_backup_${Date.now()}`;
            const currentData = exportAllData();
            if (currentData) {
                localStorage.setItem(backupKey, currentData);
                console.log('Backup vor Import erstellt:', backupKey);
            }
        }

        let importedData;
        try {
            importedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (parseError) {
            throw new Error('Ungültiges JSON-Format');
        }

        if (validateStructure) {
            validateImportStructure(importedData);
        }

        let propertiesToImport = importedData.properties || [];

        if (skipDemoData) {
            propertiesToImport = propertiesToImport.filter(prop => !prop.isDemo);
        }

        const validatedProperties = propertiesToImport.map(property => {
            const validated = validateAndRepairImportedProperty(property);
            validated.isDemo = false; 
            validated.importedAt = new Date().toISOString();
            return validated;
        });

        const existingProperties = loadPropertiesFromStorage();

        let finalProperties;
        if (mergeWithExisting) {

            finalProperties = mergeProperties(existingProperties, validatedProperties);
        } else {

            finalProperties = validatedProperties;
        }

        const saveSuccess = savePropertiesToStorage(finalProperties);

        if (!saveSuccess) {
            throw new Error('Fehler beim Speichern der importierten Daten');
        }

        let settingsImported = false;
        if (importedData.settings) {
            const currentSettings = loadSettingsFromStorage();
            const mergedSettings = { ...currentSettings, ...importedData.settings };
            settingsImported = saveSettingsToStorage(mergedSettings);
        }

        updateGlobalVariablesAfterImport();

        const result = {
            success: true,
            importedProperties: validatedProperties.length,
            totalProperties: finalProperties.length,
            previousProperties: existingProperties.length,
            settingsImported,
            mergedWithExisting: mergeWithExisting,
            metadata: importedData.metadata || null
        };

        console.log('Import erfolgreich abgeschlossen:', result);
        return result;

    } catch (error) {
        console.error('Fehler beim Import:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function validateAndRepairImportedProperty(property) {

    const repairedProperty = {
        id: property.id || generateUniqueId(),
        name: property.name || 'Unbenannte Immobilie',
        portfolio: property.portfolio || 'Standard', 
        type: property.type || 'MV',
        hasHeating: property.hasHeating !== undefined ? property.hasHeating : false,
        accountingYear: property.accountingYear || new Date().getFullYear(),
        accountingPeriod: property.accountingPeriod || '',
        isDemo: false, 
        notes: property.notes || '',
        specialFeatures: Array.isArray(property.specialFeatures) ? property.specialFeatures : [],
        checklist: property.checklist || {},
        createdAt: property.createdAt || new Date().toISOString(),
        updatedAt: property.updatedAt || new Date().toISOString(),
        importedAt: new Date().toISOString()
    };

    repairedProperty.checklist = validateAndRepairChecklist(repairedProperty.checklist, repairedProperty);

    repairedProperty.specialFeatures = repairedProperty.specialFeatures.map(feature => ({
        type: feature.type || 'Unbekannt',
        description: feature.description || ''
    }));

    console.log('Property validiert:', repairedProperty.name, 'Portfolio:', repairedProperty.portfolio);

    return repairedProperty;
}

function validateAndRepairChecklist(checklist, property) {
    const validatedChecklist = {};

    const baseChecklist = createBaseChecklistForProperty(property);

    for (const [itemName, itemData] of Object.entries(checklist)) {
        validatedChecklist[itemName] = {
            completed: itemData.completed === true,
            hasSpecialOption: itemData.hasSpecialOption === true,
            specialOptionChecked: itemData.specialOptionChecked === true
        };
    }

    for (const [itemName, itemData] of Object.entries(baseChecklist)) {
        if (!validatedChecklist[itemName]) {
            validatedChecklist[itemName] = itemData;
        }
    }

    return validatedChecklist;
}

function createBaseChecklistForProperty(property) {
    const baseItems = {
        'Verbrauchsrechnungen vorhanden': { completed: false, hasSpecialOption: false, specialOptionChecked: false },
        'Wartungsrechnung vorhanden': { completed: false, hasSpecialOption: false, specialOptionChecked: false },
        'Dienstleistungsrechnung vorhanden': { completed: false, hasSpecialOption: false, specialOptionChecked: false },
        'Freigabe vom Eigentümer erhalten': { completed: false, hasSpecialOption: false, specialOptionChecked: false },
        'Buchungen durchgeführt': { completed: false, hasSpecialOption: false, specialOptionChecked: false },
        'Abrechnung dem Eigentümer zur Freigabe geschickt': { completed: false, hasSpecialOption: false, specialOptionChecked: false }
    };

    if (property.hasHeating) {
        baseItems['Heizkostenaufstellung eingereicht'] = { completed: false, hasSpecialOption: false, specialOptionChecked: false };
        baseItems['Heizkostenaufstellung zurückerhalten'] = { completed: false, hasSpecialOption: true, specialOptionChecked: false };
    }

    return baseItems;
}

function validateImportStructure(data) {

    if (!data || typeof data !== 'object') {
        throw new Error('Ungültige Datenstruktur: Hauptobjekt fehlt');
    }

    if (!data.properties || !Array.isArray(data.properties)) {
        throw new Error('Ungültige Datenstruktur: Properties-Array fehlt oder ist ungültig');
    }

    if (data.metadata && data.metadata.exportVersion) {
        if (!IMPORT_CONFIG.supportedVersions.includes(data.metadata.exportVersion)) {
            console.warn(`Warnung: Export-Version ${data.metadata.exportVersion} möglicherweise nicht vollständig kompatibel`);
        }
    }

    data.properties.forEach((property, index) => {
        if (!property.id) {
            throw new Error(`Property ${index + 1}: ID fehlt`);
        }
        if (!property.name) {
            throw new Error(`Property ${index + 1}: Name fehlt`);
        }
        if (!['WEG', 'MV'].includes(property.type)) {
            console.warn(`Property ${index + 1}: Unbekannter Type "${property.type}", wird auf "MV" gesetzt`);
        }
    });

    return true;
}

function mergeProperties(existing, imported) {
    const merged = [...existing];

    imported.forEach(importedProp => {
        const existingIndex = merged.findIndex(prop => prop.id === importedProp.id);

        if (existingIndex !== -1) {

            merged[existingIndex] = {
                ...merged[existingIndex],
                ...importedProp,

                portfolio: importedProp.portfolio || merged[existingIndex].portfolio || 'Standard',
                updatedAt: new Date().toISOString(),
                mergedFromImport: true
            };
            console.log('Property gemerged:', merged[existingIndex].name, 'Portfolio:', merged[existingIndex].portfolio);
        } else {

            const newProperty = {
                ...importedProp,
                portfolio: importedProp.portfolio || 'Standard', 
                importedAt: new Date().toISOString()
            };
            merged.push(newProperty);
            console.log('Property hinzugefügt:', newProperty.name, 'Portfolio:', newProperty.portfolio);
        }
    });

    return merged;
}

function updateGlobalVariablesAfterImport() {
    try {

        if (typeof initializeDemoData === 'function') {
            if (typeof window !== 'undefined') {
                window.currentProperties = initializeDemoData();
                window.filteredProperties = [...window.currentProperties];
            }
        }

        console.log('Globale Variablen nach Import aktualisiert');
    } catch (error) {
        console.error('Fehler beim Aktualisieren der globalen Variablen:', error);
    }
}

function updateViewsAfterImport() {
    try {

        if (typeof renderAllViews === 'function') {
            renderAllViews();
        } else if (typeof refreshAllViews === 'function') {
            refreshAllViews();
        } else if (typeof updateAllViews === 'function') {
            updateAllViews();
        }

        if (typeof updateFiltersOnDataChange === 'function') {
            updateFiltersOnDataChange();
        }

        const portfolioManager = window.portfolioManager || getPortfolioManager();
        if (portfolioManager) {
            portfolioManager.updateAllPortfolioDropdowns();
            portfolioManager.createPortfolioFilter(); 
        }

        console.log('Views und Portfolios nach Import aktualisiert');
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Views:', error);
    }
}

function extractAndAddPortfoliosFromImport(propertiesToImport) {
    try {
        if (!propertiesToImport || !Array.isArray(propertiesToImport)) {
            console.warn('Keine Properties für Portfolio-Extraktion gefunden');
            return { added: 0, existing: 0, portfolios: [] };
        }

        const portfolioManager = window.portfolioManager || getPortfolioManager();
        if (!portfolioManager) {
            console.warn('Portfolio-Manager nicht verfügbar');
            return { added: 0, existing: 0, portfolios: [] };
        }

        const importedPortfolios = new Set();

        propertiesToImport.forEach(property => {
            const portfolioName = property.portfolio || property.Portfolio;
            if (portfolioName && typeof portfolioName === 'string' && portfolioName.trim() !== '') {
                importedPortfolios.add(portfolioName.trim());
            }
        });

        const existingPortfolios = new Set(portfolioManager.getPortfolios());

        let addedCount = 0;
        let existingCount = 0;
        const addedPortfolios = [];

        for (const portfolioName of importedPortfolios) {
            if (existingPortfolios.has(portfolioName)) {
                existingCount++;
            } else {
                try {
                    portfolioManager.addPortfolio(portfolioName, true); 
                    addedCount++;
                    addedPortfolios.push(portfolioName);
                    console.log(`Portfolio hinzugefügt: ${portfolioName}`);
                } catch (error) {
                    console.warn(`Fehler beim Hinzufügen von Portfolio "${portfolioName}":`, error);
                }
            }
        }

        portfolioManager.updateAllPortfolioDropdowns();

        return {
            added: addedCount,
            existing: existingCount,
            portfolios: addedPortfolios,
            total: importedPortfolios.size
        };

    } catch (error) {
        console.error('Fehler bei Portfolio-Extraktion:', error);
        return { added: 0, existing: 0, portfolios: [] };
    }
}

function importFromFile(file, options = {}) {
    return new Promise((resolve, reject) => {
        try {

            const validationResult = validateImportFile(file);
            if (!validationResult.valid) {
                reject(new Error(validationResult.error));
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const result = importData(e.target.result, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = function() {
                reject(new Error('Fehler beim Lesen der Datei'));
            };

            reader.readAsText(file);

        } catch (error) {
            reject(error);
        }
    });
}

function validateImportFile(file) {

    if (file.size > IMPORT_CONFIG.maxFileSize) {
        return {
            valid: false,
            error: `Datei zu groß. Maximum: ${IMPORT_CONFIG.maxFileSize / (1024 * 1024)}MB`
        };
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!IMPORT_CONFIG.allowedExtensions.includes(fileExtension)) {
        return {
            valid: false,
            error: `Ungültiger Dateityp. Erlaubt: ${IMPORT_CONFIG.allowedExtensions.join(', ')}`
        };
    }

    return { valid: true };
}

function showImportOptionsModal() {
    const modalHtml = `
        <div class="modal fade" id="importModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-upload mr-2"></i>
                            Daten importieren
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="file-upload-area" id="fileUploadArea">
                            <div class="upload-content">
                                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                                <h6>Datei hier ablegen oder klicken zum Auswählen</h6>
                                <p class="text-muted">JSON-Dateien bis zu 10MB</p>
                                <input type="file" id="importFileInput" accept=".json" style="display: none;">
                                <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('importFileInput').click()">
                                    <i class="fas fa-folder-open mr-1"></i>
                                    Datei auswählen
                                </button>
                            </div>
                        </div>

                        <div id="fileInfo" style="display: none;" class="mt-3">
                            <div class="border rounded p-3 bg-light">
                                <h6><i class="fas fa-file-alt mr-2"></i>Datei-Informationen:</h6>
                                <div id="fileDetails"></div>
                            </div>
                        </div>

                        <form id="importForm" style="display: none;" class="mt-3">
                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="mergeWithExisting">
                                    <label class="form-check-label" for="mergeWithExisting">
                                        Mit bestehenden Daten zusammenführen
                                    </label>
                                    <small class="form-text text-muted">
                                        Bestehende Immobilien werden aktualisiert, neue hinzugefügt
                                    </small>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="skipDemoData" checked>
                                    <label class="form-check-label" for="skipDemoData">
                                        Demo-Daten überspringen
                                    </label>
                                    <small class="form-text text-muted">
                                        Demo-Immobilien werden nicht importiert
                                    </small>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="createBackup" checked>
                                    <label class="form-check-label" for="createBackup">
                                        Backup vor Import erstellen
                                    </label>
                                    <small class="form-text text-muted">
                                        Aktuelle Daten werden vor dem Import gesichert
                                    </small>
                                </div>
                            </div>
                        </form>

                        <div id="importProgress" style="display: none;" class="mt-3">
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">Import wird durchgeführt...</small>
                            </div>
                        </div>

                        <div id="importResult" style="display: none;" class="mt-3"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times mr-1"></i>
                            Abbrechen
                        </button>
                        <button type="button" class="btn btn-primary" id="executeImport" style="display: none;">
                            <i class="fas fa-upload mr-1"></i>
                            Import starten
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('importModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setupFileUploadListeners();

    const closeButtons = document.querySelectorAll('#importModal [data-bs-dismiss="modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeImportModal();
        });
    });

    const escapeHandler = function(e) {
        if (e.key === 'Escape' && document.getElementById('importModal')) {
            closeImportModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    showModal('importModal');
}

function setupFileUploadListeners() {
    const fileInput = document.getElementById('importFileInput');
    const uploadArea = document.getElementById('fileUploadArea');
    const executeButton = document.getElementById('executeImport');

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    executeButton.addEventListener('click', function() {
        executeFileImport();
    });
}

function handleFileSelection(file) {
    try {

        const validation = validateImportFile(file);
        if (!validation.valid) {
            showImportError(validation.error);
            return;
        }

        showFileInfo(file);

        loadFilePreview(file);

    } catch (error) {
        showImportError('Fehler beim Verarbeiten der Datei: ' + error.message);
    }
}

function showFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileDetails = document.getElementById('fileDetails');

    const fileSize = (file.size / 1024).toFixed(2);
    const fileSizeUnit = fileSize > 1024 ? `${(fileSize / 1024).toFixed(2)} MB` : `${fileSize} KB`;

    fileDetails.innerHTML = `
        <div class="row">
            <div class="col-sm-4"><strong>Dateiname:</strong></div>
            <div class="col-sm-8">${file.name}</div>
        </div>
        <div class="row">
            <div class="col-sm-4"><strong>Größe:</strong></div>
            <div class="col-sm-8">${fileSizeUnit}</div>
        </div>
        <div class="row">
            <div class="col-sm-4"><strong>Typ:</strong></div>
            <div class="col-sm-8">${file.type || 'application/json'}</div>
        </div>
        <div class="row">
            <div class="col-sm-4"><strong>Letzte Änderung:</strong></div>
            <div class="col-sm-8">${new Date(file.lastModified).toLocaleString('de-DE')}</div>
        </div>
    `;

    fileInfo.style.display = 'block';
}

function loadFilePreview(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            showImportPreview(data);

            document.getElementById('importForm').style.display = 'block';
            document.getElementById('executeImport').style.display = 'inline-block';

        } catch (error) {
            showImportError('Ungültiges JSON-Format in der Datei');
        }
    };

    reader.onerror = function() {
        showImportError('Fehler beim Lesen der Datei');
    };

    reader.readAsText(file);
}

function showImportPreview(data) {
    const importResult = document.getElementById('importResult');

    try {
        const properties = data.properties || [];
        const realProperties = properties.filter(p => !p.isDemo);
        const demoProperties = properties.filter(p => p.isDemo);
        const exportDate = data.metadata ? new Date(data.metadata.exportDate).toLocaleString('de-DE') : 'Unbekannt';

        importResult.innerHTML = `
            <div class="border rounded p-3 bg-info bg-opacity-10">
                <h6><i class="fas fa-info-circle mr-2"></i>Import-Vorschau:</h6>
                <div class="row">
                    <div class="col-sm-6">
                        <div><strong>Gesamt-Immobilien:</strong> ${properties.length}</div>
                        <div class="ml-3">
                            <div><i class="fas fa-circle mr-1 text-success" style="font-size: 8px;"></i>Echte: ${realProperties.length}</div>
                            ${demoProperties.length > 0 ? `<div><i class="fas fa-circle mr-1 text-warning" style="font-size: 8px;"></i>Demo: ${demoProperties.length}</div>` : ''}
                        </div>
                    </div>
                    <div class="col-sm-6">
                        <div><strong>Export-Datum:</strong> ${exportDate}</div>
                        <div><strong>Version:</strong> ${data.metadata?.exportVersion || '1.0'}</div>
                        <div><strong>Einstellungen:</strong> ${data.settings ? 'Enthalten' : 'Nicht enthalten'}</div>
                    </div>
                </div>
            </div>
        `;

        importResult.style.display = 'block';

    } catch (error) {
        showImportError('Fehler beim Analysieren der Daten: ' + error.message);
    }
}

function executeFileImport() {
    const fileInput = document.getElementById('importFileInput');

    if (fileInput.files.length === 0) {
        showImportError('Keine Datei ausgewählt');
        return;
    }

    const options = {
        mergeWithExisting: document.getElementById('mergeWithExisting').checked,
        skipDemoData: document.getElementById('skipDemoData').checked,
        createBackup: document.getElementById('createBackup').checked
    };

    showImportProgress();

    setTimeout(() => {
        importFromFile(fileInput.files[0], options)
            .then(result => {
                hideImportProgress();
                if (result.success) {
                    showImportSuccess(result);

                    setTimeout(() => {
                        updateViewsAfterImport();
                        closeImportModal();
                    }, 2000);
                } else {
                    showImportError(result.error);
                }
            })
            .catch(error => {
                hideImportProgress();
                showImportError(error.message);
            });
    }, 500);
}

function showImportProgress() {
    try {
        const progressElement = document.getElementById('importProgress');
        if (progressElement) {
            progressElement.style.display = 'block';
        } else {

            showNotification('Import wird durchgeführt...', 'info', 0);
        }
    } catch (error) {
        console.log('Import gestartet...');
    }
}

function hideImportProgress() {
    try {
        const progressElement = document.getElementById('importProgress');
        if (progressElement) {
            progressElement.style.display = 'none';
        } else {

            const notifications = document.querySelectorAll('.notification');
            notifications.forEach(notification => {
                if (notification.textContent.includes('Import wird durchgeführt')) {
                    notification.remove();
                }
            });
        }
    } catch (error) {
        console.log('Import abgeschlossen.');
    }
}

function hideImportProgress() {
    document.getElementById('importProgress').style.display = 'none';
    document.getElementById('executeImport').disabled = false;
}

function showImportSuccess(result) {
    const importResult = document.getElementById('importResult');

    importResult.innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-check-circle mr-2"></i>Import erfolgreich!</h6>
            <div>
                <div><strong>Importierte Immobilien:</strong> ${result.importedProperties}</div>
                <div><strong>Gesamt-Immobilien:</strong> ${result.totalProperties}</div>
                ${result.mergedWithExisting ? 
                    `<div><strong>Modus:</strong> Mit bestehenden Daten zusammengeführt</div>` : 
                    `<div><strong>Modus:</strong> Bestehende Daten ersetzt</div>`
                }
                ${result.settingsImported ? '<div>Einstellungen wurden ebenfalls importiert</div>' : ''}
            </div>
            <small class="text-muted">Die Anwendung wird automatisch aktualisiert...</small>
        </div>
    `;

    if (typeof showNotification === 'function') {
        showNotification(
            `${result.importedProperties} Immobilien wurden importiert`,
            'success',
            4000
        );
    }
}

function showImportError(errorMessage) {
    const importResult = document.getElementById('importResult');

    importResult.innerHTML = `
        <div class="alert alert-danger">
            <h6><i class="fas fa-exclamation-triangle mr-2"></i>Import-Fehler</h6>
            <div>${errorMessage}</div>
        </div>
    `;

    importResult.style.display = 'block';

    if (typeof showNotification === 'function') {
        showNotification(errorMessage, 'error', 5000);
    }
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';

        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';

        setTimeout(() => {
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        document.body.style.overflow = 'hidden';

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImportModal();
            }
        });
    }
}

function attachImportButtonListener() {
    const importBtn = document.getElementById('importBtn');

    if (importBtn) {

        importBtn.replaceWith(importBtn.cloneNode(true));

        const newImportBtn = document.getElementById('importBtn');
        newImportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showImportOptionsModal();
        });

        console.log('Import-Button Event-Listener erfolgreich hinzugefügt');
    } else {
        console.warn('Import-Button (#importBtn) nicht gefunden');
    }
}

function addImportStyles() {
    if (!document.getElementById('importStyles')) {
        const styles = `
            <style id="importStyles">
                #importModal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                   background: rgba(0, 0, 0, 0.5);
                   z-index: 9999;
                   transition: all 0.3s ease;
               }

               .file-upload-area {
                   border: 2px dashed var(--border-color);
                   border-radius: var(--border-radius);
                   padding: 2rem;
                   text-align: center;
                   transition: all 0.3s ease;
                   cursor: pointer;
               }

               .file-upload-area:hover,
               .file-upload-area.drag-over {
                   border-color: var(--primary-color);
                   background-color: var(--light-color);
               }

               .upload-icon {
                   font-size: 3rem;
                   color: var(--secondary-color);
                   margin-bottom: 1rem;
               }

               .progress {
                   height: 1rem;
                   background-color: var(--light-color);
                   border-radius: var(--border-radius);
                   overflow: hidden;
               }

               .progress-bar {
                   background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                   transition: width 0.3s ease;
               }

               .alert {
                   padding: 1rem;
                   border-radius: var(--border-radius);
                   border: 1px solid;
               }

               .alert-success {
                   background-color: #d4edda;
                   border-color: #c3e6cb;
                   color: #155724;
               }

               .alert-danger {
                   background-color: #f8d7da;
                   border-color: #f5c6cb;
                   color: #721c24;
               }

               .bg-info {
                   background-color: var(--info-color) !important;
               }

               .bg-opacity-10 {
                   opacity: 0.1;
               }

               .form-check-input {
                   margin-right: 0.5rem;
               }

               .form-text {
                   font-size: 0.875rem;
                   color: var(--secondary-color);
               }
           </style>
       `;

       document.head.insertAdjacentHTML('beforeend', styles);
   }
}

function initializeImportFunctionality() {
   console.log('Initialisiere Import-Funktionalität...');

   addImportStyles();

   let attempts = 0;
   const maxAttempts = 10;

   function tryAttachListener() {
       attempts++;
       const importBtn = document.getElementById('importBtn');

       if (importBtn) {
           attachImportButtonListener();
           console.log('Import-Funktionalität erfolgreich initialisiert');
       } else if (attempts < maxAttempts) {
           console.log(`Import-Button noch nicht gefunden, Versuch ${attempts}/${maxAttempts}`);
           setTimeout(tryAttachListener, 500);
       } else {
           console.error('Import-Button (#importBtn) konnte nicht gefunden werden nach', maxAttempts, 'Versuchen');
       }
   }

   tryAttachListener();
}

window.showImportOptionsModal = showImportOptionsModal;
window.importData = importData;
window.importFromFile = importFromFile;

if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', initializeImportFunctionality);
} else {
   initializeImportFunctionality();
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = {
       importData,
       importFromFile,
       validateImportStructure,
       showImportOptionsModal
   };
}

async function importFromRealImmosFile() {
    try {

        showNotification('Import wird gestartet...', 'info', 2000);

        const response = await fetch('./importrealimmos.json');

        if (!response.ok) {
            throw new Error(`Datei nicht gefunden: ${response.status} ${response.statusText}`);
        }

        const jsonData = await response.json();

        if (!validateExportedDataStructure(jsonData)) {
            throw new Error('Ungültige Datei-Struktur in importrealimmos.json');
        }

        const result = await importExportedDataSafe(jsonData);

        showExportedDataImportSuccess(result);

        updateGlobalVariablesAfterImport();
        updateViewsAfterImport();

        if (typeof refreshCharts === 'function') {
            refreshCharts();
        }

        if (typeof closeHamburgerMenu === 'function') {
            setTimeout(closeHamburgerMenu, 500);
        }

    } catch (error) {
        console.error('Fehler beim Import der exportierten Daten:', error);
        showExportedDataImportError(error.message);
    }
}

async function importExportedDataSafe(jsonData) {
    const result = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [],
        metadata: jsonData.metadata,
        portfolios: { added: 0, existing: 0, portfolios: [] } 
    };

    try {

        createAutoBackupSafe();

        const propertiesToImport = jsonData.properties || [];

        result.portfolios = extractAndAddPortfoliosFromImport(propertiesToImport);

        const existingProperties = loadPropertiesFromStorage() || [];

        for (const exportedProperty of propertiesToImport) {
            try {

                const processedProperty = convertExportedProperty(exportedProperty);

                const existingIndex = existingProperties.findIndex(p =>
                    p.id === processedProperty.id || p.name === processedProperty.name
                );

                if (existingIndex !== -1) {

                    result.skipped++;
                    result.details.push(`Übersprungen: ${processedProperty.name}`);
                } else {

                    existingProperties.push(processedProperty);
                    result.imported++;
                    result.details.push(`Importiert: ${processedProperty.name}`);
                }

            } catch (propertyError) {
                result.errors++;
                result.details.push(`Fehler bei ${exportedProperty.name}: ${propertyError.message}`);
            }
        }

        savePropertiesToStorage(existingProperties);

        if (window.properties) {
            window.properties = existingProperties;
        }

        return result;

    } catch (error) {
        throw new Error(`Import-Fehler: ${error.message}`);
    }
}

async function importExportedData(jsonData, options = {}) {
    const result = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [],
        metadata: jsonData.metadata,
        portfolios: { added: 0, existing: 0, portfolios: [] } 
    };

    try {

        if (options.createBackup) {
            createAutoBackup();
        }

        const propertiesToImport = jsonData.properties || [];

        result.portfolios = extractAndAddPortfoliosFromImport(propertiesToImport);

        const existingProperties = loadPropertiesFromStorage() || [];

        for (const exportedProperty of propertiesToImport) {
            try {

                const processedProperty = convertExportedProperty(exportedProperty);

                const existingIndex = existingProperties.findIndex(p =>
                    (options.preserveIds && p.id === processedProperty.id) ||
                    p.name === processedProperty.name
                );

                if (existingIndex !== -1) {
                    if (options.skipDuplicates) {
                        result.skipped++;
                        result.details.push(`Übersprungen: ${processedProperty.name} (ID: ${processedProperty.id})`);
                        continue;
                    } else {

                        const updatedProperty = mergeProperties(existingProperties[existingIndex], processedProperty);
                        existingProperties[existingIndex] = updatedProperty;
                        result.updated++;
                        result.details.push(`Aktualisiert: ${processedProperty.name}`);
                    }
                } else {

                    existingProperties.push(processedProperty);
                    result.imported++;
                    result.details.push(`Importiert: ${processedProperty.name}`);
                }

            } catch (propertyError) {
                result.errors++;
                result.details.push(`Fehler bei ${exportedProperty.name || exportedProperty.id}: ${propertyError.message}`);
            }
        }

        savePropertiesToStorage(existingProperties);

        if (window.properties) {
            window.properties = existingProperties;
        }

        return result;

    } catch (error) {
        throw new Error(`Import-Fehler: ${error.message}`);
    }
}

function createAutoBackupSafe() {
    try {
        const properties = loadPropertiesFromStorage();
        if (properties && properties.length > 0) {
            const backupData = {
                timestamp: new Date().toISOString(),
                properties: properties,
                type: 'auto_backup_before_import'
            };

            localStorage.setItem('immobilien_auto_backup', JSON.stringify(backupData));
            console.log('Auto-Backup erstellt');
        }
    } catch (error) {
        console.error('Backup-Fehler:', error);
    }
}

function validateExportedDataStructure(data) {
    try {

        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!data.metadata || !data.metadata.exportDate) {
            return false;
        }

        if (!data.properties || !Array.isArray(data.properties)) {
            return false;
        }

        return data.properties.length === 0 || data.properties.some(property => 
            property.hasOwnProperty('id') &&
            property.hasOwnProperty('name') &&
            property.hasOwnProperty('type')
        );

    } catch (error) {
        console.error('Validierungsfehler:', error);
        return false;
    }
}

async function importExportedData(jsonData, options = {}) {
    const result = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [],
        metadata: jsonData.metadata
    };

    try {

        if (options.createBackup) {
            createAutoBackup();
        }

        const existingProperties = loadPropertiesFromStorage() || [];

        const propertiesToImport = jsonData.properties || [];

        for (const exportedProperty of propertiesToImport) {
            try {

                const processedProperty = convertExportedProperty(exportedProperty);

                const existingIndex = existingProperties.findIndex(p => 
                    (options.preserveIds && p.id === processedProperty.id) ||
                    p.name === processedProperty.name
                );

                if (existingIndex !== -1) {
                    if (options.skipDuplicates) {
                        result.skipped++;
                        result.details.push(`Übersprungen: ${processedProperty.name} (ID: ${processedProperty.id})`);
                        continue;
                    } else {

                        const updatedProperty = mergeProperties(existingProperties[existingIndex], processedProperty);
                        existingProperties[existingIndex] = updatedProperty;
                        result.updated++;
                        result.details.push(`Aktualisiert: ${processedProperty.name}`);
                    }
                } else {

                    existingProperties.push(processedProperty);
                    result.imported++;
                    result.details.push(`Importiert: ${processedProperty.name}`);
                }

            } catch (propertyError) {
                result.errors++;
                result.details.push(`Fehler bei ${exportedProperty.name || exportedProperty.id}: ${propertyError.message}`);
            }
        }

        savePropertiesToStorage(existingProperties);

        if (window.properties) {
            window.properties = existingProperties;
        }

        return result;

    } catch (error) {
        throw new Error(`Import-Fehler: ${error.message}`);
    }
}

function convertExportedProperty(exportedProperty) {

    const addressParts = parsePropertyName(exportedProperty.name);

    const convertedProperty = {
        id: exportedProperty.id,
        street: addressParts.street,
        houseNumber: addressParts.houseNumber,
        name: exportedProperty.name,
        postalCode: exportedProperty.postalCode || '',
        city: exportedProperty.city || '',
        type: exportedProperty.type,
        hasHeating: exportedProperty.hasHeating,
        portfolio: exportedProperty.portfolio || 'Standard',
        accountingPeriod: exportedProperty.accountingPeriod || exportedProperty.accountingYear?.toString() || new Date().getFullYear().toString(),
        accountingYear: exportedProperty.accountingYear || new Date().getFullYear(),
        isDemo: exportedProperty.isDemo || false,
        notes: exportedProperty.notes || [],
        specialFeatures: exportedProperty.specialFeatures || [],
        checklist: exportedProperty.checklist || {},
        masterData: exportedProperty.masterData || {},
        createdAt: exportedProperty.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (convertedProperty.checklist) {
        convertedProperty.checklist = validateAndRepairChecklist(convertedProperty.checklist, convertedProperty);
    } else {
        convertedProperty.checklist = createBaseChecklistForProperty(convertedProperty);
    }

    return convertedProperty;
}

function parsePropertyName(name) {
    if (!name) {
        return { street: '', houseNumber: '' };
    }

    const patterns = [
        /^(.+?)\s+(\d+[a-zA-Z]?)$/, 
        /^(.+?)\s+(\d+\s*[-\/]\s*\d+[a-zA-Z]?)$/, 
        /^(.+?)\s+Nr\.\s*(\d+[a-zA-Z]?)$/, 
    ];

    for (const pattern of patterns) {
        const match = name.match(pattern);
        if (match) {
            return {
                street: match[1].trim(),
                houseNumber: match[2].trim()
            };
        }
    }

    return {
        street: name.trim(),
        houseNumber: ''
    };
}

function mergeProperties(existingProperty, newProperty) {
    return {
        ...existingProperty,
        ...newProperty,
        id: existingProperty.id, 
        notes: [...(existingProperty.notes || []), ...(newProperty.notes || [])],
        specialFeatures: newProperty.specialFeatures || existingProperty.specialFeatures || [],
        checklist: newProperty.checklist || existingProperty.checklist,
        updatedAt: new Date().toISOString()
    };
}

function showExportedDataImportSuccess(result) {
    let message = `Import erfolgreich abgeschlossen:\n`;
    message += `• ${result.imported} Immobilien importiert\n`;
    message += `• ${result.updated || 0} Immobilien aktualisiert\n`;
    message += `• ${result.skipped} übersprungen\n`;

    if (result.portfolios) {
        if (result.portfolios.added > 0) {
            message += `• ${result.portfolios.added} neue Portfolios hinzugefügt\n`;
            if (result.portfolios.portfolios.length > 0) {
                message += `  (${result.portfolios.portfolios.join(', ')})\n`;
            }
        }
        if (result.portfolios.existing > 0) {
            message += `• ${result.portfolios.existing} Portfolios bereits vorhanden\n`;
        }
    }

    if (result.errors > 0) {
        message += `• ${result.errors} Fehler aufgetreten`;
    }

    showNotification(message, 'success', 5000);

    console.log('Import-Ergebnis:', result);
}

function showExportedDataImportError(errorMessage) {
    showNotification(
        `Fehler beim Import: ${errorMessage}`,
        'error',
        5000
    );
}

async function checkRealImmosFileAvailability() {
    try {
        const response = await fetch('./importrealimmos.json', { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

function validateRealImmosStructure(data) {
    try {

        if (!data || typeof data !== 'object') {
            return false;
        }

        if (data.properties && Array.isArray(data.properties)) {
            return data.properties.every(property => 
                property.hasOwnProperty('id') &&
                property.hasOwnProperty('street') &&
                property.hasOwnProperty('houseNumber')
            );
        }

        if (Array.isArray(data)) {
            return data.every(property => 
                property.hasOwnProperty('id') &&
                property.hasOwnProperty('street') &&
                property.hasOwnProperty('houseNumber')
            );
        }

        return false;
    } catch (error) {
        console.error('Validierungsfehler:', error);
        return false;
    }
}

async function importRealImmosData(jsonData, options = {}) {
    const result = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: []
    };

    try {

        if (options.createBackup) {
            createAutoBackup();
        }

        const existingProperties = loadPropertiesFromStorage() || [];

        const propertiesToImport = Array.isArray(jsonData) ? jsonData : jsonData.properties || [];

        for (const rawProperty of propertiesToImport) {
            try {

                const processedProperty = processRealImmosProperty(rawProperty);

                const existingIndex = existingProperties.findIndex(p => 
                    p.street === processedProperty.street && 
                    p.houseNumber === processedProperty.houseNumber
                );

                if (existingIndex !== -1) {
                    if (options.skipDuplicates) {
                        result.skipped++;
                        result.details.push(`Übersprungen: ${processedProperty.street} ${processedProperty.houseNumber}`);
                        continue;
                    } else {

                        existingProperties[existingIndex] = processedProperty;
                        result.updated++;
                        result.details.push(`Aktualisiert: ${processedProperty.street} ${processedProperty.houseNumber}`);
                    }
                } else {

                    existingProperties.push(processedProperty);
                    result.imported++;
                    result.details.push(`Importiert: ${processedProperty.street} ${processedProperty.houseNumber}`);
                }

            } catch (propertyError) {
                result.errors++;
                result.details.push(`Fehler bei Property: ${propertyError.message}`);
            }
        }

        savePropertiesToStorage(existingProperties);

        if (window.properties) {
            window.properties = existingProperties;
        }

        return result;

    } catch (error) {
        throw new Error(`Import-Fehler: ${error.message}`);
    }
}

function processRealImmosProperty(rawProperty) {
    const processedProperty = {
        id: rawProperty.id || generateUniqueId(),
        street: rawProperty.street || '',
        houseNumber: rawProperty.houseNumber || '',
        postalCode: rawProperty.postalCode || rawProperty.plz || '',
        city: rawProperty.city || rawProperty.ort || '',
        type: mapRealImmosType(rawProperty.type || rawProperty.typ),
        hasHeating: rawProperty.hasHeating !== undefined ? rawProperty.hasHeating : true,
        portfolio: rawProperty.portfolio || 'Standard',
        accountingPeriod: rawProperty.accountingPeriod || new Date().getFullYear().toString(),
        notes: rawProperty.notes || [],
        specialFeatures: rawProperty.specialFeatures || [],
        masterData: rawProperty.masterData || {},
        checklist: null, 
        createdAt: rawProperty.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    processedProperty.checklist = createBaseChecklistForProperty(processedProperty);

    if (rawProperty.checklist) {
        processedProperty.checklist = validateAndRepairChecklist(rawProperty.checklist, processedProperty);
    }

    return processedProperty;
}

function mapRealImmosType(realImmosType) {
    const typeMapping = {
        'mietverwaltung': 'MV',
        'weg': 'WEG',
        'mv': 'MV',
        'eigentumsverwaltung': 'WEG',
        'verwaltung': 'MV'
    };

    if (!realImmosType) return 'MV';

    const normalizedType = realImmosType.toLowerCase();
    return typeMapping[normalizedType] || 'MV';
}

function showRealImmosImportSuccess(result) {
    const message = `
        RealImmos Import erfolgreich abgeschlossen:
        • ${result.imported} neue Immobilien importiert
        • ${result.updated} Immobilien aktualisiert
        • ${result.skipped} Duplikate übersprungen
        ${result.errors > 0 ? `• ${result.errors} Fehler aufgetreten` : ''}
    `;

    showNotification(message, 'success', 6000);

    console.log('RealImmos Import Details:', result.details);
}

function showRealImmosImportError(errorMessage) {
    showNotification(
        `Fehler beim RealImmos Import: ${errorMessage}`,
        'error',
        5000
    );
}

async function checkRealImmosFileAvailability() {
    try {
        const response = await fetch('./importrealimmos.json', { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}