// Theme switcher: dark (default) -> light -> sepia -> solarized, persisted in localStorage.

var THEMES = ['dark', 'light', 'sepia', 'solarized'];

function getStoredTheme() {
	var stored = null;
	try {
		stored = localStorage.getItem('theme');
	} catch (e) { /* storage unavailable */ }
	return THEMES.indexOf(stored) !== -1 ? stored : 'dark';
}

function applyTheme(theme) {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem('theme', theme);
	} catch (e) { /* storage unavailable */ }
}

// Advance to the next theme in the cycle and briefly show its name.
function cycleTheme() {
	var current = document.documentElement.getAttribute('data-theme') || getStoredTheme();
	var next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
	applyTheme(next);
	showThemeToast(next);
}

// Back-compat: previous code called modeSwitcher() to force a theme on load.
function modeSwitcher() {
	applyTheme(getStoredTheme());
}

function showThemeToast(theme) {
	var toast = document.getElementById('theme-toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'theme-toast';
		document.body.appendChild(toast);
	}
	toast.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
	toast.classList.add('visible');
	clearTimeout(showThemeToast._t);
	showThemeToast._t = setTimeout(function () {
		toast.classList.remove('visible');
	}, 1200);
}

// Apply the saved/default theme as early as possible.
applyTheme(getStoredTheme());
