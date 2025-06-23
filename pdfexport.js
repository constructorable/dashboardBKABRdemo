// Copyright Oliver Acker, 2025, acker_oliver@yahoo.de

class PDFProgressRing {
    static drawProgressRing(pdf, x, y, radius, percentage) {

        let color;
        if (percentage === 0) color = { r: 220, g: 53, b: 69 };        
        else if (percentage < 50) color = { r: 255, g: 193, b: 7 };    
        else if (percentage < 100) color = { r: 40, g: 167, b: 69 };   
        else color = { r: 25, g: 135, b: 84 };                        

        const strokeWidth = 3;
        const backgroundColor = { r: 240, g: 240, b: 240 }; 

        pdf.setDrawColor(backgroundColor.r, backgroundColor.g, backgroundColor.b);
        pdf.setLineWidth(strokeWidth);
        pdf.circle(x, y, radius, 'S');

        if (percentage > 0) {
            pdf.setDrawColor(color.r, color.g, color.b);
            pdf.setLineWidth(strokeWidth);

            const totalSegments = 40; 
            const progressSegments = Math.ceil((percentage / 100) * totalSegments);
            const angleStep = (2 * Math.PI) / totalSegments;
            const startAngle = -Math.PI / 2; 

            for (let i = 0; i < progressSegments; i++) {
                const angle1 = startAngle + (i * angleStep);
                const angle2 = startAngle + ((i + 1) * angleStep);

                const x1 = x + Math.cos(angle1) * radius;
                const y1 = y + Math.sin(angle1) * radius;
                const x2 = x + Math.cos(angle2) * radius;
                const y2 = y + Math.sin(angle2) * radius;

                pdf.line(x1, y1, x2, y2);
            }
        }

        pdf.setTextColor(color.r, color.g, color.b);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');

        const text = `${percentage}%`;
        const textWidth = pdf.getTextWidth(text);
        pdf.text(text, x - (textWidth / 2), y + 2);

        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
    }

    static drawMiniProgressRing(pdf, x, y, percentage, size = 'small') {
        const radius = size === 'small' ? 4 : 6;
        this.drawProgressRing(pdf, x, y, radius, percentage);
    }

    static drawDetailedProgressRing(pdf, x, y, percentage, label = '') {
        const radius = 12;
        this.drawProgressRing(pdf, x, y, radius, percentage);

        if (label) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            const labelWidth = pdf.getTextWidth(label);
            pdf.text(label, x - (labelWidth / 2), y + 20);
            pdf.setTextColor(0, 0, 0);
        }
    }
}
class ImmobilienPDFExporter {
    constructor() {
        this.selectedProperties = [];
        this.selectedPropertyIds = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();

        document.addEventListener('DOMContentLoaded', () => {
            this.setupMainFilterListeners();
        });
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'pdfExportBtn' || e.target.closest('#pdfExportBtn')) {
                this.openModal();
            }
        });
    }

    setupMainFilterListeners() {

        ['typeFilter', 'heatingFilter', 'streetFilter', 'periodFilter', 'portfolioFilter'].forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    console.log('Hauptfilter geändert:', filterId);
                    this.onMainFiltersChanged();
                });
            }
        });
    }

    onMainFiltersChanged() {

        if (document.getElementById('pdfExportModal')?.style.display === 'flex') {
            console.log('PDF-Modal ist offen, aktualisiere Daten');
            setTimeout(() => {
                this.displayCurrentFilters();
                this.updatePreview();
            }, 100); 
        }
    }

    openModal() {
        console.log('=== PDF EXPORT MODAL ÖFFNEN ===');

        this.createModal();

        setTimeout(() => {
            this.updatePreview();
        }, 100);

        document.getElementById('pdfExportModal').style.display = 'flex';
    }

    getAllProperties() {
        console.log('=== PDF EXPORT: getAllProperties ===');

        if (typeof window.getCurrentFilteredProperties === 'function') {
            const filtered = window.getCurrentFilteredProperties();
            console.log('✅ Verwende getCurrentFilteredProperties:', filtered.length);
            return filtered;
        }

        if (typeof filteredProperties !== 'undefined' && Array.isArray(filteredProperties)) {
            console.log('✅ Direkter Zugriff auf filteredProperties:', filteredProperties.length);
            return filteredProperties;
        }

        if (typeof currentProperties !== 'undefined' && typeof activeFilters !== 'undefined' && typeof filterProperties === 'function') {
            console.log('✅ Verwende currentProperties + activeFilters');
            const filtered = filterProperties(currentProperties, activeFilters);
            console.log('Gefilterte Properties:', filtered.length);
            return filtered;
        }

        console.log('⚠️ Fallback: Lade alle Properties');
        if (typeof initializeDemoData === 'function') {
            return initializeDemoData();
        }

        return [];
    }

    createModal() {
        document.getElementById('pdfExportModal')?.remove();

        const properties = this.getAllProperties();
        console.log('Properties für Modal:', properties.length);

        const modal = `
        <div id="pdfExportModal" class="pdf-modal">
            <div class="pdf-modal-overlay" onclick="immobilienPDFExporter.closeModal()"></div>

            <div class="pdf-modal-container">
                <!-- Header Section -->
                <header class="pdf-modal-header">
                    <div class="header-content">
                        <div class="header-title">
                            <i class="fas fa-file-pdf pdf-icon"></i>
                            <div class="title-text">
                                <h1>PDF-Export</h1>
                                <span>Erstellen Sie professionelle Immobilien-Berichte</span>
                            </div>
                        </div>
                        <button class="close-button" onclick="immobilienPDFExporter.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Filter Status Banner -->

                </header>

                <!-- Main Content Area -->
                <main class="pdf-modal-body">
                    <!-- Left Sidebar: Controls -->
                    <aside class="control-sidebar">
                        <!-- Smart Selection Tools -->
                        <section class="selection-tools">
                            <div class="section-header">
                                <i class="fas fa-magic"></i>
                                <h3>Intelligente Auswahl</h3>
                            </div>

                            <!-- Primary Actions -->
                            <div class="primary-actions">
                                <button class="action-btn primary" onclick="immobilienPDFExporter.selectAll()">
                                    <i class="fas fa-check-double"></i>
                                    <span>Alle auswählen</span>
                                </button>
                                <button class="action-btn secondary" onclick="immobilienPDFExporter.deselectAll()">
                                    <i class="fas fa-times"></i>
                                    <span>Alle abwählen</span>
                                </button>
                            </div>

                            <!-- Status-based Selection -->
                            <div class="status-selection">
                                <label class="selection-label">Nach Status auswählen</label>
                                <div class="status-buttons">
                                    <button class="status-btn completed" onclick="immobilienPDFExporter.selectByStatus('completed')">
                                        <i class="fas fa-check-circle"></i>
                                        <span>Fertige</span>
                                    </button>
                                    <button class="status-btn progress" onclick="immobilienPDFExporter.selectByStatus('inProgress')">
                                        <i class="fas fa-clock"></i>
                                        <span>In Arbeit</span>
                                    </button>
                                    <button class="status-btn not-started" onclick="immobilienPDFExporter.selectByStatus('notStarted')">
                                        <i class="fas fa-circle"></i>
                                        <span>Offen</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Portfolio Selection (Dynamic) -->
                            <div class="portfolio-selection" id="portfolioSelectionContainer">
                                <!-- Wird dynamisch gefüllt -->
                            </div>
                        </section>

                        <!-- Selection Summary -->
                        <section class="selection-summary">
                            <div class="summary-header">
                                <i class="fas fa-chart-pie"></i>
                                <h4>Auswahl-Übersicht</h4>
                            </div>
                            <div class="summary-content" id="summaryContent">
                                <!-- Wird dynamisch gefüllt -->
                            </div>
                        </section>

                        <!-- Debug Panel (Collapsible) -->
                        <details class="debug-panel">
                            <summary class="debug-toggle">
                                <i class="fas fa-bug"></i>
                                Debug-Informationen
                            </summary>
                            <div class="debug-content" id="debugInfo">
                                <!-- Debug-Daten -->
                            </div>
                        </details>
                    </aside>

                    <!-- Right Main Area: Property List -->
                    <section class="property-section">
                        <!-- Property List Header -->
                        <header class="property-header">
                            <div class="property-title">
                                <i class="fas fa-building"></i>
                                <h3>Verfügbare Immobilien</h3>
                            </div>
                            <div class="property-counter" id="resultCounter">
                                <span class="counter-text">0 Immobilien</span>
                            </div>
                        </header>

                        <!-- Property List Container -->
                        <div class="property-list-container">
                            <div class="property-list" id="propertyList">
                                <!-- Property Items werden hier eingefügt -->
                            </div>
                        </div>
                    </section>
                </main>

                <!-- Footer Section -->
                <footer class="pdf-modal-footer">
                    <div class="footer-info" id="footerInfo">
                        <i class="fas fa-info-circle"></i>
                        <span>Keine Immobilien ausgewählt</span>
                    </div>

                    <div class="footer-actions">
                        <button class="footer-btn cancel" onclick="immobilienPDFExporter.closeModal()">
                            <i class="fas fa-times"></i>
                            <span>Abbrechen</span>
                        </button>
                        <button class="footer-btn generate" id="generateBtn" onclick="immobilienPDFExporter.generatePDF()" disabled>
                            <i class="fas fa-download"></i>
                            <span>PDF erstellen</span>
                            <span class="btn-counter" id="btnCounter"></span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modal);

        this.addModalStyles();

        this.displayCurrentFilters();
        this.updateDebugInfo();
    }

    addModalStyles() {
        if (document.getElementById('pdfModalStyles')) return;

        const styles = `
        <style id="pdfModalStyles">
        .pdf-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .pdf-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(2px);
        }

        .pdf-modal-container {
            position: relative;
            margin: 20px auto;
            max-width: 1400px;
            max-height: calc(100vh - 40px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-30px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .pdf-modal-header {
            background: linear-gradient(135deg, #3a5169 0%, #4a6479 100%);
            color: white;
            padding: 24px 32px 0;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .pdf-icon {
            font-size: 32px;
            color: #b8c5d1;
        }

        .title-text h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            line-height: 1.2;
        }

        .title-text span {
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            display: block;
            margin-top: 4px;
        }

        .close-button {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-button:hover {
            background: rgba(255, 255, 255, 0.2);

        }

        .filter-status-banner {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px 12px 0 0;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .filter-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .filter-info i {
            font-size: 16px;
            opacity: 0.8;
        }

        .filter-details strong {
            display: block;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .filter-details div {
            font-size: 12px;
            opacity: 0.9;
            line-height: 1.4;
        }

        .filter-hint {
            font-size: 12px;
            opacity: 0.7;
            font-style: italic;
        }

        .pdf-modal-body {
            display: grid;
            grid-template-columns: 400px 1fr;
            gap: 32px;
            padding: 32px;
            flex: 1;
            overflow: hidden;
        }

        .control-sidebar {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #e9ecef;
            overflow-y: auto;
            max-height: 100%;
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .section-header i {
            color: #6b8ba4;
            font-size: 18px;
        }

        .section-header h3 {
            margin: 0;
            color: #3a5169;
            font-size: 18px;
            font-weight: 600;
        }

        .primary-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }

        .action-btn {
            padding: 14px 16px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .action-btn.primary {
            background: linear-gradient(135deg, #6b8ba4 0%, #7a99b8 100%);
            color: white;
        }

        .action-btn.secondary {
            background: linear-gradient(135deg, #495057 0%, #5a6268 100%);
            color: white;
        }

        .action-btn:hover {

            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .status-selection {
            margin-bottom: 24px;
        }

        .selection-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .status-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
        }

        .status-btn {
            padding: 10px 8px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: white;
        }

        .status-btn.completed {
            background: linear-gradient(135deg, #3a5169 0%, #4a6479 100%);
        }

        .status-btn.progress {
            background: linear-gradient(135deg, #6c757d 0%, #7a8288 100%);
        }

        .status-btn.not-started {
            background: linear-gradient(135deg, #495057 0%, #5a6268 100%);
        }

        .portfolio-selection {
            margin-bottom: 24px;
        }

        .portfolio-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }

        .portfolio-btn {
            padding: 6px 12px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            white-space: nowrap;
            transition: all 0.3s ease;
        }

        .portfolio-btn:hover {
            background: #5a6268;

        }

        .selection-summary {
            background: white;
            border-radius: 12px;
            padding: 20px;
            border: 2px solid #e9ecef;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }

        .selection-summary::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #3a5169 0%, #6b8ba4 100%);
        }

        .summary-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
        }

        .summary-header i {
            color: #3a5169;
        }

        .summary-header h4 {
            margin: 0;
            color: #3a5169;
            font-size: 16px;
            font-weight: 600;
        }

        .summary-content {
            font-size: 13px;
            line-height: 1.6;
            color: #2d3e50;
        }

        .debug-panel {
            background: #e9ecef;
            border-radius: 8px;
            border: 1px solid #d1d9e0;
        }

        .debug-toggle {
            cursor: pointer;
            padding: 12px;
            font-size: 14px;
            color: #6c757d;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .debug-content {
            padding: 12px;
            background: #f8f9fa;
            font-size: 12px;
            color: #6c757d;
            font-family: 'Consolas', 'Monaco', monospace;
            border-top: 1px solid #d1d9e0;
        }

        .property-section {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .property-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e9ecef;
        }

        .property-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .property-title i {
            color: #6b8ba4;
            font-size: 20px;
        }

        .property-title h3 {
            margin: 0;
            color: #3a5169;
            font-size: 20px;
            font-weight: 600;
        }

        .property-counter {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(108, 117, 125, 0.3);
        }

        .property-list-container {
            flex: 1;
            overflow: hidden;
            border: 2px solidrgba(233, 236, 239, 0);
            border-radius: 0;
            background: white;
        }

        .property-list {
            height: 100%;
            overflow-y: auto;
            padding: 8px;
        }

        .pdf-modal-footer {
            padding: 24px 32px;
            border-top: 2px solid #e9ecef;
            background: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .footer-info {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #6c757d;
            font-weight: 500;
        }

        .footer-info i {
            color: #6b8ba4;
        }

        .footer-actions {
            display: flex;
            gap: 12px;
        }

        .footer-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .footer-btn.cancel {
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            color: white;
        }

        .footer-btn.generate {
            background: linear-gradient(135deg, #3a5169 0%, #4a6479 100%);
            color: white;
            position: relative;
        }

        .footer-btn:hover {

            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .footer-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        .btn-counter {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 14px;
            margin-left: 4px;
        }

        @media (max-width: 1200px) {
            .pdf-modal-body {
                grid-template-columns: 350px 1fr;
                gap: 24px;
                padding: 24px;
            }
        }

        @media (max-width: 768px) {
            .pdf-modal-container {
                margin: 10px;
                max-height: calc(100vh - 20px);
            }

            .pdf-modal-body {
                grid-template-columns: 1fr;
                gap: 20px;
                padding: 20px;
            }

            .control-sidebar {
                order: 2;
                max-height: 300px;
            }

            .property-section {
                order: 1;
            }
        }
        </style>
    `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    displayCurrentFilters() {
        const display = document.getElementById('activeFiltersDisplay');
        if (!display) return;

        if (typeof window.getCurrentFilters === 'function') {
            const filters = window.getCurrentFilters();

            let filterHTML = '';
            const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length;

            if (activeFilterCount === 0) {
                filterHTML = '<span style="color: #666;">Keine Filter aktiv - alle Immobilien verfügbar</span>';
            } else {
                const filterLabels = {
                    type: 'Typ',
                    heating: 'Heizung',
                    status: 'Status',
                    street: 'Straße',
                    period: 'Zeitraum',
                    portfolio: 'Portfolio',
                    demo: 'Demo'
                };

                filterHTML = Object.entries(filters)
                    .filter(([key, value]) => value && value !== '')
                    .map(([key, value]) => {
                        const label = filterLabels[key] || key;
                        return `<strong>${label}:</strong> ${value}`;
                    })
                    .join('<br>');
            }

            display.innerHTML = filterHTML;
        } else {
            display.innerHTML = '<span style="color: #ff6b35;">⚠️ Filter-Integration nicht verfügbar</span>';
        }
    }

    selectByStatus(status) {
        const filteredProperties = this.getFilteredProperties();
        this.selectedPropertyIds.clear();

        filteredProperties.forEach(property => {
            const progress = this.calculateProgress(property.checklist);
            const propertyStatus = this.getStatusFromProgress(progress);

            if (status === 'completed' && propertyStatus === 'completed') {
                this.selectedPropertyIds.add(property.id);
            } else if (status === 'inProgress' && propertyStatus === 'inProgress') {
                this.selectedPropertyIds.add(property.id);
            } else if (status === 'notStarted' && propertyStatus === 'notStarted') {
                this.selectedPropertyIds.add(property.id);
            }
        });

        this.updateSelectedPropertiesFromIds();
        this.updatePropertyList();
        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    getStatusFromProgress(progress) {
        if (progress === 0) return 'notStarted';
        if (progress === 100) return 'completed';
        return 'inProgress';
    }

    selectByPortfolio(portfolioName) {
        const filteredProperties = this.getFilteredProperties();
        this.selectedPropertyIds.clear();

        filteredProperties.forEach(property => {
            const propertyPortfolio = property.portfolio || 'Standard';
            if (propertyPortfolio === portfolioName) {
                this.selectedPropertyIds.add(property.id);
            }
        });

        this.updateSelectedPropertiesFromIds();
        this.updatePropertyList();
        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    togglePortfolioSelection(portfolioName) {
        const filteredProperties = this.getFilteredProperties();
        const portfolioProperties = filteredProperties.filter(p => (p.portfolio || 'Standard') === portfolioName);

        const allSelected = portfolioProperties.every(p => this.selectedPropertyIds.has(p.id));

        portfolioProperties.forEach(property => {
            if (allSelected) {

                this.selectedPropertyIds.delete(property.id);
            } else {

                this.selectedPropertyIds.add(property.id);
            }
        });

        this.updateSelectedPropertiesFromIds();
        this.updatePropertyList();
        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    createPortfolioSelectionButtons() {
        const container = document.getElementById('portfolioSelectionButtons');
        if (!container) return;

        const filteredProperties = this.getFilteredProperties();
        const portfolios = [...new Set(filteredProperties.map(p => p.portfolio || 'Standard'))].sort();

        if (portfolios.length <= 1) {
            container.innerHTML = '';
            return;
        }

        let buttonsHTML = '<div style="margin-bottom: 8px; font-size: 12px; font-weight: bold; color: #666;">Portfolio-Auswahl:</div>';
        buttonsHTML += '<div style="display: flex; flex-wrap: wrap; gap: 5px;">';

        portfolios.forEach(portfolio => {
            const count = filteredProperties.filter(p => (p.portfolio || 'Standard') === portfolio).length;
            buttonsHTML += `
            <button onclick="immobilienPDFExporter.togglePortfolioSelection('${portfolio}')" 
                    style="padding: 4px 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                ${portfolio} (${count})
            </button>
        `;
        });

        buttonsHTML += '</div>';
        container.innerHTML = buttonsHTML;
    }

    updateDebugInfo() {
        const debugDiv = document.getElementById('debugInfo');
        if (!debugDiv) return;

        const hasFilteredProps = typeof filteredProperties !== 'undefined';
        const hasCurrentProps = typeof currentProperties !== 'undefined';
        const hasActiveFilters = typeof activeFilters !== 'undefined';

        debugDiv.innerHTML = `
            filteredProperties: ${hasFilteredProps ? 'verfügbar (' + (filteredProperties?.length || 0) + ')' : 'nicht verfügbar'}<br>
            currentProperties: ${hasCurrentProps ? 'verfügbar (' + (currentProperties?.length || 0) + ')' : 'nicht verfügbar'}<br>
            activeFilters: ${hasActiveFilters ? 'verfügbar' : 'nicht verfügbar'}<br>
            PDF Properties: ${this.getAllProperties().length}
        `;
    }

    getFilteredProperties() {

        return this.getAllProperties();
    }

    updatePreview() {
        console.log('=== UPDATE PREVIEW START ===');

        const filteredProperties = this.getFilteredProperties();
        console.log('Gefilterte Properties für Preview:', filteredProperties.length);

        this.selectedPropertyIds.clear();
        filteredProperties.forEach(property => {
            this.selectedPropertyIds.add(property.id);
        });

        this.selectedProperties = [...filteredProperties];
        console.log('Ausgewählte Properties nach Update:', this.selectedProperties.length);

        this.updatePropertyList();
        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
        this.updateDebugInfo();

        console.log('=== UPDATE PREVIEW END ===');
    }

    updatePropertyList() {
        const propertyList = document.getElementById('propertyList');
        const resultCounter = document.getElementById('resultCounter');

        if (!propertyList) return;

        this.createPortfolioSelectionButtons();

        const selectedCount = this.selectedProperties.length;
        const totalCount = this.getFilteredProperties().length;
        resultCounter.innerHTML = `<span class="counter-text">${selectedCount} von ${totalCount} ausgewählt</span>`;

        if (totalCount === 0) {
            propertyList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <i class="fas fa-search" style="font-size: 32px; margin-bottom: 16px; display: block; opacity: 0.5;"></i>
                <h4 style="margin: 0 0 8px 0; font-weight: 600;">Keine Immobilien gefunden</h4>
                <p style="margin: 0; font-size: 14px;">Passen Sie die Filter in der Hauptanwendung an</p>
            </div>
        `;
            return;
        }

        const groupedProperties = this.groupPropertiesByPortfolio(this.getFilteredProperties());
        let listHTML = '';

        Object.keys(groupedProperties).sort().forEach(portfolio => {
            const properties = groupedProperties[portfolio];
            const selectedInPortfolio = properties.filter(p => this.selectedPropertyIds.has(p.id)).length;

            listHTML += `
            <div class="portfolio-group" style="margin-bottom: 45px;">
                <div style="background: #f1f3f4; padding: 12px 16px; font-weight: 600; color: #3a5169; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e9ecef;">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-folder" style="font-size: 14px;"></i>
                        ${portfolio} (${properties.length})
                    </span>
                    <button onclick="immobilienPDFExporter.togglePortfolioSelection('${portfolio}')" 
                            style="padding: 4px 8px; background: ${selectedInPortfolio === properties.length ? '#435c72' : '#435c52'}; color: white; border: none; border-radius: 4px; cursor: pointer; padding:11px; font-size: 12px; font-weight: 500;">
                        ${selectedInPortfolio === properties.length ? 'Alle aus Portfolio abwählen' : 'Alle aus Portfolio auswählen'}
                    </button>
                </div>
                <div style="border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
                    ${properties.map((property, index) => this.createPropertyListItem(property, index)).join('')}
                </div>
            </div>
        `;
        });

        propertyList.innerHTML = listHTML;
    }

    createPortfolioSelectionButtons() {
        const container = document.getElementById('portfolioSelectionContainer');
        if (!container) return;

        const filteredProperties = this.getFilteredProperties();
        const portfolios = [...new Set(filteredProperties.map(p => p.portfolio || 'Standard'))].sort();

        if (portfolios.length <= 1) {
            container.innerHTML = '';
            return;
        }

        let buttonsHTML = `
        <label class="selection-label">Portfolio-Auswahl</label>
        <div class="portfolio-buttons">
    `;

        portfolios.forEach(portfolio => {
            const count = filteredProperties.filter(p => (p.portfolio || 'Standard') === portfolio).length;
            buttonsHTML += `
            <button class="portfolio-btn" onclick="immobilienPDFExporter.togglePortfolioSelection('${portfolio}')">
                ${portfolio} (${count})
            </button>
        `;
        });

        buttonsHTML += '</div>';
        container.innerHTML = buttonsHTML;
    }

    createPropertyListItem(property, index) {
        const progress = this.calculateProgress(property.checklist);
        const progressColor = this.getProgressColor(progress);
        const statusText = this.getStatusText(progress);
        const isSelected = this.selectedPropertyIds.has(property.id);

        return `
            <div class="property-item" style="padding: 1px 15px; border-bottom: 1px solid #f0f0f0; transition: background-color 0.2s; cursor: pointer;" 
                 onmouseover="this.style.backgroundColor='#f8f9fa'" 
                 onmouseout="this.style.backgroundColor='white'"
                 onclick="immobilienPDFExporter.togglePropertySelection('${property.id}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 4px;">
                            <input type="checkbox" id="prop_${property.id}" ${isSelected ? 'checked' : ''} 
                                   style="margin-right: 8px;" 
                                   onclick="event.stopPropagation(); immobilienPDFExporter.togglePropertySelection('${property.id}')">
                            <strong style="color: #2d3e50; font-size: 14px;">${property.name}</strong>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-left: 24px;">
                            <span style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; margin-right: 5px;">${property.type}</span>
                            <span>${property.accountingPeriod || property.period || 'Zeitraum nicht definiert'}</span>
                            ${property.hasHeating ? '<span style="margin-left: 8px;"><i class="fas fa-fire" style="color: #ff6b35;"></i> Heizung</span>' : ''}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 80px;">
                        <div style="font-weight: bold; font-size: 14px; color: rgb(${progressColor.r}, ${progressColor.g}, ${progressColor.b});">
                            ${progress}%
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            ${statusText}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 8px; margin-left: 24px;">
                    <div style="background: #f0f0f0; height: 4px; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; background: rgb(${progressColor.r}, ${progressColor.g}, ${progressColor.b}); width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    groupPropertiesByPortfolio(properties) {
        const grouped = {};
        properties.forEach(property => {
            const portfolio = property.portfolio || 'Standard';
            if (!grouped[portfolio]) {
                grouped[portfolio] = [];
            }
            grouped[portfolio].push(property);
        });
        return grouped;
    }

    updateSelectionSummary() {
        const summaryContent = document.getElementById('summaryContent');
        if (!summaryContent) return;

        const totalAvailable = this.getFilteredProperties().length;
        const selectedCount = this.selectedProperties.length;

        if (selectedCount === 0) {
            summaryContent.innerHTML = `
            <p style="margin: 0; color: #666; font-size: 12px;">
                Keine Auswahl (${totalAvailable} verfügbar)
            </p>
        `;
            return;
        }

        const totalProgress = this.selectedProperties.reduce((sum, p) => sum + this.calculateProgress(p.checklist), 0) / selectedCount;
        const statusCounts = this.getStatusCounts();
        const portfolioCounts = this.getPortfolioCounts();

        summaryContent.innerHTML = `
        <div style="font-size: 12px; line-height: 1.4;">
            <div style="margin-bottom: 8px;">
                <strong>Ausgewählt:</strong> ${selectedCount} von ${totalAvailable} Immobilien<br>
                <strong>Ø Fortschritt:</strong> ${Math.round(totalProgress)}%
            </div>
            <div style="margin-bottom: 8px;">
                <strong>Status:</strong><br>
                <span style="color: #dc3545;">● ${statusCounts.notStarted} nicht begonnen</span><br>
                <span style="color: #ffc107;">● ${statusCounts.inProgress} in Bearbeitung</span><br>
                <span style="color: #28a745;">● ${statusCounts.completed} abgeschlossen</span>
            </div>
            <div>
                <strong>Portfolios:</strong><br>
                ${Object.entries(portfolioCounts).map(([portfolio, count]) =>
            `<span style="font-size: 14px;">• ${portfolio}: ${count}</span>`
        ).join('<br>')}
            </div>
        </div>
    `;
    }

    updateFooterInfo() {
        const footerInfo = document.getElementById('footerInfo');
        if (!footerInfo) return;

        const selectedCount = this.selectedProperties.length;

        if (selectedCount === 0) {
            footerInfo.textContent = 'Keine Immobilien ausgewählt';
        } else {
            const avgProgress = this.selectedProperties.reduce((sum, p) => sum + this.calculateProgress(p.checklist), 0) / selectedCount;
            footerInfo.textContent = `${selectedCount} Immobilien ausgewählt • Ø ${Math.round(avgProgress)}% Fortschritt`;
        }
    }

    updateGenerateButton() {
        const btn = document.getElementById('generateBtn');
        if (!btn) return;

        const selectedCount = this.selectedProperties.length;
        btn.disabled = selectedCount === 0;

        if (selectedCount === 0) {
            btn.innerHTML = '<i class="fas fa-download"></i> PDF erstellen';
        } else {
            btn.innerHTML = `<i class="fas fa-download"></i> PDF erstellen (${selectedCount})`;
        }
    }

    getStatusCounts() {
        let notStarted = 0;
        let inProgress = 0;
        let completed = 0;

        this.selectedProperties.forEach(property => {
            const progress = this.calculateProgress(property.checklist);
            if (progress === 0) notStarted++;
            else if (progress === 100) completed++;
            else inProgress++;
        });

        return { notStarted, inProgress, completed };
    }

    getPortfolioCounts() {
        const counts = {};
        this.selectedProperties.forEach(property => {
            const portfolio = property.portfolio || 'Standard';
            counts[portfolio] = (counts[portfolio] || 0) + 1;
        });
        return counts;
    }

    selectAll() {
        const filteredProperties = this.getFilteredProperties();
        this.selectedPropertyIds.clear();
        filteredProperties.forEach(property => {
            this.selectedPropertyIds.add(property.id);
        });
        this.selectedProperties = [...filteredProperties];

        filteredProperties.forEach(property => {
            const checkbox = document.getElementById(`prop_${property.id}`);
            if (checkbox) checkbox.checked = true;
        });

        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    deselectAll() {
        this.selectedPropertyIds.clear();
        this.selectedProperties = [];

        document.querySelectorAll('#propertyList input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    togglePropertySelection(propertyId) {
        const checkbox = document.getElementById(`prop_${propertyId}`);
        if (!checkbox) return;

        if (checkbox.checked) {
            this.selectedPropertyIds.add(propertyId);
        } else {
            this.selectedPropertyIds.delete(propertyId);
        }

        this.updateSelectedPropertiesFromIds();
        this.updateSelectionSummary();
        this.updateFooterInfo();
        this.updateGenerateButton();
    }

    updateSelectedPropertiesFromIds() {
        const filteredProperties = this.getFilteredProperties();
        this.selectedProperties = filteredProperties.filter(property =>
            this.selectedPropertyIds.has(property.id)
        );
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async generatePDF() {
        if (this.selectedProperties.length === 0) return;

        const btn = document.getElementById('generateBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Erstelle PDF...';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            await this.createPDFContent(pdf);

            const filename = `Immobilien_Status_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(filename);

            this.closeModal();
            alert('PDF erfolgreich erstellt!');

        } catch (error) {
            console.error('PDF-Fehler:', error);
            alert('Fehler beim Erstellen der PDF: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-download"></i> PDF erstellen (${this.selectedProperties.length})`;
        }
    }

    async createPDFContent(pdf) {
        await this.createOverviewPage(pdf);

        for (let i = 0; i < this.selectedProperties.length; i++) {
            const property = this.selectedProperties[i];
            pdf.addPage();
            await this.createPropertyPage(pdf, property, i + 1);
        }

        pdf.addPage();
        this.addLegend(pdf);

        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            this.addPageFooter(pdf, i, totalPages);
        }
    }

    async createOverviewPage(pdf) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let y = 30;

        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Immobilien-Statusbericht', pageWidth / 2, y, { align: 'center' });
        y += 20;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, pageWidth / 2, y, { align: 'center' });
        y += 30;

        const totalProgress = this.selectedProperties.reduce((sum, p) =>
            sum + this.calculateProgress(p.checklist), 0) / this.selectedProperties.length;

        const statusCounts = this.getStatusCounts();

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Gesamtübersicht', 20, y);
        y += 15;

        pdf.setDrawColor(200, 200, 200);
        pdf.setFillColor(248, 249, 250);
        pdf.rect(20, y, pageWidth - 40, 40, 'FD');
        y += 10;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Immobilien gesamt: ${this.selectedProperties.length}`, 30, y);
        y += 8;
        pdf.text(`Durchschnittlicher Fortschritt: ${Math.round(totalProgress)}%`, 30, y);
        y += 8;
        pdf.text(`Nicht begonnen: ${statusCounts.notStarted} | In Bearbeitung: ${statusCounts.inProgress} | Abgeschlossen: ${statusCounts.completed}`, 30, y);
        y += 25;

        const portfolioCounts = this.getPortfolioCounts();
        if (Object.keys(portfolioCounts).length > 1) {
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Portfolio-Verteilung:', 20, y);
            y += 12;

            Object.entries(portfolioCounts).forEach(([portfolio, count]) => {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`• ${portfolio}: ${count} Immobilien`, 25, y);
                y += 8;
            });
            y += 10;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Enthaltene Immobilien:', 20, y);
        y += 12;

        const itemsPerPage = this.calculateItemsPerPage(pageHeight, y);
        let currentPage = 1;
        let itemsOnCurrentPage = 0;

        for (let i = 0; i < this.selectedProperties.length; i++) {
            const property = this.selectedProperties[i];
            const progress = this.calculateProgress(property.checklist);
            const color = this.getProgressColor(progress);

            if (itemsOnCurrentPage >= itemsPerPage && i < this.selectedProperties.length - 1) {

                this.addContinuationFooter(pdf, currentPage, this.selectedProperties.length, i + 1);

                pdf.addPage();
                currentPage++;
                y = 30;
                itemsOnCurrentPage = 0;

                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Immobilien-Übersicht (Fortsetzung ${currentPage})`, 20, y);
                y += 20;
            }

            this.addPropertyToOverview(pdf, property, i + 1, y, pageWidth, progress, color);
            y += 12;
            itemsOnCurrentPage++;
        }

        pdf.setTextColor(0, 0, 0);
    }

    calculateItemsPerPage(pageHeight, startY) {

        const bottomMargin = 40; 
        const itemHeight = 12; 
        const availableHeight = pageHeight - startY - bottomMargin;

        return Math.floor(availableHeight / itemHeight);
    }

    addPropertyToOverview(pdf, property, index, y, pageWidth, progress, color) {

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${index}. ${property.name}`, 25, y);

        pdf.setTextColor(color.r, color.g, color.b);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${progress}%`, pageWidth - 40, y);

        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const detailText = `${property.type} • ${property.portfolio || 'Standard'} • ${property.accountingPeriod || 'Zeitraum nicht definiert'}`;

        const maxDetailWidth = pageWidth - 90;
        const truncatedDetail = this.truncateText(pdf, detailText, maxDetailWidth);
        pdf.text(truncatedDetail, 25, y + 5);
    }

    addContinuationFooter(pdf, pageNumber, totalProperties, currentIndex) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();

        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'italic');

        const continueText = `Fortsetzung auf nächster Seite... (${currentIndex} von ${totalProperties} Immobilien)`;
        pdf.text(continueText, pageWidth / 2, pageHeight - 20, { align: 'center' });

        const progressWidth = 100;
        const progressX = (pageWidth - progressWidth) / 2;
        const progressY = pageHeight - 15;
        const progressPercentage = (currentIndex / totalProperties) * 100;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(progressX, progressY, progressWidth, 3, 'F');

        pdf.setFillColor(107, 139, 164); 
        pdf.rect(progressX, progressY, (progressWidth * progressPercentage) / 100, 3, 'F');
    }

    truncateText(pdf, text, maxWidth) {
        const textWidth = pdf.getTextWidth(text);

        if (textWidth <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (pdf.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }

        return truncated + '...';
    }

    createPropertyPage(pdf, property, index) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let y = 25; 

        const progress = this.calculateProgress(property.checklist);
        const color = this.getProgressColor(progress);
        const statusText = this.getStatusText(progress);

        pdf.setFontSize(16); 
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index}. ${property.name}`, 20, y);

        const ringX = pageWidth - 30; 
        const ringY = y + 8;
        const ringRadius = 12; 

        PDFProgressRing.drawProgressRing(pdf, ringX, ringY, ringRadius, progress);

        pdf.setFontSize(9); 
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(color.r, color.g, color.b);
        const statusWidth = pdf.getTextWidth(statusText);
        pdf.text(statusText, ringX - (statusWidth / 2), ringY + 18); 
        pdf.setTextColor(0, 0, 0);

        y += 25; 

        pdf.setDrawColor(200, 200, 200);
        pdf.setFillColor(248, 249, 250);
        pdf.rect(20, y + 8, pageWidth - 40, 35, 'FD'); 
        y += 7; 

        pdf.setFontSize(11); 
        pdf.setFont('helvetica', 'bold');
        pdf.text('Stammdaten', 25, y);
        y += 10; 

        pdf.setFontSize(11); 
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Typ: ${property.type}`, 25, y);
        pdf.text(`Portfolio: ${property.portfolio || 'Standard'}`, 110, y);
        y += 6; 
        pdf.text(`Heizung: ${property.hasHeating ? 'Ja' : 'Nein'}`, 25, y);
        pdf.text(`Jahr: ${property.accountingYear}`, 110, y);
        y += 6;
        pdf.text(`Zeitraum: ${property.accountingPeriod || property.period || 'Nicht definiert'}`, 25, y);
        y += 25; 

        const checklist = property.checklist || {};
        const checklistItems = Object.keys(checklist);

        if (checklistItems.length > 0) {
            pdf.setFontSize(11); 
            pdf.setFont('helvetica', 'bold');
            pdf.text('Checkliste', 20, y);
            y += 12; 

            const completedCount = checklistItems.filter(item => checklist[item]?.completed).length;
            pdf.setFontSize(11); 
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${completedCount} von ${checklistItems.length} Aufgaben erledigt`, 25, y);
            pdf.setTextColor(0, 0, 0);
            y += 12; 

            const sortedItems = checklistItems.sort((a, b) => {
                const aCompleted = checklist[a]?.completed || false;
                const bCompleted = checklist[b]?.completed || false;
                return bCompleted - aCompleted;
            });

            const bottomMargin = 15; 
            const availableHeight = pageHeight - y - bottomMargin;
            const itemHeight = 9; 
            let maxItemsForCurrentPage = Math.floor(availableHeight / itemHeight);

            console.log(`Checklist Debug: ${checklistItems.length} items, maxPerPage: ${maxItemsForCurrentPage}, availableHeight: ${availableHeight}`);

            let itemsDisplayed = 0;
            let currentPage = 1;

            for (let i = 0; i < sortedItems.length; i++) {

                if (itemsDisplayed >= maxItemsForCurrentPage && i < sortedItems.length) {
                    pdf.setFontSize(11);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`... Fortsetzung auf nächster Seite (${sortedItems.length - i} weitere)`, 25, y);
                    pdf.setTextColor(0, 0, 0);

                    pdf.addPage();
                    currentPage++;
                    y = 25;

                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${index}. ${property.name} (Fortsetzung)`, 20, y);
                    y += 15;

                    pdf.setFontSize(11);
                    pdf.text(`Checkliste (Fortsetzung ${currentPage})`, 20, y);
                    y += 10;

                    const newAvailableHeight = pageHeight - y - 20;
                    maxItemsForCurrentPage = Math.floor(newAvailableHeight / itemHeight);
                    itemsDisplayed = 0;
                }

                const item = sortedItems[i];
                const checkData = checklist[item];
                const isCompleted = checkData?.completed || false;

                this.drawSimpleCheckbox(pdf, 25, y - 1, isCompleted);

                pdf.setFontSize(11); 
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(120, 120, 120);
                pdf.text(`${i + 1}.`, 31, y + 1); 

                pdf.setFontSize(11); 
                pdf.setFont('helvetica', 'normal');

                if (isCompleted) {
                    pdf.setTextColor(25, 135, 84);
                } else {
                    pdf.setTextColor(220, 53, 69);
                }

                const maxWidth = pageWidth - 50; 
                const lines = this.splitTextToLines(pdf, item, maxWidth);

                const displayText = lines[0];
                if (lines.length > 1) {
                    const truncatedText = displayText.substring(0, displayText.length - 3) + '...';
                    pdf.text(truncatedText, 38, y + 1); 
                } else {
                    pdf.text(displayText, 38, y + 1);
                }

                pdf.setTextColor(0, 0, 0);
                y += itemHeight; 
                itemsDisplayed++;
            }

            console.log(`Checklist Complete: ${sortedItems.length} Items verarbeitet`);

        } else {
            pdf.setFontSize(11);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Keine Checkliste verfügbar', 25, y);
            pdf.setTextColor(0, 0, 0);
        }
    }

    addPageFooter(pdf, currentPage, totalPages) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);

        if (currentPage === 1) {
            pdf.text('Übersicht', 20, pageHeight - 10);
        } else if (currentPage <= totalPages - 1) {
            const propertyNumber = currentPage - 1;
            pdf.text(`Immobilie ${propertyNumber}`, 20, pageHeight - 10);
        } else {
            pdf.text('Legende', 20, pageHeight - 10);
        }

        pdf.text(`Seite ${currentPage} von ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('Immobilienverwaltung Dashboard', pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
    }

    splitTextToLines(pdf, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = pdf.getTextWidth(testLine);

            if (textWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word);
                    currentLine = '';
                }
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [text];
    }

    drawSimpleCheckbox(pdf, x, y, isCompleted) {
        const size = 3;

        if (isCompleted) {
            pdf.setFillColor(25, 135, 84);
            pdf.rect(x, y, size, size, 'F');
            pdf.setDrawColor(255, 255, 255);
            pdf.setLineWidth(0.3);
            pdf.line(x + 0.5, y + 1.5, x + 1.3, y + 2.3);
            pdf.line(x + 1.3, y + 2.3, x + 2.5, y + 0.7);
        } else {
            pdf.setFillColor(220, 53, 69);
            pdf.rect(x, y, size, size, 'F');
            pdf.setDrawColor(255, 255, 255);
            pdf.setLineWidth(0.3);
            pdf.line(x + 0.5, y + 0.5, x + 2.5, y + 2.5);
            pdf.line(x + 2.5, y + 0.5, x + 0.5, y + 2.5);
        }
    }

    getStatusText(progress) {
        if (progress === 0) return 'Nicht begonnen';
        if (progress === 100) return 'Abgeschlossen';
        return 'In Bearbeitung';
    }

    addLegend(pdf) {
        let y = 30;

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Legende und Erläuterungen', 20, y);
        y += 20;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Fortschritts-Status:', 20, y);
        y += 12;

        const progressLegend = [
            { range: '0%', text: 'Nicht begonnen', color: { r: 220, g: 53, b: 69 } },
            { range: '1-49%', text: 'In Bearbeitung', color: { r: 255, g: 193, b: 7 } },
            { range: '50-99%', text: 'Fortgeschritten', color: { r: 40, g: 167, b: 69 } },
            { range: '100%', text: 'Abgeschlossen', color: { r: 25, g: 135, b: 84 } }
        ];

        progressLegend.forEach(item => {
            pdf.setFillColor(item.color.r, item.color.g, item.color.b);
            pdf.rect(25, y - 2, 8, 4, 'F');

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${item.range}: ${item.text}`, 40, y);
            y += 8;
        });

        y += 15;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Checklisten-Symbole:', 20, y);
        y += 12;

        this.drawSimpleCheckbox(pdf, 25, y - 1, true);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Aufgabe erledigt', 35, y);
        y += 10;

        this.drawSimpleCheckbox(pdf, 25, y - 1, false);
        pdf.text('Aufgabe noch offen', 35, y);
        y += 20;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Dokumentstruktur:', 20, y);
        y += 12;

        const notes = [
            'Seite 1: Gesamtübersicht aller ausgewählten Immobilien',
            'Seite 2-X: Eine Immobilie pro Seite mit vollständigen Details',
            'Letzte Seite: Diese Legende und Erläuterungen',
            'Lange Aufgabentexte werden automatisch umgebrochen',
            'Bei sehr vielen Aufgaben wird die Anzeige optimiert',
            'Erledigte Aufgaben stehen vor offenen Aufgaben'
        ];

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        notes.forEach(note => {
            pdf.text(`• ${note}`, 25, y);
            y += 7;
        });
    }

    calculateProgress(checklist) {
        if (!checklist || Object.keys(checklist).length === 0) return 0;
        const items = Object.values(checklist);
        const completed = items.filter(item => item.completed).length;
        return Math.round((completed / items.length) * 100);
    }

    getProgressColor(progress) {
        if (progress === 0) return { r: 220, g: 53, b: 69 };
        if (progress < 50) return { r: 255, g: 193, b: 7 };
        if (progress < 100) return { r: 40, g: 167, b: 69 };
        return { r: 25, g: 135, b: 84 };
    }

    closeModal() {
        const modal = document.getElementById('pdfExportModal');
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        }
    }

    categorizeChecklistItems(items, checklist) {

        const categories = {
            'Dokumente': [],
            'Abrechnung': [],
            'Verwaltung': [],
            'Sonstiges': []
        };

        items.forEach(item => {
            if (item.toLowerCase().includes('dokument') || item.toLowerCase().includes('unterlage')) {
                categories['Dokumente'].push(item);
            } else if (item.toLowerCase().includes('abrechnung') || item.toLowerCase().includes('kosten')) {
                categories['Abrechnung'].push(item);
            } else if (item.toLowerCase().includes('verwaltung') || item.toLowerCase().includes('verwalter')) {
                categories['Verwaltung'].push(item);
            } else {
                categories['Sonstiges'].push(item);
            }
        });

        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });

        return categories;
    }

    calculateCategoryProgress(categoryItems) {
        if (categoryItems.length === 0) return 0;

        const checklist = this.selectedProperties.find(p => p.checklist)?.checklist || {};
        const completed = categoryItems.filter(item => checklist[item]?.completed).length;
        return Math.round((completed / categoryItems.length) * 100);
    }

}

function loadJsPDF() {
    if (typeof window.jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {

        };
        script.onerror = () => {
            console.error('Fehler beim Laden von jsPDF');
        };
        document.head.appendChild(script);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadJsPDF();
    setTimeout(() => {
        window.immobilienPDFExporter = new ImmobilienPDFExporter();

    }, 500);
});

window.initPDFExporter = function () {
    if (!window.immobilienPDFExporter) {
        loadJsPDF();
        setTimeout(() => {
            window.immobilienPDFExporter = new ImmobilienPDFExporter();
            console.log('Immobilien PDF Exporter manuell initialisiert');
        }, 500);
    }
};

window.openPDFExport = function () {
    if (window.immobilienPDFExporter) {
        window.immobilienPDFExporter.openModal();
    } else {
        console.log('Immobilien PDF Exporter noch nicht initialisiert, versuche Initialisierung...');
        window.initPDFExporter();
        setTimeout(() => {
            if (window.immobilienPDFExporter) {
                window.immobilienPDFExporter.openModal();
            }
        }, 1000);
    }
};

window.pdfExporter = window.immobilienPDFExporter;