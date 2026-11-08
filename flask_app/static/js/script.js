let counts = {
    'programming': 0,
    'youtube_entertainment': 0,
    'youtube_edu': 0
};
let trackingInterval = null;

const startButton = document.getElementById('startTrackingButton');
const stopButton = document.getElementById('stopTrackingButton');
const trackingStatus = document.getElementById('trackingStatus');

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

function startTracking() {
    if (trackingInterval !== null) {
        return;
    }

    startButton.disabled = true;
    stopButton.disabled = false;
    trackingStatus.textContent = 'Tracking is running. Captures occur every 60 seconds.';

    trackingInterval = setInterval(() => {
        fetch('/capture')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Capture failed (${res.status}).`);
                }
                return res.json();
            })
            .then(data => {
                if (trackingInterval === null) {
                    return;
                }
                renderDashboard(data.dashboard);
                console.log("Tracked:", data.activity);
            })
            .catch(error => {
                if (trackingInterval !== null) {
                    trackingStatus.textContent = `Tracking is running, but capture failed: ${error.message}`;
                    console.error(error);
                }
            });
    }, 60000);
}

function stopTracking() {
    if (trackingInterval === null) {
        return;
    }

    clearInterval(trackingInterval);
    trackingInterval = null;
    startButton.disabled = false;
    stopButton.disabled = true;
    trackingStatus.textContent = 'Tracking is stopped.';
}

loadDashboard();
