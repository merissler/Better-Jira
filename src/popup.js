var checkboxSettings = [
    {
        id: "toggle-colorizer",
        key: "enableColorizer",
        defaultValue: true
    },
    {
        id: "toggle-skip-light-colors",
        key: "skipLightColors",
        defaultValue: false
    },
    {
        id: "toggle-skip-dark-colors",
        key: "skipDarkColors",
        defaultValue: false
    },
    {
        id: "toggle-recommended-definitions",
        key: "hideRecommendedDefinitions",
        defaultValue: true
    },
    {
        id: "toggle-define-popup",
        key: "hideDefinePopup",
        defaultValue: true
    },
    {
        id: "toggle-rovo-top",
        key: "hideRovoTop",
        defaultValue: true
    },
    {
        id: "toggle-rovo-bottom",
        key: "hideRovoBottom",
        defaultValue: true
    },
	{
        id: "toggle-comments-summary",
        key: "hideCommentsSummary",
        defaultValue: true
    },
    {
        id: "toggle-recommended-apps",
        key: "hideRecommendedApps",
        defaultValue: true
    },
    {
        id: "toggle-development-panel",
        key: "hideDevelopmentPanel",
        defaultValue: true
    },
	{
        id: "toggle-suggestions-panel",
        key: "hideSuggestionsPanel",
        defaultValue: true
    },
    {
        id: "toggle-css-rjtezs",
        key: "hideCssRjtezs",
        defaultValue: true
    }
];

document.addEventListener("DOMContentLoaded", function () {
    loadCheckboxes();
    wireCheckboxes();
});

function loadCheckboxes() {
    var defaults = getDefaultSettings();

    chrome.storage.local.get(defaults, function (settings) {
        checkboxSettings.forEach(function (item) {
            var checkbox = document.getElementById(item.id);

            if (checkbox != null) {
                checkbox.checked = settings[item.key];
            }
        });

        normalizeSkipColorCheckboxes();
        updateColorizerOptionState();
    });
}

function wireCheckboxes() {
    checkboxSettings.forEach(function (item) {
        var checkbox = document.getElementById(item.id);

        if (checkbox != null) {
            checkbox.addEventListener("change", function () {
                handleCheckboxChange(item.key, checkbox.checked);
            });
        }
    });
}

function handleCheckboxChange(key, value) {
    var settings = {};
    settings[key] = value;

    if (key === "enableColorizer") {
        updateColorizerOptionState();
    }

    if (key === "skipLightColors") {
        if (value) {
            setCheckboxChecked("toggle-skip-dark-colors", false);
            settings.skipDarkColors = false;
        }
    }

    if (key === "skipDarkColors") {
        if (value) {
            setCheckboxChecked("toggle-skip-light-colors", false);
            settings.skipLightColors = false;
        }
    }

    saveSettings(settings);
}

function normalizeSkipColorCheckboxes() {
    var skipLight = document.getElementById("toggle-skip-light-colors");
    var skipDark = document.getElementById("toggle-skip-dark-colors");

    if (skipLight != null && skipDark != null) {
        if (skipLight.checked && skipDark.checked) {
            skipDark.checked = false;

            saveSettings({
                skipDarkColors: false
            });
        }
    }
}

function updateColorizerOptionState() {
    var colorizer = document.getElementById("toggle-colorizer");
    var skipLight = document.getElementById("toggle-skip-light-colors");
    var skipDark = document.getElementById("toggle-skip-dark-colors");

    if (colorizer != null) {
        var enabled = colorizer.checked;

        if (skipLight != null) {
            skipLight.disabled = enabled === false;
        }

        if (skipDark != null) {
            skipDark.disabled = enabled === false;
        }
    }
}

function setCheckboxChecked(id, checked) {
    var checkbox = document.getElementById(id);

    if (checkbox != null) {
        checkbox.checked = checked;
    }
}

function saveSettings(settings) {
    chrome.storage.local.set(settings, function () {
        notifyCurrentTab();
    });
}

function getDefaultSettings() {
    var defaults = {};

    checkboxSettings.forEach(function (item) {
        defaults[item.key] = item.defaultValue;
    });

    return defaults;
}

function notifyCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "betterJiraSettingsChanged"
            });
        }
    });
}
