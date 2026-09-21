const DEMO_SENDERS = [
    { sender: 'Trailhead Outfitters <deals@trailhead.example>',        count: 14, unsubscribeUrl: 'https://demo.invalid/unsub/trailhead',    unsubscribeMailto: null },
    { sender: 'The Daily Brew <news@dailybrew.example>',               count: 12, unsubscribeUrl: 'https://demo.invalid/unsub/dailybrew',    unsubscribeMailto: null },
    { sender: 'Pixel Pantry <offers@pixelpantry.example>',             count: 11, unsubscribeUrl: 'https://demo.invalid/unsub/pixelpantry',  unsubscribeMailto: null },
    { sender: 'Bytesized Weekly <hello@bytesized.example>',            count: 9,  unsubscribeUrl: 'https://demo.invalid/unsub/bytesized',    unsubscribeMailto: null },
    { sender: 'StreamBox <promos@streambox.example>',                  count: 8,  unsubscribeUrl: null, unsubscribeMailto: 'mailto:unsubscribe@streambox.example' },
    { sender: 'Fable Book Club <club@fablebooks.example>',             count: 7,  unsubscribeUrl: 'https://demo.invalid/unsub/fablebooks',   unsubscribeMailto: null },
    { sender: 'Maple Street Gym <team@maplestreetgym.example>',        count: 6,  unsubscribeUrl: 'https://demo.invalid/unsub/maplestreet',  unsubscribeMailto: null },
    { sender: 'Northwind Credit Union <alerts@northwindcu.example>',   count: 6,  unsubscribeUrl: null, unsubscribeMailto: null },
    { sender: 'Lumen Learning <courses@lumenlearn.example>',           count: 5,  unsubscribeUrl: 'https://demo.invalid/unsub/lumenlearn',   unsubscribeMailto: null },
    { sender: 'Citywide Transit <updates@citytransit.example>',        count: 5,  unsubscribeUrl: null, unsubscribeMailto: 'mailto:stop@citytransit.example' },
    { sender: 'Sam Rivera <sam@example.com>',                          count: 4,  unsubscribeUrl: null, unsubscribeMailto: null },
    { sender: 'Cozy Candle Co. <sale@cozycandle.example>',             count: 4,  unsubscribeUrl: 'https://demo.invalid/unsub/cozycandle',   unsubscribeMailto: null },
    { sender: 'Riverbend Elementary PTA <pta@riverbend.example>',      count: 3,  unsubscribeUrl: null, unsubscribeMailto: null },
    { sender: 'Gadget Garage <newsletter@gadgetgarage.example>',       count: 3,  unsubscribeUrl: 'https://demo.invalid/unsub/gadgetgarage', unsubscribeMailto: null },
    { sender: 'Wanderly Travel <trips@wanderly.example>',              count: 3,  unsubscribeUrl: 'https://demo.invalid/unsub/wanderly',     unsubscribeMailto: null },
];

const body = document.getElementById('results-body');
const filterInput = document.getElementById('filter-input');

const unsubState = new Map();

function canUnsubscribe(sender) {
    return Boolean(sender.unsubscribeUrl || sender.unsubscribeMailto);
}

function updateStats(senders) {
    document.getElementById('stat-senders').textContent = senders.length;
    document.getElementById('stat-emails').textContent = senders.reduce((sum, s) => sum + s.count, 0);
    document.getElementById('stat-unsubscribable').textContent = senders.filter(canUnsubscribe).length;
}

function textCell(text) {
    const td = document.createElement('td');
    td.textContent = text;
    return td;
}

function buttonLabel(state) {
    if (state === 'done') return 'Done';
    if (state === 'pending') return 'Unsubscribing...';
    return 'Unsubscribe';
}

function actionCell(sender) {
    const td = document.createElement('td');
    if (!canUnsubscribe(sender)) {
        td.textContent = '-';
        return td;
    }

    const state = unsubState.get(sender.sender);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'unsub-button';
    button.textContent = buttonLabel(state);
    button.disabled = Boolean(state);

    button.addEventListener('click', async () => {
        unsubState.set(sender.sender, 'pending');
        button.disabled = true;
        button.textContent = buttonLabel('pending');

        await new Promise((resolve) => setTimeout(resolve, 600));

        if (unsubState.get(sender.sender) === 'pending') {
            unsubState.set(sender.sender, 'done');
            if (button.isConnected) {
                button.textContent = buttonLabel('done');
            } else {
                applyFilter();
            }
        }
    });

    td.append(button);
    return td;
}

function renderRows(senders) {
    body.replaceChildren();

    if (senders.length === 0) {
        const row = document.createElement('tr');
        const cell = textCell('No senders found');
        cell.colSpan = 4;
        row.append(cell);
        body.append(row);
        return;
    }

    senders.forEach((sender) => {
        const row = document.createElement('tr');
        row.append(
            textCell(sender.sender),
            textCell(sender.count),
            textCell(canUnsubscribe(sender) ? 'Yes' : 'No unsubscribe link found :('),
            actionCell(sender)
        );
        body.append(row);
    });
}

function applyFilter() {
    const query = filterInput.value.trim().toLowerCase();
    renderRows(DEMO_SENDERS.filter((s) => s.sender.toLowerCase().includes(query)));
}

filterInput.addEventListener('input', applyFilter);

document.getElementById('reset-demo').addEventListener('click', () => {
    unsubState.clear();
    filterInput.value = '';
    applyFilter();
});

updateStats(DEMO_SENDERS);
applyFilter();
