const startYear = 2026;
const currentYear = new Date().getFullYear();

const copyrightYear = document.getElementById("copyright-year");
if (copyrightYear) {
    copyrightYear.textContent =
        currentYear > startYear
            ? `${startYear}–${currentYear}`
            : startYear;
}
