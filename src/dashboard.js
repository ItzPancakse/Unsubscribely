// just some scripts for the dashboard page ig

let allSenders = []

async function loadSenders() {
    const res = await fetch('/api/gmail/scan');
    const body = document.getElementById('results-body');

    if (!res.ok) {
        body.innerHTML = '<tr><td colspan="4">Failed to load senders</td></tr>';
        return;
    }

    allSenders = await res.json();
    updateStats(allSenders);
    renderRows(allSenders);
}

function updateStats(senders) {
    const totalEmails = senders.reduce((sum, s) => sum + s.count, 0);
    const unsubscribable = senders.filter((s) => s.unsubscribeUrl || s.unsubscribableMailto).length;

    document.getElementById('stat-senders').textContent = senders.length;
    document.getElementById('stat-emails').textContent = totalEmails;
    document.getElementById('stat-unsubscribable').textContent = unsubscribable;
}

function renderRows(senders) {
    const body = document.getElementById('results-body');
    body.innerHTML = '';

    if (senders.length === 0) {
        body.innerHTML = '<tr><td colspan="4">No senders found</td></tr>';
        return;
    }

    senders.forEach((s) => {
        const row = document.createElement('tr');
        const canUnsub = s.unsubscribeUrl || s.unsubscribableMailto;

        row.innerHTML = `
        <td>${s.sender}</td>
        <td>${s.count}</td>
        <td>${canUnsub ? 'Yes' : 'No unsubscribe link found :('}</td>
        <td>${canUnsub ? '<button class="unsub-button">Unsubscribe</button>' : '-'}</td>
        `;

        if (canUnsub) {
            row.querySelector('.unsub-button').addEventListener('click', async (e) => {
                e.target.disabled = true;
                e.target.textContent = 'Unsubscribing...';
                const res = await fetch('/api/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: s.unsubscribeUrl, mailto: s.unsubscribableMailto }),
                });
                const result = await res.json();
                e.target.textContent = result.success ? 'Done' : 'Failed';
            });
        }

        body.appendChild(row);
    });
}

document.getElementById('filter-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allSenders.filter((s) => s.sender.toLowerCase().includes(query));
    renderRows(filtered);
});

loadSenders();
