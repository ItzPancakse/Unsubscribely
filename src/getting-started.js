document.getElementById('connect-gmail').addEventListener('click', () => {
    window.location.href = '/api/gmail/connect';
});

const imapForm = document.getElementById('imap-form');
const imapFormEl = document.getElementById('imap-credentials-form');
let selectedHost = null;

document.getElementById('connect-icloud').addEventListener('click', () => {
    selectedHost = 'imap.mail.me.com';
    imapForm.hidden = false;
    imapForm.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('connect-yahoo').addEventListener('click', () => {
    selectedHost = 'imap.mail.yahoo.com';
    imapForm.hidden = false;
    imapForm.scrollIntoView({ behavior: 'smooth' });
});

imapFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('imap-email').value;
    const pass = document.getElementById('imap-password').value;

    const submitBtn = imapFormEl.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scanning...';

    try {
        const res = await fetch('/api/imap/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: selectedHost, user, pass }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Something went wrong.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Scan my inbox';
            return;
        }

        const senders = await res.json();
        sessionStorage.setItem('imapSenders', JSON.stringify(senders));
        window.location.href = '/dashboard.html?source=imap';
    } catch (err) {
        alert('Connection failed.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Scan my inbox';
    }
});
