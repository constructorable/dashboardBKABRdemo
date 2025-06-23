function createProgressChart(canvasId, progress, size = 120) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas-Element nicht gefunden:', canvasId);
        return null;
    }

    const ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 3); 

    canvas.width = size * dpr;
    canvas.height = size * dpr;

    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.display = 'block'; 

    ctx.save();
    ctx.scale(dpr, dpr);

    drawProgressRing(ctx, progress, size);

    return {
        canvas,
        update: (newProgress) => {

            ctx.restore();
            ctx.save();

            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            ctx.scale(dpr, dpr);
            drawProgressRing(ctx, newProgress, size);
        }
    };
}

function drawProgressRing(ctx, progress, size) {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = Math.max(size / 2 - 15, 10); 
    const lineWidth = Math.max(size / 15, 4); 

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e8ecf0';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    if (progress > 0) {
        const angle = (progress / 100) * 2 * Math.PI;
        const startAngle = -Math.PI / 2; 
        const endAngle = startAngle + angle;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = getProgressColor(progress);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    const fontSize = Math.max(size / 8, 10); 
    ctx.fillStyle = getProgressColor(progress);
    ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${progress}%`, centerX, centerY);
}

function getProgressColor(progress) {
    if (progress === 0) {
        return '#e74c3c'; 
    } else if (progress <= 15) {
        return '#e67e22'; 
    } else if (progress <= 30) {
        return '#f39c12'; 
    } else if (progress <= 45) {
        return '#f1c40f'; 
    } else if (progress <= 60) {
        return '#9acd32'; 
    } else if (progress <= 75) {
        return '#2ecc71'; 
    } else if (progress <= 90) {
        return '#27ae60'; 
    } else {
        return '#1e8449'; 
    }
}

function createSmallProgressChart(canvasId, progress) {
    return createProgressChart(canvasId, progress, 120);
}

function createLargeProgressChart(canvasId, progress) {
    return createProgressChart(canvasId, progress, 150);
}

function animateProgress(chartInstance, fromProgress, toProgress, duration = 1000) {
    if (!chartInstance || !chartInstance.update) {
        return;
    }

    const startTime = Date.now();
    const progressDiff = toProgress - fromProgress;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);

        const easedProgress = easeOutCubic(progressRatio);
        const currentProgress = Math.round(fromProgress + (progressDiff * easedProgress));

        chartInstance.update(currentProgress);

        if (progressRatio < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function createStatusIndicator(progress) {
    const canvas = document.createElement('canvas');
    const size = 12;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); 

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.className = 'status-indicator';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 1;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = getProgressColor(progress);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    return canvas;
}

function updatePropertyCharts(propertyId, progress) {

    const cardChart = document.querySelector(`[data-property-id="${propertyId}"] .chart-container canvas`);
    if (cardChart) {

        cardChart.style.display = 'block';

        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const size = 120;

        cardChart.width = size * dpr;
        cardChart.height = size * dpr;
        cardChart.style.width = size + 'px';
        cardChart.style.height = size + 'px';

        const ctx = cardChart.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        drawProgressRing(ctx, progress, size);
        ctx.restore();
    }

    const modalChart = document.getElementById('modalChart');
    if (modalChart && modalChart.dataset.propertyId === propertyId) {
        modalChart.style.display = 'block';

        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const size = 150;

        modalChart.width = size * dpr;
        modalChart.height = size * dpr;
        modalChart.style.width = size + 'px';
        modalChart.style.height = size + 'px';

        const ctx = modalChart.getContext('2d');
        ctx.save();
        ctx.scale(dpr, dpr);
        drawProgressRing(ctx, progress, size);
        ctx.restore();

        const progressText = document.getElementById('modalProgressPercent');
        if (progressText) {
            progressText.textContent = `${progress}%`;
            progressText.style.color = getProgressColor(progress);
        }
    }

    const sidebarItem = document.querySelector(`[data-property-id="${propertyId}"] .status-indicator`);
    if (sidebarItem) {
        sidebarItem.style.backgroundColor = getProgressColor(progress);
    }
}

function createOverviewChart(canvasId, statusCounts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas-Element nicht gefunden:', canvasId);
        return null;
    }

    const size = 200;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 40;

    const total = statusCounts.notStarted + statusCounts.inProgress + statusCounts.completed;

    if (total === 0) {

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#e8ecf0';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.fillStyle = '#6b8ba4';
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Keine Daten', centerX, centerY);

        return null;
    }

    const segments = [
        { count: statusCounts.notStarted, color: '#e74c3c', label: 'Nicht begonnen' },
        { count: statusCounts.inProgress, color: '#f39c12', label: 'In Bearbeitung' },
        { count: statusCounts.completed, color: '#1e8449', label: 'Abgeschlossen' }
    ];

    let currentAngle = -Math.PI / 2; 

    segments.forEach(segment => {
        if (segment.count > 0) {
            const segmentAngle = (segment.count / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segmentAngle);
            ctx.strokeStyle = segment.color;
            ctx.lineWidth = 20;
            ctx.stroke();

            currentAngle += segmentAngle;
        }
    });

    ctx.fillStyle = '#3a5169';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 5);

    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('Gesamt', centerX, centerY + 15);

    return {
        canvas,
        update: (newStatusCounts) => createOverviewChart(canvasId, newStatusCounts)
    };
}

function createProgressBar(containerId, progress, showText = true) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container-Element nicht gefunden:', containerId);
        return null;
    }

    container.innerHTML = '';
    container.className = 'progress-bar-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${progress}%`;
    progressFill.style.backgroundColor = getProgressColor(progress);

    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    if (showText) {
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.textContent = `${progress}% abgeschlossen`;
        progressText.style.color = getProgressColor(progress);
        container.appendChild(progressText);
    }

    return {
        container,
        update: (newProgress) => {
            progressFill.style.width = `${newProgress}%`;
            progressFill.style.backgroundColor = getProgressColor(newProgress);
            if (showText) {
                progressText.textContent = `${newProgress}% abgeschlossen`;
                progressText.style.color = getProgressColor(newProgress);
            }
        }
    };
}

function createMiniChart(progress, size = 24) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.display = 'block';
    canvas.className = 'mini-chart';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e8ecf0';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (progress > 0) {
        const angle = (progress / 100) * 2 * Math.PI;
        const startAngle = -Math.PI / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
        ctx.strokeStyle = getProgressColor(progress);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    return canvas;
}

function updateMultipleCharts(updates) {
    updates.forEach(update => {
        if (update.propertyId && update.progress !== undefined) {
            updatePropertyCharts(update.propertyId, update.progress);
        }
    });
}

function createResponsiveChart(containerId, progress, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container-Element nicht gefunden:', containerId);
        return null;
    }

    const defaultOptions = {
        type: 'ring', 
        size: 'auto', 
        showText: true,
        animate: true
    };

    const opts = { ...defaultOptions, ...options };

    let size = opts.size;
    if (size === 'auto') {
        const containerWidth = container.offsetWidth;
        size = Math.min(containerWidth - 20, 200);
    }

    switch (opts.type) {
        case 'ring':
            const canvas = document.createElement('canvas');
            canvas.id = `${containerId}_canvas`;
            container.appendChild(canvas);
            return createProgressChart(canvas.id, progress, size);

        case 'bar':
            return createProgressBar(containerId, progress, opts.showText);

        case 'mini':
            const miniCanvas = createMiniChart(progress, size);
            container.appendChild(miniCanvas);
            return { canvas: miniCanvas };

        default:
            console.error('Unbekannter Chart-Typ:', opts.type);
            return null;
    }
}

function cleanupChart(chartInstance) {
    if (chartInstance && chartInstance.canvas) {
        const canvas = chartInstance.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function optimizeChartRendering() {

    const canvases = document.querySelectorAll('canvas');

    canvases.forEach(canvas => {
        if (!canvas.style.width || !canvas.style.height) {
            return; 
        }

        const ctx = canvas.getContext('2d');
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3); 

        if (devicePixelRatio > 1) {
            const rect = canvas.getBoundingClientRect();

            const expectedWidth = rect.width * devicePixelRatio;
            const expectedHeight = rect.height * devicePixelRatio;

            if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
                canvas.width = expectedWidth;
                canvas.height = expectedHeight;

                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
                canvas.style.display = 'block';

                ctx.scale(devicePixelRatio, devicePixelRatio);
            }
        }
    });
}

function ensureCanvasVisibility() {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        if (canvas.offsetParent === null) { 
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createProgressChart,
        createSmallProgressChart,
        createLargeProgressChart,
        createStatusIndicator,
        createOverviewChart,
        createProgressBar,
        createMiniChart,
        createResponsiveChart,
        updatePropertyCharts,
        updateMultipleCharts,
        animateProgress,
        getProgressColor,
        cleanupChart,
        optimizeChartRendering,
        ensureCanvasVisibility
    };
}
