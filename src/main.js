const startYear = 2026;
const currentYear = new Date().getFullYear();

document.getElementById("copyright-year").textContent =
    currentYear > startYear
        ? `${startYear}–${currentYear}`
        : startYear;
