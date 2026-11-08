let counts = {
    'programming': 0,
    'youtube_entertainment': 0,
    'youtube_edu': 0
};
let trackingTimeout = null;
let captureController = null;
let isTracking = false;
const MIN_CAPTURE_DELAY_MS = 60000;
const MAX_CAPTURE_DELAY_MS = 90000;

const startButton = document.getElementById('startTrackingButton');
const stopButton = document.getElementById('stopTrackingButton');
const trackingStatus = document.getElementById('trackingStatus');
const sidebarTrackingStatus = document.getElementById('sidebarTrackingStatus');

const ctx = document.getElementById('activityChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: Object.keys(counts),
        datasets: [{
            label: 'Time Spent Today (Minutes)',
            data: Object.values(counts),
            backgroundColor: ['#22c55e', '#f43f5e', '#3b82f6'],
            borderRadius: 6,
            barThickness: 60  // 💡 Set bar thickness to prevent auto-shrink
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // 💡 Ensure consistent layout
        animation: false, // ✅ Completely disables animation on update
        plugins: {
            tooltip: {
                enabled: true,
                position: 'nearest',
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#f8fafc',
                padding: 10
            },
            legend: {
                display: false
            }
        },
        interaction: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#cbd5e1'
                },
                grid: {
                    color: '#334155'
                }
            },
            x: {
                ticks: {
                    color: '#cbd5e1'
                },
                grid: {
                    display: false
                }
            }
        }
    }
});

function updateChart(label) {
    const activityMinutes = label.daily_activity_minutes || {};
    counts = Object.fromEntries(Object.keys(counts).map(activity => [
        activity,
        activityMinutes[activity] || 0
    ]));
    chart.data.datasets[0].data = Object.values(counts);
    chart.update();
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function renderDashboard(data) {
    document.getElementById('dailyTotal').textContent = formatDuration(data.period_seconds.daily);
    document.getElementById('weeklyTotal').textContent = formatDuration(data.period_seconds.weekly);
    document.getElementById('monthlyTotal').textContent = formatDuration(data.period_seconds.monthly);
    updateChart(data);
}

function loadDashboard() {
    fetch('/dashboard')
        .then(res => {
            if (!res.ok) {
                throw new Error(`Dashboard failed (${res.status}).`);
            }
            return res.json();
        })
        .then(renderDashboard)
        .catch(error => console.error(error));
}

function showView(viewId) {
    document.querySelectorAll('.page-view').forEach(view => {
        view.hidden = view.id !== viewId;
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        const active = link.dataset.view === viewId;
        link.classList.toggle('is-active', active);
        if (active) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function setTrackingStatus(message, active) {
    trackingStatus.textContent = message;
    sidebarTrackingStatus.textContent = active ? 'Tracking active' : 'Tracking stopped';
    document.querySelector('.status-indicator').classList.toggle('is-running', active);
}

function scheduleNextCapture() {
    const delay = Math.floor(
        Math.random() * (MAX_CAPTURE_DELAY_MS - MIN_CAPTURE_DELAY_MS + 1)
    ) + MIN_CAPTURE_DELAY_MS;
    trackingTimeout = setTimeout(captureActivity, delay);
    setTrackingStatus('Tracking is running. Captures are randomized between 60 and 90 seconds.', true);
}

async function captureActivity() {
    trackingTimeout = null;
    if (!isTracking) {
        return;
    }

    const controller = new AbortController();
    captureController = controller;
    try {
        const response = await fetch('/capture', { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Capture failed (${response.status}).`);
        }
        const data = await response.json();
        if (!isTracking) {
            return;
        }
        renderDashboard(data.dashboard);
        console.log('Tracked:', data.activity);
    } catch (error) {
        if (isTracking && error.name !== 'AbortError') {
            setTrackingStatus(`Tracking is running, but capture failed: ${error.message}`, true);
            console.error(error);
        }
    } finally {
        if (captureController === controller) {
            captureController = null;
        }
        if (isTracking) {
            scheduleNextCapture();
        }
    }
}

function startTracking() {
    if (isTracking) {
        return;
    }

    isTracking = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    scheduleNextCapture();
}

function stopTracking() {
    if (!isTracking) {
        return;
    }

    isTracking = false;
    clearTimeout(trackingTimeout);
    trackingTimeout = null;
    if (captureController) {
        captureController.abort();
        captureController = null;
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    setTrackingStatus('Tracking is stopped.', false);
}

async function loadSettings() {
    try {
        const response = await fetch('/settings');
        if (!response.ok) {
            throw new Error(`Settings failed (${response.status}).`);
        }
        const data = await response.json();
        document.getElementById('screenshotDirectory').value = data.screenshot_dir;
    } catch (error) {
        document.getElementById('settingsStatus').textContent = error.message;
    }
}

async function saveSettings(event) {
    event.preventDefault();
    const saveButton = document.getElementById('saveSettingsButton');
    const status = document.getElementById('settingsStatus');
    saveButton.disabled = true;
    status.textContent = 'Saving folder...';

    try {
        const response = await fetch('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                screenshot_dir: document.getElementById('screenshotDirectory').value
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Settings failed (${response.status}).`);
        }
        document.getElementById('screenshotDirectory').value = data.screenshot_dir;
        status.textContent = 'Screenshot folder saved. It will be used for the next capture.';
    } catch (error) {
        status.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
}

async function browseScreenshotFolder() {
    const browseButton = document.getElementById('browseFolderButton');
    const status = document.getElementById('settingsStatus');
    browseButton.disabled = true;
    status.textContent = 'Opening folder picker...';

    try {
        const response = await fetch('/select-folder', { method: 'POST' });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Folder picker failed (${response.status}).`);
        }
        if (data.screenshot_dir) {
            document.getElementById('screenshotDirectory').value = data.screenshot_dir;
            status.textContent = 'Folder selected. Save settings to apply it.';
        } else {
            status.textContent = 'Folder selection canceled.';
        }
    } catch (error) {
        status.textContent = `${error.message} You can enter a folder path above.`;
    } finally {
        browseButton.disabled = false;
    }
}

loadDashboard();
loadSettings();
