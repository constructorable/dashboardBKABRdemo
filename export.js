// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

const EXPORT_CONFIG = {
    filePrefix: 'immobilien_export',
    dateFormat: 'YYYY-MM-DD_HH-mm-ss',
    version: '1.0'
};

function exportData(options = {}) {
    try {
        const {
            includeDemoData = false,
            includeSettings = true,
            customFilename = null,
            filteredPropertiesOnly = false
        } = options;

        let properties = [];

        if (filteredPropertiesOnly && typeof getCurrentlyDisplayedProperties === 'function') {

            properties = getCurrentlyDisplayedProperties();
            if (!includeDemoData) {
                properties = properties.filter(prop => !prop.isDemo);
            }
        } else {

            const realProperties = loadPropertiesFromStorage();
            properties = realProperties;

            if (includeDemoData) {
                const demoProperties = getDemoProperties();
                properties = [...properties, ...demoProperties];
            }
        }

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                exportVersion: EXPORT_CONFIG.version,
                totalProperties: properties.length,
                realProperties: properties.filter(p => !p.isDemo).length,
                demoProperties: properties.filter(p => p.isDemo).length,
                exportedBy: 'Immobilienverwaltung Dashboard',
                includedDemoData: includeDemoData,
                filteredExport: filteredPropertiesOnly
            },
            properties: properties,
            settings: includeSettings ? loadSettingsFromStorage() : null
        };

        const filename = customFilename || generateExportFilename();

        const jsonString = JSON.stringify(exportData, null, 2);

        const stats = {
            filename,
            fileSize: (jsonString.length / 1024).toFixed(2) + ' KB',
            totalProperties: properties.length,
            realProperties: properties.filter(p => !p.isDemo).length,
            demoProperties: properties.filter(p => p.isDemo).length
        };

        return {
            success: true,
            data: jsonString,
            stats,
            filename
        };

    } catch (error) {
        console.error('Fehler beim Exportieren:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

function downloadExport(options = {}) {
    try {
        const exportResult = exportData(options);

        if (!exportResult.success) {
            throw new Error(exportResult.error);
        }

        const blob = new Blob([exportResult.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = exportResult.filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);

        showExportSuccessNotification(exportResult.stats);

        return exportResult;

    } catch (error) {
        console.error('Fehler beim Download:', error);
        showExportErrorNotification(error.message);
        return { success: false, error: error.message };
    }
}

function generateExportFilename(customName = null) {
    const now = new Date();
    const dateString = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_');

    const baseName = customName || EXPORT_CONFIG.filePrefix;
    return `${baseName}_${dateString}.json`;
}

function showExportOptionsModal() {
    const modalHtml = `
        <div class="modal fade" id="exportModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-download mr-2"></i>
                            Daten exportieren
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="exportForm">
                            <div class="form-group mb-3">
                                <label for="exportFilename" class="form-label">Dateiname (optional):</label>
                                <input type="text" 
                                       class="form-control" 
                                       id="exportFilename" 
                                       placeholder="z.B. meine_immobilien_backup">
                                <small class="form-text text-muted">
                                    Datum und .json-Endung werden automatisch hinzugefügt
                                </small>
                            </div>

                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" 
                                           class="form-check-input" 
                                           id="includeDemoData">
                                    <label class="form-check-label" for="includeDemoData">
                                        Demo-Immobilien mit exportieren
                                    </label>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" 
                                           class="form-check-input" 
                                           id="includeSettings" 
                                           checked>
                                    <label class="form-check-label" for="includeSettings">
                                        Anwendungseinstellungen mit exportieren
                                    </label>
                                </div>
                            </div>

                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input type="checkbox" 
                                           class="form-check-input" 
                                           id="filteredOnly">
                                    <label class="form-check-label" for="filteredOnly">
                                        Nur aktuell angezeigte Immobilien exportieren
                                    </label>
                                    <small class="form-text text-muted">
                                        Berücksichtigt aktuelle Filter und Sucheinstellungen
                                    </small>
                                </div>
                            </div>
                        </form>

                    </div>
                    <div class="modal-footer">
                        <button type="button" 
                                class="btn btn-secondary" 
                                data-bs-dismiss="modal">
                            <i class="fas fa-times mr-1"></i>
                            Abbrechen
                        </button>
                        <button type="button" 
                                class="btn btn-primary" 
                                id="executeExport">
                            <i class="fas fa-download mr-1"></i>
                            Export starten
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('exportModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const form = document.getElementById('exportForm');
    const previewDiv = document.getElementById('exportPreview');

    function updatePreview() {
        const options = getExportOptionsFromForm();
        const preview = generateExportPreview(options);
        previewDiv.innerHTML = preview;
    }

    form.addEventListener('change', updatePreview);
    form.addEventListener('input', updatePreview);

    document.getElementById('executeExport').addEventListener('click', function() {
        const options = getExportOptionsFromForm();
        showExportConfirmation(options);
    });

    const closeButtons = document.querySelectorAll('#exportModal [data-bs-dismiss="modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeExportModal();
        });
    });

    const escapeHandler = function(e) {
        if (e.key === 'Escape' && document.getElementById('exportModal')) {
            closeExportModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    showModal('exportModal');

    setTimeout(updatePreview, 200);
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
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
                closeExportModal();
            }
        });
    }
}

function getExportOptionsFromForm() {
    return {
        customFilename: document.getElementById('exportFilename').value.trim() || null,
        includeDemoData: document.getElementById('includeDemoData').checked,
        includeSettings: document.getElementById('includeSettings').checked,
        filteredPropertiesOnly: document.getElementById('filteredOnly').checked
    };
}

function generateExportPreview(options) {
    try {
        let properties = [];

        if (options.filteredPropertiesOnly && typeof getCurrentlyDisplayedProperties === 'function') {
            properties = getCurrentlyDisplayedProperties();
        } else {
            properties = loadPropertiesFromStorage();
            if (options.includeDemoData) {
                properties = [...properties, ...getDemoProperties()];
            }
        }

        const realCount = properties.filter(p => !p.isDemo).length;
        const demoCount = properties.filter(p => p.isDemo).length;

        const filename = options.customFilename ? 
            generateExportFilename(options.customFilename) : 
            generateExportFilename();

        return `
            <div class="export-preview-content">
                <div class="mb-2">
                    <i class="fas fa-file-alt mr-2 text-primary"></i>
                    <strong>Dateiname:</strong> ${filename}
                </div>
                <div class="mb-2">
                    <i class="fas fa-building mr-2 text-info"></i>
                    <strong>Gesamt-Immobilien:</strong> ${properties.length}
                </div>
                <div class="ml-4 mb-2">
                    <div><i class="fas fa-circle mr-2 text-success" style="font-size: 8px;"></i>Echte Immobilien: ${realCount}</div>
                    ${demoCount > 0 ? `<div><i class="fas fa-circle mr-2 text-warning" style="font-size: 8px;"></i>Demo-Immobilien: ${demoCount}</div>` : ''}
                </div>
                <div class="mb-2">
                    <i class="fas fa-cog mr-2 text-secondary"></i>
                    <strong>Einstellungen:</strong> ${options.includeSettings ? 'Ja' : 'Nein'}
                </div>
                <div class="mb-3">
                    <i class="fas fa-filter mr-2 text-primary"></i>
                    <strong>Filter aktiv:</strong> ${options.filteredPropertiesOnly ? 'Ja' : 'Nein'}
                </div>
                <div class="text-muted border-top pt-2">
                    <small>
                        <i class="fas fa-info-circle mr-1"></i>
                        Geschätzte Dateigröße: ~${Math.ceil(properties.length * 2)}KB
                    </small>
                </div>
            </div>
        `;
    } catch (error) {
        return `<div class="text-danger"><i class="fas fa-exclamation-triangle mr-2"></i>Fehler bei der Vorschau: ${error.message}</div>`;
    }
}

function showExportConfirmation(options) {
    const preview = generateExportPreview(options);

    showConfirmationModal(
        'Export bestätigen',
        `
        <p class="mb-3">Möchten Sie die folgenden Daten exportieren?</p>
        <div class="border rounded p-3 bg-light">
            ${preview}
        </div>
        `,
        'Export starten',
        'Abbrechen',
        function() {

            closeExportModal();
            executeExport(options);
        }
    );
}

function executeExport(options) {

    showExportProgress();

    setTimeout(() => {
        const result = downloadExport(options);
        hideExportProgress();

        if (result.success) {

            logExportActivity(result.stats);
        }
    }, 800); 
}

function showExportProgress() {
    const progressHtml = `
        <div id="exportProgress" class="export-progress-overlay">
            <div class="export-progress-content">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="sr-only">Exportiere...</span>
                </div>
                <h5>Exportiere Daten...</h5>
                <p class="text-muted mb-0">Bitte warten Sie einen Moment</p>
            </div>
        </div>
    `;

    if (!document.getElementById('exportProgress')) {
        document.body.insertAdjacentHTML('beforeend', progressHtml);
    }
}

function hideExportProgress() {
    const progress = document.getElementById('exportProgress');
    if (progress) {
        progress.style.opacity = '0';
        setTimeout(() => {
            progress.remove();
            document.body.style.overflow = 'auto'; 
        }, 300);
    }
}

function showExportSuccessNotification(stats) {
    const message = `
        Export erfolgreich abgeschlossen!<br>
        <small class="text-muted">
            <i class="fas fa-check-circle text-success mr-1"></i>
            ${stats.totalProperties} Immobilien • ${stats.fileSize} • ${stats.filename}
        </small>
    `;

    if (typeof showNotification === 'function') {
        showNotification('Export erfolgreich', message, 'success');
    } else {
        alert(`Export erfolgreich!\n${stats.totalProperties} Immobilien exportiert als ${stats.filename}`);
    }
}

function showExportErrorNotification(errorMessage) {
    if (typeof showNotification === 'function') {
        showNotification('Export-Fehler', `<i class="fas fa-exclamation-triangle mr-2"></i>${errorMessage}`, 'error');
    } else {
        alert(`Export-Fehler: ${errorMessage}`);
    }
}

function logExportActivity(stats) {
    try {
        const exportLog = {
            timestamp: new Date().toISOString(),
            filename: stats.filename,
            propertiesCount: stats.totalProperties,
            fileSize: stats.fileSize
        };

        const settings = loadSettingsFromStorage();
        if (!settings.exportHistory) {
            settings.exportHistory = [];
        }

        settings.exportHistory.unshift(exportLog);

        settings.exportHistory = settings.exportHistory.slice(0, 10);

        saveSettingsToStorage(settings);

    } catch (error) {
        console.warn('Export-Log konnte nicht gespeichert werden:', error);
    }
}

function attachExportButtonListener() {
    const exportBtn = document.getElementById('exportBtn');

    if (exportBtn) {

        exportBtn.replaceWith(exportBtn.cloneNode(true));

        const newExportBtn = document.getElementById('exportBtn');
        newExportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showExportOptionsModal();
        });

        console.log('Export-Button Event-Listener erfolgreich hinzugefügt');
    } else {
        console.warn('Export-Button (#exportBtn) nicht gefunden');
    }
}

function addExportStyles() {
    if (!document.getElementById('exportStyles')) {
        const styles = `
            <style id="exportStyles">
                #exportModal {
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

                #exportModal .modal-dialog {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }

                #exportModal .modal-content {
                    background: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-hover);
                    max-width: 500px;
                    width: 100%;
                    transition: all 0.3s ease;
                    animation: modalSlideIn 0.3s ease-out;
                }

                @keyframes modalSlideIn {
                    from {
                        transform: scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                #exportModal .modal-header {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    border-bottom: none;
                    border-radius: var(--border-radius) var(--border-radius) 0 0;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                #exportModal .modal-title {
                    margin: 0;
                    font-weight: 600;
                }

                #exportModal .btn-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    opacity: 0.8;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }

                #exportModal .btn-close:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.2);
                }

                #exportModal .modal-body {
                    padding: 25px;
                }

                #exportModal .modal-footer {
                    padding: 20px 25px;
                    border-top: 1px solid var(--border-color);
                    background: var(--light-color);
                    border-radius: 0 0 var(--border-radius) var(--border-radius);
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .export-progress-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    transition: opacity 0.3s ease;
                }

                .export-progress-content {
                    background: white;
                    padding: 40px;
                    border-radius: var(--border-radius);
                    text-align: center;
                    box-shadow: var(--shadow-hover);
                    max-width: 300px;
                }

                .export-preview-content {
                    font-size: 0.9rem;
                    line-height: 1.5;
                }

                .export-preview-content > div {
                    margin-bottom: 8px;
                }

                .export-preview-content .fas {
                    width: 16px;
                    text-align: center;
                }

                .form-check-input:checked {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                }

                .form-check-input:focus {
                    box-shadow: 0 0 0 0.25rem rgba(58, 81, 105, 0.25);
                }

                .spinner-border {
                    width: 3rem;
                    height: 3rem;
                    border-width: 0.3em;
                }

                @media (max-width: 768px) {
                    #exportModal .modal-dialog {
                        padding: 10px;
                    }

                    #exportModal .modal-content {
                        margin: 10px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

function initializeExportFunctionality() {
    console.log('Initialisiere Export-Funktionalität...');

    addExportStyles();

    let attempts = 0;
    const maxAttempts = 10;

    function tryAttachListener() {
        attempts++;
        const exportBtn = document.getElementById('exportBtn');

        if (exportBtn) {
            attachExportButtonListener();
            console.log('Export-Funktionalität erfolgreich initialisiert');
        } else if (attempts < maxAttempts) {
            console.log(`Export-Button noch nicht gefunden, Versuch ${attempts}/${maxAttempts}`);
            setTimeout(tryAttachListener, 500);
        } else {
            console.error('Export-Button (#exportBtn) konnte nicht gefunden werden nach', maxAttempts, 'Versuchen');
        }
    }

    tryAttachListener();
}

window.showExportOptionsModal = showExportOptionsModal;
window.exportData = exportData;
window.downloadExport = downloadExport;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExportFunctionality);
} else {
    initializeExportFunctionality();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportData,
        downloadExport,
        generateExportFilename,
        showExportOptionsModal
    };
}

function showConfirmationModal(title, message, confirmText, cancelText, onConfirm, onCancel) {
    const modalHtml = `
        <div class="modal fade" id="confirmationModal" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-question-circle mr-2"></i>
                            ${title}
                        </h5>
                        <button type="button" class="btn-close" onclick="closeConfirmationModal()">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" 
                                class="btn btn-secondary" 
                                onclick="closeConfirmationModal()">
                            <i class="fas fa-times mr-1"></i>
                            ${cancelText || 'Abbrechen'}
                        </button>
                        <button type="button" 
                                class="btn btn-primary" 
                                id="confirmButton">
                            <i class="fas fa-check mr-1"></i>
                            ${confirmText || 'Bestätigen'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('confirmationModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('confirmButton').addEventListener('click', function() {
        closeConfirmationModal();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });

    const cancelButtons = document.querySelectorAll('#confirmationModal [onclick="closeConfirmationModal()"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
        });
    });

    const escapeHandler = function(e) {
        if (e.key === 'Escape' && document.getElementById('confirmationModal')) {
            closeConfirmationModal();
            if (onCancel && typeof onCancel === 'function') {
                onCancel();
            }
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    showModal('confirmationModal');
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';

        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

function addConfirmationModalStyles() {
    if (!document.getElementById('confirmationModalStyles')) {
        const styles = `
            <style id="confirmationModalStyles">
                #confirmationModal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    transition: all 0.3s ease;
                }

                #confirmationModal .modal-dialog {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }

                #confirmationModal .modal-content {
                    background: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-hover);
                    max-width: 450px;
                    width: 100%;
                    transition: all 0.3s ease;
                    animation: confirmationModalSlideIn 0.3s ease-out;
                }

                @keyframes confirmationModalSlideIn {
                    from {
                        transform: scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                #confirmationModal .modal-header {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    border-bottom: none;
                    border-radius: var(--border-radius) var(--border-radius) 0 0;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                #confirmationModal .modal-title {
                    margin: 0;
                    font-weight: 600;
                }

                #confirmationModal .btn-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    opacity: 0.8;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }

                #confirmationModal .btn-close:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.2);
                }

                #confirmationModal .modal-body {
                    padding: 25px;
                    color: var(--dark-color);
                    line-height: 1.6;
                }

                #confirmationModal .modal-footer {
                    padding: 20px 25px;
                    border-top: 1px solid var(--border-color);
                    background: var(--light-color);
                    border-radius: 0 0 var(--border-radius) var(--border-radius);
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                #confirmationModal .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    transition: var(--transition);
                    font-weight: 600;
                }

                #confirmationModal .btn-secondary {
                    background: var(--border-color);
                    color: var(--dark-color);
                }

                #confirmationModal .btn-secondary:hover {
                    background: var(--accent-color);

                }

                #confirmationModal .btn-primary {
                    background: var(--primary-color);
                    color: white;
                }

                #confirmationModal .btn-primary:hover {
                    background: var(--secondary-color);
                                    box-shadow: var(--shadow-hover);
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

window.showConfirmationModal = showConfirmationModal;
window.closeConfirmationModal = closeConfirmationModal;

addConfirmationModalStyles();