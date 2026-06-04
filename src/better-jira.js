const COLOR_MULTIPLIER = 137.508;
const DARK_BRIGHTNESS_LIMIT = 0.10;
const LIGHT_BRIGHTNESS_LIMIT = 0.90;
const COLOR_HUE_STEP = 47;

var defaultSettings = {
    enableColorizer: true,
    skipLightColors: false,
    skipDarkColors: false,

    hideRecommendedDefinitions: true,
    hideDefinePopup: true,
    hideRovoTop: true,
    hideRovoBottom: true,
    hideDevelopmentPanel: true,
    hideRecommendedApps: true,
    hideCssRjtezs: true,
	hideCommentsSummary: true,
	hideSuggestionsPanel: true,
};

var currentSettings = defaultSettings;
var betterJiraObserver = null;
var colorizerRefreshScheduled = false;
var settingsListenerStarted = false;

var ticketElementGroups = [
    {
        linkSelector: ".bu4bgh-5.dLPyHk",
        textSelector: ".bu4bgh-0"
    },
    {
        linkSelector: '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]',
        textSelector: '[data-testid="issue.views.issue-base.foundation.summary.heading"]'
    },
    {
        linkSelector: ".issue-link",
        textSelector: ".issue-link"
    },
    {
        linkSelector: '[data-testid="issue-navigator.ui.issue-results.detail-view.card-list.card"]',
        textSelector: "._slp31hna._1i4q1hna._1nmz1hna._otyr1b66"
    },
    {
        linkSelector: '.jira-activity-item .activity-item-summary a[href*="/browse/"]',
        textSelector: '.jira-activity-item .activity-item-summary a[href*="/browse/"]'
    }
];

var deleteClassRules = [
    {
        className: "css-rjtezs",
        settingKey: "hideCssRjtezs"
    },
	{
		className: "css-1nnhl9x",
		settingKey: "hideCommentsSummary",
	}
];

var deleteAttributeSelectorRules = [
    {
        selector: '[data-vc="issue-view-development-context-panel"]',
        settingKey: "hideDevelopmentPanel"
    },
    {
        selector: '[data-testid="atlassian-navigation.ui.conversation-assistant.app-navigation-ai-mate"]',
        settingKey: "hideRovoTop"
    },
    {
        selector: '[data-spotlight-target="rovo-ai-button"]',
        settingKey: "hideRovoBottom"
    },
    {
        selector: '[data-testid="highlight-actions.ui.popup-target.popup-dialog.popup-wrapper.popup"]',
        settingKey: "hideDefinePopup"
    },
	{
		selector: '[data-testid="servicedesk-ai-context-common.ui.ai-context-container.ai-container"]',
		settingKey: "hideSuggestionsPanel"
	},
	{
		selector: '[data-testid="servicedesk-smart-request-summary-trigger.ui.jira-smart-summary-standard-button"]',
		settingKey: "hideCommentsSummary"
	}
];

startBetterJira();

function startBetterJira() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initializeBetterJira();
        });
    }
    else {
        initializeBetterJira();
    }
}

function initializeBetterJira() {
    loadSettings(function (settings) {
        applySettings(settings);
        observeDomChanges();
        listenForSettingsChanges();
    });
}

function loadSettings(callback) {
    chrome.storage.local.get(defaultSettings, function (settings) {
        callback(settings);
    });
}

function applySettings(settings) {
    currentSettings = settings;

    cleanBetterJiraNode(document.body);

    if (currentSettings.enableColorizer) {
        assignAllTicketColors();
    }
    else {
        clearAllTicketColors();
    }
}

function listenForSettingsChanges() {
    if (settingsListenerStarted === false) {
        settingsListenerStarted = true;

        chrome.runtime.onMessage.addListener(function (message) {
            if (message != null) {
                if (message.action === "betterJiraSettingsChanged") {
                    reloadSettingsAndApply();
                }
            }
        });

        chrome.storage.onChanged.addListener(function (changes, areaName) {
            if (areaName === "local") {
                if (hasRelevantSettingChanged(changes)) {
                    reloadSettingsAndApply();
                }
            }
        });
    }
}

function reloadSettingsAndApply() {
    loadSettings(function (settings) {
        applySettings(settings);
    });
}

function hasRelevantSettingChanged(changes) {
    var changed = false;

    if (changes.enableColorizer != null) {
        changed = true;
    }

    if (changes.skipLightColors != null) {
        changed = true;
    }

    if (changes.skipDarkColors != null) {
        changed = true;
    }

    if (changes.hideRecommendedDefinitions != null) {
        changed = true;
    }

    if (changes.hideDefinePopup != null) {
        changed = true;
    }

    if (changes.hideRovoTop != null) {
        changed = true;
    }

    if (changes.hideRovoBottom != null) {
        changed = true;
    }

    if (changes.hideDevelopmentPanel != null) {
        changed = true;
    }

    if (changes.hideRecommendedApps != null) {
        changed = true;
    }

    if (changes.hideCssRjtezs != null) {
        changed = true;
    }

    return changed;
}

function isSettingEnabled(settingKey) {
    var enabled = false;

    if (currentSettings != null) {
        if (currentSettings[settingKey] === true) {
            enabled = true;
        }
    }

    return enabled;
}

function observeDomChanges() {
    if (betterJiraObserver == null) {
        betterJiraObserver = new MutationObserver(function (mutations) {
            var shouldRefreshColors = false;

            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    cleanBetterJiraNode(node);
                    shouldRefreshColors = true;
                });

                if (mutation.type === "characterData") {
                    var parent = mutation.target.parentNode;

                    if (parent != null) {
                        cleanBetterJiraNode(parent);
                        shouldRefreshColors = true;
                    }
                }
            });

            if (shouldRefreshColors) {
                scheduleTicketColorRefresh();
            }
        });

        betterJiraObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
}

function getDeleteSelectorText() {
    var selectors = [];

    deleteClassRules.forEach(function (rule) {
        if (isSettingEnabled(rule.settingKey)) {
            selectors.push("." + rule.className);
        }
    });

    deleteAttributeSelectorRules.forEach(function (rule) {
        if (isSettingEnabled(rule.settingKey)) {
            selectors.push(rule.selector);
        }
    });

    return selectors.join(", ");
}

function unwrap(el) {
    var parent = el.parentNode;
    var unwrapped = false;

    if (parent != null) {
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }

        parent.removeChild(el);
        unwrapped = true;
    }

    return unwrapped;
}

function onAcronym(el) {
    var unwrapped = unwrap(el);
    return unwrapped;
}

function deleteElement(el) {
    var parent = el.parentNode;
    var deleted = false;

    if (parent != null) {
        parent.removeChild(el);
        deleted = true;
    }

    return deleted;
}

function hasRecommendedForTeamParagraph(el) {
    var result = false;
    var paragraphs = el.querySelectorAll("p");

    paragraphs.forEach(function (item) {
        if (item.textContent.trim() === "Recommended for your team") {
            result = true;
        }
    });

    return result;
}

function isRecommendedForTeamListItem(el) {
    var result = false;

    if (isSettingEnabled("hideRecommendedApps")) {
        if (el.tagName === "DIV") {
            if (el.getAttribute("role") === "listitem") {
                if (el.closest("._bozg1crf") != null) {
                    if (hasRecommendedForTeamParagraph(el)) {
                        result = true;
                    }
                }
            }
        }
    }

    return result;
}

function deleteRecommendedForTeamItemNear(node) {
    var deleted = false;

    if (isSettingEnabled("hideRecommendedApps")) {
        if (node.nodeType === 1) {
            if (isRecommendedForTeamListItem(node)) {
                deleted = deleteElement(node);
            }
            else {
                var listItem = node.closest('div[role="listitem"]');

                if (listItem != null) {
                    if (isRecommendedForTeamListItem(listItem)) {
                        deleted = deleteElement(listItem);
                    }
                }
            }
        }
    }

    return deleted;
}

function deleteRecommendedForTeamItems(root) {
    if (isSettingEnabled("hideRecommendedApps")) {
        var list = [];

        if (root.matches != null) {
            if (root.matches("._bozg1crf")) {
                list = Array.from(root.querySelectorAll('div[role="listitem"]'));
            }
            else {
                list = Array.from(root.querySelectorAll('._bozg1crf div[role="listitem"]'));
            }
        }

        list.forEach(function (item) {
            if (isRecommendedForTeamListItem(item)) {
                deleteElement(item);
            }
        });
    }
}

function shouldDelete(el) {
    var result = false;
    var selectorText = getDeleteSelectorText();

    if (selectorText !== "") {
        if (el.matches(selectorText)) {
            result = true;
        }
    }

    if (isRecommendedForTeamListItem(el)) {
        result = true;
    }

    return result;
}

function deleteMatchingItems(root) {
    var selectorText = getDeleteSelectorText();

    if (selectorText !== "") {
        var deleteList = root.querySelectorAll(selectorText);

        deleteList.forEach(function (item) {
            deleteElement(item);
        });
    }
}

function unwrapRecommendedDefinitions(root) {
    var unwrappedRoot = false;

    if (isSettingEnabled("hideRecommendedDefinitions")) {
        if (root.classList.contains("acronym-highlight")) {
            unwrappedRoot = onAcronym(root);
        }

        if (unwrappedRoot === false) {
            var acronymList = root.querySelectorAll(".acronym-highlight");

            acronymList.forEach(function (item) {
                onAcronym(item);
            });
        }
    }
}

function cleanBetterJiraNode(node) {
    if (node.nodeType === 1) {
        var deleted = deleteRecommendedForTeamItemNear(node);

        if (deleted === false) {
            if (shouldDelete(node)) {
                deleteElement(node);
            }
            else {
                deleteMatchingItems(node);
                deleteRecommendedForTeamItems(node);
                unwrapRecommendedDefinitions(node);
            }
        }
    }
}

function scheduleTicketColorRefresh() {
    if (colorizerRefreshScheduled === false) {
        colorizerRefreshScheduled = true;

        window.requestAnimationFrame(function () {
            colorizerRefreshScheduled = false;

            if (currentSettings.enableColorizer) {
                assignAllTicketColors();
            }
        });
    }
}

function assignAllTicketColors() {
    ticketElementGroups.forEach(function (group) {
        assignTicketColorsForGroup(group);
    });
}

function assignTicketColorsForGroup(group) {
    var ticketLinkElements = Array.from(document.querySelectorAll(group.linkSelector));
    var ticketTextElements = Array.from(document.querySelectorAll(group.textSelector));

    ticketLinkElements.forEach(function (ticketLinkElement, index) {
        var ticketTextElement = ticketTextElements[index];
        var href = getHref(ticketLinkElement);
        var ticketNumber = getTicketNumberFromHref(href);

        if (href.indexOf("browse") >= 0 && ticketNumber > 0) {
            assignTicketColor(ticketLinkElement, ticketNumber);

            if (ticketTextElement != null) {
                assignTicketColor(ticketTextElement, ticketNumber);
            }
        }
    });
}

function assignTicketColor(ticketElement, seed) {
    var uniqueColor = getTicketColor(seed, currentSettings);

    if (ticketElement != null) {
        saveOriginalColor(ticketElement);
        ticketElement.style.setProperty("color", uniqueColor, "important");
        ticketElement.setAttribute("data-better-jira-colorized", "Y");
    }
}

function getTicketColor(seed, settings) {
    var color = null;
    var startingHue = (seed * COLOR_MULTIPLIER) % 360;

    for (var i = 0; i < 360 && color == null; i++) {
        var hue = (startingHue + (i * COLOR_HUE_STEP)) % 360;
        var rgb = hsvToRgb(hue, 1, 1);
        var brightness = getVisibleBrightness(rgb.r, rgb.g, rgb.b);

        if (isColorAllowed(brightness, settings)) {
            color = rgbToHex(rgb.r, rgb.g, rgb.b);
        }
    }

    if (color == null) {
        color = rgbToHex(255, 255, 255);
    }

    return color;
}

function isColorAllowed(brightness, settings) {
    var allowed = true;

    if (settings.skipDarkColors) {
        if (brightness < DARK_BRIGHTNESS_LIMIT) {
            allowed = false;
        }
    }

    if (settings.skipLightColors) {
        if (brightness > LIGHT_BRIGHTNESS_LIMIT) {
            allowed = false;
        }
    }

    return allowed;
}

function getVisibleBrightness(r, g, b) {
    var red = srgbToLinear(r / 255);
    var green = srgbToLinear(g / 255);
    var blue = srgbToLinear(b / 255);

    var brightness = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);

    return brightness;
}

function srgbToLinear(value) {
    var result = 0;

    if (value <= 0.04045) {
        result = value / 12.92;
    }
    else {
        result = Math.pow((value + 0.055) / 1.055, 2.4);
    }

    return result;
}

function hsvToRgb(h, s, v) {
    var r = 0;
    var g = 0;
    var b = 0;

    var i = Math.floor(h / 60);
    var f = h / 60 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function saveOriginalColor(ticketElement) {
    if (ticketElement.hasAttribute("data-better-jira-original-color") === false) {
        ticketElement.setAttribute("data-better-jira-original-color", ticketElement.style.getPropertyValue("color"));
        ticketElement.setAttribute("data-better-jira-original-color-priority", ticketElement.style.getPropertyPriority("color"));
    }
}

function clearAllTicketColors() {
    var colorizedItems = document.querySelectorAll('[data-better-jira-colorized="Y"]');

    colorizedItems.forEach(function (item) {
        clearTicketColor(item);
    });
}

function clearTicketColor(ticketElement) {
    var originalColor = ticketElement.getAttribute("data-better-jira-original-color");
    var originalPriority = ticketElement.getAttribute("data-better-jira-original-color-priority");

    if (originalColor != null && originalColor !== "") {
        ticketElement.style.setProperty("color", originalColor, originalPriority);
    }
    else {
        ticketElement.style.removeProperty("color");
    }

    ticketElement.removeAttribute("data-better-jira-colorized");
    ticketElement.removeAttribute("data-better-jira-original-color");
    ticketElement.removeAttribute("data-better-jira-original-color-priority");
}

function getHref(el) {
    var href = "";

    if (el != null) {
        if (el.href != null) {
            href = el.href;
        }
        else {
            var link = el.querySelector("a[href]");

            if (link != null) {
                href = link.href;
            }
        }
    }

    return href;
}

function getTicketNumberFromHref(href) {
    var currentNumber = "";
    var bestNumber = 0;

    for (var i = 0; i < href.length; i++) {
        var ch = href[i];

        if (ch >= "0" && ch <= "9") {
            currentNumber += ch;
        }
        else {
            if (currentNumber.length >= 4) {
                bestNumber = Number(currentNumber);
            }

            currentNumber = "";
        }
    }

    if (currentNumber.length >= 4) {
        bestNumber = Number(currentNumber);
    }

    return bestNumber;
}

function rgbToHex(r, g, b) {
    var value = (1 << 24) + (r << 16) + (g << 8) + b;
    return "#" + value.toString(16).slice(1).toUpperCase();
}
