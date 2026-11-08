let counts = {
    'programming': 0,
    'youtube_entertainment': 0,
    'youtube_edu': 0
};

const ctx = document.getElementById('activityChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: Object.keys(counts),
        datasets: [{
            label: 'Time Spent (Minutes)',
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
    counts[label]++;
    chart.data.datasets[0].data = Object.values(counts);
    chart.update();
}

function startTracking() {
    setInterval(() => {
        fetch('/capture')
            .then(res => res.json())
            .then(data => {
                updateChart(data.activity);
                console.log("Tracked:", data.activity);
            });
    }, 60000);
}
