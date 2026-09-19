document.getElementById('test-button').addEventListener('click', async () => {
    const msg = await window.go.main.App.Greet();
    document.getElementById('response').textContent  = msg;
});