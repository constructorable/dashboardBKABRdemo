// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

let currentModalProperty = null;
let modalInitialized = false;

function initializeModalImmo() {
    if (modalInitialized) {
        console.log('Modal-Immo bereits initialisiert');
        return;
    }

    setupGlobalModalListeners();
    modalInitialized = true;

}

function openPropertyModal(property) {
    console.log('Öffne Property Modal für:', property.name);

    currentModalProperty = { ...property }; 

    if (typeof window.searchFilterSortDebug !== 'undefined' &&
        typeof window.searchFilterSortDebug.setSelectedProperty === 'function') {
        window.searchFilterSortDebug.setSelectedProperty(currentModalProperty);
    }

    const modal = document.getElementById('propertyModal');
    const modalTitle = document.getElementById('modalTitle');

    if (!modal) {
        console.error('Property Modal nicht gefunden');
        return;
    }

    if (modalTitle) {
        modalTitle.textContent = property.name;
    }

    if (modalTitle) {
        const typeIcon = getPropertyTypeIcon(property.type);
        modalTitle.innerHTML = `${typeIcon} ${property.name}`;
    }

    modal.dataset.propertyId = property.id;

    loadModalContent(currentModalProperty);

    modal.classList.add('show');

    setTimeout(() => {
        setupCurrentModalListeners();

        const progress = calculateProgress(currentModalProperty.checklist);
        if (typeof createLargeProgressChart === 'function') {
            createLargeProgressChart('modalChart', progress);
        }
        const progressElement = document.getElementById('modalProgressPercent');
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
            if (typeof getProgressColor === 'function') {
                progressElement.style.color = getProgressColor(progress);
            }
        }
    }, 100);
}

function closePropertyModal() {
    const modal = document.getElementById('propertyModal');
    if (!modal) return;

    console.log('Schließe Property-Modal mit Animation...');

    modal.style.transition = 'opacity .6s ease-out, transform .6s ease-out';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(1)';

    setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';

        modal.removeAttribute('style');

        currentModalProperty = null;
        selectedProperty = null;

        document.body.style.overflow = '';

        console.log('Property-Modal geschlossen');

        if (typeof refreshCharts === 'function') {
            refreshCharts();
        }

    }, 600); 
}

function setupGlobalModalListeners() {

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('propertyModal');
            if (modal && modal.classList.contains('show')) {
                e.preventDefault();
                closePropertyModal();
            }
        }
    });
}

function setupCurrentModalListeners() {

    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close Button geklickt');
            closePropertyModal();
        };
    }

    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tabName = tab.dataset.tab;
            console.log('Tab geklickt:', tabName);
            if (tabName) {
                switchModalTab(tabName);
            }
        };
    });

    const modal = document.getElementById('propertyModal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target.id === 'propertyModal') {
                console.log('Modal Background geklickt');
                closePropertyModal();
            }
        };
    }

    console.log('Current Modal Event-Listeners eingerichtet');
}

function removeCurrentModalListeners() {
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = null;
    }

    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.onclick = null;
    });

    const modal = document.getElementById('propertyModal');
    if (modal) {
        modal.onclick = null;
    }
}

function loadModalContent(property) {
    try {
        loadChecklistTab(property);
        loadSpecialFeaturesTab(property);
        loadNotesTab(property);
        loadMasterDataTab(property);

        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const checklistTab = document.querySelector(`[data-tab="checklist"]`);
        const checklistContent = document.getElementById('checklistContent');

        if (checklistTab) {
            checklistTab.classList.add('active');
        }
        if (checklistContent) {
            checklistContent.classList.add('active');

            checklistContent.style.opacity = '0';
            checklistContent.style.transform = 'translateY(20px)';
            checklistContent.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

            requestAnimationFrame(() => {
                checklistContent.style.opacity = '1';
                checklistContent.style.transform = 'translateY(0)';
            });

            setTimeout(() => {
                checklistContent.style.transition = '';
                checklistContent.style.transform = '';
            }, 500);
        }

        setTimeout(adjustModalHeight, 100);
        console.log('Modal Content geladen für:', property.name);
    } catch (error) {
        console.error('Fehler beim Laden des Modal Contents:', error);
    }
}

function switchModalTab(tabName) {
    console.log('Wechsle zu Tab:', tabName);
    try {

        if (document.querySelector('.modal-content.switching')) {
            return;
        }

        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.add('switching');
        }

        const currentActiveContent = document.querySelector('.tab-content.active');
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}Content`);

        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('Tab aktiviert:', tabName);
        } else {
            console.warn('Tab nicht gefunden:', tabName);
        }

        if (currentActiveContent && currentActiveContent !== targetContent) {

            currentActiveContent.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
            currentActiveContent.style.opacity = '0';
            currentActiveContent.style.transform = 'translateX(-20px)';

            setTimeout(() => {

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.style.opacity = '0';
                    targetContent.style.transform = 'translateX(20px)';
                    targetContent.style.transition = 'opacity 0.3s ease-in, transform 0.3s ease-in';

                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            targetContent.style.opacity = '1';
                            targetContent.style.transform = 'translateX(0)';
                        });
                    });

                    console.log('Content aktiviert:', tabName);

                    setTimeout(() => {
                        targetContent.style.transition = '';
                        targetContent.style.transform = '';
                        if (modalContent) {
                            modalContent.classList.remove('switching');
                        }

                        adjustModalHeight();
                    }, 300);
                } else {
                    console.warn('Content nicht gefunden:', tabName + 'Content');
                    if (modalContent) {
                        modalContent.classList.remove('switching');
                    }
                }
            }, 250);

        } else {

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.opacity = '0';
                targetContent.style.transform = 'translateY(15px)';
                targetContent.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';

                requestAnimationFrame(() => {
                    targetContent.style.opacity = '1';
                    targetContent.style.transform = 'translateY(0)';
                });

                setTimeout(() => {
                    targetContent.style.transition = '';
                    targetContent.style.transform = '';
                    if (modalContent) {
                        modalContent.classList.remove('switching');
                    }
                    adjustModalHeight();
                }, 400);

                console.log('Content aktiviert:', tabName);
            } else {
                console.warn('Content nicht gefunden:', tabName + 'Content');
                if (modalContent) {
                    modalContent.classList.remove('switching');
                }
            }
        }

    } catch (error) {
        console.error('Fehler beim Tab-Wechsel:', error);

        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('switching');
        }
    }
}

function adjustModalHeight() {
    const modal = document.getElementById('propertyModal');
    if (modal && modal.classList.contains('show')) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.height = '90vh';
            modalContent.style.maxHeight = '90vh';
        }
    }
}

function loadChecklistTab(property) {
    const content = document.getElementById('checklistContent');
    if (!content) {
        console.warn('Checklist Content Container nicht gefunden');
        return;
    }

    const checklist = property.checklist || {};
    let html = '<div class="checklist">';

    Object.keys(checklist).forEach(item => {
        const itemData = checklist[item];
        const itemId = `checklist_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}`;

        const isHeatingReturnItem = item.includes('Heizkostenabrechnung zurückerhalten') ||
            item.includes('Heizkostenaufstellung zurückerhalten');

        const isOwnerApprovalItem = item.includes('Freigabe vom Eigentümer erhalten') ||
            item.includes('Jahresabrechnung von Eigentümergemeinschaft freigegeben');

        if (isHeatingReturnItem) {
            html += `
        <div class="checklist-item heating-return-item">
            <div class="heating-main-label">
                <i class="fas fa-fire"></i>
                <span>${item}</span>
            </div>
            <div class="heating-status-grid">
                <label class="heating-status-option ${itemData.heatingStatus?.includes('ja') ? 'selected' : ''}">
                    <input type="checkbox" name="heating_ja_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="ja" ${itemData.heatingStatus?.includes('ja') ? 'checked' : ''}
                           onchange="updateHeatingStatusModal('${property.id}', '${btoa(item)}', 'ja', this.checked)">
                    <span class="heating-status-content success">
                        <i class="fas fa-check-circle"></i>
                        <span>ja</span>
                    </span>
                </label>

                <label class="heating-status-option ${itemData.heatingStatus?.includes('nein') ? 'selected' : ''}">
                    <input type="checkbox" name="heating_nein_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="nein" ${itemData.heatingStatus?.includes('nein') ? 'checked' : ''}
                           onchange="updateHeatingStatusModal('${property.id}', '${btoa(item)}', 'nein', this.checked)">
                    <span class="heating-status-content error">
                        <i class="fas fa-times-circle"></i>
                        <span>nein</span>
                    </span>
                </label>

                <label class="heating-status-option ${itemData.heatingStatus?.includes('korrektur') ? 'selected' : ''}">
                    <input type="checkbox" name="heating_korrektur_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="korrektur" ${itemData.heatingStatus?.includes('korrektur') ? 'checked' : ''}
                           onchange="updateHeatingStatusModal('${property.id}', '${btoa(item)}', 'korrektur', this.checked)">
                    <span class="heating-status-content warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>In Korrektur</span>
                    </span>
                </label>
            </div>
        </div>
    `;
        } else if (isOwnerApprovalItem) {
            html += `
        <div class="checklist-item owner-approval-item">
            <div class="owner-approval-label">
                <i class="fas fa-user-check"></i>
                <span>${item}</span>
            </div>
            <div class="owner-approval-grid">
                <label class="owner-approval-option ${itemData.ownerApprovalStatus?.includes('ja') ? 'selected' : ''}">
                    <input type="checkbox" name="owner_ja_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="ja" ${itemData.ownerApprovalStatus?.includes('ja') ? 'checked' : ''}
                           onchange="updateOwnerApprovalStatusModal('${property.id}', '${btoa(item)}', 'ja', this.checked)">
                    <span class="owner-approval-content success">
                        <i class="fas fa-check-circle"></i>
                        <span>ja</span>
                    </span>
                </label>

                <label class="owner-approval-option ${itemData.ownerApprovalStatus?.includes('nein') ? 'selected' : ''}">
                    <input type="checkbox" name="owner_nein_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="nein" ${itemData.ownerApprovalStatus?.includes('nein') ? 'checked' : ''}
                           onchange="updateOwnerApprovalStatusModal('${property.id}', '${btoa(item)}', 'nein', this.checked)">
                    <span class="owner-approval-content error">
                        <i class="fas fa-times-circle"></i>
                        <span>nein</span>
                    </span>
                </label>

                <label class="owner-approval-option ${itemData.ownerApprovalStatus?.includes('korrektur') ? 'selected' : ''}">
                    <input type="checkbox" name="owner_korrektur_${property.id}_${btoa(item).replace(/[^a-zA-Z0-9]/g, '')}" 
                           value="korrektur" ${itemData.ownerApprovalStatus?.includes('korrektur') ? 'checked' : ''}
                           onchange="updateOwnerApprovalStatusModal('${property.id}', '${btoa(item)}', 'korrektur', this.checked)">
                    <span class="owner-approval-content warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>in Korrektur</span>
                    </span>
                </label>
            </div>
        </div>
    `;
        } else {
            html += `
        <div class="checklist-item ${itemData.completed ? 'completed' : ''}">
            <input type="checkbox" id="${itemId}" ${itemData.completed ? 'checked' : ''} 
                   onchange="updateChecklistItemModal('${property.id}', '${btoa(item)}', this.checked)">
            <label for="${itemId}">${item}</label>

            ${itemData.hasSpecialOption ? `
                <div class="special-options" style="display: ${itemData.completed ? 'none' : 'none'};">
                    <label>
                        <input type="checkbox" ${itemData.specialOptionChecked ? 'checked' : ''} 
                               onchange="updateSpecialOptionModal('${property.id}', '${btoa(item)}', this.checked)">
                        ${getSpecialOptionText(item)}
                    </label>
                </div>
            ` : ''}
        </div>
    `;
        }
    });

    html += `
        <div class="checklist-copy-section">
            <button class="btn btn-copy-property" onclick="showCopyPropertyDialog('${property.id}')">
                <i class="fas fa-plus"></i>   Immobilie für neues Abrechnungsjahr kopieren
            </button>
        </div>
    `;

    html += '</div>';
    content.innerHTML = html;

    setTimeout(() => {
        Object.keys(property.checklist || {}).forEach(item => {
            const itemData = property.checklist[item];

            if (itemData.heatingStatus === 'ja') {
                const heatingElement = document.querySelector(`[onchange*="updateHeatingStatusModal"][onchange*="${btoa(item)}"]`);
                if (heatingElement) {
                    const checklistItem = heatingElement.closest('.checklist-item');
                    if (checklistItem) {
                        checklistItem.classList.add('completed');
                    }
                }
            }

            if (itemData.ownerApprovalStatus === 'ja') {
                const ownerElement = document.querySelector(`[onchange*="updateOwnerApprovalStatusModal"][onchange*="${btoa(item)}"]`);
                if (ownerElement) {
                    const checklistItem = ownerElement.closest('.checklist-item');
                    if (checklistItem) {
                        checklistItem.classList.add('completed');
                    }
                }
            }
        });
    }, 50);
}

function showCopyPropertyDialog(propertyId) {
    const property = currentProperties.find(p => p.id === propertyId);
    if (!property) {
        showModalNotification('Immobilie nicht gefunden', 'error');
        return;
    }

    const fields = [
        {
            name: 'newName',
            label: 'Neuer Immobilienname',
            icon: 'fas fa-building',
            type: 'text',
            required: true,
            placeholder: 'Neuer Name für die kopierte Immobilie',
            value: `${property.name} (Kopie)`,
            maxLength: 100,
            minLength: 3
        },
        {
            name: 'newAccountingYear',
            label: 'Neues Abrechnungsjahr',
            icon: 'fas fa-calendar-alt',
            type: 'number',
            required: true,
            placeholder: 'z.B. 2025',
            value: property.accountingYear + 1,
            min: 2020,
            max: 2030
        },
        {
            name: 'newAccountingPeriod',
            label: 'Neuer Abrechnungszeitraum',
            icon: 'fas fa-calendar-check',
            type: 'text',
            required: true,
            placeholder: 'z.B. 01.06.2025 - 31.05.2026',
            value: generateNewAccountingPeriod(property.accountingPeriod, property.accountingYear + 1),
            maxLength: 50
        },
        {
            name: 'copyNotes',
            label: 'Notizen kopieren?',
            icon: 'fas fa-sticky-note',
            type: 'checkbox',
            checked: true
        },
        {
            name: 'copyFeatures',
            label: 'Besonderheiten kopieren?',
            icon: 'fas fa-star',
            type: 'checkbox',
            checked: true
        },
        {
            name: 'copyChecklistProgress',
            label: 'Checklisten-Fortschritt kopieren?',
            icon: 'fas fa-tasks',
            type: 'checkbox',
            checked: false
        }
    ];

    showInputModal(
        'Immobilie kopieren',
        fields,
        async (formData) => {
            return await copyPropertyWithOptions(propertyId, formData);
        }
    );
}

function generateNewAccountingPeriod(oldPeriod, newYear) {
    if (!oldPeriod) {
        return `01.01.${newYear} - 31.12.${newYear}`;
    }

    const yearRegex = /\d{4}/g;
    const matches = oldPeriod.match(yearRegex);

    if (!matches || matches.length === 0) {
        return `01.01.${newYear} - 31.12.${newYear}`;
    }

    let newPeriod = oldPeriod;
    matches.forEach(year => {
        const oldYearNum = parseInt(year);
        const yearDiff = newYear - parseInt(matches[0]); 
        const newYearForThisMatch = oldYearNum + yearDiff;
        newPeriod = newPeriod.replace(year, newYearForThisMatch.toString());
    });

    return newPeriod;
}

function generateNewAccountingPeriod(oldPeriod, newYear) {
    if (!oldPeriod) {
        return `01.01.${newYear} - 31.12.${newYear}`;
    }

    const yearRegex = /\d{4}/g;
    return oldPeriod.replace(yearRegex, newYear.toString());
}

async function copyPropertyWithOptions(originalId, options) {
    console.log('=== COPY PROPERTY START ===');
    console.log('Original ID:', originalId);
    console.log('Received options:', options);

    const original = currentProperties.find(p => p.id === originalId);
    if (!original) {
        console.error('Original nicht gefunden!');
        showModalNotification('Original-Immobilie nicht gefunden', 'error');
        return { success: false };
    }

    console.log('Original property found:', original.name);

    try {

        if (!options.newName || !options.newAccountingYear || !options.newAccountingPeriod) {
            showModalNotification('Bitte füllen Sie alle Pflichtfelder aus', 'error');
            return { success: false };
        }

        const newProperty = {
            id: `immobilie_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: options.newName.trim(),
            type: original.type,
            hasHeating: original.hasHeating,
            accountingYear: parseInt(options.newAccountingYear),
            accountingPeriod: options.newAccountingPeriod.trim(),
            isDemo: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (options.copyNotes === true) {
            console.log('Copying notes - original has:', original.notes?.length || 0, 'notes');
            if (original.notes && Array.isArray(original.notes) && original.notes.length > 0) {
                newProperty.notes = original.notes.map((note, index) => ({
                    id: `note_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
                    timestamp: new Date().toISOString(),
                    text: note.text || '',
                    author: (note.author || 'Unbekannt') + ' (kopiert)'
                }));
                console.log('Notes copied successfully:', newProperty.notes.length);
            } else {
                newProperty.notes = [];
            }
        } else {
            newProperty.notes = [];
        }

        if (options.copyFeatures === true) {
            console.log('Copying features - original has:', original.specialFeatures?.length || 0, 'features');
            if (original.specialFeatures && Array.isArray(original.specialFeatures) && original.specialFeatures.length > 0) {
                newProperty.specialFeatures = original.specialFeatures.map(feature => ({
                    type: feature.type || 'Unbekannt',
                    description: feature.description || ''
                }));
                console.log('Features copied successfully:', newProperty.specialFeatures.length);
            } else {
                newProperty.specialFeatures = [];
            }
        } else {
            newProperty.specialFeatures = [];
        }

        if (options.copyChecklistProgress === true && original.checklist) {
            newProperty.checklist = JSON.parse(JSON.stringify(original.checklist));
            console.log('Checklist progress copied');
        } else {

            if (typeof getChecklistForProperty === 'function') {
                newProperty.checklist = getChecklistForProperty(newProperty.type, newProperty.hasHeating);
            } else if (original.checklist && Object.keys(original.checklist).length > 0) {
                newProperty.checklist = {};
                Object.keys(original.checklist).forEach(key => {
                    newProperty.checklist[key] = {
                        completed: false,
                        specialOptionChecked: false,
                        heatingStatus: '',
                        ownerApprovalStatus: '',
                        hasSpecialOption: original.checklist[key].hasSpecialOption || false
                    };
                });
            } else {
                newProperty.checklist = {};
            }
            console.log('Checklist reset');
        }

        console.log('Final new property:', newProperty);

        currentProperties.push(newProperty);
        console.log('Added to currentProperties. Total count:', currentProperties.length);

        if (typeof savePropertyToStorage === 'function') {
            const saveResult = savePropertyToStorage(newProperty);
            console.log('Saved to localStorage:', saveResult);
        }

        if (typeof window.filteredProperties !== 'undefined') {
            window.filteredProperties = [...currentProperties];
            console.log('Updated window.filteredProperties');
        }

        if (typeof filteredProperties !== 'undefined') {
            filteredProperties = [...currentProperties];
            console.log('Updated global filteredProperties');
        }

        if (typeof window.searchFilterSortDebug !== 'undefined' &&
            typeof window.searchFilterSortDebug.updateProperties === 'function') {
            window.searchFilterSortDebug.updateProperties(currentProperties);
            console.log('Updated searchFilterSortDebug');
        }

        console.log('Starting UI updates...');

        try {

            if (typeof renderPropertyCards === 'function') {
                renderPropertyCards(currentProperties);
                console.log('✓ Property cards rendered');
            }

            if (typeof renderSidebarItems === 'function') {
                renderSidebarItems(currentProperties);
                console.log('✓ Sidebar items rendered');
            }

            if (typeof updateStatusCards === 'function') {
                updateStatusCards(currentProperties);
                console.log('✓ Status cards updated');
            }

            if (typeof renderAllViews === 'function') {
                renderAllViews();
                console.log('✓ All views rendered');
            }

            if (typeof updateFiltersOnDataChange === 'function') {
                updateFiltersOnDataChange();
                console.log('✓ Filters updated');
            }

            if (typeof renderAllCharts === 'function') {
                setTimeout(() => {
                    renderAllCharts();
                    console.log('✓ Charts re-rendered');
                }, 100);
            }

            if (typeof refreshAfterPropertyChange === 'function') {
                refreshAfterPropertyChange(newProperty.id, 'create');
                console.log('✓ Refresh after change executed');
            }

        } catch (renderError) {
            console.error('Error during UI update:', renderError);

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }

        closePropertyModal();

        showModalNotification(
            `Immobilie "${options.newName}" erfolgreich kopiert! ` +
            `${newProperty.notes.length} Verlauf, ${newProperty.specialFeatures.length} Besonderheiten übertragen.`,
            'success'
        );

        console.log('=== COPY PROPERTY SUCCESS ===');
        console.log('New property ID:', newProperty.id);
        console.log('Current properties count:', currentProperties.length);

        return { success: true, newProperty };

    } catch (error) {
        console.error('=== COPY PROPERTY ERROR ===');
        console.error('Error:', error);
        showModalNotification('Fehler beim Kopieren: ' + error.message, 'error');
        return { success: false };
    }
}

function forceUIUpdate() {
    console.log('=== FORCE UI UPDATE ===');

    const updateMethods = [
        'renderAllViews',
        'renderPropertyCards',
        'renderSidebarItems',
        'updateStatusCards',
        'updateFiltersOnDataChange',
        'refreshAllViews',
        'updateDashboard'
    ];

    let updateSuccessful = false;

    updateMethods.forEach(methodName => {
        if (typeof window[methodName] === 'function') {
            try {
                window[methodName](currentProperties);
                console.log(`✓ ${methodName} executed successfully`);
                updateSuccessful = true;
            } catch (error) {
                console.warn(`✗ ${methodName} failed:`, error);
            }
        } else {
            console.log(`- ${methodName} not available`);
        }
    });

    if (!updateSuccessful) {
        console.warn('No update methods successful - forcing page reload');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    console.log('=== FORCE UI UPDATE END ===');
}

function updateOwnerApprovalStatusModal(propertyId, encodedItem, status, isChecked) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    try {
        const item = atob(encodedItem);
        if (!currentModalProperty.checklist[item]) {
            console.error('Checklist-Item nicht gefunden:', item);
            return;
        }

        if (!Array.isArray(currentModalProperty.checklist[item].ownerApprovalStatus)) {
            currentModalProperty.checklist[item].ownerApprovalStatus = [];
        }

        if (isChecked) {

            currentModalProperty.checklist[item].ownerApprovalStatus = [status];

            const allStatuses = ['ja', 'nein', 'korrektur'];
            allStatuses.forEach(otherStatus => {
                if (otherStatus !== status) {
                    const otherCheckboxName = `owner_${otherStatus}_${propertyId}_${encodedItem.replace(/[^a-zA-Z0-9]/g, '')}`;
                    const otherCheckbox = document.querySelector(`input[name="${otherCheckboxName}"]`);
                    if (otherCheckbox) {
                        otherCheckbox.checked = false;
                        const otherOption = otherCheckbox.closest('.owner-approval-option');
                        if (otherOption) {
                            otherOption.classList.remove('selected');
                        }
                    }
                }
            });
        } else {

            currentModalProperty.checklist[item].ownerApprovalStatus = [];
        }

        currentModalProperty.updatedAt = new Date().toISOString();

        const checkboxName = `owner_${status}_${propertyId}_${encodedItem.replace(/[^a-zA-Z0-9]/g, '')}`;
        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
        if (checkbox) {
            const option = checkbox.closest('.owner-approval-option');
            if (option) {
                if (isChecked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            }
        }

        const ownerItem = document.querySelector(`input[name="${checkboxName}"]`).closest('.checklist-item');
        if (ownerItem) {
            const ownerApprovalStatus = currentModalProperty.checklist[item].ownerApprovalStatus;
            if (ownerApprovalStatus.includes('ja')) {
                ownerItem.classList.add('completed');
            } else {
                ownerItem.classList.remove('completed');
            }
        }

        updatePropertyInMainData(currentModalProperty);
        updateModalChart();
        console.log(`Modal Eigentümer-Freigabe-Status aktualisiert: ${item} -> ${status} (${isChecked ? 'aktiviert' : 'deaktiviert'})`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Modal Eigentümer-Freigabe-Status:', error);
    }
}

function updateHeatingStatusModal(propertyId, encodedItem, status, isChecked) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    try {
        const item = atob(encodedItem);
        if (!currentModalProperty.checklist[item]) {
            console.error('Checklist-Item nicht gefunden:', item);
            return;
        }

        if (!Array.isArray(currentModalProperty.checklist[item].heatingStatus)) {
            currentModalProperty.checklist[item].heatingStatus = [];
        }

        if (isChecked) {

            currentModalProperty.checklist[item].heatingStatus = [status];

            const allStatuses = ['ja', 'nein', 'korrektur'];
            allStatuses.forEach(otherStatus => {
                if (otherStatus !== status) {
                    const otherCheckboxName = `heating_${otherStatus}_${propertyId}_${encodedItem.replace(/[^a-zA-Z0-9]/g, '')}`;
                    const otherCheckbox = document.querySelector(`input[name="${otherCheckboxName}"]`);
                    if (otherCheckbox) {
                        otherCheckbox.checked = false;
                        const otherOption = otherCheckbox.closest('.heating-status-option');
                        if (otherOption) {
                            otherOption.classList.remove('selected');
                        }
                    }
                }
            });
        } else {

            currentModalProperty.checklist[item].heatingStatus = [];
        }

        currentModalProperty.updatedAt = new Date().toISOString();

        const checkboxName = `heating_${status}_${propertyId}_${encodedItem.replace(/[^a-zA-Z0-9]/g, '')}`;
        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
        if (checkbox) {
            const option = checkbox.closest('.heating-status-option');
            if (option) {
                if (isChecked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            }
        }

        const heatingItem = document.querySelector(`input[name="${checkboxName}"]`).closest('.checklist-item');
        if (heatingItem) {
            const heatingStatus = currentModalProperty.checklist[item].heatingStatus;
            if (heatingStatus.includes('ja')) {
                heatingItem.classList.add('completed');
            } else {
                heatingItem.classList.remove('completed');
            }
        }

        updatePropertyInMainData(currentModalProperty);
        updateModalChart();
        console.log(`Modal Heizkostenstatus aktualisiert: ${item} -> ${status} (${isChecked ? 'aktiviert' : 'deaktiviert'})`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Modal Heizkostenstatus:', error);
    }
}

function loadSpecialFeaturesTab(property) {
    const content = document.getElementById('specialContent');
    if (!content) {
        console.warn('Special Content Container nicht gefunden');
        return;
    }

    let html = `
        <div class="special-features-container">
            <h4><i class="fas fa-star"></i> Besonderheiten</h4>
            <div class="special-features-table-container">
                <table class="special-features">
                    <thead>
                        <tr>
                            <th><i class="fas fa-tag"></i> Titel</th>
                            <th><i class="fas fa-info-circle"></i> Beschreibung</th>
                            <th><i class="fas fa-cogs"></i> Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (property.specialFeatures && property.specialFeatures.length > 0) {
        property.specialFeatures.forEach((feature, index) => {
            html += `
                <tr>
                    <td title="${escapeHtml(feature.type)}" style="font-weight: 600;">${escapeHtml(feature.type)}</td>
                    <td title="${escapeHtml(feature.description)}">${escapeHtml(feature.description)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editSpecialFeatureModal('${property.id}', ${index})" title="Bearbeiten">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="deleteSpecialFeatureModal('${property.id}', ${index})" title="Löschen">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="3" class="noentry">
                    <i class="fas fa-info-circle" style="margin-right: 0.5rem; color: var(--secondary-color);"></i>
                    Keine Besonderheiten vorhanden
                </td>
            </tr>
        `;
    }

    html += `
                    </tbody>
                </table>
            </div>
            <button class="add-special-btn" onclick="addSpecialFeatureModal('${property.id}')">
                <i class="fas fa-plus"></i> Besonderheit hinzufügen
            </button>
        </div>
    `;

    content.innerHTML = html;
}

function loadNotesTab(property) {
    const content = document.getElementById('notesContent');
    if (!content) {
        console.warn('Notes Content Container nicht gefunden');
        return;
    }

    const notes = Array.isArray(property.notes) ? property.notes : migrateNotes(property.notes);

    content.innerHTML = `
        <div class="notes-timeline-container">
            <div class="notes-header">
                <h4><i class="fas fa-sticky-note"></i> Verlauf</h4>
                <button class="btn btn-primary add-note-btn" onclick="addNewNote('${property.id}')">
                    <i class="fas fa-plus"></i> Neuer Eintrag
                </button>
            </div>

            <div class="notes-timeline" id="notesTimeline">
                ${renderNotesTimeline(notes, property.id)}
            </div>

            ${notes.length === 0 ? `
                <div class="notes-empty">
                    <i class="fas fa-comment-alt-slash"></i>
                    <p>Noch keine Einträge vorhanden</p>
                    <button class="btn btn-outline-primary" onclick="addNewNote('${property.id}')">
                        <i class="fas fa-plus"></i> Ersten Eintrag hinzufügen
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function openPortfolioManagementFromModal() {
    if (window.portfolioManager) {
        window.portfolioManager.openPortfolioModal();

        const originalCloseModal = window.portfolioManager.closePortfolioModal;
        window.portfolioManager.closePortfolioModal = function () {
            originalCloseModal.call(this);

            setTimeout(() => {
                const portfolioSelect = document.getElementById('editPropertyPortfolioModal');
                const currentValue = portfolioSelect ? portfolioSelect.value : 'Standard';
                initializePortfolioDropdownInModal(currentValue);
            }, 100);
        };
    }
}

function loadMasterDataTab(property) {
    const content = document.getElementById('masterdataContent');
    if (!content) {
        console.warn('Masterdata Content Container nicht gefunden');
        return;
    }

    const currentPortfolio = property.portfolio || 'Standard';

    content.innerHTML = `
        <div class="masterdata-container">

<div style="display: flex; justify-content: space-between; align-items: center;">
  <h4 style="margin: 0;"><i class="fas fa-cog"></i> Stammdaten</h4>
  <button type="button" class="btn btn-primary" onclick="saveMasterDataModal('${property.id}')">
    <i class="fas fa-save"></i> Änderungen speichern
  </button>
</div>

            <form id="masterdataFormModal" class="property-form">
                <div class="form-group">
                    <label for="editPropertyNameModal">
                        <i class="fas fa-building"></i>
                        Immobilienname / Straße
                    </label>
                    <input type="text" id="editPropertyNameModal" value="${escapeHtml(property.name)}" required>
                </div>

                <!-- NEUES PORTFOLIO-FELD -->
                <div class="form-group">
                    <label for="editPropertyPortfolioModal">
                        <i class="fas fa-briefcase"></i>
                        Portfolio
                    </label>
                    <div class="portfolio-input-group">
                        <select id="editPropertyPortfolioModal" required>
                            <!-- Wird automatisch befüllt -->
                        </select>
                        <button type="button" class="btn btn-sm btn-secondary portfolio-manage-btn" onclick="openPortfolioManagementFromModal()" title="Portfolio verwalten">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="editPropertyTypeModal">
                            <i class="fas fa-tag"></i>
                            Typ
                        </label>
                        <select id="editPropertyTypeModal" required>
                            <option value="WEG" ${property.type === 'WEG' ? 'selected' : ''}>WEG (Wohnungseigentum)</option>
                            <option value="MV" ${property.type === 'MV' ? 'selected' : ''}>MV (Mietverwaltung)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editAccountingYearModal">
                            <i class="fas fa-calendar-alt"></i>
                            Abrechnungsjahr
                        </label>
                        <input type="number" id="editAccountingYearModal" value="${property.accountingYear}" min="2020" max="2030" required>
                    </div>

                    <div class="form-group">
                        <label for="editAccountingPeriodModal">
                            <i class="fas fa-calendar-alt"></i>
                            Abrechnungszeitraum
                        </label>
                        <input type="text" id="editAccountingPeriodModal" value="${escapeHtml(property.accountingPeriod || '')}" placeholder="z.B. 01.06.2025 - 31.05.2026" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="editHasHeatingModal">
                        <i class="fas fa-fire"></i>
                        Heizkostenabrechnung
                    </label>
                    <select id="editHasHeatingModal" required>
                        <option value="true" ${property.hasHeating ? 'selected' : ''}>✓ Mit Heizkostenabrechnung</option>
                        <option value="false" ${!property.hasHeating ? 'selected' : ''}>✗ Ohne Heizkostenabrechnung</option>
                    </select>
                </div>

                <div class="property-info-display">
                    <h5><i class="fas fa-info-circle"></i> Zusätzliche Informationen</h5>

                    <div class="info-item">
                        <i class="fas fa-briefcase"></i>
                        <strong>Portfolio:</strong>
                        <span class="portfolio-display">${escapeHtml(currentPortfolio)}</span>
                    </div>

                    <div class="info-item">
                        <i class="fas fa-plus-circle"></i>
                        <strong>Erstellt:</strong>
                        <span>${formatDate(property.createdAt)}</span>
                    </div>

                    ${property.updatedAt ? `
                        <div class="info-item">
                            <i class="fas fa-edit"></i>
                            <strong>Geändert:</strong>
                            <span>${formatDate(property.updatedAt)}</span>
                        </div>
                    ` : ''}

                    <div class="info-item">
                        <i class="fas fa-key"></i>
                        <strong>Immobilien-ID:</strong>
                        <span style="font-family: monospace; font-size: 0.8rem;">${property.id}</span>
                    </div>

                    ${property.isDemo ? `
                        <div class="info-item demo">
                            <i class="fas fa-flask"></i>
                            <strong>Demo-Objekt:</strong>
                            <span>Diese Immobilie ist ein Beispiel-Objekt für Testzwecke</span>
                        </div>
                    ` : ''}

                    <div class="info-item">
                        <i class="fas fa-tasks"></i>
                        <strong>Checkliste:</strong>
                        <span>${Object.keys(property.checklist || {}).length} Aufgaben definiert</span>
                    </div>

                    ${property.specialFeatures && property.specialFeatures.length > 0 ? `
                        <div class="info-item">
                            <i class="fas fa-star"></i>
                            <strong>Besonderheiten:</strong>
                            <span>${property.specialFeatures.length} Besonderheiten</span>
                        </div>
                    ` : ''}
                </div>

                 <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="saveMasterDataModal('${property.id}')">
                        <i class="fas fa-save"></i> Änderungen speichern
                    </button>
                </div>

            </form>

        </div>

    `;

    setTimeout(() => {
        initializePortfolioDropdownInModal(currentPortfolio);
    }, 50);
}

function initializePortfolioDropdownInModal(selectedPortfolio) {
    const portfolioSelect = document.getElementById('editPropertyPortfolioModal');
    if (portfolioSelect && window.portfolioManager) {
        window.portfolioManager.populatePortfolioDropdown(portfolioSelect, selectedPortfolio);
    }
}

function initPortfolioModalIntegration() {
    document.addEventListener('portfolioModalClosed', () => {
        console.log('Portfolio Modal geschlossen - Event empfangen');

        setTimeout(() => {
            const portfolioSelect = document.getElementById('editPropertyPortfolioModal');
            if (portfolioSelect) {
                const currentValue = portfolioSelect.value || 'Standard';

                if (typeof initializePortfolioDropdownInModal === 'function') {
                    initializePortfolioDropdownInModal(currentValue);
                } else {
                    window.portfolioManager?.populatePortfolioDropdown(portfolioSelect, currentValue);
                }
            }
        }, 100);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPortfolioModalIntegration();
});

function renderNotesTimeline(notes, propertyId) {
    if (!notes || notes.length === 0) {
        return '';
    }

    const sortedNotes = [...notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return sortedNotes.map(note => `
        <div class="note-item" data-note-id="${note.id}">
            <div class="note-timestamp">
                <div class="note-date">${formatNoteDate(note.timestamp)}</div>
                <div class="note-time">${formatNoteTime(note.timestamp)}</div>
            </div>
            <div class="note-content">
                <div class="note-header">
                    <span class="note-author">
                        <i class="fas fa-user"></i>
                        ${escapeHtml(note.author)}
                    </span>
                    <div class="note-actions">
                        <button class="note-action-btn" onclick="editNote('${propertyId}', '${note.id}')" title="Bearbeiten">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-action-btn delete" onclick="deleteNote('${propertyId}', '${note.id}')" title="Löschen">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-text">${escapeHtml(note.text).replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    `).join('');
}

function addNewNote(propertyId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    const fields = [
        {
            name: 'text',
            label: 'Notiz',
            icon: 'fas fa-comment',
            type: 'textarea',
            required: true,
            placeholder: 'Text...',
            minLength: 1,
            maxLength: 2000,
            rows: 6
        },
        {
            name: 'author',
            label: 'Verfasser',
            icon: 'fas fa-user',
            type: 'text',
            required: true,
            placeholder: 'Ihr Name oder Kürzel...',
            maxLength: 50
        }
    ];

    showInputModal(
        'Neuen Eintrag hinzufügen',
        fields,
        async (formData) => {

            if (!Array.isArray(currentModalProperty.notes)) {
                currentModalProperty.notes = migrateNotes(currentModalProperty.notes);
            }

            const newNote = {
                id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                text: formData.text,
                author: formData.author
            };

            currentModalProperty.notes.unshift(newNote); 
            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);
            loadNotesTab(currentModalProperty);

            showModalNotification('Notiz hinzugefügt', 'success');

            return { success: true };
        },
        { author: getLastUsedAuthor() } 
    ).catch(error => {
        if (error.message !== 'User cancelled') {
            console.error('Fehler beim Hinzufügen der Notiz:', error);
        }
    });
}

function editNote(propertyId, noteId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!Array.isArray(currentModalProperty.notes)) {
        currentModalProperty.notes = migrateNotes(currentModalProperty.notes);
    }

    const noteIndex = currentModalProperty.notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) {
        console.error('Notiz nicht gefunden');
        return;
    }

    const note = currentModalProperty.notes[noteIndex];

    const fields = [
        {
            name: 'text',
            label: 'Notiz',
            icon: 'fas fa-comment',
            type: 'textarea',
            required: true,
            placeholder: 'Text...',
            minLength: 1,
            maxLength: 2000,
            rows: 6
        },
        {
            name: 'author',
            label: 'Verfasser',
            icon: 'fas fa-user',
            type: 'text',
            required: true,
            placeholder: 'Ihr Name oder Kürzel...',
            maxLength: 50
        }
    ];

    showInputModal(
        'Notiz bearbeiten',
        fields,
        async (formData) => {

            currentModalProperty.notes[noteIndex] = {
                ...note,
                text: formData.text,
                author: formData.author,
                editedAt: new Date().toISOString()
            };

            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);
            loadNotesTab(currentModalProperty);

            showModalNotification('Notiz aktualisiert', 'success');

            return { success: true };
        },
        { text: note.text, author: note.author } 
    ).catch(error => {
        if (error.message !== 'User cancelled') {
            console.error('Fehler beim Bearbeiten der Notiz:', error);
        }
    });
}

function deleteNote(propertyId, noteId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!Array.isArray(currentModalProperty.notes)) {
        currentModalProperty.notes = migrateNotes(currentModalProperty.notes);
    }

    const noteIndex = currentModalProperty.notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) {
        console.error('Notiz nicht gefunden');
        return;
    }

    const note = currentModalProperty.notes[noteIndex];

    const confirmText = `Notiz vom ${formatNoteDate(note.timestamp)} wirklich löschen?

${note.text.substring(0, 100)}${note.text.length > 100 ? '...' : ''}

Diese Aktion kann nicht rückgängig gemacht werden.`;

    if (confirm(confirmText)) {
        try {

            currentModalProperty.notes.splice(noteIndex, 1);
            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);
            loadNotesTab(currentModalProperty);

            showModalNotification('Notiz gelöscht', 'success');

        } catch (error) {
            console.error('Fehler beim Löschen der Notiz:', error);
            showModalNotification('Fehler beim Löschen der Notiz', 'error');
        }
    }
}

function formatNoteDate(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        return 'Unbekannt';
    }
}

function formatNoteTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '';
    }
}

function getLastUsedAuthor() {

    try {
        const lastAuthor = localStorage.getItem('last_note_author');
        return lastAuthor || 'Admin';
    } catch (error) {
        return 'Admin';
    }
}

function saveLastUsedAuthor(author) {
    try {
        localStorage.setItem('last_note_author', author);
    } catch (error) {
        console.warn('Konnte letzten Autor nicht speichern');
    }
}

window.addNewNote = addNewNote;
window.editNote = editNote;
window.deleteNote = deleteNote;

function updateChecklistItemModal(propertyId, encodedItem, isCompleted) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    try {
        const item = atob(encodedItem);
        if (!currentModalProperty.checklist[item]) {
            console.error('Checklist-Item nicht gefunden:', item);
            return;
        }

        currentModalProperty.checklist[item].completed = isCompleted;
        currentModalProperty.updatedAt = new Date().toISOString();

        updateModalChart();

        updatePropertyInMainData(currentModalProperty);

        console.log(`Modal Checklist-Item aktualisiert: ${item} -> ${isCompleted ? 'abgeschlossen' : 'offen'}`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Modal Checklist-Items:', error);
    }
}

function updateSpecialOptionModal(propertyId, encodedItem, isChecked) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    try {
        const item = atob(encodedItem);
        if (!currentModalProperty.checklist[item]) {
            console.error('Checklist-Item nicht gefunden');
            return;
        }

        currentModalProperty.checklist[item].specialOptionChecked = isChecked;

        updatePropertyInMainData(currentModalProperty);

        console.log(`Modal Sonderoption aktualisiert: ${item} -> ${isChecked ? 'aktiviert' : 'deaktiviert'}`);

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Modal Sonderoption:', error);
    }
}

function saveNotesModal(propertyId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    const notesTextarea = document.getElementById('propertyNotesModal');

    if (!notesTextarea) {
        console.error('Notizen-Textarea nicht gefunden');
        return;
    }

    try {

        currentModalProperty.notes = notesTextarea.value.trim();
        currentModalProperty.updatedAt = new Date().toISOString();

        updatePropertyInMainData(currentModalProperty);

        showModalNotification('Verlauf gespeichert', 'success');

        console.log('Modal Notizen gespeichert');

    } catch (error) {
        console.error('Fehler beim Speichern der Modal Notizen:', error);
        showModalNotification('Fehler beim Speichern der Notizen', 'error');
    }
}

function saveMasterDataModal(propertyId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }
    try {

        const oldType = currentModalProperty.type;
        const oldHasHeating = currentModalProperty.hasHeating;
        const oldName = currentModalProperty.name; 

        const newName = document.getElementById('editPropertyNameModal').value.trim();
        const newPortfolio = document.getElementById('editPropertyPortfolioModal').value;
        const newType = document.getElementById('editPropertyTypeModal').value;
        const newHasHeating = document.getElementById('editHasHeatingModal').value === 'true';
        const newAccountingYear = parseInt(document.getElementById('editAccountingYearModal').value);
        const newAccountingPeriod = document.getElementById('editAccountingPeriodModal').value.trim();

        console.log('=== SPEICHERN DEBUG START ===');
        console.log('Property ID:', propertyId);
        console.log('Alter Name:', oldName);
        console.log('Neuer Name:', newName);
        console.log('Portfolio:', newPortfolio);
        console.log('Name geändert:', oldName !== newName);

        if (!newName || !newPortfolio || !newType || !newAccountingYear || !newAccountingPeriod) {
            console.log('Validierung fehlgeschlagen - fehlende Felder');
            showModalNotification('Bitte füllen Sie alle Felder aus', 'error');
            return;
        }

        if (oldName !== newName) {
            console.log('Name wurde geändert - führe Duplikatsprüfung durch');

            if (typeof checkPropertyNameDuplicate === 'function') {
                console.log('checkPropertyNameDuplicate Funktion verfügbar');

                const isDuplicate = checkPropertyNameDuplicate(newName, propertyId);
                console.log('Duplikatsprüfung Ergebnis:', isDuplicate);

                if (isDuplicate) {
                    console.log('Duplikat gefunden - Speichern abgebrochen');
                    showModalNotification('Eine Immobilie mit diesem Namen existiert bereits', 'error');
                    return;
                }
                console.log('Kein Duplikat - Speichern fortsetzen');
            } else {
                console.warn('checkPropertyNameDuplicate Funktion nicht verfügbar');
            }
        } else {
            console.log('Name unverändert - keine Duplikatsprüfung nötig');
        }

        console.log('Speichere Änderungen...');

        currentModalProperty.name = newName;
        currentModalProperty.portfolio = newPortfolio;
        currentModalProperty.type = newType;
        currentModalProperty.hasHeating = newHasHeating;
        currentModalProperty.accountingYear = newAccountingYear;
        currentModalProperty.accountingPeriod = newAccountingPeriod;
        currentModalProperty.updatedAt = new Date().toISOString();

        if (oldType !== newType || oldHasHeating !== newHasHeating) {
            if (typeof updateChecklistForPropertyChange === 'function') {
                currentModalProperty.checklist = updateChecklistForPropertyChange(
                    currentModalProperty, oldType, oldHasHeating
                );

                loadChecklistTab(currentModalProperty);
            }
        }

        updatePropertyInMainData(currentModalProperty);

        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = currentModalProperty.name;
        }

        const portfolioDisplay = document.querySelector('.portfolio-display');
        if (portfolioDisplay) {
            portfolioDisplay.textContent = newPortfolio;
        }

        updateModalChart();

        showModalNotification('Stammdaten gespeichert', 'success');
        console.log('=== SPEICHERN DEBUG END - ERFOLGREICH ===');

    } catch (error) {
        console.error('=== SPEICHERN DEBUG END - FEHLER ===', error);
        showModalNotification('Fehler beim Speichern der Stammdaten', 'error');
    }
}

function addSpecialFeatureModal(propertyId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    const type = prompt('Titel:');
    if (!type) return;

    const description = prompt('Beschreibung:');
    if (!description) return;

    try {

        if (!currentModalProperty.specialFeatures) {
            currentModalProperty.specialFeatures = [];
        }

        currentModalProperty.specialFeatures.push({
            type: type.trim(),
            description: description.trim()
        });

        currentModalProperty.updatedAt = new Date().toISOString();

        updatePropertyInMainData(currentModalProperty);

        loadSpecialFeaturesTab(currentModalProperty);

        showModalNotification('Besonderheit hinzugefügt', 'success');

    } catch (error) {
        console.error('Fehler beim Hinzufügen der Besonderheit:', error);
        showModalNotification('Fehler beim Hinzufügen der Besonderheit', 'error');
    }
}

function editSpecialFeatureModal(propertyId, index) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!currentModalProperty.specialFeatures || !currentModalProperty.specialFeatures[index]) {
        console.error('Besonderheit nicht gefunden');
        return;
    }

    const feature = currentModalProperty.specialFeatures[index];

    const newType = prompt('Titel:', feature.type);
    if (newType === null) return;

    const newDescription = prompt('Beschreibung:', feature.description);
    if (newDescription === null) return;

    try {

        currentModalProperty.specialFeatures[index] = {
            type: newType.trim(),
            description: newDescription.trim()
        };

        currentModalProperty.updatedAt = new Date().toISOString();

        updatePropertyInMainData(currentModalProperty);

        loadSpecialFeaturesTab(currentModalProperty);

        showModalNotification('Besonderheit aktualisiert', 'success');

    } catch (error) {
        console.error('Fehler beim Bearbeiten der Besonderheit:', error);
        showModalNotification('Fehler beim Bearbeiten der Besonderheit', 'error');
    }
}

function deleteSpecialFeatureModal(propertyId, index) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!currentModalProperty.specialFeatures || !currentModalProperty.specialFeatures[index]) {
        console.error('Besonderheit nicht gefunden');
        return;
    }

    const feature = currentModalProperty.specialFeatures[index];

    if (confirm(`Besonderheit "${feature.type}" wirklich löschen?`)) {
        try {

            currentModalProperty.specialFeatures.splice(index, 1);
            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);

            loadSpecialFeaturesTab(currentModalProperty);

            showModalNotification('Besonderheit gelöscht', 'success');

        } catch (error) {
            console.error('Fehler beim Löschen der Besonderheit:', error);
            showModalNotification('Fehler beim Löschen der Besonderheit', 'error');
        }
    }
}

function updatePropertyInMainData(updatedProperty) {
    try {
        console.log('=== MAIN DATA UPDATE START ===');
        console.log('Property ID:', updatedProperty.id);

        if (typeof updateDataFromExternal === 'function') {

        }

        if (typeof savePropertyToStorage === 'function') {
            savePropertyToStorage(updatedProperty);
            console.log('Property im Storage gespeichert');
        }

        if (typeof refreshAfterPropertyChange === 'function') {
            console.log('Rufe refreshAfterPropertyChange auf...');
            refreshAfterPropertyChange(updatedProperty.id, 'update');
        }

        console.log('=== MAIN DATA UPDATE END ===');

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Hauptdaten:', error);
    }
}

function updateModalChart() {
    if (!currentModalProperty) return;

    try {
        console.log('=== MODAL CHART UPDATE START ===');
        console.log('Property:', currentModalProperty.name);

        console.log('Checklist Debug:', currentModalProperty.checklist);

        console.log('calculateProgress Funktion verfügbar:', typeof calculateProgress);
        console.log('isItemCompleted Funktion verfügbar:', typeof isItemCompleted);
        console.log('isHeatingReturnItem Funktion verfügbar:', typeof isHeatingReturnItem);
        console.log('isOwnerApprovalItem Funktion verfügbar:', typeof isOwnerApprovalItem);

        Object.keys(currentModalProperty.checklist).forEach(itemName => {
            const itemData = currentModalProperty.checklist[itemName];
            console.log(`Item: ${itemName}`);
            console.log(`  - completed: ${itemData.completed}`);
            console.log(`  - heatingStatus: ${JSON.stringify(itemData.heatingStatus)}`);
            console.log(`  - ownerApprovalStatus: ${JSON.stringify(itemData.ownerApprovalStatus)}`);
            console.log(`  - isHeatingReturnItem: ${isHeatingReturnItem(itemName)}`);
            console.log(`  - isOwnerApprovalItem: ${isOwnerApprovalItem(itemName)}`);
            console.log(`  - isItemCompleted: ${isItemCompleted(itemName, itemData)}`);
        });

        const progress = calculateProgress(currentModalProperty.checklist);
        console.log('Berechneter Progress:', progress + '%');

        if (typeof createLargeProgressChart === 'function') {
            createLargeProgressChart('modalChart', progress);
        }

        const progressElement = document.getElementById('modalProgressPercent');
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
            if (typeof getProgressColor === 'function') {
                progressElement.style.color = getProgressColor(progress);
            }
        }

        console.log(`Modal-Chart aktualisiert: ${progress}%`);
        console.log('=== MODAL CHART UPDATE END ===');

    } catch (error) {
        console.error('Fehler beim Aktualisieren des Modal-Charts:', error);
        console.error('Error Stack:', error.stack);
    }
}

function showModalNotification(message, type = 'info') {

    const existing = document.getElementById('modalNotification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'modalNotification';
    notification.className = `modal-notification ${type}`;

    let icon = 'fas fa-info-circle';
    let bgColor = 'var(--info-color)';

    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            bgColor = 'var(--success-color)';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';

            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            bgColor = '#f39c12';
            break;
    }

    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 0.75rem 1rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-hover);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3333);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unbekannt';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Ungültiges Datum';
    }
}

function getSpecialOptionText(item) {
    if (item.includes('Heizkostenabrechnung zurückerhalten') ||
        item.includes('Heizkostenaufstellung zurückerhalten')) {
        return 'Korrektur erforderlich (abgelehnt)';
    } else if (item.includes('Eigentümer zur Freigabe geschickt')) {
        return 'Eigentümer wünscht Korrektur';
    }
    return 'Sonderstatus';
}

function checkPropertyNameDuplicate(name, excludeId) {
    try {
        let allProperties = [];

        console.log('=== DUPLIKATSPRÜFUNG START ===');
        console.log('Suche nach Name:', name);
        console.log('Ausschließen ID:', excludeId);

        if (typeof window.searchFilterSortDebug !== 'undefined' && window.searchFilterSortDebug.getCurrentProperties) {
            allProperties = window.searchFilterSortDebug.getCurrentProperties();
            console.log('Properties von searchFilterSortDebug erhalten:', allProperties.length);
        } else if (typeof initializeDemoData === 'function') {
            allProperties = initializeDemoData();
            console.log('Properties von initializeDemoData erhalten:', allProperties.length);
        } else {

            const storedProperties = typeof loadPropertiesFromStorage === 'function' ? loadPropertiesFromStorage() : [];
            const demoProperties = typeof getDemoProperties === 'function' ? getDemoProperties() : [];
            allProperties = [...demoProperties, ...storedProperties];
            console.log('Properties von Fallback-Methode erhalten:', allProperties.length);
        }

        console.log('Verfügbare Properties:', allProperties.map(p => ({
            id: p.id,
            name: p.name,
            isExcluded: p.id === excludeId
        })));

        const duplicates = allProperties.filter(property =>
            property.id !== excludeId &&
            property.name.toLowerCase() === name.toLowerCase()
        );

        console.log('Gefundene Duplikate:', duplicates);
        console.log('=== DUPLIKATSPRÜFUNG END ===');

        return duplicates.length > 0;

    } catch (error) {
        console.error('Fehler bei Duplikatsprüfung:', error);
        return false; 
    }
}

window.openPropertyModal = openPropertyModal;
window.closePropertyModal = closePropertyModal;
window.switchModalTab = switchModalTab;
window.updateChecklistItemModal = updateChecklistItemModal;
window.updateSpecialOptionModal = updateSpecialOptionModal;
window.saveNotesModal = saveNotesModal;
window.saveMasterDataModal = saveMasterDataModal;
window.addSpecialFeatureModal = addSpecialFeatureModal;
window.editSpecialFeatureModal = editSpecialFeatureModal;
window.deleteSpecialFeatureModal = deleteSpecialFeatureModal;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeModalImmo, 200);
    });
} else {
    setTimeout(initializeModalImmo, 200);
}

function migrateNotes(notes) {

    if (Array.isArray(notes)) {
        return notes.map(note => ({
            id: note.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: note.timestamp || new Date().toISOString(),
            text: note.text || '',
            author: note.author || 'Unbekannt'
        }));
    }

    if (typeof notes === 'string' && notes.trim()) {
        return [{
            id: `migrated_${Date.now()}`,
            timestamp: new Date().toISOString(),
            text: notes.trim(),
            author: 'Migriert'
        }];
    }

    return [];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeModalImmo,
        openPropertyModal,
        closePropertyModal,
        switchModalTab,
        loadModalContent,
        updateChecklistItemModal,
        updateSpecialOptionModal,
        saveNotesModal,
        saveMasterDataModal,
        addSpecialFeatureModal,
        editSpecialFeatureModal,
        deleteSpecialFeatureModal
    };
}

function showInputModal(title, fields, onSubmit, prefillData = {}) {
    return new Promise((resolve, reject) => {
        const existingModal = document.getElementById('inputModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.className = 'input-modal';

        let fieldsHtml = '';
        fields.forEach(field => {
            const value = prefillData[field.name] || field.value || '';
            const errorId = `error_${field.name}`;

            if (field.type === 'checkbox') {

                const checked = prefillData[field.name] !== undefined ?
                    prefillData[field.name] :
                    (field.checked || false);

                fieldsHtml += `
                <div class="input-form-group" data-field="${field.name}">
                    <label class="checkbox-label">
                        <input type="checkbox" 
                               id="input_${field.name}" 
                               name="${field.name}"
                               ${checked ? 'checked' : ''}
                               ${field.required ? 'required' : ''}>
                        <i class="${field.icon || 'fas fa-check'}"></i>
                        ${field.label}
                        ${field.required ? '<span style="color: #e74c3c;">*</span>' : ''}
                    </label>
                    <div class="input-error-message" id="${errorId}" style="display: none;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span></span>
                    </div>
                </div>
                `;
            } else {

                fieldsHtml += `
                <div class="input-form-group" data-field="${field.name}">
                    <label for="input_${field.name}">
                        <i class="${field.icon || 'fas fa-edit'}"></i>
                        ${field.label}
                        ${field.required ? '<span style="color: #e74c3c;">*</span>' : ''}
                    </label>
                    ${field.type === 'textarea' ?
                        `<textarea id="input_${field.name}" 
                                   placeholder="${field.placeholder || ''}" 
                                   ${field.required ? 'required' : ''} 
                                   rows="${field.rows || 3}"
                                   ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}>${value}</textarea>` :
                        `<input type="${field.type || 'text'}" 
                                id="input_${field.name}" 
                                value="${value}" 
                                placeholder="${field.placeholder || ''}" 
                                ${field.required ? 'required' : ''} 
                                ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                                ${field.min ? `min="${field.min}"` : ''}
                                ${field.max ? `max="${field.max}"` : ''}>`
                    }
                    <div class="input-error-message" id="${errorId}" style="display: none;">
                        <i class="fas fa-exclamation-circle"></i>
                        <span></span>
                    </div>
                </div>
                `;
            }
        });

        modal.innerHTML = `
            <div class="input-modal-content">
                <div class="input-modal-header">
                    <h3><i class="fas fa-edit"></i> ${title}</h3>
                    <button class="input-modal-close" onclick="closeInputModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="input-modal-body">
                    <form class="input-form" id="inputForm">
                        ${fieldsHtml}
                        <div class="input-form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeInputModal()">
                                <i class="fas fa-times"></i> Abbrechen
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Speichern
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        setupInputModalListeners(modal, fields, onSubmit, resolve, reject);

        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="checkbox"]), textarea');
            if (firstInput) {
                firstInput.focus();
                if (firstInput.type === 'text') {
                    firstInput.select();
                }
            }
        }, 300);
    });
}

function setupInputModalListeners(modal, fields, onSubmit, resolve, reject) {
    const form = modal.querySelector('#inputForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (await handleInputFormSubmit(fields, onSubmit, resolve, reject)) {
            closeInputModal();
        }
    });

    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeInputModal();
            reject(new Error('User cancelled'));
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeInputModal();
            reject(new Error('User cancelled'));
        }
    });

    fields.forEach(field => {
        const input = modal.querySelector(`#input_${field.name}`);
        if (input) {
            input.addEventListener('input', () => {
                validateField(field, input.value);
            });

            input.addEventListener('blur', () => {
                validateField(field, input.value);
            });
        }
    });
}

async function handleInputFormSubmit(fields, onSubmit, resolve, reject) {
    const form = document.getElementById('inputForm');
    const formData = {};
    let isValid = true;

    console.log('=== FORM SUBMIT START ===');

    fields.forEach(field => {
        const input = document.getElementById(`input_${field.name}`);
        let value;

        if (field.type === 'checkbox') {
            value = input.checked;
            console.log(`Checkbox ${field.name}:`, value);
        } else {
            value = input.value.trim();
            console.log(`Field ${field.name}:`, value);
        }

        if (!validateField(field, value)) {
            isValid = false;
        }

        formData[field.name] = value;
    });

    console.log('Gesammelte Form-Daten:', formData);
    console.log('Validation valid:', isValid);

    if (!isValid) {
        console.log('Validation fehlgeschlagen');
        return false;
    }

    form.classList.add('loading');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        console.log('Rufe onSubmit auf mit:', formData);
        const result = await onSubmit(formData);
        console.log('onSubmit Ergebnis:', result);
        resolve(result);
        return true;
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showInputModalError('Fehler beim Speichern: ' + error.message);
        return false;
    } finally {
        form.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function validateField(field, value) {
    const formGroup = document.querySelector(`[data-field="${field.name}"]`);
    const errorElement = document.getElementById(`error_${field.name}`);
    const input = document.getElementById(`input_${field.name}`);

    let isValid = true;
    let errorMessage = '';

    if (field.required && !value) {
        isValid = false;
        errorMessage = `${field.label} ist erforderlich`;
    }

    if (isValid && field.minLength && value.length < field.minLength) {
        isValid = false;
        errorMessage = `${field.label} muss mindestens ${field.minLength} Zeichen lang sein`;
    }

    if (isValid && field.maxLength && value.length > field.maxLength) {
        isValid = false;
        errorMessage = `${field.label} darf maximal ${field.maxLength} Zeichen lang sein`;
    }

    if (isValid && field.validate) {
        const customResult = field.validate(value);
        if (customResult !== true) {
            isValid = false;
            errorMessage = customResult;
        }
    }

    if (isValid) {
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
        errorElement.style.display = 'none';
    } else {
        formGroup.classList.remove('success');
        formGroup.classList.add('error');
        errorElement.querySelector('span').textContent = errorMessage;
        errorElement.style.display = 'flex';
    }

    return isValid;
}

function closeInputModal() {
    const modal = document.getElementById('inputModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function showInputModalError(message) {
    const modal = document.getElementById('inputModal');
    if (!modal) return;

    const existingError = modal.querySelector('.input-modal-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'input-modal-error';
    errorDiv.innerHTML = `
        <div style="color: white; padding: 0.75rem; margin-bottom: 1rem; border-radius: var(--border-radius); display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;

    const modalBody = modal.querySelector('.input-modal-body');
    modalBody.insertBefore(errorDiv, modalBody.firstChild);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function addSpecialFeatureModal(propertyId) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    const fields = [
        {
            name: 'type',
            label: 'Titel:',
            icon: 'fas fa-tag',
            type: 'text',
            required: true,
            placeholder: 'z.B. Aufzug, Tiefgarage, Denkmalschutz...',
            maxLength: 50,
            minLength: 2
        },
        {
            name: 'description',
            label: 'Beschreibung',
            icon: 'fas fa-info-circle',
            type: 'textarea',
            required: true,
            placeholder: 'Detaillierte Beschreibung der Besonderheit...',
            maxLength: 500,
            minLength: 5,
            rows: 4
        }
    ];

    showInputModal(
        'Neue Besonderheit hinzufügen',
        fields,
        async (formData) => {

            if (!currentModalProperty.specialFeatures) {
                currentModalProperty.specialFeatures = [];
            }

            currentModalProperty.specialFeatures.push({
                type: formData.type,
                description: formData.description
            });

            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);

            loadSpecialFeaturesTab(currentModalProperty);

            showModalNotification('Besonderheit hinzugefügt', 'success');

            return { success: true };
        }
    ).catch(error => {
        if (error.message !== 'User cancelled') {
            console.error('Fehler beim Hinzufügen der Besonderheit:', error);
        }
    });
}

function editSpecialFeatureModal(propertyId, index) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!currentModalProperty.specialFeatures || !currentModalProperty.specialFeatures[index]) {
        console.error('Besonderheit nicht gefunden');
        return;
    }

    const feature = currentModalProperty.specialFeatures[index];

    const fields = [
        {
            name: 'type',
            label: 'Titel:',
            icon: 'fas fa-tag',
            type: 'text',
            required: true,
            placeholder: 'z.B. Aufzug, Tiefgarage, Denkmalschutz...',
            maxLength: 50,
            minLength: 2
        },
        {
            name: 'description',
            label: 'Beschreibung',
            icon: 'fas fa-info-circle',
            type: 'textarea',
            required: true,
            placeholder: 'Detaillierte Beschreibung der Besonderheit...',
            maxLength: 500,
            minLength: 5,
            rows: 4
        }
    ];

    showInputModal(
        'Besonderheit bearbeiten',
        fields,
        async (formData) => {

            currentModalProperty.specialFeatures[index] = {
                type: formData.type,
                description: formData.description
            };

            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);

            loadSpecialFeaturesTab(currentModalProperty);

            showModalNotification('Besonderheit aktualisiert', 'success');

            return { success: true };
        },
        { type: feature.type, description: feature.description } 
    ).catch(error => {
        if (error.message !== 'User cancelled') {
            console.error('Fehler beim Bearbeiten der Besonderheit:', error);
        }
    });
}

function deleteSpecialFeatureModal(propertyId, index) {
    if (!currentModalProperty || currentModalProperty.id !== propertyId) {
        console.error('Aktuelle Modal-Property stimmt nicht überein');
        return;
    }

    if (!currentModalProperty.specialFeatures || !currentModalProperty.specialFeatures[index]) {
        console.error('Besonderheit nicht gefunden');
        return;
    }

    const feature = currentModalProperty.specialFeatures[index];

    if (confirm(`Besonderheit "${feature.type}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) {
        try {

            currentModalProperty.specialFeatures.splice(index, 1);
            currentModalProperty.updatedAt = new Date().toISOString();

            updatePropertyInMainData(currentModalProperty);

            loadSpecialFeaturesTab(currentModalProperty);

            showModalNotification('Besonderheit gelöscht', 'success');

        } catch (error) {
            console.error('Fehler beim Löschen der Besonderheit:', error);
            showModalNotification('Fehler beim Löschen der Besonderheit', 'error');
        }
    }
}

window.closeInputModal = closeInputModal;

window.updateHeatingStatusModal = updateHeatingStatusModal;

window.updateOwnerApprovalStatusModal = updateOwnerApprovalStatusModal;

window.showCopyPropertyDialog = showCopyPropertyDialog;
window.copyPropertyWithOptions = copyPropertyWithOptions;