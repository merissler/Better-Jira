var deleteClassNames = [
    "css-rjtezs"
];

var deleteAttributeSelectors = [
    '[data-vc="issue-view-development-context-panel"]',
    '[data-testid="atlassian-navigation.ui.conversation-assistant.app-navigation-ai-mate"]',
    '[data-spotlight-target="rovo-ai-button"]'
];

function getDeleteSelectorText() {
    var selectors = [];

    deleteClassNames.forEach(function (className) {
        selectors.push("." + className);
    });

    deleteAttributeSelectors.forEach(function (selector) {
        selectors.push(selector);
    });

    return selectors.join(", ");
}

function unwrap(el) {
    var parent = el.parentNode;

    if (parent != null) {
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }

        parent.removeChild(el);
    }
}

function onAcronym(el) {
    unwrap(el);
}

function deleteElement(el) {
    var parent = el.parentNode;

    if (parent != null) {
        parent.removeChild(el);
    }
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

    if (el.tagName === "DIV") {
        if (el.getAttribute("role") === "listitem") {
            if (el.closest("._bozg1crf") != null) {
                if (hasRecommendedForTeamParagraph(el)) {
                    result = true;
                }
            }
        }
    }

    return result;
}

function deleteRecommendedForTeamItemNear(node) {
    if (node.nodeType === 1) {
        if (isRecommendedForTeamListItem(node)) {
            deleteElement(node);
        }
        else {
            var listItem = node.closest('div[role="listitem"]');

            if (listItem != null) {
                if (isRecommendedForTeamListItem(listItem)) {
                    deleteElement(listItem);
                }
            }
        }
    }
}

function deleteRecommendedForTeamItems(root) {
    var list = root.querySelectorAll('._bozg1crf div[role="listitem"]');

    list.forEach(function (item) {
        if (isRecommendedForTeamListItem(item)) {
            deleteElement(item);
        }
    });
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

function cleanNode(node) {
    if (node.nodeType === 1) {
        deleteRecommendedForTeamItemNear(node);

        if (shouldDelete(node)) {
            deleteElement(node);
        }
        else {
            deleteMatchingItems(node);
            deleteRecommendedForTeamItems(node);

            if (node.classList.contains("acronym-highlight")) {
                onAcronym(node);
            }

            var acronymList = node.querySelectorAll(".acronym-highlight");

            acronymList.forEach(function (item) {
                onAcronym(item);
            });
        }
    }
}

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            cleanNode(node);
        });

        if (mutation.type === "characterData") {
            var parent = mutation.target.parentNode;

            if (parent != null) {
                cleanNode(parent);
            }
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

deleteMatchingItems(document.body);
deleteRecommendedForTeamItems(document.body);

document.querySelectorAll(".acronym-highlight").forEach(function (item) {
    onAcronym(item);
});
