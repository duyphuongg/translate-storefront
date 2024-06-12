var Weglot = function() {
"use strict";

var validTags = {
    version1: [],
    version2: ["ABBR", "ACRONYM", "B", "BDO", "BIG", "CITE", "EM", "I", "KBD", "Q", "SMALL", "STRONG", "SUB", "SUP", "U"],
    version3: ["A", "BDI", "BR", "DEL", "DFN", "INS", "S", "SPAN"]
};

validTags.version2.unshift("#text");

var config = {
    excludedBlocks: [],
    mediaEnabled: false,
    externalEnabled: false,
    extraDefinitions: [],
    translationEngine: 2,
    noTranslateAttribute: "data-wg-notranslate",
    mergeNodes: []
};

var datadogConfig = {
    ddtags: "env:prod",
    clientToken: "pub4efaec96ce2494088ba70a2049d58dc3",
    site: "datadoghq.com"
};

var datadogHeaders = {
    "dd-api-key": "pub4efaec96ce2494088ba70a2049d58dc3",
    ddsource: "browser"
};

var environment = "prod";

function logError(error) {
    var service = error.service;

    function logToConsole(message, options) {
        var sendToConsole = options.sendToConsole === undefined ? true : options.sendToConsole;
        var consoleOverride = options.consoleOverride;
        var sendToDatadog = options.sendToDatadog === undefined ? true : options.sendToDatadog;

        if (sendToDatadog && environment !== "dev") {
            var logData = Object.assign({}, options, {
                service: service,
                status: options.status
            }, window.location && {
                view: {
                    url: window.location.href
                }
            }, options.message && {
                message: options.message
            }, options.stack && {
                stack: options.stack
            }, options.status && {
                logStatus: options.status
            }, datadogConfig);

            if (window.Weglot && window.Weglot.options) {
                logData.projectInfo = ["host", "api_key", "url_type", "technology_name", "technology_id", "is_connect", "auto_switch"].reduce(function (data, key) {
                    var newData = {};
                    newData[key] = window.Weglot.options[key];
                    return Object.assign({}, data, newData);
                }, {});
            }

            var headers = Object.keys(datadogHeaders).map(function (key) {
                return key + "=" + datadogHeaders[key];
            }).join("&");

            fetch("https://http-intake.logs.datadoghq.com/api/v2/logs?" + headers, {
                method: "POST",
                body: JSON.stringify(logData),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }

        if (sendToConsole) {
            var logMessage = consoleOverride || message;
            var logType = ["notice", "info"].includes(options.status) ? "log" : options.status;
            console[logType]("[Weglot]", logMessage);
        }
    }

    var log = function log(level) {
        return function (message, options) {
            if (options === undefined) {
                options = {};
            }
            logToConsole(message, Object.assign({}, options, { status: level }));
        };
    };

    return {
        log: log("info"),
        info: log("info"),
        notice: log("notice"),
        warn: log("warn"),
        error: log("error")
    };
}

var logger = logError({
    service: "html-parser-engine"
});

var apiEndpoints = function () {
    try {
        return JSON.parse('{"TRANSLATION":"translations.weglot.io","SWITCHER":"switchers.weglot.io","EXCLUSION":"exclusions.weglot.io","DEFINITION":"definitions.weglot.io"}');
    } catch (error) {
        return {};
    }
}();

var endpoints = Object.keys(apiEndpoints).map(function (key) {
    return apiEndpoints[key];
});
function containsInvalidTags(text) {
    var invalidTags = ["script", "style", "noscript"];
    for (var i = 0; i < invalidTags.length; i++) {
        if (text.indexOf(invalidTags[i]) !== -1) {
            return true;
        }
    }
    return false;
}

function getValidTextNodes(element, checkWhitespace) {
    return getMemoizedResult("__validTextNodes", element, function (el) {
        return (
            el.textContent &&
            (!checkWhitespace || el.textContent.trim()) &&
            el.textContent.indexOf("BESbswy") === -1 &&
            !containsInvalidTags(el.textContent) &&
            isValidJSON(el.textContent)
        );
    });
}

function isValidJSON(text) {
    if (!text.trim()) {
        return false;
    }
    var firstChar = text.charAt(0);
    if (firstChar !== "[" && firstChar !== "{") {
        return false;
    }
    var lastChar = text[text.length - 1];
    if (lastChar !== "]" && lastChar !== "}") {
        return false;
    }
    text = text
        .replace(/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
        .replace(
            /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
            "]"
        )
        .replace(/(?:^|:|,)(?:\s*\[)+/g, "");
    return /^[\],:{}\s]*$/.test(text);
}

function isMergedNode(node) {
    try {
        if (
            config.mergedSelectorRemove &&
            node.closest(config.mergedSelectorRemove)
        ) {
            return false;
        }
    } catch (e) {}
    return (
        (config.mergeNodes &&
            config.mergeNodes.indexOf(node.nodeName) !== -1) ||
        (node.dataset && node.dataset.wgMerge) ||
        (config.selectorMerging && node.matches && node.matches(config.selectorMerging))
    );
}

function hasOnlyInlineChildNodes(element) {
    return getMemoizedResult("__onlyInlineChildsNodes", element, function (el) {
        if (!el.childNodes) {
            return true;
        }
        for (var i = 0; i < el.childNodes.length; i++) {
            var childNode = el.childNodes[i];
            if (childNode.weglot || !isMergedNode(childNode) || !hasOnlyInlineChildNodes(childNode)) {
                return false;
            }
        }
        return true;
    });
}

function hasNestedNoTranslate(element) {
    if (!element.children) {
        return false;
    }
    for (var i = 0; i < element.children.length; i++) {
        var child = element.children[i];
        if (child.wgNoTranslate || hasNestedNoTranslate(child)) {
            return true;
        }
    }
    return false;
}

function isNoTranslateElement(element) {
    if (!element) {
        return false;
    }
    var closestElement = element.closest ? element : element.parentNode;
    return (
        (closestElement && closestElement.matches("[" + config.noTranslateAttribute + "]")) ||
        hasNestedNoTranslate(element)
    );
}

var querySelectorAll = function(element, selector) {
    return function(query, fallback) {
        try {
            var modifiedQuery = query;
            if (modifiedQuery.includes(":")) {
                modifiedQuery = modifiedQuery.replace(/([^\\]):/g, "$1\\:");
            }
            return element[selector] ? element[selector](modifiedQuery) : fallback;
        } catch (error) {
            try {
                return element[selector] ? element[selector](query) : fallback;
            } catch (error) {
                console.warn(error, {
                    consoleOverride: "Your CSS rules are incorrect: " + query,
                    sendToDatadog: false
                });
            }
        }
        return fallback;
    };
};

var matches = querySelectorAll("matches", false);
var closest = querySelectorAll("closest", null);

function hasHtmlTags(text) {
    return text.includes("<") && text.includes(">");
}

var elementMap = new WeakMap();

function getTranslatableElements(element) {
    if (!element) {
        return [];
    }
    var container = element.querySelectorAll ? element : element.parentNode;
    if (!container) {
        return [];
    }
    if (function isExcluded(element) {
        var excludedBlocks = config.excludedBlocks;
        if (excludedBlocks && excludedBlocks.length) {
            var selectors = excludedBlocks.map(function(block) {
                return block.value;
            });
            var selectorString = selectors.join(",");
            if (matches(element, selectorString)) {
                if (config.privateMode) {
                    var excludedSelector = selectors.find(function(selector) {
                        return matches(element, selector);
                    });
                    element.wgNoTranslate = "Excluded by selector: " + excludedSelector;
                } else {
                    element.wgNoTranslate = true;
                }
                return;
            }
            var matchingElements = querySelectorAll(element, selectorString);
            if (matchingElements) {
                for (var i = 0; i < matchingElements.length; i += 1) {
                    var matchingElement = matchingElements[i];
                    if (config.privateMode) {
                        var excludedSelector = selectors.find(function(selector) {
                            return matches(matchingElement, selector);
                        });
                        matchingElement.wgNoTranslate = "Excluded by selector: " + excludedSelector;
                    } else {
                        matchingElement.wgNoTranslate = true;
                    }
                }
            }
        }
    }(container), !config.whitelist || !config.whitelist.length) {
        return [].concat(getTitleElements(container), getTextNodeElements(container));
    }
    var whitelistSelectors = config.whitelist.map(function(whitelistItem) {
        return whitelistItem.value;
    }).join(",");
    if (closest(container, whitelistSelectors)) {
        return getTextNodeElements(container);
    }
    var translatableElements = [];
    for (var i = 0, elements = querySelectorAll(container, whitelistSelectors); i < elements.length; i += 1) {
        var element = elements[i];
        [].push.apply(translatableElements, getTextNodeElements(element));
    }
    return translatableElements;
}

function getTitleElements(container) {
    var titleElement = document.getElementsByTagName("title")[0];
    if (container !== document.documentElement || !document.title || !titleElement || hasHtmlTags(titleElement)) {
        return [];
    }
    return [{
        element: titleElement.firstChild,
        type: 9,
        words: titleElement.textContent,
        properties: {}
    }];
}

function getTextNodeElements(container) {
    return [].concat(getAttributeElements(container), getCommentElements(container));
}

function getAttributeElements(container) {
    var elements = [];
    config.translatableAttributes.forEach(function(attribute) {
        for (var i = 0, matchingElements = container.querySelectorAll(attribute.selector); i < matchingElements.length; i += 1) {
            var element = matchingElements[i];
            if (!isResolved(element)) {
                var words = attribute.get(element);
                if (!isEmpty(words)) {
                    elements.push({
                        element: element,
                        words: words,
                        type: attribute.type,
                        attrSetter: attribute.set,
                        attrName: attribute.name
                    });
                }
            }
        }
    });
    return elements;
}

function getCommentElements(container) {
    var elements = [];
    var treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT, null, false);
    var node;
    while (node = treeWalker.nextNode()) {
        var words = getCommentText(node);
        if (!isEmpty(words)) {
            elements.push({
                element: node,
                words: words,
                type: 1,
                properties: {}
            });
        }
    }
    return elements;
}

function getCommentText(commentNode) {
    return commentNode.nodeValue.replace(/<!--[^>]*-->/g, "");
}

function getTextNodeText(textNode) {
    return textNode.textContent;
}

function isResolved(element) {
    if (element.wgResolved) {
        return true;
    }
    var parentElement = element;
    do {
        if (parentElement.wgResolved) {
            return parentElement;
        }
        parentElement = parentElement.parentElement || parentElement.parentNode;
    } while (parentElement !== null && parentElement.nodeType === 1);
    return false;
}

function isEmpty(text) {
    return text.trim() === "";
}

function getTranslatableElement(element, treeWalker) {
    var resolvedElement = isResolved(element);
    if (resolvedElement && elementMap.has(resolvedElement)) {
        var cachedElement = elementMap.get(resolvedElement);
        return {
            element: cachedElement[0],
            words: cachedElement[1],
            type: 1,
            properties: cachedElement[2]
        };
    }
    var translatableElement = getTranslatableElementFromNode(element, treeWalker);
    if (translatableElement) {
        var resolvedElement = translatableElement.element;
        var words = translatableElement.words;
        var properties = translatableElement.properties;
        if (!isEmpty(words)) {
            elementMap.set(resolvedElement, [resolvedElement, words, properties]);
            return {
                element: resolvedElement,
                words: words,
                type: 1,
                properties: properties
            };
        }
    }
}

function getTranslatableElementFromNode(node, treeWalker) {
    var text = getTextNodeText(node);
    if (!isEmpty(text)) {
        return {
            element: node,
            words: text,
            type: 1,
            properties: {}
        };
    }
}

function getTranslatableElementFromComment(commentNode) {
    var text = getCommentText(commentNode);
    if (!isEmpty(text)) {
        return {
            element: commentNode,
            words: text,
            type: 1,
            properties: {}
        };
    }
}
function traverseDOM(element, callback) {
    if (element.childNodes) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const childNode = element.childNodes[i];
            if (!childNode) return;
            callback(childNode);
            traverseDOM(childNode, callback);
        }
    }
}

function isNumeric(value) {
    return !isNaN(value);
}

function translateElements(elements, language) {
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const translations = element.weglot.content;
        if (translations && element.isConnected) {
            for (let j = 0; j < translations.length; j++) {
                const translation = translations[j];
                const originalText = translation.original;
                const properties = translation.properties;
                const attrSetter = translation.attrSetter;
                const translatedText = translation.translations[language] || originalText;
                if (properties) {
                    element.weglot.setted = true;
                    replaceText(element, translatedText, properties, originalText, elements);
                }
                if (attrSetter) {
                    element.weglot.setted = true;
                    attrSetter(element, translatedText, originalText);
                }
            }
            element.wgResolved = false;
        }
    }
}

function replaceText(element, translatedText, properties, originalText, elements) {
    if (element.nodeType === 1) {
        const wrapperElement = createWrapperElement(translatedText, element, properties);
        element.innerHTML = "";
        element.appendChild(wrapperElement);
    } else if (isNumeric(translatedText) && !isNumeric(originalText)) {
        if (!element.parentNode) {
            console.warn("Unable to translate some words, please contact support@weglot.com.");
            console.warn(element, { sendToDatadog: false });
            return;
        }
        if (element.parentNode.childNodes.length === 1) {
            element.parentNode.weglot = element.weglot;
            replaceText(element.parentNode, translatedText, properties, originalText);
        } else {
            const translationWrapper = element.closest && element.closest("[data-wg-translation-wrapper]") || element.parentNode.closest("[data-wg-translation-wrapper]");
            if (!translationWrapper || translationWrapper.innerHTML !== translatedText) {
                const spanElement = document.createElement("span");
                spanElement.dataset.wgTranslationWrapper = "";
                spanElement.weglot = element.weglot;
                element.parentNode.replaceChild(spanElement, element);
                replaceText(element.parentNode, translatedText, properties, originalText);
            }
        }
    } else {
        element.textContent = translatedText;
    }
}

function createWrapperElement(translatedText, element, properties) {
    const fragment = document.createDocumentFragment();
    if (element.nodeType !== 1) {
        fragment.appendChild(element);
        return fragment;
    }
    for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.firstChild;
        if (isTranslationPlaceholder(childNode)) {
            const placeholderIndex = getPlaceholderIndex(childNode);
            const placeholder = properties[placeholderIndex - 1];
            if (!placeholder) continue;
            const clonedChild = placeholder.used ? placeholder.child.cloneNode(true) : placeholder.child;
            const childFragment = createWrapperElement(clonedChild, childNode, properties);
            if (childFragment.contains(clonedChild)) {
                console.error("There is an HTML error in the translation of: " + element.innerHTML.toString());
                return fragment;
            }
            clonedChild.innerHTML = "";
            clonedChild.appendChild(childFragment);
            fragment.appendChild(clonedChild);
            document.createDocumentFragment().appendChild(childNode);
            placeholder.used = true;
        } else {
            fragment.appendChild(childNode);
        }
    }
    return fragment;
}

function isTranslationPlaceholder(node) {
    if (node && node.nodeType === 1 && node.attributes && node.attributes[0]) {
        const attributeName = node.attributes[0].name;
        const placeholderIndex = parseInt(attributeName.split("wg-")[1]);
        return !isNaN(placeholderIndex);
    }
}

function getPlaceholderIndex(node) {
    const attributeName = node.attributes[0].name;
    const placeholderIndex = parseInt(attributeName.split("wg-")[1]);
    return isNaN(placeholderIndex) ? undefined : placeholderIndex;
}

function initialize() {
    // Code for initialization
}

function translateCurrentLocation() {
    // Code for translating the current location
}

function translateOnLanguageChange() {
    // Code for translating on language change
}

function translateOnOptionsReady() {
    // Code for translating when options are ready
}

function translateOnCurrentLocationChanged() {
    // Code for translating when current location changes
}

initialize();
translateCurrentLocation();
translateOnLanguageChange();
translateOnOptionsReady();
translateOnCurrentLocationChanged();
function updateImageSrcset(element, newSrcset) {
    if (element.parentNode && element.parentNode.tagName === "PICTURE") {
        const pictureChildren = element.parentNode.children;
        for (let i = 0; i < pictureChildren.length; i += 1) {
            const child = pictureChildren[i];
            if (child.tagName === "SOURCE") {
                child.setAttribute("srcset", newSrcset);
            }
        }
    }
}

function extractDomain(url) {
    return url && url.split && url.split("www.")[1] || url;
}

function getDefaultAttributes(options) {
    const defaultAttributes = [
        {
            type: 1,
            selectors: ["[title]"],
            attribute: getAttribute("title"),
        },
        {
            type: 2,
            selectors: ["input[type='submit']", "input[type='button']", "button"],
            attribute: getAttribute("value"),
        },
        {
            type: 3,
            selectors: ["input[placeholder]", "textarea[placeholder]"],
            attribute: getAttribute("placeholder"),
        },
        {
            type: 4,
            selectors: [
                "meta[name='description']",
                "meta[property='og:description']",
                "meta[property='og:site_name']",
                "meta[property='og:image:alt']",
                "meta[name='twitter:description']",
                "meta[itemprop='description']",
                "meta[itemprop='name']",
            ],
            attribute: getAttribute("content"),
        },
        {
            type: 7,
            selectors: ["img"],
            attribute: getAttribute("alt"),
        },
        {
            type: 8,
            selectors: ["[href$='.pdf']", "[href$='.docx']", "[href$='.doc']"],
            attribute: getAttribute("href"),
        },
        {
            type: 9,
            selectors: ["meta[property='og:title']", "meta[name='twitter:title']"],
            attribute: getAttribute("content"),
        },
    ];

    if (!options) {
        return defaultAttributes;
    }

    if (options.media_enabled) {
        defaultAttributes.push(
            {
                type: 5,
                selectors: ["youtube.com", "youtu.be", "vimeo.com", "dailymotion.com"].map((e) => `iframe[src*='${e}']`),
                attribute: getAttribute("src"),
            },
            {
                type: 6,
                selectors: ["img", "source"],
                attribute: {
                    name: "src",
                    get: (element) => {
                        const src = element.getAttribute("src");
                        if (!src || !src.split) {
                            return "";
                        }
                        if (src.startsWith("data:image")) {
                            return "";
                        }
                        const queryString = src.split("?")[1];
                        element.queryString = queryString;
                        return src.split("?")[0];
                    },
                    set: (element, oldValue, newValue) => {
                        const src = element.getAttribute("src");
                        const srcset = element.getAttribute("srcset");
                        if (oldValue === newValue) {
                            if (element.hasAttribute("wgsrcset")) {
                                element.setAttribute("srcset", element.getAttribute("wgsrcset") || element.dataset.srcset);
                                element.removeAttribute("wgsrcset");
                            }
                        } else if (src.split("?")[0] !== oldValue && newValue !== oldValue) {
                            element.setAttribute("src", oldValue);
                            updateImageSrcset(element, oldValue);
                            if (element.hasAttribute("srcset")) {
                                element.setAttribute("wgsrcset", srcset);
                                element.setAttribute("srcset", "");
                            }
                            element.dataset.wgtranslated = true;
                            element.isChanged = true;
                        }
                    },
                },
            },
            {
                type: 6,
                selectors: ["meta[property='og:image']", "meta[property='og:logo']"],
                attribute: getAttribute("content"),
            },
            {
                type: 6,
                selectors: ["img"],
                attribute: getAttribute("srcset"),
            }
        );
    }

    if (options.translate_aria) {
        defaultAttributes.push({
            type: 1,
            selectors: ["[aria-label]"],
            attribute: getAttribute("aria-label"),
        });
    }

    if (options.external_enabled) {
        const currentHostname = extractDomain(() => {
            const { hostname, search } = window.location;
            if (!isValidHostname(hostname) || !search) {
                return hostname;
            }
            const match = decodeURIComponent(search).match(/url=https?:\/\/([^/]+)/);
            return match ? match[1] : hostname;
        })();
        defaultAttributes.push(
            {
                type: 10,
                selectors: ["iframe"],
                attribute: getAttribute("src"),
            },
            {
                type: 10,
                selectors: ["a[rel=external]"],
                attribute: getAttribute("href"),
            },
            {
                type: 10,
                selectors: ['[href^="mailto"]'],
                attribute: getAttribute("href"),
            },
            {
                type: 10,
                selectors: ['[href^="tel"]'],
                attribute: getAttribute("href"),
            },
            {
                type: 10,
                selectors: ["http:", "https:", "//"].map((e) => `[href^="${e}"]:not(link)`),
                attribute: {
                    name: "href",
                    get: (element) => {
                        if (!element.href || !element.href.split) {
                            return "";
                        }
                        const domain = element.href.split("/")[2];
                        return domain && extractDomain(domain) !== currentHostname ? element.getAttribute("href") : "";
                    },
                    set: (element, newValue) => {
                        element.setAttribute("href", newValue);
                    },
                },
            }
        );
    }

    if (options.extra_definitions && options.extra_definitions.length) {
        for (let i = 0; i < options.extra_definitions.length; i += 1) {
            const extraDefinition = options.extra_definitions[i];
            const type = extraDefinition.type;
            const selector = extraDefinition.selector;
            const attribute = extraDefinition.attribute;
            if (attribute && selector) {
                defaultAttributes.push({
                    type: type,
                    selectors: [selector],
                    attribute: {
                        name: attribute,
                        get: (element) => element.getAttribute(attribute),
                        set: (element, newValue) => element.setAttribute(attribute, newValue),
                    },
                });
            } else {
                console.warn("Each extra definition option needs at least {attribute,selector}", {
                    sendToDatadog: false,
                });
            }
        }
    }

    return defaultAttributes;
}
// Helper function to create a new TextNode
function createTextNode(text) {
    return document.createTextNode(text);
}

// Helper function to set the TextNodes of an element
function setTextNodes(element, textNodes) {
    // Remove all existing child nodes
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // Append the new TextNodes to the element
    textNodes.forEach(function (textNode) {
        element.appendChild(createTextNode(textNode));
    });
}

// Helper function to get all TextNodes of an element
function getTextNodes(element) {
    var textNodes = [];

    function traverse(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node.nodeValue);
        } else {
            for (var i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    }

    traverse(element);
    return textNodes;
}

// Initialize the Weglot object
var Weglot = function (document, options) {
    if (!options || !options.translation_engine) {
        throw "translation_engine is required";
    }

    var config = {
        document: document,
        mergeNodes: [],
        selectorMerging: "",
        mergedSelectorRemove: "",
        extra_merged_selectors: options.extra_merged_selectors || [],
        translation_engine: options.translation_engine,
    };

    // Merge the validTags into mergeNodes based on the translation_engine
    var validTags = {
        version1: [],
        version2: ["ABBR", "ACRONYM", "B", "BDO", "BIG", "CITE", "EM", "I", "KBD", "Q", "SMALL", "STRONG", "SUB", "SUP", "U"],
        version3: ["A", "BDI", "BR", "DEL", "DFN", "INS", "S", "SPAN"]
    };
    validTags.version2.unshift("#text");
    config.mergeNodes = Object.keys(validTags).reduce(function (mergeNodes, version, index) {
        if (config.translation_engine >= index + 1) {
            mergeNodes.push.apply(mergeNodes, validTags[version]);
        }
        return mergeNodes;
    }, []);

    // Set the selectorMerging and mergedSelectorRemove based on the options
    if (Array.isArray(config.extra_merged_selectors)) {
        config.selectorMerging = config.extra_merged_selectors.filter(function (selector) {
            return selector && typeof selector === "string";
        }).join(",");
    }
    if (options.merged_selectors_remove) {
        config.mergedSelectorRemove = options.merged_selectors_remove.map(function (selector) {
            return selector.value;
        }).join(",");
    }

    // Public methods and properties
    return {
        getTextNodes: function (element) {
            return getTextNodes(element);
        },
        setTextNodes: function (element, textNodes) {
            setTextNodes(element, textNodes);
        },
        definitions: [],
    };
};


  var B = i({
      service: "js-library"
  })
    , $ = "https://cdn.weglot.com/projects-settings/"
    , V = "preview.weglot.io"
    , G = "wglang"
    , J = "wg-style-trans"
    , X = "data-wg-notranslate"
    , Y = "wg-translations"
    , K = "wg-slugs"
    , Z = "Shopify"
    , Q = "BigCommerce"
    , ee = "Jimdo"
    , te = "Squarespace"
    , ne = "Wix"
    , re = "Webflow"
    , oe = "Square Online"
    , ae = "Bubble"
    , ie = "Salesforce"
    , se = ["excluded_blocks", "excluded_blocks_remove", "dynamics", "excluded_paths", "dangerously_force_dynamic", "extra_definitions", "translate_event"]
    , ce = ["polyfillReady", "languageChanged", "initialized", "start", "switchersReady"]
    , le = {
      button_style: {
          full_name: !0,
          with_name: !0,
          is_dropdown: !0,
          with_flags: !1,
          flag_type: ""
      },
      switchers: [],
      auto_switch: !1,
      auto_switch_fallback: "",
      excluded_blocks: [],
      excluded_blocks_remove: [],
      whitelist: [],
      translate_event: [{
          selector: "[data-wg-translate-event]",
          eventName: null
      }],
      customer_tag: !1,
      order_tag: !0,
      dynamics: [],
      excluded_paths: [],
      wait_transition: !0,
      hide_switcher: !1,
      translate_search: !1,
      media_enabled: !1,
      search_forms: "",
      cache: !1,
      live: !0,
      loading_bar: !0,
      search_parameter: "",
      translation_engine: 2,
      override_hreflang: !0
  }
    , ue = ["none", "shiny", "square", "circle", "rectangle_mat"]
    , fe = {};
  !function(e) {
      var t = function() {
          try {
              return !!Symbol.iterator
          } catch (e) {
              return !1
          }
      }()
        , n = function(e) {
          var n = {
              next: function() {
                  var t = e.shift();
                  return {
                      done: void 0 === t,
                      value: t
                  }
              }
          };
          return t && (n[Symbol.iterator] = function() {
              return n
          }
          ),
          n
      }
        , r = function(e) {
          try {
              return encodeURIComponent(e).replace(/%20/g, "+")
          } catch (t) {
              return e
          }
      }
        , o = function(e) {
          try {
              return decodeURIComponent(String(e).replace(/\+/g, " "))
          } catch (t) {
              return e
          }
      };
      (function() {
          try {
              var t = e.URLSearchParams;
              return "a=1" === new t("?a=1").toString() && "function" == typeof t.prototype.set && "function" == typeof t.prototype.entries
          } catch (e) {
              return !1
          }
      }
      )() || function() {
          var o = function(e) {
              Object.defineProperty(this, "_entries", {
                  writable: !0,
                  value: {}
              });
              var t = typeof e;
              if ("undefined" === t)
                  ;
              else if ("string" === t)
                  "" !== e && this._fromString(e);
              else if (e instanceof o) {
                  var n = this;
                  e.forEach((function(e, t) {
                      n.append(t, e)
                  }
                  ))
              } else {
                  if (null === e || "object" !== t)
                      throw new TypeError("Unsupported input's type for URLSearchParams");
                  if ("[object Array]" === Object.prototype.toString.call(e))
                      for (var r = 0; r < e.length; r++) {
                          var a = e[r];
                          if ("[object Array]" !== Object.prototype.toString.call(a) && 2 === a.length)
                              throw new TypeError("Expected [string, any] as entry at index " + r + " of URLSearchParams's input");
                          this.append(a[0], a[1])
                      }
                  else
                      for (var i in e)
                          e.hasOwnProperty(i) && this.append(i, e[i])
              }
          }
            , a = o.prototype;
          a.append = function(e, t) {
              e in this._entries ? this._entries[e].push(String(t)) : this._entries[e] = [String(t)]
          }
          ,
          a.delete = function(e) {
              delete this._entries[e]
          }
          ,
          a.get = function(e) {
              return e in this._entries ? this._entries[e][0] : null
          }
          ,
          a.getAll = function(e) {
              return e in this._entries ? this._entries[e].slice(0) : []
          }
          ,
          a.has = function(e) {
              return e in this._entries
          }
          ,
          a.set = function(e, t) {
              this._entries[e] = [String(t)]
          }
          ,
          a.forEach = function(e, t) {
              var n;
              for (var r in this._entries)
                  if (this._entries.hasOwnProperty(r)) {
                      n = this._entries[r];
                      for (var o = 0; o < n.length; o++)
                          e.call(t, n[o], r, this)
                  }
          }
          ,
          a.keys = function() {
              var e = [];
              return this.forEach((function(t, n) {
                  e.push(n)
              }
              )),
              n(e)
          }
          ,
          a.values = function() {
              var e = [];
              return this.forEach((function(t) {
                  e.push(t)
              }
              )),
              n(e)
          }
          ,
          a.entries = function() {
              var e = [];
              return this.forEach((function(t, n) {
                  e.push([n, t])
              }
              )),
              n(e)
          }
          ,
          t && (a[Symbol.iterator] = a.entries),
          a.toString = function() {
              var e = [];
              return this.forEach((function(t, n) {
                  e.push(r(n) + "=" + r(t))
              }
              )),
              e.join("&")
          }
          ,
          e.URLSearchParams = o
      }();
      var a = e.URLSearchParams.prototype;
      "function" != typeof a.sort && (a.sort = function() {
          var e = this
            , t = [];
          this.forEach((function(n, r) {
              t.push([r, n]),
              e._entries || e.delete(r)
          }
          )),
          t.sort((function(e, t) {
              return e[0] < t[0] ? -1 : e[0] > t[0] ? 1 : 0
          }
          )),
          e._entries && (e._entries = {});
          for (var n = 0; n < t.length; n++)
              this.append(t[n][0], t[n][1])
      }
      ),
      "function" != typeof a._fromString && Object.defineProperty(a, "_fromString", {
          enumerable: !1,
          configurable: !1,
          writable: !1,
          value: function(e) {
              if (this._entries)
                  this._entries = {};
              else {
                  var t = [];
                  this.forEach((function(e, n) {
                      t.push(n)
                  }
                  ));
                  for (var n = 0; n < t.length; n++)
                      this.delete(t[n])
              }
              var r, a = (e = e.replace(/^\?/, "")).split("&");
              for (n = 0; n < a.length; n++)
                  r = a[n].split("="),
                  this.append(o(r[0]), r.length > 1 ? o(r[1]) : "")
          }
      })
  }(fe),
  function(e) {
      if (function() {
          try {
              var t = new e.URL("b","http://a");
              return t.pathname = "c d",
              "http://a/c%20d" === t.href && t.searchParams
          } catch (e) {
              return !1
          }
      }() || function() {
          var t = e.URL
            , n = function(t, n) {
              "string" != typeof t && (t = String(t)),
              n && "string" != typeof n && (n = String(n));
              var r, o = document;
              if (n && (void 0 === e.location || n !== e.location.href)) {
                  n = n.toLowerCase(),
                  (r = (o = document.implementation.createHTMLDocument("")).createElement("base")).href = n,
                  o.head.appendChild(r);
                  try {
                      if (0 !== r.href.indexOf(n))
                          throw new Error(r.href)
                  } catch (e) {
                      throw new Error("URL unable to set base " + n + " due to " + e)
                  }
              }
              var a = o.createElement("a");
              a.href = t,
              r && (o.body.appendChild(a),
              a.href = a.href);
              var i = o.createElement("input");
              if (i.type = "url",
              i.value = t,
              ":" === a.protocol || !/:/.test(a.href) || !i.checkValidity() && !n)
                  throw new TypeError("Invalid URL");
              Object.defineProperty(this, "_anchorElement", {
                  value: a
              });
              var s = new e.URLSearchParams(this.search)
                , c = !0
                , l = !0
                , u = this;
              ["append", "delete", "set"].forEach((function(e) {
                  var t = s[e];
                  s[e] = function() {
                      t.apply(s, arguments),
                      c && (l = !1,
                      u.search = s.toString(),
                      l = !0)
                  }
              }
              )),
              Object.defineProperty(this, "searchParams", {
                  value: s,
                  enumerable: !0
              });
              var f = void 0;
              Object.defineProperty(this, "_updateSearchParams", {
                  enumerable: !1,
                  configurable: !1,
                  writable: !1,
                  value: function() {
                      this.search !== f && (f = this.search,
                      l && (c = !1,
                      this.searchParams._fromString(this.search),
                      c = !0))
                  }
              })
          }
            , r = n.prototype;
          ["hash", "host", "hostname", "port", "protocol"].forEach((function(e) {
              !function(e) {
                  Object.defineProperty(r, e, {
                      get: function() {
                          return this._anchorElement[e]
                      },
                      set: function(t) {
                          this._anchorElement[e] = t
                      },
                      enumerable: !0
                  })
              }(e)
          }
          )),
          Object.defineProperty(r, "search", {
              get: function() {
                  return this._anchorElement.search
              },
              set: function(e) {
                  this._anchorElement.search = e,
                  this._updateSearchParams()
              },
              enumerable: !0
          }),
          Object.defineProperties(r, {
              toString: {
                  get: function() {
                      var e = this;
                      return function() {
                          return e.href
                      }
                  }
              },
              href: {
                  get: function() {
                      return this._anchorElement.href.replace(/\?$/, "")
                  },
                  set: function(e) {
                      this._anchorElement.href = e,
                      this._updateSearchParams()
                  },
                  enumerable: !0
              },
              pathname: {
                  get: function() {
                      return this._anchorElement.pathname.replace(/(^\/?)/, "/")
                  },
                  set: function(e) {
                      this._anchorElement.pathname = e
                  },
                  enumerable: !0
              },
              origin: {
                  get: function() {
                      var e = {
                          "http:": 80,
                          "https:": 443,
                          "ftp:": 21
                      }[this._anchorElement.protocol]
                        , t = this._anchorElement.port != e && "" !== this._anchorElement.port;
                      return this._anchorElement.protocol + "//" + this._anchorElement.hostname + (t ? ":" + this._anchorElement.port : "")
                  },
                  enumerable: !0
              },
              password: {
                  get: function() {
                      return ""
                  },
                  set: function(e) {},
                  enumerable: !0
              },
              username: {
                  get: function() {
                      return ""
                  },
                  set: function(e) {},
                  enumerable: !0
              }
          }),
          n.createObjectURL = function(e) {
              return t.createObjectURL.apply(t, arguments)
          }
          ,
          n.revokeObjectURL = function(e) {
              return t.revokeObjectURL.apply(t, arguments)
          }
          ,
          e.URL = n
      }(),
      void 0 !== e.location && !("origin"in e.location)) {
          var t = function() {
              return e.location.protocol + "//" + e.location.hostname + (e.location.port ? ":" + e.location.port : "")
          };
          try {
              Object.defineProperty(e.location, "origin", {
                  get: t,
                  enumerable: !0
              })
          } catch (n) {
              setInterval((function() {
                  e.location.origin = t()
              }
              ), 100)
          }
      }
  }(fe);
  var de = fe.URL
    , ge = function(e, t) {
      return function(n, r) {
          if (!n || !n[e] || !r)
              return t;
          try {
              return n[e](r)
          } catch (e) {
              B.error(e, {
                  consoleOverride: "The CSS selectors that you provided are incorrect: " + r,
                  sendToDatadog: !1
              })
          }
          return t
      }
  }
    , pe = ge("querySelectorAll", [])
    , _e = ge("querySelector", null)
    , he = ge("closest", null)
    , me = function(e) {
      return document.getElementById(e)
  };
  function ve(e) {
      e && e.parentNode && e.parentNode.removeChild(e)
  }
  function ye(e) {
      e = "" + e;
      return ["&nbsp;", "&amp;", "&quot;", "&lt;", "&gt;"].some((function(t) {
          return -1 !== e.indexOf(t)
      }
      )) ? e.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">") : e
  }
  function we(e) {
      var t = window.location.search.slice(1).split("&").map((function(e) {
          return e && e.split("=")
      }
      )).find((function(t) {
          return t[0] === e
      }
      ));
      return t && t[1]
  }
  function be() {
      try {
          if (window.frameElement || window.self !== window.top)
              return "with-window-top"
      } catch (e) {
          return "no-window-top"
      }
  }
  function ke(e, t) {
      var n = document.createElement("style");
      ve(me(t)),
      n.id = t,
      n.type = "text/css",
      n.styleSheet ? n.styleSheet.cssText = e : n.appendChild(document.createTextNode(e)),
      document.head && document.head.appendChild(n)
  }
  var xe = function() {
      return /google|facebook|bing|yahoo|baidu|yandex|lighthouse/i.test(navigator.userAgent)
  };
  function Ee(e) {
      try {
          document.createDocumentFragment().querySelector(e)
      } catch (e) {
          return !1
      }
      return !0
  }
  var Ce = function(e, t, n) {
      var r = new de(e,location.href);
      return r.searchParams.set(t, n),
      "" + r.pathname + r.search
  };
  function Oe(e) {
      "loading" !== document.readyState ? e() : document.addEventListener("DOMContentLoaded", (function() {
          return e()
      }
      ))
  }
  var Se = function(e, t) {
      var n;
      return void 0 === t && (t = 1e3),
      function() {
          for (var r = this, o = [], a = arguments.length; a--; )
              o[a] = arguments[a];
          clearTimeout(n),
          n = setTimeout((function() {
              e.apply(r, o)
          }
          ), t)
      }
  }
    , Le = function(e) {
      var t = (new Date).getTime().toString();
      try {
          var n = e.contentWindow;
          return n[t] = "asd",
          "asd" === n[t]
      } catch (e) {
          return !1
      }
  };
  var Ne = {}
    , Te = function(e, t) {
      Ne[e] || (Ne[e] = []),
      Ne[e].push(t)
  }
    , je = function(e, t) {
      if (Ne[e])
          for (var n = 0, r = Ne[e]; n < r.length; n += 1) {
              (0,
              r[n])(t)
          }
  };
  var Ae = [];
  function Re(e, t, n) {
      if (e)
          return n();
      Pe(t, n, !0)
  }
  function Pe(e, t, n) {
      return "function" != typeof t ? (B.error("You should provide a callback function as second argument", {
          sendToDatadog: n
      }),
      !1) : !n && ce.indexOf(e) < 0 ? (B.error("No Weglot event is named " + e, {
          sendToDatadog: !1
      }),
      !1) : (Ae.push({
          name: e,
          callback: t,
          internal: n
      }),
      !0)
  }
  function Ie(e) {
      for (var t = [], n = arguments.length - 1; n-- > 0; )
          t[n] = arguments[n + 1];
      for (var r = Ae.filter((function(t) {
          return t.name === e
      }
      )), o = 0, a = r; o < a.length; o += 1) {
          var i = a[o];
          try {
              i.callback.apply(i, t)
          } catch (e) {
              if (i.internal)
                  throw e;
              B.error("Error triggering callback function: " + e, {
                  sendToDatadog: !1
              })
          }
      }
  }
  function De() {
      if (!u(window.location.hostname) || !document.baseURI) {
          var e = window.location;
          return {
              url: e.href,
              hostname: e.hostname,
              pathname: e.pathname,
              search: e.search
          }
      }
      var t = new de(document.baseURI)
        , n = t.hostname
        , r = t.pathname
        , o = t.search;
      return {
          url: document.baseURI,
          hostname: n,
          pathname: r,
          search: o
      }
  }
  var Fe = De();
  Re(Ia && Object.keys(Ia).length > 0, "onOptionsReady", (function() {
      if (Ia.dynamicPushState) {
          var e = history.pushState;
          history.pushState = function() {
              for (var t = [], n = arguments.length; n--; )
                  t[n] = arguments[n];
              e.apply(history, t);
              var r = De();
              Fe.hostname = r.hostname,
              Fe.pathname = r.pathname,
              Fe.url = r.url,
              Ie("onCurrentLocationChanged")
          }
      }
  }
  ));
  var Ue, We = {};
  function He(e) {
      var t = 1;
      return e.replace(/\((.*?)\)/g, (function() {
          return "$" + t++
      }
      ))
  }
  function Me() {
      var e = Fe.pathname
        , t = Ia.localeRules;
      void 0 === t && (t = []);
      var n = Ia.languages
        , r = {
          position: 0,
          translatedFormat: "CODE",
          originalFormat: "",
          addedByDefault: !0
      }
        , o = Ia.language_from;
      if (t.length) {
          var a = [];
          t.map((function(e) {
              var t = e.position
                , n = e.translatedFormat;
              n && "CODE" !== n && a.push(t || 0)
          }
          ));
          var i = a.filter((function(e, t, n) {
              return n.indexOf(e) === t
          }
          )).map((function(e) {
              return Object.assign({}, r, {
                  position: e
              })
          }
          ));
          t.unshift.apply(t, i)
      } else
          t.push(r);
      var s = null
        , c = null
        , l = t.find((function(t) {
          var r = t.position;
          void 0 === r && (r = 0);
          var a = t.translatedFormat;
          void 0 === a && (a = "CODE");
          var i = t.originalFormat;
          void 0 === i && (i = "");
          var l = t.addedByDefault;
          if (!a.includes("CODE"))
              return !1;
          var u = e.split("/");
          if (u.length <= r)
              return !1;
          var f = u[r + 1]
            , d = n.find((function(e) {
              var t = e.custom_code || e.language_to
                , n = a.replace("CODE", t)
                , r = new RegExp("^" + n + "$","g");
              return !!r.test(f) && (c = r,
              !0)
          }
          ));
          if (d)
              return s = d.custom_code || d.language_to,
              !0;
          if (i) {
              var g = i.replace("CODE", o);
              return new RegExp("^" + g + "$","g").test(f)
          }
          return !l
      }
      )) || r;
      return We.convertLocale = function(t, n, r, a) {
          if (void 0 === n && (n = e),
          void 0 === r && (r = s || o),
          void 0 === a && (a = null),
          r === t)
              return n;
          var i = l.position;
          void 0 === i && (i = 0);
          var u = l.originalFormat;
          void 0 === u && (u = "");
          var f = l.translatedFormat;
          void 0 === f && (f = "CODE");
          var d = n.split("/");
          if (d.length <= i)
              return n;
          var g = d[i + 1];
          if (r === o) {
              var p = f.replace(/CODE/g, t)
                , _ = !1;
              if (u) {
                  var h = u.replace(/CODE/g, o)
                    , m = new RegExp("^" + h + "$","g")
                    , v = He(p);
                  p = g.replace(m, v),
                  a && !m.test(g) && (_ = !0,
                  p = a.split("/")[i + 1])
              }
              var y = u && !_ ? 2 : 1;
              return d.slice(0, i + 1).concat([p], d.slice(i + y)).join("/")
          }
          if (t === o && !u)
              return d.slice(0, i + 1).concat(d.slice(i + 2)).join("/");
          var w = He((t === o ? u : f).replace(/CODE/g, t))
            , b = g.replace(c, w);
          return d.slice(0, i + 1).concat([b], d.slice(i + 2)).join("/")
      }
      ,
      We.language = s || o,
      We
  }
  function qe() {
      var e = Fe.hostname
        , t = Ia.languages.find((function(t) {
          return t.connect_host_destination && t.connect_host_destination.host === e
      }
      ));
      return t ? t.custom_code || t.language_to : Ia.language_from
  }
  function ze() {
      return Me().language
  }
  function Be() {
      if (Ue)
          return Ue;
      if (Ia.is_connect) {
          var e = document.documentElement.dataset.wgTranslated;
          return e ? (Ue = e,
          e) : Ue = Ia.subdirectory ? ze() : qe()
      }
      return Ue = Ia.language_from
  }
  function $e(e, t) {
      var n = t;
      n || (n = Be());
      for (var r = 0, o = e; r < o.length; r += 1) {
          var a = o[r];
          if (!a || !a.dataset || !a.dataset.wgOnlyDisplay)
              return;
          a.hidden = a.dataset.wgOnlyDisplay !== n
      }
  }
  Pe("onCurrentLocationChanged", (function() {
      We = {}
  }
  ), !0);
  var Ve = {
      getItem: function(e) {
          return z.get(e)
      },
      setItem: function(e, t, n) {
          void 0 === n && (n = {});
          var r = n.domain
            , o = n.path
            , a = n.expires;
          z.set({
              name: e,
              value: t,
              domain: r,
              path: o,
              expires: a,
              options: Ia
          })
      },
      removeItem: function(e) {
          return z.erase({
              name: e,
              options: Ia
          })
      }
  }
    , Ge = {
      getItem: function() {},
      setItem: function() {},
      removeItem: function() {}
  };
  function Je(e) {
      void 0 === e && (e = {});
      var t = e.type || "local";
      try {
          return "cookie" === t ? Ve : window[t + "Storage"]
      } catch (e) {}
      return e.type ? Ge : Je({
          type: "local" === t ? "cookie" : "local"
      })
  }
  var Xe = {
      slugs: {},
      version: 0,
      network: void 0
  };
  function Ye() {
      return new Promise((function(e) {
          for (var t = Ia.languages, n = {}, r = function() {
              var r = a[o]
                , i = r.custom_code
                , s = r.language_to;
              (function(e) {
                  var t = Ia.api_key
                    , n = Ia.versions;
                  if (!n || !n.slugTranslation)
                      return Promise.resolve({});
                  var r = "https://cdn-api-weglot.com/translations/slugs?api_key=" + t + "&language_to=" + e + "&v=" + n.slugTranslation;
                  return fetch(r).then((function(e) {
                      return e.json()
                  }
                  )).then((function(e) {
                      return Array.isArray(e) ? {} : e
                  }
                  )).catch((function(e) {
                      return B.error(e),
                      {}
                  }
                  ))
              }
              )(s).then((function(r) {
                  n[i || s] = r,
                  Object.keys(n).length === t.length && e(n)
              }
              ))
          }, o = 0, a = t; o < a.length; o += 1)
              r()
      }
      ))
  }
  function Ke(e) {
      return e ? Object.keys(e).reduce((function(t, n) {
          return t[n] = function(e) {
              return Object.keys(e).reduce((function(t, n) {
                  return e[n] && (t.original[n] = e[n],
                  t.translated[e[n]] = n),
                  t
              }
              ), {
                  original: {},
                  translated: {}
              })
          }(e[n]),
          t
      }
      ), {}) : {}
  }
  function Ze(e) {
      var t = Ia.versions;
      if (t && t.slugTranslation) {
          var n = t.slugTranslation;
          Xe.version < n && (Xe.network ? Xe.network.resolved || Xe.network.then((function(t) {
              return e(Ke(t))
          }
          )) : Xe.network = Ye().then((function(t) {
              return Xe.network.resolved = !0,
              function(e) {
                  var t = Ia.versions
                    , n = {
                      version: t ? t.slugTranslation : 1,
                      slugs: e
                  };
                  try {
                      var r = Je({
                          type: "local"
                      });
                      r && r.setItem(K, JSON.stringify(n))
                  } catch (e) {
                      B.warn(e)
                  }
                  Xe = Object.assign({}, Xe, n)
              }(t),
              e(Ke(t)),
              t
          }
          )).catch((function() {
              return e({}),
              {}
          }
          ))),
          e(Ke(Xe.slugs))
      } else
          e({})
  }
  !function() {
      if (Object.keys(Xe.slugs).length)
          return Xe.slugs;
      try {
          var e = Je({
              type: "local"
          });
          if (!e)
              return {};
          var t = e.getItem(K);
          t && (Object.assign(Xe, JSON.parse(t)),
          Xe.slugs)
      } catch (e) {
          return {}
      }
  }();
  var Qe = {};
  function et(e, t) {
      return e.split("/").map((function(e) {
          return t[decodeURIComponent(e)] || e
      }
      )).join("/")
  }
  function tt(e, t) {
      Ia.auto_switch && (Ia.is_tld || Ia.rendered) && (e === Ia.language_from ? t.searchParams.set("no_redirect", "true") : t.searchParams.delete("no_redirect"))
  }
  function nt(e, t) {
      var n = Be()
        , r = new de(Fe.url);
      Ia.visual_editor && r.searchParams.has("url") && (r = new de(r.searchParams.get("url"))),
      r.searchParams.has("lang") && r.searchParams.delete("lang"),
      tt(e, r);
      var o = function(e) {
          if (Ia.subdirectory)
              return !1;
          var t = Ia.language_from
            , n = Ia.host
            , r = Ia.languages;
          if (e === t)
              return n;
          var o = r.find((function(t) {
              return t.custom_code === e || t.language_to === e
          }
          )) || {}
            , a = o.connect_host_destination;
          return a && a.host
      }(e);
      return o && (r.hostname = o),
      r.pathname = function(e, t, n, r) {
          if (!Object.keys(e).length)
              return t;
          if (!Qe.originalPath)
              if (n !== Ia.language_from && e[n]) {
                  var o = e[n].translated;
                  Qe.originalPath = et(t, o)
              } else
                  Qe.originalPath = t;
          return r === Ia.language_from ? Qe.originalPath : e[r] && e[r].original ? et(Qe.originalPath, e[r].original) : t
      }(t, r.pathname, n, e),
      Ia.subdirectory && e && (r.pathname = Me().convertLocale(e, r.pathname)),
      r.toString()
  }
  function rt(e, t) {
      if (!Ia.is_connect || !e)
          return t("#");
      var n = Ia.dynamicPushState
        , r = Ia.injectedData;
      void 0 === r && (r = {});
      var o = r.allLanguageUrls;
      if (void 0 === o && (o = {}),
      !n && o && o[e]) {
          var a = new de(o[e]);
          return tt(e, a),
          t(a.toString())
      }
      Ze((function(n) {
          return t(nt(e, n))
      }
      ))
  }
  Pe("onCurrentLocationChanged", (function() {
      Qe = {}
  }
  ), !0);
  var ot = {};
  function at() {
      var e = Ia.host;
      return void 0 === e && (e = window.location.hostname),
      0 === e.indexOf("www.") ? e.slice(3) : "." + e
  }
  function it() {
      var e = document.cookie.match(/(^cart=[^;]+|[\W]cart=[^;]+)/g);
      if (e) {
          var t = e.map((function(e) {
              return e.split("=").pop()
          }
          ));
          1 !== t.length && t[0] === t[1] || z.set({
              name: "cart",
              value: t[0],
              domain: at(),
              options: Ia
          })
      } else
          setTimeout(it, 100)
  }
  function st(e) {
      var t = "/checkout?locale=" + e + (Ia.shopify_skip_shop_pay ? "&skip_shop_pay=true" : "");
      fetch(t).then((function(e) {
          document.location.href = encodeURI(e.url)
      }
      )).catch((function() {
          document.location.href = encodeURI(t)
      }
      ))
  }
  function ct(e) {
      var t = e || Be()
        , n = lt(t)
        , r = [{
          name: "locale",
          value: n
      }].concat(Ia.shopify_skip_shop_pay ? [{
          name: "skip_shop_pay",
          value: "true"
      }] : []);
      [{
          name: "action",
          selector: ['form[method="post"][action*="/cart"]', 'form[method="post"][action*="/checkout"]'],
          testRegex: /\/(cart|checkout|)\/?(\?|$)/,
          event: "submit"
      }, {
          name: "href",
          selector: ['a[href*="/checkout"]', 'a[href*="/cart/checkout"]'],
          testRegex: /\/(cart\/)?checkout\/?(\?|$)/,
          event: "click"
      }].forEach((function(e) {
          for (var o = e.name, a = e.selector, i = e.testRegex, s = e.event, c = document.querySelectorAll(a.join(",")), l = function() {
              var e = f[u]
                , a = e.getAttribute(o);
              if (i.test(a) && !r.every((function(e) {
                  return a.includes(e.name + "=" + e.value)
              }
              ))) {
                  for (var c = 0, l = r; c < l.length; c += 1) {
                      var d = l[c];
                      a = Ce(a, d.name, d.value)
                  }
                  e.setAttribute(o, a),
                  e.wgCheckoutListener && e.removeEventListener(s, e.wgCheckoutListener),
                  t !== Ia.language_from && Ia.fix_shopify_checkout_locale && (e.wgCheckoutListener = function(e) {
                      return e.preventDefault(),
                      e.stopPropagation(),
                      Ia.is_connect && !Ia.subdirectory ? (Je({
                          type: "cookie"
                      }).setItem("wg_checkout_redirect", t),
                      document.location.href = encodeURI((Ia.is_https ? "https:" : "http:") + "//" + Ia.host)) : st(n),
                      !1
                  }
                  ,
                  e.addEventListener(s, e.wgCheckoutListener))
              }
          }, u = 0, f = c; u < f.length; u += 1)
              l()
      }
      ))
  }
  function lt(e) {
      var t = {
          pt: "pt-PT",
          ro: "ro-RO",
          fl: "fil",
          zh: "zh-CN",
          tw: "zh-TW"
      };
      return t[e] ? t[e] : e.substr(0, 2)
  }
  function ut(e) {
      var t, n, r, o = e || Be(), a = document.getElementById("create_customer") || document.querySelector('form[action="' + (t = o,
      n = "/account",
      (Ia.is_connect && t !== Ia.language_from ? ot[n] ? ot[n] : (Ze((function(e) {
          var o = e && e[t] ? et(n, e[t].original) : n;
          r = Ia.subdirectory ? Me().convertLocale(t, o, Ia.language_from) : o
      }
      )),
      ot[n] = r,
      r) : n) + '"]')) || "string" == typeof Ia.customer_tag && _e(document, Ia.customer_tag);
      if (a) {
          var i = document.getElementById("weglot-lang-form");
          i && i.parentNode.removeChild(i);
          var s = document.createElement("input");
          Object.assign(s, {
              type: "hidden",
              id: "weglot-lang-form",
              name: "customer[tags]",
              value: "#wg" + o + "#wg"
          }),
          a.appendChild(s)
      }
  }
  function ft(e) {
      var t = function() {
          var e = document.getElementById("shopify-features");
          if (!e)
              return null;
          var t = e.textContent.match(/"shopId":(\d*)/);
          return t ? t[1] : null
      }();
      t && z.set({
          name: "checkout_locale",
          value: lt(e),
          path: t,
          options: Ia
      })
  }
  function dt(e) {
      var t = e || Be();
      if (!Ia.visual_editor && !be()) {
          var n = Ia.cart_attributes
            , r = Ia.is_connect
            , o = Ia.original_shopify_checkout
            , a = Ia.subdirectory
            , i = Ia.language_from
            , s = Je({
              type: "cookie"
          }).getItem("cart")
            , c = Je({
              type: "session"
          }).getItem("wg-cart-update-token");
          if (Je({
              type: "session"
          }).getItem("wg-cart-update-lang") !== lt(t) || s !== c) {
              var l = n.map((function(e) {
                  return "attributes[" + e + "]=" + lt(t)
              }
              )).join("&")
                , u = fetch("/cart/update.js", {
                  method: "POST",
                  body: l,
                  headers: {
                      "Content-Type": "application/x-www-form-urlencoded"
                  },
                  credentials: "same-origin"
              });
              !1 !== o && r && !a && i === Be() && u.then((function(e) {
                  return e.json()
              }
              )).then((function(e) {
                  var t = e.token;
                  return z.set({
                      name: "cart",
                      value: t,
                      domain: at(),
                      options: Ia
                  })
              }
              )),
              Je({
                  type: "session"
              }).setItem("wg-cart-update-token", s),
              Je({
                  type: "session"
              }).setItem("wg-cart-update-lang", lt(t))
          }
          for (var f = document.querySelectorAll('a[href*="/cart/"]'), d = "attributes[lang]=" + t, g = 0, p = f; g < p.length; g += 1) {
              var _ = p[g]
                , h = _.getAttribute("href");
              if (h) {
                  var m = h.match(/\/cart\/\d+:\d+(\?)?/);
                  m && (h = h.replace(/&?attributes\[lang\]=([a-zA-Z-]+)/g, ""),
                  _.setAttribute("href", h + (m[1] ? "&" : "?") + d))
              }
          }
      }
  }
  function gt(e) {
      if (Ia.language_from !== e) {
          window.Shopify && (window.Shopify.locale = e),
          !xe() && Ia.order_tag && dt(e),
          ct(e),
          ft(e);
          var t = document.querySelectorAll("[data-wg-only-display]");
          t.length && $e(t, e),
          Ia.customer_tag && ut(e)
      }
  }
  Pe("onCurrentLocationChanged", (function() {
      ot = {}
  }
  ), !0);
  var pt = ["#isp_search_result_page_container", ".snize-ac-results", "#snize_results", ".snize-recommendation", ".snize-modal", ".snize-search-results-header", "div>span.cc-message", ".hc-widget", ".jdgm-rev-widg__header", ".jdgm-rev__body", ".jdgm-rev-title", ".yotpo-main-widget", "#swell-popup", ".swell-tab", ".yotpo-widget-override-css", ".cw-row", ".mini-popup-container", "email-field cw-form-control", "phone-field cw-form-control", ".sms-policy-text", ".wlo-content-holder", ".wlo-wheel-holder", ".yotpo-smsbump-modal__content", ".cw-compliance-text", "#saso-notifications", ".saso-cross-sell-popup", ".saso-cart-item-discount-notes", ".saso-cart-item-upsell-notes", ".saso-volume-discount-tiers", ".opw-leading-normal", ".opw-my-2.opw-leading-normal.opw-text-lg.opw-text-left", ".opinew-navbar.opw-flex.opw-items-center.opw-justify-between.opw-flex-wrap.opw-py-4.opw-px-6", ".main-content-container.opw--mx-1", ".opw-text-center.opw-text-sm.opw-border-solid.opw-border-0.opw-mt-3", ".summary-card-container.opw-mx-1", ".opw-reviews-container.opw-mt-3.opw--mx-1", ".opinew-reviews-title.opw-flex.opw-items-center.opw-flex-no-shrink.opw-mr-6", ".opw-flex.opw-flex-row-reverse", "#opinew-app-container", ".gem_dynamic-content", ".pp_tracking_content", ".pp_all_form_div", ".pp_tracking_result_title", ".progress-bar-style", ".pp_tracking_left", ".pp_num_status_show", ".pp_tracking_status_tips", ".pp_page_map_div", ".pp_tracking_result_parent", ".pp_tracking_right", ".pp_recommend_product_parent", ".currency-converter-cart-note", ".cbb-shipping-rates-calculator", ".cbb-frequently-bought-container", ".cbb-frequently-bought-discount-applied-message", ".cbb-also-bought-container", "#zonos", ".buddha-menu-item", ".R-GlobalModal", ".ruk-rating-snippet-count", ".R-ContentList-container", ".R-ReviewsList-container", ".R-SliderIndicator-group", ".R-TextBody", ".widgetId-reviewsio-carousel-widget", ".REVIEWSIO-FloatingMinimised", ".REVIEWSIO-FloatingMinimised__Container", ".reviewsio-carousel-widget", ".reviews-io-floating-widget", ".reviews_container", ".site-nav.style--sidebar .site-nav-container .subtitle", ".search-more", ".variant-quantity", ".lion-claimed-rewards-list", ".lion-header", ".lion-header__join-buttons", ".lion-header__join-today", ".lion-history-table", ".lion-integrated-page-section__heading-text", ".lion-loyalty-panel", ".lion-loyalty-splash", ".lion-loyalty-widget", ".lion-modal__content", ".lion-modal__header", ".lion-referral-widget", ".lion-rewards-list", ".lion-rules-list", ".lion-tier-overview", ".ccpops-popup__content__bottom-text", ".ccpops-popup__content__top-text", ".ccpops-trigger__text", ".ks-table-row", ".klaviyo-form"];
  function _t(e) {
      if (e && e.toLowerCase) {
          var t = e.toLowerCase()
            , n = Ia.languages.find((function(e) {
              var n = e.language_to
                , r = e.custom_code;
              return n === t || (r ? r.toLowerCase() === t : void 0)
          }
          ));
          return n ? n.language_to : e
      }
  }
  var ht, mt = {};
  function vt(e) {
      return {
          START_WITH: function(t) {
              return 0 === e.indexOf(t)
          },
          NOT_START_WITH: function(t) {
              return 0 !== e.indexOf(t)
          },
          END_WITH: function(t) {
              return -1 !== e.indexOf(t, e.length - t.length)
          },
          NOT_END_WITH: function(t) {
              return -1 === e.indexOf(t, e.length - t.length)
          },
          CONTAIN: function(t) {
              return -1 !== e.indexOf(t)
          },
          NOT_CONTAIN: function(t) {
              return -1 === e.indexOf(t)
          },
          IS_EXACTLY: function(t) {
              return e === t
          },
          NOT_IS_EXACTLY: function(t) {
              return e !== t
          },
          MATCH_REGEX: function(t) {
              try {
                  return new RegExp(t,"i").test(e)
              } catch (e) {
                  return B.warn(e, {
                      consoleOverride: t + " is an invalid regex",
                      sendToDatadog: !1
                  }),
                  !1
              }
          }
      }
  }
  function yt(e) {
      var t = Ia.excluded_paths
        , n = Fe.pathname;
      if (n = n.toLowerCase(),
      "shopify.weglot.com" === window.location.host || !t || !t.length)
          return !1;
      if ("string" == typeof t && t.split(",").some((function(e) {
          return new RegExp(e,"i").test(n)
      }
      )))
          return {
              allExcluded: !0,
              language_button_displayed: !0
          };
      var r = e || _t(Be());
      return void 0 !== mt[r] && mt.currentLang === r || (mt.currentLang = r,
      Ia.injectedData && Ia.injectedData.originalPath && (n = Ia.injectedData.originalPath.toLowerCase()),
      t.some((function(e) {
          var t = e.type
            , o = e.value
            , a = e.excluded_languages
            , i = e.language_button_displayed
            , s = e.regex;
          o = o.toLowerCase();
          var c = {
              language_button_displayed: i,
              allExcluded: !(!a || !(0 === a.length || a.length >= Ia.languages.length))
          };
          if (a && a.length && !a.includes(r))
              return !1;
          var l = vt(n);
          if (s && !t.startsWith("NOT") ? l.MATCH_REGEX(s) : l[t](o))
              return mt[r] = c,
              !0;
          var u = n;
          try {
              u = decodeURIComponent(n)
          } catch (e) {
              return
          }
          if (u !== n) {
              var f = vt(u);
              return (s && !t.startsWith("NOT") ? f.MATCH_REGEX(s) : f[t](o)) ? (mt[r] = c,
              !0) : void 0
          }
      }
      ))),
      mt[r]
  }
  function wt() {
      if (ht)
          return ht;
      if (!Ia.api_key)
          return B.warn("Weglot must be initialized to use it.", {
              sendToDatadog: !1
          }),
          [];
      var e = (Ia.languages || []).filter((function(e) {
          var t = yt(e.language_to)
            , n = !t || t.language_button_displayed;
          return (!1 !== e.enabled || Ia.private_mode) && n && (Ia.subdirectory || !Ia.is_connect || e.connect_host_destination && e.connect_host_destination.created_on_aws)
      }
      )).map((function(e) {
          return e.custom_code || e.language_to
      }
      ))
        , t = [Ia.language_from].concat(e);
      return ht = t.filter((function(e, n) {
          return e && t.indexOf(e) == n
      }
      )),
      e.length || B.log("No public language available.", {
          sendToDatadog: !1
      }),
      ht
  }
  function bt() {
      var e = Je().getItem(G);
      if (e && wt().includes(e))
          return e
  }
  Pe("onCurrentLocationChanged", (function() {
      mt = {}
  }
  ), !0),
  Pe("onCurrentLocationChanged", (function() {
      ht = null
  }
  ), !0);
  var kt = function(e) {
      return e && Je().setItem(G, e)
  }
    , xt = [{
      condition: [{
          type: "TECHNOLOGY_ID",
          payload: 2
      }],
      value: [{
          original: "^/checkouts/(?:[\\w]{32})(/.*)?$",
          formatted: "/checkouts$1"
      }, {
          original: "^/account/(orders|activate)/(?:[\\w]{32})$",
          formatted: "/account/$1/"
      }, {
          original: "^/orders/(?:[\\w]{32})$",
          formatted: "/orders/"
      }, {
          original: "^/wallets/checkouts/(?:.*)$",
          formatted: "/wallets/checkouts/"
      }, {
          original: "^/(.+)\\.(json|xml)$",
          formatted: "/$1"
      }]
  }]
    , Et = !1
    , Ct = {}
    , Ot = {}
    , St = Je({
      type: "local"
  });
  if (St.getItem(Y))
      try {
          Ct = JSON.parse(St.getItem(Y)),
          Object.keys(Ct).forEach((function(e) {
              Object.keys(Ct[e]).forEach((function(t) {
                  if (2 === t.length) {
                      Ot[t] || (Ot[t] = {});
                      var n = Ct[e][t];
                      Ot[t][n] = e
                  }
              }
              ))
          }
          )),
          Et = !0
      } catch (zn) {
          Et = !0
      }
  function Lt(e) {
      return Ct[e]
  }
  function Nt(e, t, n, r) {
      var o, a = Lt(e);
      a ? (a[r] = n,
      a.createdTime = (new Date).getTime(),
      a.t = t) : Ct[e] = ((o = {})[r] = n,
      o.createdTime = (new Date).getTime(),
      o.t = t,
      o),
      Ot[r] || (Ot[r] = {}),
      Ot[r][n] = e,
      Ia.cache && Se(Tt)()
  }
  var Tt = function() {
      return Ct && St.setItem(Y, JSON.stringify(Ct))
  };
  var jt = []
    , At = new Set
    , Rt = !1
    , Pt = function(e) {
      return At.has(Dt(e))
  }
    , It = function(e) {
      return At.add(Dt(e))
  };
  function Dt(e) {
      return ye(e).replace(/<([^>]+)\/>/g, "<$1>").replace(/[\n\r]+/g, "")
  }
  function Ft(e, t) {
      void 0 === e && (e = document.documentElement);
      var n = Be();
      return C(e).filter((function(e) {
          return (t || Ut)(e)
      }
      )).map(function(e) {
          return function(t) {
              var n = t.element
                , r = t.words
                , o = t.type
                , a = t.properties
                , i = t.attrSetter;
              n.weglot || (n.weglot = {
                  content: []
              });
              var s, c, l = n.weglot, u = {}, f = (s = r,
              !!Ot[c = e] && Ot[c][s]);
              if (f && (u[e] = r,
              r = f),
              a) {
                  var d = l.content.find((function(e) {
                      return e.html
                  }
                  ));
                  d ? Object.assign(d, {
                      original: r,
                      properties: a,
                      translations: u
                  }) : l.content.push({
                      html: !0,
                      original: r,
                      type: o,
                      properties: a,
                      translations: u
                  })
              }
              if (i) {
                  var g = l.content.find((function(e) {
                      return e.attrSetter === i
                  }
                  ))
                    , p = {
                      attrSetter: i,
                      original: r,
                      type: o,
                      translations: u
                  };
                  g ? Object.assign(g, p) : l.content.push(p)
              }
              return n
          }
      }(n))
  }
  function Ut(e) {
      var t = e.element
        , n = e.words;
      return !t.weglot || !t.weglot.content || !t.weglot.content.some((function(e) {
          var t, r = e.original, o = e.translations;
          return r === n || (t = o,
          Object.keys(t).map((function(e) {
              return t[e]
          }
          ))).includes(ye(n))
      }
      ))
  }
  function Wt(e) {
      for (var t = [], n = 0, r = e; n < r.length; n += 1) {
          var o = r[n];
          -1 === jt.indexOf(o) && t.push(o)
      }
      return [].push.apply(jt, t),
      t
  }
  function Ht(e, t) {
      void 0 === e && (e = jt),
      void 0 === t && (t = {});
      var n = Ia.prevent_retranslation
        , r = Ia.injectedData;
      void 0 === r && (r = {});
      var o = Ia.is_connect;
      if (n && o && !Rt) {
          var a = r.translatedWordsList;
          void 0 === a && (a = []),
          a.forEach((function(e) {
              return It(e)
          }
          )),
          Rt = !0
      }
      for (var i = [], s = {}, c = 0, l = e; c < l.length; c += 1)
          for (var u = 0, f = l[c].weglot.content; u < f.length; u += 1) {
              var d = f[u]
                , g = d.original
                , p = d.type;
              s[g] || (n && Pt(g) || (s[g] = !0,
              i.push(Object.assign({}, {
                  t: p,
                  w: g
              }, t.label && {
                  l: t.label
              }))))
          }
      return i
  }
  function Mt(e, t, n) {
      if (void 0 === t && (t = Be()),
      void 0 === n && (n = jt),
      e && e.to_words && e.to_words.length)
          for (var r = e.from_words, o = e.to_words, a = 0, i = n; a < i.length; a += 1)
              for (var s = 0, c = i[a].weglot.content || {}; s < c.length; s += 1) {
                  var l = c[s]
                    , u = l.original
                    , f = l.translations
                    , d = r.indexOf(ye(u));
                  if (-1 !== d && !f[t]) {
                      var g = (p = o[d]) && p.replace && p.replace(/wg-(\d+)=""(\s*)\/(\s*)>/g, 'wg-$1="">');
                      Ia.prevent_retranslation && It(g),
                      f[t] = g
                  }
              }
      var p;
      try {
          A(n, t)
      } catch (e) {
          B.error(e)
      }
  }
  function qt(e, t) {
      var n;
      void 0 === t && (t = {
          cdn: !1,
          search: !1
      });
      var r = e.l_to
        , o = e.words;
      e.l_to = _t(r);
      var a, i = o;
      if (!Ia.visual_editor) {
          if (n = function(e, t) {
              var n = []
                , r = []
                , o = [];
              return e.forEach((function(e) {
                  var a = Lt(e.w);
                  a && a[t] ? (n.push(a[t]),
                  r.push(ye(e.w))) : o.push(e)
              }
              )),
              {
                  cachedWords: {
                      to_words: n,
                      from_words: r
                  },
                  newWords: o
              }
          }(o, r),
          i = n.newWords,
          (a = n.cachedWords).to_words.length && !t.search) {
              if (!i.length)
                  return Promise.resolve(a);
              Mt(a, r, t.nodes)
          }
          Et && [].push.apply(i, function() {
              Et = !1;
              var e = (new Date).getTime();
              return Object.keys(Ct).filter((function(t) {
                  return Ct[t].createdTime + 216e5 < e
              }
              )).map((function(e) {
                  return {
                      t: Ct[e].t,
                      w: e
                  }
              }
              ))
          }())
      }
      return i.length ? (e.request_url = function() {
          var e = function() {
              if (Ia.visual_editor)
                  return new de(Fe.url);
              var e = Ia.technology_name
                , t = Ia.injectedData;
              if (e === ne)
                  return new de(window.location.href);
              if (t && t.originalCanonicalUrl)
                  try {
                      return new de(t.originalCanonicalUrl)
                  } catch (e) {}
              var n = document.querySelector("link[rel='canonical'][href]");
              if (n)
                  try {
                      return new de(n.href)
                  } catch (e) {}
              return new de(window.location.href)
          }();
          e.pathname = (t = e.pathname,
          t.split("/").filter((function(e) {
              return !e || isNaN(Number(e))
          }
          )).join("/"));
          var t;
          for (var n = 0, r = xt.filter((function(e) {
              return e.condition.some((function(e) {
                  var t = e.type
                    , n = e.payload;
                  return "TECHNOLOGY_ID" === t && n === Ia.technology_id
              }
              ))
          }
          )); n < r.length; n += 1) {
              var o = r[n].value;
              try {
                  for (var a = 0, i = o; a < i.length; a += 1) {
                      var s = i[a]
                        , c = s.original
                        , l = s.formatted
                        , u = e.pathname.replace(new RegExp(c), l);
                      if (u !== e.pathname)
                          return e.pathname = u,
                          e.toString()
                  }
              } catch (e) {
                  B.warn(e, {
                      consoleOverride: "Invalid URL regex, " + e.stack
                  })
              }
          }
          return e.toString()
      }(),
      e.words = i,
      function(e) {
          var t = Ia.versions && Ia.versions.translation || 1
            , n = ["api_key=" + Ia.api_key, "v=" + t]
            , r = "https://" + (Ia.bypass_cdn_api ? "api.weglot.com" : "cdn-api-weglot.com") + "/translate?" + n.join("&");
          return fetch(r, {
              method: "POST",
              body: zt(JSON.stringify(e))
          }).then(Bt).then((function(e) {
              return e.json()
          }
          )).then((function(e) {
              if (!e || !e.to_words)
                  throw B.warn(e),
                  Error("An error occurred, please try again later");
              return e
          }
          ))
      }(e).then((function(e) {
          return i.forEach((function(t, n) {
              var o = e.to_words[n];
              Nt(t.w, t.t, o, r)
          }
          )),
          e
      }
      ))) : t.search && a ? Promise.resolve(a) : Promise.resolve({
          to_words: [],
          from_words: []
      })
  }
  function zt(e) {
      return e.replace(/[\u007F-\uFFFF]/g, (function(e) {
          return "\\u" + ("0000" + e.charCodeAt(0).toString(16)).substr(-4)
      }
      ))
  }
  function Bt(e) {
      if (400 === e.status)
          throw Error("You reached Weglot limitation. Please upgrade your plan.");
      if (401 === e.status)
          throw Error("Your Weglot API key seems wrong.");
      if (e.status >= 402)
          throw Error(e.statusText);
      return e
  }
  function $t(e) {
      var t = Ia.api_key;
      return fetch("https://api.weglot.com/pageviews?api_key=" + t, {
          method: "POST",
          body: JSON.stringify({
              url: e || Fe.url,
              language: Be(),
              browser_language: navigator.language
          })
      })
  }
  function Vt(e, t, n) {
      void 0 === n && (n = {});
      n = Object.assign({}, {
          title: !0,
          cdn: !1,
          search: !1
      }, n);
      var r = {
          l_from: Ia.language_from,
          l_to: t,
          words: e
      };
      return n.title && (r.title = document.title),
      qt(r, n)
  }
  function Gt(e, t) {
      if ("string" != typeof e || "function" != typeof t)
          return !1;
      var n = Be();
      return n === Ia.language_from ? (t(e),
      !1) : (qt({
          l_from: n,
          l_to: Ia.language_from,
          words: [{
              t: 2,
              w: e
          }]
      }, {
          cdn: !0,
          search: !0
      }).then((function(e) {
          return e.to_words[0].toLowerCase().trim()
      }
      )).then(t),
      !0)
  }
  var Jt = [];
  function Xt(e) {
      var t = e.langTo;
      void 0 === t && (t = Be());
      var n = e.node;
      void 0 === n && (n = document.documentElement);
      var r = Ia.proxify_iframes
        , o = Ia.api_key
        , a = Ia.language_from;
      if (r && r.length && Array.isArray(r))
          for (var i = 0, s = pe(n, r.join(",")); i < s.length; i += 1) {
              var c = s[i]
                , l = c.src;
              if (!l)
                  return;
              if (c.weglot || (c.weglot = {}),
              !l.includes("proxy.weglot.com/")) {
                  if (c.weglot.originalFrameSrc || (c.weglot.originalFrameSrc = l),
                  t === a)
                      return;
                  try {
                      c.src = l.replace("://", "://proxy.weglot.com/" + o + "/" + a + "/" + t + "/")
                  } catch (e) {}
                  return
              }
              if (!t || t === a) {
                  var u = (c.weglot || {}).originalFrameSrc;
                  return void (u && (c.src = u))
              }
              var f = new RegExp(o + "/" + a + "/[^/]+/");
              return void (c.src = l.replace(f, o + "/" + a + "/" + t + "/"))
          }
  }
  function Yt(e) {
      void 0 === e && (e = Be()),
      function(e) {
          void 0 === e && (e = Be());
          for (var t = {
              message: "Weglot.setLanguage",
              payload: e
          }, n = 0, r = Jt; n < r.length; n += 1) {
              var o = r[n];
              try {
                  o.postMessage(t, "*")
              } catch (e) {
                  B.warn(e)
              }
          }
      }(e),
      Xt({
          langTo: e
      })
  }
  function Kt(e) {
      if (e.data && "null" !== e.origin) {
          var t = e.data
            , n = t.message
            , r = t.payload;
          if (n) {
              if ("Weglot.iframe" === n) {
                  var o = {
                      message: "Weglot.setLanguage",
                      payload: Be()
                  };
                  return e.source.postMessage(o, e.origin),
                  void Jt.push(e.source)
              }
              "Weglot.setLanguage" !== n || ma(r)
          }
      }
  }
  var Zt, Qt, en, tn, nn, rn, on, an, sn = {}, cn = [], ln = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  function un(e, t) {
      for (var n in t)
          e[n] = t[n];
      return e
  }
  function fn(e) {
      var t = e.parentNode;
      t && t.removeChild(e)
  }
  function dn(e, t, n) {
      var r, o, a, i = {};
      for (a in t)
          "key" == a ? r = t[a] : "ref" == a ? o = t[a] : i[a] = t[a];
      if (arguments.length > 2 && (i.children = arguments.length > 3 ? Zt.call(arguments, 2) : n),
      "function" == typeof e && null != e.defaultProps)
          for (a in e.defaultProps)
              void 0 === i[a] && (i[a] = e.defaultProps[a]);
      return gn(e, i, r, o, null)
  }
  function gn(e, t, n, r, o) {
      var a = {
          type: e,
          props: t,
          key: n,
          ref: r,
          __k: null,
          __: null,
          __b: 0,
          __e: null,
          __d: void 0,
          __c: null,
          __h: null,
          constructor: void 0,
          __v: null == o ? ++en : o
      };
      return null == o && null != Qt.vnode && Qt.vnode(a),
      a
  }
  function pn(e) {
      return e.children
  }
  function _n(e, t) {
      this.props = e,
      this.context = t
  }
  function hn(e, t) {
      if (null == t)
          return e.__ ? hn(e.__, e.__.__k.indexOf(e) + 1) : null;
      for (var n; t < e.__k.length; t++)
          if (null != (n = e.__k[t]) && null != n.__e)
              return n.__e;
      return "function" == typeof e.type ? hn(e) : null
  }
  function mn(e) {
      var t, n;
      if (null != (e = e.__) && null != e.__c) {
          for (e.__e = e.__c.base = null,
          t = 0; t < e.__k.length; t++)
              if (null != (n = e.__k[t]) && null != n.__e) {
                  e.__e = e.__c.base = n.__e;
                  break
              }
          return mn(e)
      }
  }
  function vn(e) {
      (!e.__d && (e.__d = !0) && tn.push(e) && !yn.__r++ || nn !== Qt.debounceRendering) && ((nn = Qt.debounceRendering) || rn)(yn)
  }
  function yn() {
      var e, t, n, r, o, a, i, s;
      for (tn.sort(on); e = tn.shift(); )
          e.__d && (t = tn.length,
          r = void 0,
          o = void 0,
          i = (a = (n = e).__v).__e,
          (s = n.__P) && (r = [],
          (o = un({}, a)).__v = a.__v + 1,
          Nn(s, a, o, n.__n, void 0 !== s.ownerSVGElement, null != a.__h ? [i] : null, r, null == i ? hn(a) : i, a.__h),
          Tn(r, a),
          a.__e != i && mn(a)),
          tn.length > t && tn.sort(on));
      yn.__r = 0
  }
  function wn(e, t, n, r, o, a, i, s, c, l) {
      var u, f, d, g, p, _, h, m = r && r.__k || cn, v = m.length;
      for (n.__k = [],
      u = 0; u < t.length; u++)
          if (null != (g = n.__k[u] = null == (g = t[u]) || "boolean" == typeof g || "function" == typeof g ? null : "string" == typeof g || "number" == typeof g || "bigint" == typeof g ? gn(null, g, null, null, g) : Array.isArray(g) ? gn(pn, {
              children: g
          }, null, null, null) : g.__b > 0 ? gn(g.type, g.props, g.key, g.ref ? g.ref : null, g.__v) : g)) {
              if (g.__ = n,
              g.__b = n.__b + 1,
              null === (d = m[u]) || d && g.key == d.key && g.type === d.type)
                  m[u] = void 0;
              else
                  for (f = 0; f < v; f++) {
                      if ((d = m[f]) && g.key == d.key && g.type === d.type) {
                          m[f] = void 0;
                          break
                      }
                      d = null
                  }
              Nn(e, g, d = d || sn, o, a, i, s, c, l),
              p = g.__e,
              (f = g.ref) && d.ref != f && (h || (h = []),
              d.ref && h.push(d.ref, null, g),
              h.push(f, g.__c || p, g)),
              null != p ? (null == _ && (_ = p),
              "function" == typeof g.type && g.__k === d.__k ? g.__d = c = bn(g, c, e) : c = xn(e, g, d, m, p, c),
              "function" == typeof n.type && (n.__d = c)) : c && d.__e == c && c.parentNode != e && (c = hn(d))
          }
      for (n.__e = _,
      u = v; u--; )
          null != m[u] && ("function" == typeof n.type && null != m[u].__e && m[u].__e == n.__d && (n.__d = En(r).nextSibling),
          Rn(m[u], m[u]));
      if (h)
          for (u = 0; u < h.length; u++)
              An(h[u], h[++u], h[++u])
  }
  function bn(e, t, n) {
      for (var r, o = e.__k, a = 0; o && a < o.length; a++)
          (r = o[a]) && (r.__ = e,
          t = "function" == typeof r.type ? bn(r, t, n) : xn(n, r, r, o, r.__e, t));
      return t
  }
  function kn(e, t) {
      return t = t || [],
      null == e || "boolean" == typeof e || (Array.isArray(e) ? e.some((function(e) {
          kn(e, t)
      }
      )) : t.push(e)),
      t
  }
  function xn(e, t, n, r, o, a) {
      var i, s, c;
      if (void 0 !== t.__d)
          i = t.__d,
          t.__d = void 0;
      else if (null == n || o != a || null == o.parentNode)
          e: if (null == a || a.parentNode !== e)
              e.appendChild(o),
              i = null;
          else {
              for (s = a,
              c = 0; (s = s.nextSibling) && c < r.length; c += 1)
                  if (s == o)
                      break e;
              e.insertBefore(o, a),
              i = a
          }
      return void 0 !== i ? i : o.nextSibling
  }
  function En(e) {
      var t, n, r;
      if (null == e.type || "string" == typeof e.type)
          return e.__e;
      if (e.__k)
          for (t = e.__k.length - 1; t >= 0; t--)
              if ((n = e.__k[t]) && (r = En(n)))
                  return r;
      return null
  }
  function Cn(e, t, n) {
      "-" === t[0] ? e.setProperty(t, null == n ? "" : n) : e[t] = null == n ? "" : "number" != typeof n || ln.test(t) ? n : n + "px"
  }
  function On(e, t, n, r, o) {
      var a;
      e: if ("style" === t)
          if ("string" == typeof n)
              e.style.cssText = n;
          else {
              if ("string" == typeof r && (e.style.cssText = r = ""),
              r)
                  for (t in r)
                      n && t in n || Cn(e.style, t, "");
              if (n)
                  for (t in n)
                      r && n[t] === r[t] || Cn(e.style, t, n[t])
          }
      else if ("o" === t[0] && "n" === t[1])
          a = t !== (t = t.replace(/Capture$/, "")),
          t = t.toLowerCase()in e ? t.toLowerCase().slice(2) : t.slice(2),
          e.l || (e.l = {}),
          e.l[t + a] = n,
          n ? r || e.addEventListener(t, a ? Ln : Sn, a) : e.removeEventListener(t, a ? Ln : Sn, a);
      else if ("dangerouslySetInnerHTML" !== t) {
          if (o)
              t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
          else if ("width" !== t && "height" !== t && "href" !== t && "list" !== t && "form" !== t && "tabIndex" !== t && "download" !== t && t in e)
              try {
                  e[t] = null == n ? "" : n;
                  break e
              } catch (e) {}
          "function" == typeof n || (null == n || !1 === n && "-" !== t[4] ? e.removeAttribute(t) : e.setAttribute(t, n))
      }
  }
  function Sn(e) {
      return this.l[e.type + !1](Qt.event ? Qt.event(e) : e)
  }
  function Ln(e) {
      return this.l[e.type + !0](Qt.event ? Qt.event(e) : e)
  }
  function Nn(e, t, n, r, o, a, i, s, c) {
      var l, u, f, d, g, p, _, h, m, v, y, w, b, k, x, E = t.type;
      if (void 0 !== t.constructor)
          return null;
      null != n.__h && (c = n.__h,
      s = t.__e = n.__e,
      t.__h = null,
      a = [s]),
      (l = Qt.__b) && l(t);
      try {
          e: if ("function" == typeof E) {
              if (h = t.props,
              m = (l = E.contextType) && r[l.__c],
              v = l ? m ? m.props.value : l.__ : r,
              n.__c ? _ = (u = t.__c = n.__c).__ = u.__E : ("prototype"in E && E.prototype.render ? t.__c = u = new E(h,v) : (t.__c = u = new _n(h,v),
              u.constructor = E,
              u.render = Pn),
              m && m.sub(u),
              u.props = h,
              u.state || (u.state = {}),
              u.context = v,
              u.__n = r,
              f = u.__d = !0,
              u.__h = [],
              u._sb = []),
              null == u.__s && (u.__s = u.state),
              null != E.getDerivedStateFromProps && (u.__s == u.state && (u.__s = un({}, u.__s)),
              un(u.__s, E.getDerivedStateFromProps(h, u.__s))),
              d = u.props,
              g = u.state,
              u.__v = t,
              f)
                  null == E.getDerivedStateFromProps && null != u.componentWillMount && u.componentWillMount(),
                  null != u.componentDidMount && u.__h.push(u.componentDidMount);
              else {
                  if (null == E.getDerivedStateFromProps && h !== d && null != u.componentWillReceiveProps && u.componentWillReceiveProps(h, v),
                  !u.__e && null != u.shouldComponentUpdate && !1 === u.shouldComponentUpdate(h, u.__s, v) || t.__v === n.__v) {
                      for (t.__v !== n.__v && (u.props = h,
                      u.state = u.__s,
                      u.__d = !1),
                      u.__e = !1,
                      t.__e = n.__e,
                      t.__k = n.__k,
                      t.__k.forEach((function(e) {
                          e && (e.__ = t)
                      }
                      )),
                      y = 0; y < u._sb.length; y++)
                          u.__h.push(u._sb[y]);
                      u._sb = [],
                      u.__h.length && i.push(u);
                      break e
                  }
                  null != u.componentWillUpdate && u.componentWillUpdate(h, u.__s, v),
                  null != u.componentDidUpdate && u.__h.push((function() {
                      u.componentDidUpdate(d, g, p)
                  }
                  ))
              }
              if (u.context = v,
              u.props = h,
              u.__P = e,
              w = Qt.__r,
              b = 0,
              "prototype"in E && E.prototype.render) {
                  for (u.state = u.__s,
                  u.__d = !1,
                  w && w(t),
                  l = u.render(u.props, u.state, u.context),
                  k = 0; k < u._sb.length; k++)
                      u.__h.push(u._sb[k]);
                  u._sb = []
              } else
                  do {
                      u.__d = !1,
                      w && w(t),
                      l = u.render(u.props, u.state, u.context),
                      u.state = u.__s
                  } while (u.__d && ++b < 25);
              u.state = u.__s,
              null != u.getChildContext && (r = un(un({}, r), u.getChildContext())),
              f || null == u.getSnapshotBeforeUpdate || (p = u.getSnapshotBeforeUpdate(d, g)),
              x = null != l && l.type === pn && null == l.key ? l.props.children : l,
              wn(e, Array.isArray(x) ? x : [x], t, n, r, o, a, i, s, c),
              u.base = t.__e,
              t.__h = null,
              u.__h.length && i.push(u),
              _ && (u.__E = u.__ = null),
              u.__e = !1
          } else
              null == a && t.__v === n.__v ? (t.__k = n.__k,
              t.__e = n.__e) : t.__e = jn(n.__e, t, n, r, o, a, i, c);
          (l = Qt.diffed) && l(t)
      } catch (e) {
          t.__v = null,
          (c || null != a) && (t.__e = s,
          t.__h = !!c,
          a[a.indexOf(s)] = null),
          Qt.__e(e, t, n)
      }
  }
  function Tn(e, t) {
      Qt.__c && Qt.__c(t, e),
      e.some((function(t) {
          try {
              e = t.__h,
              t.__h = [],
              e.some((function(e) {
                  e.call(t)
              }
              ))
          } catch (e) {
              Qt.__e(e, t.__v)
          }
      }
      ))
  }
  function jn(e, t, n, r, o, a, i, s) {
      var c, l, u, f = n.props, d = t.props, g = t.type, p = 0;
      if ("svg" === g && (o = !0),
      null != a)
          for (; p < a.length; p++)
              if ((c = a[p]) && "setAttribute"in c == !!g && (g ? c.localName === g : 3 === c.nodeType)) {
                  e = c,
                  a[p] = null;
                  break
              }
      if (null == e) {
          if (null === g)
              return document.createTextNode(d);
          e = o ? document.createElementNS("http://www.w3.org/2000/svg", g) : document.createElement(g, d.is && d),
          a = null,
          s = !1
      }
      if (null === g)
          f === d || s && e.data === d || (e.data = d);
      else {
          if (a = a && Zt.call(e.childNodes),
          l = (f = n.props || sn).dangerouslySetInnerHTML,
          u = d.dangerouslySetInnerHTML,
          !s) {
              if (null != a)
                  for (f = {},
                  p = 0; p < e.attributes.length; p++)
                      f[e.attributes[p].name] = e.attributes[p].value;
              (u || l) && (u && (l && u.__html == l.__html || u.__html === e.innerHTML) || (e.innerHTML = u && u.__html || ""))
          }
          if (function(e, t, n, r, o) {
              var a;
              for (a in n)
                  "children" === a || "key" === a || a in t || On(e, a, null, n[a], r);
              for (a in t)
                  o && "function" != typeof t[a] || "children" === a || "key" === a || "value" === a || "checked" === a || n[a] === t[a] || On(e, a, t[a], n[a], r)
          }(e, d, f, o, s),
          u)
              t.__k = [];
          else if (p = t.props.children,
          wn(e, Array.isArray(p) ? p : [p], t, n, r, o && "foreignObject" !== g, a, i, a ? a[0] : n.__k && hn(n, 0), s),
          null != a)
              for (p = a.length; p--; )
                  null != a[p] && fn(a[p]);
          s || ("value"in d && void 0 !== (p = d.value) && (p !== e.value || "progress" === g && !p || "option" === g && p !== f.value) && On(e, "value", p, f.value, !1),
          "checked"in d && void 0 !== (p = d.checked) && p !== e.checked && On(e, "checked", p, f.checked, !1))
      }
      return e
  }
  function An(e, t, n) {
      try {
          "function" == typeof e ? e(t) : e.current = t
      } catch (e) {
          Qt.__e(e, n)
      }
  }
  function Rn(e, t, n) {
      var r, o;
      if (Qt.unmount && Qt.unmount(e),
      (r = e.ref) && (r.current && r.current !== e.__e || An(r, null, t)),
      null != (r = e.__c)) {
          if (r.componentWillUnmount)
              try {
                  r.componentWillUnmount()
              } catch (e) {
                  Qt.__e(e, t)
              }
          r.base = r.__P = null,
          e.__c = void 0
      }
      if (r = e.__k)
          for (o = 0; o < r.length; o++)
              r[o] && Rn(r[o], t, n || "function" != typeof e.type);
      n || null == e.__e || fn(e.__e),
      e.__ = e.__e = e.__d = void 0
  }
  function Pn(e, t, n) {
      return this.constructor(e, n)
  }
  function In(e) {
      var t, n, r = "";
      if ("string" == typeof e || "number" == typeof e)
          r += e;
      else if ("object" == typeof e)
          if (Array.isArray(e)) {
              var o = e.length;
              for (t = 0; t < o; t++)
                  e[t] && (n = In(e[t])) && (r && (r += " "),
                  r += n)
          } else
              for (n in e)
                  e[n] && (r && (r += " "),
                  r += n);
      return r
  }
  Zt = cn.slice,
  Qt = {
      __e: function(e, t, n, r) {
          for (var o, a, i; t = t.__; )
              if ((o = t.__c) && !o.__)
                  try {
                      if ((a = o.constructor) && null != a.getDerivedStateFromError && (o.setState(a.getDerivedStateFromError(e)),
                      i = o.__d),
                      null != o.componentDidCatch && (o.componentDidCatch(e, r || {}),
                      i = o.__d),
                      i)
                          return o.__E = o
                  } catch (t) {
                      e = t
                  }
          throw e
      }
  },
  en = 0,
  _n.prototype.setState = function(e, t) {
      var n;
      n = null != this.__s && this.__s !== this.state ? this.__s : this.__s = un({}, this.state),
      "function" == typeof e && (e = e(un({}, n), this.props)),
      e && un(n, e),
      null != e && this.__v && (t && this._sb.push(t),
      vn(this))
  }
  ,
  _n.prototype.forceUpdate = function(e) {
      this.__v && (this.__e = !0,
      e && this.__h.push(e),
      vn(this))
  }
  ,
  _n.prototype.render = pn,
  tn = [],
  rn = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout,
  on = function(e, t) {
      return e.__v.__b - t.__v.__b
  }
  ,
  yn.__r = 0,
  an = 0;
  var Dn, Fn, Un, Wn, Hn = 0, Mn = [], qn = [], zn = Qt.__b, Bn = Qt.__r, $n = Qt.diffed, Vn = Qt.__c, Gn = Qt.unmount;
  function Jn(e, t) {
      Qt.__h && Qt.__h(Fn, e, Hn || t),
      Hn = 0;
      var n = Fn.__H || (Fn.__H = {
          __: [],
          __h: []
      });
      return e >= n.__.length && n.__.push({
          __V: qn
      }),
      n.__[e]
  }
  function Xn(e) {
      return Hn = 1,
      function(e, t, n) {
          var r = Jn(Dn++, 2);
          if (r.t = e,
          !r.__c && (r.__ = [n ? n(t) : or(void 0, t), function(e) {
              var t = r.__N ? r.__N[0] : r.__[0]
                , n = r.t(t, e);
              t !== n && (r.__N = [n, r.__[1]],
              r.__c.setState({}))
          }
          ],
          r.__c = Fn,
          !Fn.u)) {
              var o = function(e, t, n) {
                  if (!r.__c.__H)
                      return !0;
                  var o = r.__c.__H.__.filter((function(e) {
                      return e.__c
                  }
                  ));
                  if (o.every((function(e) {
                      return !e.__N
                  }
                  )))
                      return !a || a.call(this, e, t, n);
                  var i = !1;
                  return o.forEach((function(e) {
                      if (e.__N) {
                          var t = e.__[0];
                          e.__ = e.__N,
                          e.__N = void 0,
                          t !== e.__[0] && (i = !0)
                      }
                  }
                  )),
                  !(!i && r.__c.props === e) && (!a || a.call(this, e, t, n))
              };
              Fn.u = !0;
              var a = Fn.shouldComponentUpdate
                , i = Fn.componentWillUpdate;
              Fn.componentWillUpdate = function(e, t, n) {
                  if (this.__e) {
                      var r = a;
                      a = void 0,
                      o(e, t, n),
                      a = r
                  }
                  i && i.call(this, e, t, n)
              }
              ,
              Fn.shouldComponentUpdate = o
          }
          return r.__N || r.__
      }(or, e)
  }
  function Yn(e, t) {
      var n = Jn(Dn++, 3);
      !Qt.__s && rr(n.__H, t) && (n.__ = e,
      n.i = t,
      Fn.__H.__h.push(n))
  }
  function Kn(e) {
      return Hn = 5,
      function(e, t) {
          var n = Jn(Dn++, 7);
          return rr(n.__H, t) ? (n.__V = e(),
          n.i = t,
          n.__h = e,
          n.__V) : n.__
      }((function() {
          return {
              current: e
          }
      }
      ), [])
  }
  function Zn() {
      for (var e; e = Mn.shift(); )
          if (e.__P && e.__H)
              try {
                  e.__H.__h.forEach(tr),
                  e.__H.__h.forEach(nr),
                  e.__H.__h = []
              } catch (t) {
                  e.__H.__h = [],
                  Qt.__e(t, e.__v)
              }
  }
  Qt.__b = function(e) {
      Fn = null,
      zn && zn(e)
  }
  ,
  Qt.__r = function(e) {
      Bn && Bn(e),
      Dn = 0;
      var t = (Fn = e.__c).__H;
      t && (Un === Fn ? (t.__h = [],
      Fn.__h = [],
      t.__.forEach((function(e) {
          e.__N && (e.__ = e.__N),
          e.__V = qn,
          e.__N = e.i = void 0
      }
      ))) : (t.__h.forEach(tr),
      t.__h.forEach(nr),
      t.__h = [])),
      Un = Fn
  }
  ,
  Qt.diffed = function(e) {
      $n && $n(e);
      var t = e.__c;
      t && t.__H && (t.__H.__h.length && (1 !== Mn.push(t) && Wn === Qt.requestAnimationFrame || ((Wn = Qt.requestAnimationFrame) || er)(Zn)),
      t.__H.__.forEach((function(e) {
          e.i && (e.__H = e.i),
          e.__V !== qn && (e.__ = e.__V),
          e.i = void 0,
          e.__V = qn
      }
      ))),
      Un = Fn = null
  }
  ,
  Qt.__c = function(e, t) {
      t.some((function(e) {
          try {
              e.__h.forEach(tr),
              e.__h = e.__h.filter((function(e) {
                  return !e.__ || nr(e)
              }
              ))
          } catch (n) {
              t.some((function(e) {
                  e.__h && (e.__h = [])
              }
              )),
              t = [],
              Qt.__e(n, e.__v)
          }
      }
      )),
      Vn && Vn(e, t)
  }
  ,
  Qt.unmount = function(e) {
      Gn && Gn(e);
      var t, n = e.__c;
      n && n.__H && (n.__H.__.forEach((function(e) {
          try {
              tr(e)
          } catch (e) {
              t = e
          }
      }
      )),
      n.__H = void 0,
      t && Qt.__e(t, n.__v))
  }
  ;
  var Qn = "function" == typeof requestAnimationFrame;
  function er(e) {
      var t, n = function() {
          clearTimeout(r),
          Qn && cancelAnimationFrame(t),
          setTimeout(e)
      }, r = setTimeout(n, 100);
      Qn && (t = requestAnimationFrame(n))
  }
  function tr(e) {
      var t = Fn
        , n = e.__c;
      "function" == typeof n && (e.__c = void 0,
      n()),
      Fn = t
  }
  function nr(e) {
      var t = Fn;
      e.__c = e.__(),
      Fn = t
  }
  function rr(e, t) {
      return !e || e.length !== t.length || t.some((function(t, n) {
          return t !== e[n]
      }
      ))
  }
  function or(e, t) {
      return "function" == typeof t ? t(e) : t
  }
  function ar(e, t) {
      for (var n in t)
          e[n] = t[n];
      return e
  }
  function ir(e, t) {
      for (var n in e)
          if ("__source" !== n && !(n in t))
              return !0;
      for (var r in t)
          if ("__source" !== r && e[r] !== t[r])
              return !0;
      return !1
  }
  function sr(e) {
      this.props = e
  }
  (sr.prototype = new _n).isPureReactComponent = !0,
  sr.prototype.shouldComponentUpdate = function(e, t) {
      return ir(this.props, e) || ir(this.state, t)
  }
  ;
  var cr = Qt.__b;
  Qt.__b = function(e) {
      e.type && e.type.__f && e.ref && (e.props.ref = e.ref,
      e.ref = null),
      cr && cr(e)
  }
  ;
  var lr = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.forward_ref") || 3911;
  var ur = Qt.__e;
  Qt.__e = function(e, t, n, r) {
      if (e.then)
          for (var o, a = t; a = a.__; )
              if ((o = a.__c) && o.__c)
                  return null == t.__e && (t.__e = n.__e,
                  t.__k = n.__k),
                  o.__c(e, t);
      ur(e, t, n, r)
  }
  ;
  var fr = Qt.unmount;
  function dr(e, t, n) {
      return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach((function(e) {
          "function" == typeof e.__c && e.__c()
      }
      )),
      e.__c.__H = null),
      null != (e = ar({}, e)).__c && (e.__c.__P === n && (e.__c.__P = t),
      e.__c = null),
      e.__k = e.__k && e.__k.map((function(e) {
          return dr(e, t, n)
      }
      ))),
      e
  }
  function gr(e, t, n) {
      return e && (e.__v = null,
      e.__k = e.__k && e.__k.map((function(e) {
          return gr(e, t, n)
      }
      )),
      e.__c && e.__c.__P === t && (e.__e && n.insertBefore(e.__e, e.__d),
      e.__c.__e = !0,
      e.__c.__P = n)),
      e
  }
  function pr() {
      this.__u = 0,
      this.t = null,
      this.__b = null
  }
  function _r(e) {
      var t = e.__.__c;
      return t && t.__a && t.__a(e)
  }
  function hr() {
      this.u = null,
      this.o = null
  }
  Qt.unmount = function(e) {
      var t = e.__c;
      t && t.__R && t.__R(),
      t && !0 === e.__h && (e.type = null),
      fr && fr(e)
  }
  ,
  (pr.prototype = new _n).__c = function(e, t) {
      var n = t.__c
        , r = this;
      null == r.t && (r.t = []),
      r.t.push(n);
      var o = _r(r.__v)
        , a = !1
        , i = function() {
          a || (a = !0,
          n.__R = null,
          o ? o(s) : s())
      };
      n.__R = i;
      var s = function() {
          if (!--r.__u) {
              if (r.state.__a) {
                  var e = r.state.__a;
                  r.__v.__k[0] = gr(e, e.__c.__P, e.__c.__O)
              }
              var t;
              for (r.setState({
                  __a: r.__b = null
              }); t = r.t.pop(); )
                  t.forceUpdate()
          }
      }
        , c = !0 === t.__h;
      r.__u++ || c || r.setState({
          __a: r.__b = r.__v.__k[0]
      }),
      e.then(i, i)
  }
  ,
  pr.prototype.componentWillUnmount = function() {
      this.t = []
  }
  ,
  pr.prototype.render = function(e, t) {
      if (this.__b) {
          if (this.__v.__k) {
              var n = document.createElement("div")
                , r = this.__v.__k[0].__c;
              this.__v.__k[0] = dr(this.__b, n, r.__O = r.__P)
          }
          this.__b = null
      }
      var o = t.__a && dn(pn, null, e.fallback);
      return o && (o.__h = null),
      [dn(pn, null, t.__a ? null : e.children), o]
  }
  ;
  var mr = function(e, t, n) {
      if (++n[1] === n[0] && e.o.delete(t),
      e.props.revealOrder && ("t" !== e.props.revealOrder[0] || !e.o.size))
          for (n = e.u; n; ) {
              for (; n.length > 3; )
                  n.pop()();
              if (n[1] < n[0])
                  break;
              e.u = n = n[2]
          }
  };
  (hr.prototype = new _n).__a = function(e) {
      var t = this
        , n = _r(t.__v)
        , r = t.o.get(e);
      return r[0]++,
      function(o) {
          var a = function() {
              t.props.revealOrder ? (r.push(o),
              mr(t, e, r)) : o()
          };
          n ? n(a) : a()
      }
  }
  ,
  hr.prototype.render = function(e) {
      this.u = null,
      this.o = new Map;
      var t = kn(e.children);
      e.revealOrder && "b" === e.revealOrder[0] && t.reverse();
      for (var n = t.length; n--; )
          this.o.set(t[n], this.u = [1, 0, this.u]);
      return e.children
  }
  ,
  hr.prototype.componentDidUpdate = hr.prototype.componentDidMount = function() {
      var e = this;
      this.o.forEach((function(t, n) {
          mr(e, n, t)
      }
      ))
  }
  ;
  var vr = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.element") || 60103
    , yr = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/
    , wr = /^on(Ani|Tra|Tou|BeforeInp|Compo)/
    , br = /[A-Z0-9]/g
    , kr = "undefined" != typeof document
    , xr = function(e) {
      return ("undefined" != typeof Symbol && "symbol" == typeof Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(e)
  };
  _n.prototype.isReactComponent = {},
  ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach((function(e) {
      Object.defineProperty(_n.prototype, e, {
          configurable: !0,
          get: function() {
              return this["UNSAFE_" + e]
          },
          set: function(t) {
              Object.defineProperty(this, e, {
                  configurable: !0,
                  writable: !0,
                  value: t
              })
          }
      })
  }
  ));
  var Er = Qt.event;
  function Cr() {}
  function Or() {
      return this.cancelBubble
  }
  function Sr() {
      return this.defaultPrevented
  }
  Qt.event = function(e) {
      return Er && (e = Er(e)),
      e.persist = Cr,
      e.isPropagationStopped = Or,
      e.isDefaultPrevented = Sr,
      e.nativeEvent = e
  }
  ;
  var Lr = {
      enumerable: !1,
      configurable: !0,
      get: function() {
          return this.class
      }
  }
    , Nr = Qt.vnode;
  Qt.vnode = function(e) {
      "string" == typeof e.type && function(e) {
          var t = e.props
            , n = e.type
            , r = {};
          for (var o in t) {
              var a = t[o];
              if (!("value" === o && "defaultValue"in t && null == a || kr && "children" === o && "noscript" === n || "class" === o || "className" === o)) {
                  var i = o.toLowerCase();
                  "defaultValue" === o && "value"in t && null == t.value ? o = "value" : "download" === o && !0 === a ? a = "" : "ondoubleclick" === i ? o = "ondblclick" : "onchange" !== i || "input" !== n && "textarea" !== n || xr(t.type) ? "onfocus" === i ? o = "onfocusin" : "onblur" === i ? o = "onfocusout" : wr.test(o) ? o = i : -1 === n.indexOf("-") && yr.test(o) ? o = o.replace(br, "-$&").toLowerCase() : null === a && (a = void 0) : i = o = "oninput",
                  "oninput" === i && r[o = i] && (o = "oninputCapture"),
                  r[o] = a
              }
          }
          "select" == n && r.multiple && Array.isArray(r.value) && (r.value = kn(t.children).forEach((function(e) {
              e.props.selected = -1 != r.value.indexOf(e.props.value)
          }
          ))),
          "select" == n && null != r.defaultValue && (r.value = kn(t.children).forEach((function(e) {
              e.props.selected = r.multiple ? -1 != r.defaultValue.indexOf(e.props.value) : r.defaultValue == e.props.value
          }
          ))),
          t.class && !t.className ? (r.class = t.class,
          Object.defineProperty(r, "className", Lr)) : (t.className && !t.class || t.class && t.className) && (r.class = r.className = t.className),
          e.props = r
      }(e),
      e.$$typeof = vr,
      Nr && Nr(e)
  }
  ;
  var Tr = Qt.__r;
  Qt.__r = function(e) {
      Tr && Tr(e),
      e.__c
  }
  ;
  var jr = Qt.diffed;
  Qt.diffed = function(e) {
      jr && jr(e);
      var t = e.props
        , n = e.__e;
      null != n && "textarea" === e.type && "value"in t && t.value !== n.value && (n.value = null == t.value ? "" : t.value)
  }
  ;
  var Ar, Rr = function(e, t) {
      var n = {
          __c: t = "__cC" + an++,
          __: e,
          Consumer: function(e, t) {
              return e.children(t)
          },
          Provider: function(e) {
              var n, r;
              return this.getChildContext || (n = [],
              (r = {})[t] = this,
              this.getChildContext = function() {
                  return r
              }
              ,
              this.shouldComponentUpdate = function(e) {
                  this.props.value !== e.value && n.some((function(e) {
                      e.__e = !0,
                      vn(e)
                  }
                  ))
              }
              ,
              this.sub = function(e) {
                  n.push(e);
                  var t = e.componentWillUnmount;
                  e.componentWillUnmount = function() {
                      n.splice(n.indexOf(e), 1),
                      t && t.call(e)
                  }
              }
              ),
              e.children
          }
      };
      return n.Provider.__ = n.Consumer.contextType = n
  }({}), Pr = (Ar = "div",
  function(e) {
      var t = {}
        , n = t.shouldForwardProp
        , r = t.label
        , o = function(e, t) {
          function n(e) {
              var n = this.props.ref
                , r = n == e.ref;
              return !r && n && (n.call ? n(null) : n.current = null),
              t ? !t(this.props, e) || !r : ir(this.props, e)
          }
          function r(t) {
              return this.shouldComponentUpdate = n,
              dn(e, t)
          }
          return r.displayName = "Memo(" + (e.displayName || e.name) + ")",
          r.prototype.isReactComponent = !0,
          r.__f = !0,
          r
      }(function(e) {
          function t(t) {
              var n = ar({}, t);
              return delete n.ref,
              e(n, t.ref || null)
          }
          return t.$$typeof = lr,
          t.render = t,
          t.prototype.isReactComponent = t.__f = !0,
          t.displayName = "ForwardRef(" + (e.displayName || e.name) + ")",
          t
      }((function(t, r) {
          var o = t || {}
            , a = o.children
            , i = o.as;
          void 0 === i && (i = Ar);
          var s = o.style;
          void 0 === s && (s = {});
          var c = function(e, t) {
              var n = {};
              for (var r in e)
                  Object.prototype.hasOwnProperty.call(e, r) && -1 === t.indexOf(r) && (n[r] = e[r]);
              return n
          }(o, ["children", "as", "style"])
            , l = c
            , u = function(e) {
              var t = Fn.context[e.__c]
                , n = Jn(Dn++, 9);
              return n.c = e,
              t ? (null == n.__ && (n.__ = !0,
              t.sub(Fn)),
              t.props.value) : e.__
          }(Rr);
          return dn(i, Object.assign({}, {
              ref: r,
              style: Object.assign({}, e(Object.assign({}, l, {
                  theme: u
              })), "function" == typeof s ? s(Object.assign({}, l, {
                  theme: u
              })) : s)
          }, n ? function(e, t) {
              return Object.keys(e).filter(t).reduce((function(t, n) {
                  return t[n] = e[n],
                  t
              }
              ), {})
          }(l, n) : l), a)
      }
      )));
      return o.displayName = (r || Ar) + "💅",
      o
  }
  )((function() {
      return {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh"
      }
  }
  ));
  function Ir(e) {
      var t = e.displayError;
      void 0 === t && (t = !0);
      var n = e.logger;
      void 0 === n && (n = function() {}
      );
      var r = e.children
        , o = function(e) {
          var t = Jn(Dn++, 10)
            , n = Xn();
          return t.__ = e,
          Fn.componentDidCatch || (Fn.componentDidCatch = function(e, r) {
              t.__ && t.__(e, r),
              n[1](e)
          }
          ),
          [n[0], function() {
              n[1](void 0)
          }
          ]
      }((function(e) {
          return n(e.message)
      }
      ));
      return o[0] && t ? dn(Pr, null, dn("p", null, "An error has occurred, we apologise for the inconvenience. ", dn("br", null), dn("br", null), "We have been notified and will rectify the situation as soon as possible. ", dn("br", null), dn("br", null), "Please try again later or contact support@weglot.com directly.")) : r
  }
  var Dr = ["text_active", "text_inactive", "text_hover"]
    , Fr = ["bg_active", "bg_inactive", "bg_hover"]
    , Ur = [{
      name: "default",
      editorDropdown: !0,
      editableProps: ["flag_type", "with_flags", "is_dropdown", "with_name", "full_name", "invert_flags", "open_hover", "close_outside_click"],
      defaultValues: {
          style: {
              with_name: !0,
              with_flags: !0,
              full_name: !0,
              is_dropdown: !0,
              invert_flags: !0,
              flag_type: "rectangle_mat"
          },
          opts: {
              open_hover: !1,
              close_outside_click: !1
          }
      }
  }, {
      name: "toggle",
      editableProps: Dr.concat(Fr),
      defaultValues: {
          style: {
              full_name: !1
          },
          colors: {
              bg_active: "#3D46FB",
              bg_inactive: "transparent",
              bg_hover: "transparent",
              text_active: "#FFFFFF",
              text_inactive: "#000000",
              text_hover: "#000000"
          }
      }
  }, {
      name: "bubble",
      editorDropdown: !0,
      editableProps: ["flag_type", "with_flags", "full_name", "color", "open_hover", "close_outside_click"].concat(Dr),
      defaultValues: {
          style: {
              with_name: !0,
              with_flags: !0,
              full_name: !0,
              flag_type: "rectangle_mat"
          },
          opts: {
              open_hover: !1,
              close_outside_click: !0
          },
          colors: {
              text_inactive: "#333333",
              text_active: "#555555",
              text_hover: "#555555"
          }
      }
  }, {
      name: "vertical_expand",
      editorDropdown: !0,
      editableProps: ["with_flags", "full_name", "color", "open_hover", "close_outside_click"].concat(Dr, Fr),
      defaultValues: {
          style: {
              with_name: !0,
              with_flags: !0,
              full_name: !1,
              flag_type: "square"
          },
          opts: {
              open_hover: !0,
              close_outside_click: !1
          },
          colors: {
              text_active: "#000000",
              text_inactive: "#000000",
              text_hover: "#FFFFFF",
              bg_inactive: "#FFFFFF",
              bg_active: "#FFFFFF",
              bg_hover: "#3D46FB"
          }
      }
  }, {
      name: "horizontal_expand",
      editorDropdown: !1,
      editableProps: ["open_hover", "close_outside_click"].concat(Dr, Fr),
      defaultValues: {
          style: {
              with_name: !0,
              with_flags: !1,
              full_name: !1,
              flag_type: "square"
          },
          opts: {
              open_hover: !0,
              close_outside_click: !1
          },
          colors: {
              text_inactive: "#000000",
              text_active: "#FFFFFF",
              text_hover: "#FFFFFF",
              bg_inactive: "#FFFFFF",
              bg_active: "#3D46FB",
              bg_hover: "#3D46FB"
          }
      }
  }, {
      name: "underline_edge",
      editableProps: ["full_name"].concat(Dr),
      maxLanguages: 10,
      minLanguages: null,
      defaultValues: {
          style: {
              full_name: !1
          },
          colors: {
              text_active: "#FA8072",
              text_inactive: "#333333",
              text_hover: "#FA8072"
          }
      }
  }, {
      name: "skewed",
      editorDropdown: !0,
      editableProps: ["with_flags", "full_name", "open_hover", "close_outside_click", "bg_active", "bg_inactive"].concat(Dr),
      defaultValues: {
          style: {
              with_name: !0,
              with_flags: !0,
              full_name: !1,
              flag_type: "square"
          },
          opts: {
              open_hover: !0,
              close_outside_click: !1
          },
          colors: {
              text_active: "#000000",
              text_inactive: "#000000",
              text_hover: "#3D46FB",
              bg_inactive: "#FFFFFF",
              bg_active: "transparent",
              bg_hover: "#FFFFFF"
          }
      }
  }, {
      name: "underline_full",
      maxLanguages: 10,
      minLanguages: null,
      editableProps: ["with_flags", "flag_type"].concat(Dr),
      defaultValues: {
          style: {
              full_name: !0,
              with_flags: !0,
              flag_type: "rectangle_mat"
          },
          colors: {
              text_active: "#333333",
              text_inactive: "#333333",
              text_hover: "#3D46FB"
          }
      }
  }].map((function(e) {
      return Object.assign({}, e, {
          defaultValues: Object.assign({}, e.defaultValues, {
              opts: Object.assign({}, e.defaultValues.opts, {
                  is_responsive: !1,
                  display_device: "mobile",
                  pixel_cutoff: 768
              }),
              style: Object.assign({}, e.defaultValues.style, {
                  size_scale: 1
              })
          }),
          editableProps: e.editableProps.concat(["is_responsive", "display_device", "pixel_cutoff", "size_scale"])
      })
  }
  ));
  function Wr(e) {
      var t = function(e) {
          return Ur.find((function(t) {
              return t.name === e
          }
          ))
      }(e)
        , n = t.defaultValues;
      void 0 === n && (n = {});
      var r = n
        , o = r.style;
      void 0 === o && (o = {});
      var a = r.opts;
      void 0 === a && (a = {});
      var i = r.colors;
      return void 0 === i && (i = {}),
      {
          style: o,
          opts: a,
          colors: i
      }
  }
  var Hr = i({
      service: "switcher-templates"
  })
    , Mr = {
      af: {
          name: "Afrikaans",
          flag: "za"
      },
      am: {
          name: "አማርኛ",
          flag: "et"
      },
      ar: {
          name: "العربية‏",
          flag: "sa"
      },
      az: {
          name: "Azərbaycan dili",
          flag: "az"
      },
      ba: {
          name: "башҡорт теле",
          flag: "ru"
      },
      be: {
          name: "Беларуская",
          flag: "by"
      },
      bg: {
          name: "Български",
          flag: "bg"
      },
      bn: {
          name: "বাংলা",
          flag: "bd"
      },
      br: {
          name: "Português Brasileiro",
          flag: "br"
      },
      bs: {
          name: "Bosanski",
          flag: "ba"
      },
      ca: {
          name: "Català",
          flag: "es-ca"
      },
      co: {
          name: "Corsu",
          flag: "fr-co"
      },
      cs: {
          name: "Čeština",
          flag: "cz"
      },
      cy: {
          name: "Cymraeg",
          flag: "gb-wls"
      },
      da: {
          name: "Dansk",
          flag: "dk"
      },
      de: {
          name: "Deutsch",
          flag: "de"
      },
      el: {
          name: "Ελληνικά",
          flag: "gr"
      },
      en: {
          name: "English",
          flag: "gb"
      },
      eo: {
          name: "Esperanto",
          flag: "eo"
      },
      es: {
          name: "Español",
          flag: "es"
      },
      et: {
          name: "Eesti",
          flag: "ee"
      },
      eu: {
          name: "Euskara",
          flag: "eus"
      },
      fa: {
          name: "فارسی",
          flag: "ir"
      },
      fi: {
          name: "Suomi",
          flag: "fi"
      },
      fj: {
          name: "Vosa Vakaviti",
          flag: "fj"
      },
      fl: {
          name: "Filipino",
          flag: "ph"
      },
      fr: {
          name: "Français",
          flag: "fr"
      },
      fy: {
          name: "frysk",
          flag: "nl"
      },
      ga: {
          name: "Gaeilge",
          flag: "ie"
      },
      gd: {
          name: "Gàidhlig",
          flag: "gb-sct"
      },
      gl: {
          name: "Galego",
          flag: "es-ga"
      },
      gu: {
          name: "ગુજરાતી",
          flag: "in"
      },
      ha: {
          name: "هَوُسَ",
          flag: "ne"
      },
      he: {
          name: "עברית",
          flag: "il"
      },
      hi: {
          name: "हिंदी",
          flag: "in"
      },
      hr: {
          name: "Hrvatski",
          flag: "hr"
      },
      ht: {
          name: "Kreyòl ayisyen",
          flag: "ht"
      },
      hu: {
          name: "Magyar",
          flag: "hu"
      },
      hw: {
          name: "‘Ōlelo Hawai‘i",
          flag: "hw"
      },
      hy: {
          name: "հայերեն",
          flag: "am"
      },
      id: {
          name: "Bahasa Indonesia",
          flag: "id"
      },
      ig: {
          name: "Igbo",
          flag: "ne"
      },
      is: {
          name: "Íslenska",
          flag: "is"
      },
      it: {
          name: "Italiano",
          flag: "it"
      },
      ja: {
          name: "日本語",
          flag: "jp"
      },
      jv: {
          name: "Wong Jawa",
          flag: "id"
      },
      ka: {
          name: "ქართული",
          flag: "ge"
      },
      kk: {
          name: "Қазақша",
          flag: "kz"
      },
      km: {
          name: "ភាសាខ្មែរ",
          flag: "kh"
      },
      kn: {
          name: "ಕನ್ನಡ",
          flag: "in"
      },
      ko: {
          name: "한국어",
          flag: "kr"
      },
      ku: {
          name: "كوردی",
          flag: "iq"
      },
      ky: {
          name: "кыргызча",
          flag: "kg"
      },
      la: {
          name: "Latine",
          flag: "it"
      },
      lb: {
          name: "Lëtzebuergesch",
          flag: "lu"
      },
      lo: {
          name: "ພາສາລາວ",
          flag: "la"
      },
      lt: {
          name: "Lietuvių",
          flag: "lt"
      },
      lv: {
          name: "Latviešu",
          flag: "lv"
      },
      lg: {
          name: "Oluganda",
          flag: "ug"
      },
      mg: {
          name: "Malagasy",
          flag: "mg"
      },
      mi: {
          name: "te reo Māori",
          flag: "nz"
      },
      mk: {
          name: "Македонски",
          flag: "mk"
      },
      ml: {
          name: "മലയാളം",
          flag: "in"
      },
      mn: {
          name: "Монгол",
          flag: "mn"
      },
      mr: {
          name: "मराठी",
          flag: "in"
      },
      ms: {
          name: "Bahasa Melayu",
          flag: "my"
      },
      mt: {
          name: "Malti",
          flag: "mt"
      },
      my: {
          name: "မျန္မာစာ",
          flag: "mm"
      },
      ne: {
          name: "नेपाली",
          flag: "np"
      },
      nl: {
          name: "Nederlands",
          flag: "nl"
      },
      no: {
          name: "Norsk",
          flag: "no"
      },
      ny: {
          name: "chiCheŵa",
          flag: "mw"
      },
      pa: {
          name: "ਪੰਜਾਬੀ",
          flag: "in"
      },
      pl: {
          name: "Polski",
          flag: "pl"
      },
      ps: {
          name: "پښتو",
          flag: "pk"
      },
      pt: {
          name: "Português",
          flag: "pt"
      },
      ro: {
          name: "Română",
          flag: "ro"
      },
      ru: {
          name: "Русский",
          flag: "ru"
      },
      sd: {
          name: '"سنڌي، سندھی, सिन्धी"',
          flag: "pk"
      },
      si: {
          name: "සිංහල",
          flag: "lk"
      },
      sk: {
          name: "Slovenčina",
          flag: "sk"
      },
      sl: {
          name: "Slovenščina",
          flag: "si"
      },
      sm: {
          name: '"gagana fa\'a Samoa"',
          flag: "ws"
      },
      sn: {
          name: "chiShona",
          flag: "zw"
      },
      so: {
          name: "Soomaaliga",
          flag: "so"
      },
      sq: {
          name: "Shqip",
          flag: "al"
      },
      sr: {
          name: "Српски",
          flag: "rs"
      },
      st: {
          name: "seSotho",
          flag: "ng"
      },
      su: {
          name: "Sundanese",
          flag: "sd"
      },
      sv: {
          name: "Svenska",
          flag: "se"
      },
      sw: {
          name: "Kiswahili",
          flag: "ke"
      },
      ta: {
          name: "தமிழ்",
          flag: "in"
      },
      te: {
          name: "తెలుగు",
          flag: "in"
      },
      tg: {
          name: "Тоҷикӣ",
          flag: "tj"
      },
      th: {
          name: "ภาษาไทย",
          flag: "th"
      },
      tl: {
          name: "Tagalog",
          flag: "ph"
      },
      to: {
          name: "faka-Tonga",
          flag: "to"
      },
      tr: {
          name: "Türkçe",
          flag: "tr"
      },
      tt: {
          name: "Tatar",
          flag: "tr"
      },
      tw: {
          name: "中文 (繁體)",
          flag: "tw"
      },
      ty: {
          name: '"te reo Tahiti, te reo Māʼohi"',
          flag: "pf"
      },
      uk: {
          name: "Українська",
          flag: "ua"
      },
      ur: {
          name: "اردو",
          flag: "pk"
      },
      uz: {
          name: '"O\'zbek"',
          flag: "uz"
      },
      vi: {
          name: "Tiếng Việt",
          flag: "vn"
      },
      xh: {
          name: "isiXhosa",
          flag: "za"
      },
      yi: {
          name: "ייִדיש",
          flag: "il"
      },
      yo: {
          name: "Yorùbá",
          flag: "ng"
      },
      zh: {
          name: "中文 (简体)",
          flag: "cn"
      },
      zu: {
          name: "isiZulu",
          flag: "za"
      },
      hm: {
          name: "Hmoob",
          flag: "hmn"
      },
      cb: {
          name: "Sugbuanon",
          flag: "ph"
      },
      or: {
          name: "ଓଡ଼ିଆ",
          flag: "in"
      },
      tk: {
          name: "Türkmen",
          flag: "tr"
      },
      ug: {
          name: "ئۇيغۇر",
          flag: "uig"
      },
      fc: {
          name: "Français (Canada)",
          flag: "ca"
      },
      as: {
          name: "অসমীয়া",
          flag: "in"
      },
      sa: {
          name: "Srpski",
          flag: "rs"
      },
      om: {
          name: "Afaan Oromoo",
          flag: "et"
      },
      iu: {
          name: "ᐃᓄᒃᑎᑐᑦ",
          flag: "ca"
      },
      ti: {
          name: "ቲግሪንያ",
          flag: "er"
      },
      bm: {
          name: "Bamanankan",
          flag: "ml"
      },
      bo: {
          name: "བོད་ཡིག",
          flag: "cn"
      },
      ak: {
          name: "Baoulé",
          flag: "gh"
      },
      rw: {
          name: "Kinyarwanda",
          flag: "rw"
      },
      kb: {
          name: "سۆرانی",
          flag: "iq"
      },
      fo: {
          name: "Føroyskt",
          flag: "fo"
      },
      il: {
          name: "Ilokano",
          flag: "ph"
      }
  };
  function qr(e) {
      if (!e || !e.toLowerCase)
          return "Unknown";
      var t = e.toLowerCase()
        , n = Ia.languages.find((function(e) {
          var n = e.language_to
            , r = e.custom_code;
          return n === t || (r ? r.toLowerCase() === t : void 0)
      }
      ));
      return n && n.custom_local_name ? n.custom_local_name : n && n.custom_name ? n.custom_name : t === Ia.language_from && Ia.language_from_custom_name ? Ia.language_from_custom_name : Mr[t] ? Mr[t].name : "Unknown"
  }
  function zr(e, t) {
      return t[e] ? t[e].flag : ""
  }
  function Br(e) {
      return function(e, t, n) {
          if (!e || !e.toLowerCase)
              return "";
          if (t.language_from === e)
              return t.language_from_custom_flag || zr(e, n);
          var r = e.toLowerCase()
            , o = t.languages.find((function(e) {
              var t = e.language_to
                , n = e.custom_code;
              return t === r || n && n.toLowerCase() === r
          }
          ));
          return o ? o.custom_flag || zr(o.language_to, n) : ""
      }(e, Ia, Mr)
  }
  function $r(e, t, n) {
      return t < e ? e : t > n ? n : t
  }
  function Vr(e, t) {
      return t && 1 !== t ? Math.round(e * t * 100) / 100 : e
  }
  function Gr(e, t) {
      return "WordPress" === Ia.technology_name && Ia.injectedData && !Ia.is_connect ? t(Ia.injectedData.switcher_links[e]) : rt(e, t)
  }
  var Jr = 13
    , Xr = 27
    , Yr = 38
    , Kr = 40;
  var Zr = ["none", "shiny", "square", "circle", "rectangle_mat"];
  function Qr(e) {
      return e ? e.getBoundingClientRect() : {
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0
      }
  }
  function eo() {
      var e = Xn("WordPress" === Ia.technology_name && Ia.injectedData && !Ia.is_connect ? Ia.injectedData.current_language : Ia.switcher_editor ? Ia.language_from : window.Weglot.getCurrentLang())
        , t = e[0]
        , n = e[1];
      return Yn((function() {
          Ia.is_connect || "WordPress" === Ia.technology_name || Ia.switcher_editor || window.Weglot.on("languageChanged", (function(e) {
              n(e)
          }
          ))
      }
      ), []),
      [t, n]
  }
  function to(e, t) {
      var n = window.innerWidth > 0 ? window.innerWidth : screen.width
        , r = t || 768;
      return "mobile" === e ? n <= r : n > r
  }
  function no(e, t, n) {
      var r = Xn(!1)
        , o = r[0]
        , a = r[1]
        , i = e.style;
      void 0 === i && (i = {});
      var s = e.colors;
      return void 0 === s && (s = {}),
      Yn((function() {
          var e = i.size_scale;
          if (e && 1 !== e) {
              var r, o, c, l, u = (r = t({
                  style: i,
                  colors: s
              }),
              o = n,
              c = Ia.button_style && Ia.button_style.custom_css,
              l = r.map((function(e) {
                  var t = e.selector
                    , n = e.declarations;
                  return ["aside.country-selector.weglot_switcher." + o + t + " {", Object.keys(n).map((function(e) {
                      return "\t" + e.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase() + ": " + n[e] + ";"
                  }
                  )).join("\n"), "}"].join("\n")
              }
              )).join("\n\n"),
              !c || Ia.switcher_gallery ? l : l + "\n\n" + c);
              !function(e, t) {
                  if (e) {
                      var n = document.querySelector("style#weglot-switcher-" + t);
                      if (n)
                          n.textContent = e;
                      else if (document.head) {
                          var r = document.createElement("style");
                          r.id = "weglot-switcher-" + t,
                          r.textContent = e,
                          document.head.appendChild(r)
                      }
                  }
              }(u, n),
              a(!0)
          }
      }
      ), []),
      o
  }
  function ro(e) {
      var t = e.close_outside_click;
      void 0 === t && (t = !1);
      var n = e.open_hover;
      void 0 === n && (n = !1);
      var r = eo()
        , o = r[0]
        , a = r[1]
        , i = Xn(!1)
        , s = i[0]
        , c = i[1]
        , l = function(e) {
          var t = Kn(null);
          return Yn((function() {
              if (e)
                  return document.addEventListener("mousedown", n),
                  function() {
                      document.removeEventListener("mousedown", n)
                  }
                  ;
              function n(n) {
                  t.current && !t.current.contains(n.target) && e()
              }
          }
          ), [t]),
          t
      }(t && !n && x)
        , f = Kn(null)
        , d = wt().filter((function(e) {
          return e !== o
      }
      ))
        , g = Xn(null)
        , p = g[0]
        , _ = g[1]
        , h = Xn(!1)
        , m = h[0]
        , v = h[1]
        , y = Xn(!1)
        , w = y[0]
        , b = y[1];
      function k() {
          var e = Qr(l.current)
            , t = e.bottom;
          void 0 === t && (t = 0);
          var n = e.left;
          void 0 === n && (n = 0),
          b(t > window.innerHeight / 2),
          v(n > window.innerWidth / 2),
          c(!0)
      }
      function x() {
          c(!1),
          _(null)
      }
      function E() {
          return s ? x() : k()
      }
      function C(e) {
          if (Ia.switcher_editor)
              return c(!1);
          var t;
          a(e),
          t = e,
          "WordPress" === Ia.technology_name && Ia.injectedData && !Ia.is_connect ? Gr(t, (function(e) {
              u(window.location.hostname) ? window.dispatchEvent(new CustomEvent("veLanguageChangeUrl",{
                  detail: {
                      targetUrl: e
                  }
              })) : window.location.replace(e)
          }
          )) : window.Weglot.switchTo(t),
          c(!1)
      }
      return Yn((function() {
          p && f.current.scrollIntoView({
              block: "center"
          })
      }
      ), [p]),
      {
          open: s,
          opensUpward: w,
          opensLeftward: m,
          language: o,
          otherLanguages: d,
          focusedLanguage: p,
          switcherContainerRef: l,
          focusedLanguageRef: f,
          handleMouseEnter: function() {
              n && k()
          },
          handleMouseLeave: function() {
              n && x()
          },
          handleKeyDown: function(e) {
              return e.keyCode === Jr ? (e.preventDefault(),
              p && C(p),
              E()) : e.keyCode === Kr || e.keyCode === Yr ? (e.preventDefault(),
              void function(e) {
                  var t = e === Kr ? "down" : "up"
                    , n = d.slice(-1).pop()
                    , r = d[0]
                    , o = Qr(l.current).bottom;
                  void 0 === o && (o = 0);
                  var a = o > window.innerHeight / 2;
                  if (!p || !s) {
                      return _("down" === t ? r : n),
                      void (!s && ("up" === t && a || "down" === t && !a) && k())
                  }
                  if (!a && "up" === t && p === r || a && "down" === t && p === n)
                      return void E();
                  var i = "up" === t ? -1 : 1
                    , c = d.indexOf(p) + i;
                  if (c === d.length || -1 === c)
                      return;
                  _(d[c])
              }(e.keyCode)) : void (e.keyCode === Xr && s && (e.preventDefault(),
              E()))
          },
          switchLanguage: C,
          toggleOpen: E
      }
  }
  var oo = {
      rectangle_mat: {
          width: 30,
          height: 20
      },
      shiny: {
          width: 30,
          height: 20
      },
      circle: {
          width: 24,
          height: 24
      },
      square: {
          width: 24,
          height: 24
      }
  }
    , ao = function(e) {
      var t = e.language
        , n = e.flagType;
      void 0 === n && (n = "circle");
      var r = e.size_scale
        , o = Br(t)
        , a = oo[n] || {}
        , i = a.width
        , s = a.height;
      if (o)
          return dn("img", {
              src: o.indexOf("http") > -1 ? o : "https://cdn.weglot.com/flags/" + n + "/" + o + ".svg",
              width: Vr(i, r),
              height: Vr(s, r),
              className: "wg-flag",
              role: "none",
              alt: qr(t) + " flag"
          })
  }
    , io = function(e) {
      var t = e.styleOpts
        , n = e.language
        , r = e.onClick
        , o = e.legacyFlags
        , a = e.open;
      void 0 === a && (a = !1);
      var i = e.url
        , s = e.focusedLanguage
        , c = e.isSelected;
      void 0 === c && (c = !1);
      var l = e.focusRef;
      void 0 === l && (l = null);
      var u = t.with_name;
      void 0 === u && (u = !0);
      var f = t.full_name;
      void 0 === f && (f = !0);
      var d = t.with_flags
        , g = t.size_scale
        , p = t.flag_type
        , _ = !!s && n === s
        , h = f ? qr(n) : n.toUpperCase()
        , m = c ? "div" : "li"
        , v = Zr.indexOf(p || "rectangle_mat")
        , y = d ? " wg-flags" + (o ? " flag-" + v + " legacy" : "") : ""
        , w = _ && !c ? " focus" : ""
        , b = c ? " wgcurrent" : "";
      return dn(m, Object.assign({}, {
          "data-l": n,
          onClick: function(e) {
              return function(e, t) {
                  e.preventDefault(),
                  r(t)
              }(e, n)
          },
          className: "wg-li " + n + b + y + w
      }, c ? {
          role: "combobox",
          "aria-activedescendant": s ? "weglot-language-" + s : "",
          "aria-label": "Language",
          tabindex: "0",
          "aria-expanded": a,
          "aria-controls": "weglot-listbox"
      } : {
          role: "none",
          id: "wg-" + n
      }), dn("a", Object.assign({}, c ? {
          target: "_self"
      } : {
          role: "option"
      }, {
          href: i
      }, !u && {
          "aria-label": h
      }, _ && !c && {
          ref: l
      }, {
          id: "weglot-language-" + n,
          tabIndex: -1
      }), d && !o && dn(ao, {
          language: n,
          flagType: p,
          size_scale: g
      }), u && h))
  };
  function so(e) {
      var t = e.style.size_scale
        , n = function(e) {
          return Vr(e, t)
      };
      return [{
          selector: ".wg-drop ul",
          declarations: {
              top: n(38) + "px",
              bottom: "auto"
          }
      }, {
          selector: ".wg-drop.weg-openup ul",
          declarations: {
              bottom: n(38) + "px",
              top: "auto"
          }
      }, {
          selector: " a",
          declarations: {
              fontSize: n(13) + "px"
          }
      }, {
          selector: ".wg-drop a img.wg-flag",
          declarations: {
              height: n(30) + "px"
          }
      }, {
          selector: ".wg-drop .wg-li.wgcurrent",
          declarations: {
              height: n(38) + "px",
              display: "flex",
              alignItems: "center"
          }
      }, {
          selector: ".wg-drop a",
          declarations: {
              height: n(38) + "px"
          }
      }, {
          selector: " .wgcurrent:after",
          declarations: {
              height: n(38) + "px",
              backgroundSize: n(9) + "px"
          }
      }, {
          selector: ".wg-drop .wgcurrent a",
          declarations: {
              paddingRight: $r(22, n(40), 40) + "px",
              paddingLeft: $r(5, n(10), 10) + "px"
          }
      }]
  }
  var co, lo, uo, fo = "default", go = function(e, t) {
      return function(n) {
          var r = n || {}
            , o = r.style;
          void 0 === o && (o = {});
          var a = r.opts;
          void 0 === a && (a = {});
          var i = r.colors;
          void 0 === i && (i = {});
          var s = Wr(t)
            , c = s.style
            , l = s.opts
            , u = s.colors
            , f = document.createElement("div");
          return function(e, t, n) {
              var r, o, a;
              Qt.__ && Qt.__(e, t),
              o = (r = "function" == typeof n) ? null : t.__k,
              a = [],
              Nn(t, e = (!r && n || t).__k = dn(pn, null, [e]), o || sn, sn, void 0 !== t.ownerSVGElement, !r && n ? [n] : o ? null : t.firstChild ? Zt.call(t.childNodes) : null, a, !r && n ? n : o ? o.__e : t.firstChild, r),
              Tn(a, e)
          }(dn(Ir, {
              logger: Hr.error,
              displayError: !1
          }, dn(e, {
              style: Object.assign({}, c, o),
              opts: Object.assign({}, l, a),
              colors: Object.assign({}, u, i)
          })), f),
          f.classList.add("weglot-container"),
          f
      }
  }((function(e) {
      var t = e.style
        , n = e.opts
        , r = ro(n)
        , o = r.open
        , a = r.opensUpward
        , i = r.opensLeftward
        , s = r.language
        , c = r.focusedLanguage
        , l = r.switcherContainerRef
        , u = r.focusedLanguageRef
        , f = r.handleMouseEnter
        , d = r.handleMouseLeave
        , g = r.handleKeyDown
        , p = r.switchLanguage
        , _ = r.toggleOpen
        , h = function() {
          var e = wt()
            , t = Xn(e.reduce((function(e, t) {
              var n;
              return Object.assign({}, e, ((n = {})[t] = "",
              n))
          }
          ), {}))
            , n = t[0]
            , r = t[1];
          return Yn((function() {
              Promise.all(e.map((function(e) {
                  return new Promise((function(t) {
                      return Gr(e, (function(n) {
                          return t({
                              l: e,
                              url: n
                          })
                      }
                      ))
                  }
                  ))
              }
              ))).then((function(e) {
                  return r(e.reduce((function(e, t) {
                      var n, r = t.l, o = t.url;
                      return Object.assign({}, e, ((n = {})[r] = o,
                      n))
                  }
                  ), {}))
              }
              ))
          }
          ), []),
          n
      }()
        , m = function(e) {
          var t = e.is_responsive
            , n = e.display_device
            , r = e.pixel_cutoff
            , o = Xn(!t || to(n, r))
            , a = o[0]
            , i = o[1]
            , s = function() {
              return i(to(n, r))
          };
          return Yn((function() {
              if (t)
                  return window.addEventListener("resize", s),
                  function() {
                      window.removeEventListener("resize", s)
                  }
          }
          ), [t, n, r]),
          a
      }(n);
      no({
          style: t
      }, so, fo);
      var v = Ia.switcher_editor
        , y = t.is_dropdown
        , w = t.invert_flags
        , b = y || w
        , k = wt().filter((function(e) {
          return !b || e !== s
      }
      ))
        , x = /background-position/i.test(Ia.button_style.custom_css) && !Ia.languages.some((function(e) {
          return e.custom_flag
      }
      ))
        , E = function() {
          for (var e, t, n = arguments, r = 0, o = "", a = arguments.length; r < a; r++)
              (e = n[r]) && (t = In(e)) && (o && (o += " "),
              o += t);
          return o
      }({
          open: o,
          closed: !o,
          "wg-drop": y,
          "wg-list": !y,
          "weg-openup": a && o,
          "weg-openleft": i && o,
          "wg-editor": v
      });
      return m ? dn("aside", {
          ref: l,
          "data-wg-notranslate": !0,
          onKeyDown: g,
          onMouseEnter: f,
          onMouseLeave: d,
          className: "weglot_switcher country-selector default " + E,
          "aria-label": "Language selected: " + qr(s)
      }, b && dn(io, {
          styleOpts: t,
          open: o,
          focusedLanguage: c,
          language: s,
          isSelected: !0,
          onClick: _,
          legacyFlags: x,
          url: "#"
      }), dn("ul", {
          role: "listbox",
          id: "weglot-listbox",
          style: !o && t.is_dropdown && {
              display: "none"
          }
      }, k.map((function(e) {
          return dn(io, {
              language: e,
              url: e === s ? "#" : h[e],
              onClick: p,
              isSelected: e === s,
              focusedLanguage: c,
              key: "wg-" + e,
              focusRef: u,
              styleOpts: t,
              legacyFlags: x
          })
      }
      )))) : dn(pn, null)
  }
  ), fo), po = 0, _o = [];
  function ho(e, t) {
      if (void 0 === t && (t = document.documentElement),
      e && !e.ready) {
          var n = e.style || Ia.button_style
            , r = e.location;
          void 0 === r && (r = {});
          var o = function(e, t) {
              void 0 === e && (e = {});
              var n = e.target
                , r = e.sibling;
              if (!n)
                  return {
                      defaultPosition: !0
                  };
              var o = pe(t, n);
              if (!o.length)
                  return {
                      error: Ee(n) ? "The provided target is not on this page." : "The provided target is not a valid CSS selector."
                  };
              var a = pe(t, r);
              if (!r || !a.length)
                  return {
                      targetNode: o[0],
                      siblingNode: null
                  };
              var i = Array.from(o)
                , s = Array.from(a)
                , c = null
                , l = s.find((function(e) {
                  return c = i.find((function(t) {
                      return e.parentNode === t
                  }
                  )),
                  !!c
              }
              ));
              return l && c ? {
                  targetNode: c,
                  siblingNode: l
              } : {
                  error: "The provided sibling selector does not belong to target element."
              }
          }(r, t)
            , a = o.error
            , i = o.targetNode
            , s = o.siblingNode
            , c = o.defaultPosition;
          if (!a) {
              var l = go(Object.assign({}, e, !Ia.switcher_editor && {
                  style: n
              }));
              if (l.weglotSwitcher = e,
              _o.push(l),
              c)
                  return l.classList.add("wg-default"),
                  document.body.appendChild(l),
                  e.ready = !0,
                  l;
              l.setAttribute("data-switcher-id", String(++po)),
              l.id = "weglot-switcher-" + po,
              l.setAttribute("data-switcher-style-opt", JSON.stringify(n)),
              i.insertBefore(l, s),
              e.ready = !0;
              for (var u = 0, f = t.querySelectorAll(".weglot-container:empty"); u < f.length; u += 1) {
                  ve(f[u])
              }
              return l
          }
          B.warn(a, {
              sendToDatadog: !1
          })
      }
  }
  function mo(e) {
      var t = e.name
        , n = e.hash;
      if (void 0 === n && (n = null),
      _e(document.documentElement, "script#weglot-switcher-" + t))
          return !1;
      var r = !Ia.switcher_editor && n ? t + "." + n : t
        , o = document.getElementsByTagName("head")[0] || document.documentElement
        , a = document.createElement("script");
      return a.type = "text/javascript",
      a.src = "https://cdn.weglot.com/switchers/" + r + ".min.js",
      a.id = "weglot-switcher-" + t,
      o.insertBefore(a, o.firstChild),
      !0
  }
  function vo() {
      co || Ie("switchersReady", Be()),
      co = !0,
      clearTimeout(uo),
      lo && lo.parentNode.removeChild(lo)
  }
  function yo(e) {
      if (void 0 === e && (e = document),
      !(wt().length < 2 || Ia.hide_switcher || Ia.switcher_editor)) {
          var t = e.isConnected ? e : document;
          (function(e) {
              void 0 === e && (e = document.body);
              var t = Ia.linkHooksConfig && Ia.linkHooksConfig.additionalCheckSelectors || [];
              if (0 === pe(e, ['a[href^="#Weglot-"]', 'a[href*="change-language.weglot.com/"]'].concat(t).join(",")).length)
                  return;
              for (var n = !1, r = 0, o = wt(); r < o.length; r += 1) {
                  var a = o[r]
                    , i = pe(e, ba(a));
                  if (0 !== i.length) {
                      n = !0;
                      for (var s = 0, c = i; s < c.length; s += 1) {
                          ka(a, c[s])
                      }
                  }
              }
              return Pe("languageChanged", (function(e) {
                  for (var t = 0, n = wa; t < n.length; t += 1) {
                      var r = n[t]
                        , o = r.language
                        , a = r.links;
                      if (o === e)
                          for (var i = 0, s = a; i < s.length; i += 1) {
                              var c = s[i];
                              c.classList.add("weglot-link--active"),
                              Ia.linkHooksConfig && Ia.linkHooksConfig.onLinkActive && Ia.linkHooksConfig.onLinkActive(c)
                          }
                      else
                          for (var l = 0, u = a; l < u.length; l += 1) {
                              var f = u[l];
                              f.classList.remove("weglot-link--active"),
                              Ia.linkHooksConfig && Ia.linkHooksConfig.offLinkActive && Ia.linkHooksConfig.offLinkActive(f)
                          }
                  }
              }
              ), !0),
              n
          }
          )(t) && vo();
          var n = t.querySelectorAll("#weglot_here:not(.weglot-container),.weglot_here:not(.weglot-container)");
          if (n.length) {
              for (var r = 0, o = n; r < o.length; r += 1) {
                  var a = o[r]
                    , i = go({
                      style: Ia.button_style
                  });
                  i.classList.add("weglot_here"),
                  a.parentNode.insertBefore(i, a),
                  ve(a)
              }
              vo()
          }
          for (var s = 0, c = Ia.switchers; s < c.length; s += 1) {
              var l = c[s];
              if (!l.default) {
                  var u = l.template;
                  if (u) {
                      if (u.name) {
                          if (!mo(u)) {
                              var f = window.Weglot.switchers && window.Weglot.switchers[u.name];
                              f && f.addSwitchers(t)
                          }
                          vo()
                      }
                  } else
                      ho(l, t) && vo()
              }
          }
          if (!co && !lo) {
              var d = Ia.switchers.find((function(e) {
                  return e.default
              }
              )) || {
                  style: Ia.button_style
              };
              uo = setTimeout((function() {
                  lo = ho(d),
                  Ie("switchersReady", Be())
              }
              ))
          }
      }
  }
  Pe("onCurrentLocationChanged", (function() {
      _o.forEach((function(e) {
          return e.parentNode && e.parentNode.removeChild(e)
      }
      )),
      _o.splice(0),
      function() {
          for (var e = window.Weglot.switchers || {}, t = 0, n = Object.keys(e); t < n.length; t += 1)
              e[n[t]].removeSwitchers()
      }(),
      co = null,
      lo = null,
      po = 0,
      Ia.button_style.ready = !1,
      Ia.switchers.map((function(e) {
          return e.ready = !1
      }
      )),
      yo()
  }
  ), !0);
  var wo = 0;
  function bo() {
      var e = ["name", "value"];
      Ia.translate_event.forEach((function(t) {
          for (var n = pe(document.body, t.selector), r = function() {
              var n = a[o];
              if (n.alreadyListeningEventInput)
                  return !n.alreadyListeningEventInput.isConnected && wo < 10 && (wo++,
                  n.parentNode.insertBefore(n.alreadyListeningEventInput, n.nextSibling)),
                  {};
              var r = n.cloneNode(!0);
              if (!r)
                  return {};
              r.name = "",
              n.alreadyListeningEventInput = r,
              n.parentNode.insertBefore(r, n.nextSibling),
              n.style.display = "none",
              new MutationObserver((function(t) {
                  for (var o = 0, a = t; o < a.length; o += 1) {
                      var i = a[o]
                        , s = n.getAttribute(i.attributeName);
                      e.includes(i.attributeName) && r.setAttribute(i.attributeName, s)
                  }
              }
              )).observe(n, {
                  attributes: !0
              });
              var i = Se((function(e) {
                  13 === e.keyCode && e.target.form ? e.target.form.dispatchEvent(new Event("submit")) : Gt(e.target.value, (function(e) {
                      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(n, e);
                      var r = t.eventName || n.getAttribute("data-wg-translate-event")
                        , o = document.createEvent("HTMLEvents");
                      o.initEvent("focus", !0, !1),
                      n.dispatchEvent(o),
                      o.initEvent(r, !0, !1),
                      n.dispatchEvent(o)
                  }
                  ))
              }
              ), 400);
              r.addEventListener("keydown", i)
          }, o = 0, a = n; o < a.length; o += 1) {
              var i = r();
              if (i)
                  return i.v
          }
      }
      ))
  }
  try {
      var ko = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function(e) {
          var t = ko.call(this, e);
          return xo([this]),
          t
      }
  } catch (Kn) {}
  function xo(e) {
      if (Ia.translate_shadow_roots) {
          e || (e = pe(document, Ia.dynamics.map((function(e) {
              return e.value
          }
          )).join(",")));
          for (var t = 0, n = e; t < n.length; t += 1) {
              var r = n[t];
              if (r.shadowRoot && !r.shadowRoot.wgTranslated) {
                  r.shadowRoot.wgTranslated = !0,
                  Ro(r.shadowRoot);
                  var o = Ft(r.shadowRoot);
                  o.length && (Wt(o),
                  Do(o))
              }
          }
      }
  }
  var Eo, Co = null, Oo = [], So = [X, "class", "id"], Lo = [], No = [];
  function To(e, t) {
      Eo && clearTimeout(Eo);
      for (var n = 0, r = t; n < r.length; n += 1) {
          var o = r[n];
          1 === o.nodeType && Oo.push(o)
      }
      Oo.length && (Eo = setTimeout((function() {
          yo(e),
          bo(),
          Ia.subdomain && function(e) {
              var t = window.location.hostname;
              if (-1 !== [Ia.host].concat(l).indexOf(t))
                  return;
              for (var n = 0, r = e; n < r.length; n += 1)
                  for (var o = r[n], a = 0, i = pe(o, "[href]"); a < i.length; a += 1) {
                      var s = i[a];
                      if (!v(s)) {
                          var c = s.getAttribute("href");
                          c && c.includes("//" + Ia.host) && s.setAttribute("href", c.replace(Ia.host, t))
                      }
                  }
          }(Oo),
          Ia.proxify_iframes && Ia.proxify_iframes.length && Oo.forEach((function(e) {
              return Xt({
                  node: e
              })
          }
          )),
          xo(Oo),
          je("onDynamicDetected"),
          Oo = []
      }
      ), 100))
  }
  function jo(e, t) {
      var n = Ia.dynamics
        , r = Po;
      t !== document ? r = function() {
          return !0
      }
      : n && 0 !== n.length || (r = function() {
          return !1
      }
      );
      try {
          if (yt())
              return;
          if (e = function(e, t) {
              var n = []
                , r = e.filter((function(e) {
                  var r = e.addedNodes
                    , o = e.type
                    , a = e.target;
                  "attributes" === o && function(e) {
                      "IMG" === e.nodeName && e.srcset && e.dataset.wgtranslated && (e.setAttribute("wgsrcset", e.srcset),
                      e.srcset = "")
                  }(a);
                  var i = function(e) {
                      do {
                          if (e.weglot && e.weglot.setted)
                              return e;
                          e = e.parentElement || e.parentNode
                      } while (e)
                  }(a);
                  return i ? (n.push(i),
                  !1) : r.length ? (setTimeout((function() {
                      return To(a, r)
                  }
                  )),
                  !Co || !a || !he(a, Co)) : !So.includes(e.attributeName) && t(a) && ("characterData" === o || "attributes" === o)
              }
              ));
              if (n.length)
                  for (var o = 0, a = n; o < a.length; o += 1) {
                      a[o].weglot.setted = !1
                  }
              return r
          }(e, r),
          !n || 0 === n.length)
              return;
          if (e.length)
              try {
                  !function(e, t, n) {
                      void 0 === n && (n = !0);
                      for (var r = [], o = function(e) {
                          var n = e.outerHTML || e.textContent;
                          if (e.wgParsedHTML !== n) {
                              e.wgParsedHTML = n;
                              for (var o = Ft(e, (function(e) {
                                  var n = e.element;
                                  return !function(e) {
                                      return e.weglot && e.weglot.dynamic > 20
                                  }(n) && t(n)
                              }
                              )), a = 0, i = o; a < i.length; a += 1) {
                                  var s = i[a];
                                  Ia.ignoreDynamicFragments && !document.body.contains(s) || (s.weglot.dynamic || (s.weglot.dynamic = 0),
                                  s.weglot.dynamic++,
                                  r.push(s))
                              }
                              return null
                          }
                      }, a = [], i = 0, s = e; i < s.length; i += 1) {
                          var c = s[i]
                            , l = c.type
                            , u = c.target
                            , f = c.addedNodes;
                          switch (l) {
                          case "attributes":
                          case "characterData":
                              if (a.includes(u))
                                  break;
                              a.push(u),
                              o(u);
                              break;
                          case "childList":
                              var d = f.length > 1 ? u : f[0];
                              if (a.includes(d))
                                  break;
                              if (o(d),
                              a.push(d),
                              !n)
                                  break;
                              for (var g = 0, p = f; g < p.length; g += 1) {
                                  var _ = p[g]
                                    , h = [];
                                  "IFRAME" === _.tagName ? h = [_] : _.querySelectorAll && (h = _.querySelectorAll("iframe"));
                                  for (var m = 0; m < h.length; m++) {
                                      var y = h[m];
                                      t(y) && Le(y) && !v(y) && (o(y.contentWindow.document),
                                      Ro(y.contentWindow.document))
                                  }
                              }
                          }
                      }
                      r.length && (Wt(r),
                      Do(r))
                  }(e, r)
              } catch (e) {
                  B.warn(e)
              }
      } catch (e) {
          B.warn(e, {
              consoleOverride: "Error in MutationObserver"
          })
      }
  }
  var Ao = !1;
  function Ro(e) {
      var t = e !== document ? e : e.body || e
        , n = new MutationObserver((function(t) {
          var n;
          if (Ao)
              jo(t, e);
          else {
              var r = Lo.find((function(t) {
                  return t.documentElement === e
              }
              ));
              r ? (n = r.mutations).push.apply(n, t) : Lo.push({
                  documentElement: e,
                  mutations: [].concat(t)
              })
          }
      }
      ));
      n.observe(t, {
          childList: !0,
          subtree: !0,
          characterData: !0,
          attributes: !0
      }),
      No.push(n)
  }
  function Po(e) {
      return !(!Ia.dynamics || 0 === Ia.dynamics.length) && (e && e.closest || (e = e.parentNode),
      e && e.closest && he(e, Ia.dynamics.map((function(e) {
          return e.value
      }
      )).join(", ")))
  }
  var Io = {
      times: [],
      timeout: null,
      nodes: []
  };
  function Do(e) {
      void 0 === e && (e = []),
      clearTimeout(Io.timeout);
      var t = Be();
      if (t !== Ia.language_from) {
          if (Io.times = Io.times.filter((function(e) {
              return e > Date.now() - 1e3
          }
          )),
          Io.times.length && (Io.timeout || Io.times.length >= 10))
              return Io.nodes = Io.nodes.concat(e),
              void (Io.timeout = setTimeout((function() {
                  return Do()
              }
              ), 1e3));
          Io.timeout = null,
          Io.times.push(Date.now());
          var n = Io.nodes.concat(e);
          return Io.nodes = [],
          Vt(Ht(n), t, {
              title: !1,
              cdn: !0,
              nodes: n
          }).then((function(e) {
              return Mt(e, t, n)
          }
          ))
      }
  }
  var Fo = [{
      codes: ["no"],
      pattern: /^(nn|nb)(-[a-z]+)?$/i
  }, {
      codes: ["zh"],
      pattern: /^zh(-hans(-\w{2})?)?(-(cn|sg))?$/i
  }, {
      codes: ["tw", "zh-TW"],
      pattern: /^zh-(hant)?-?(tw|hk|mo)?$/i
  }, {
      codes: ["br"],
      pattern: /^pt-br$/i
  }, {
      codes: ["fl"],
      pattern: /^fil$/i
  }];
  function Uo(e) {
      void 0 === e && (e = wt());
      for (var t = {}, n = {}, r = 0, o = e; r < o.length; r += 1) {
          var a = o[r]
            , i = a.toLowerCase()
            , s = i.substring(0, 2);
          t[s] || (t[s] = []),
          t[s].push(i),
          n[i] = a
      }
      for (var c = 0, l = navigator.languages || [navigator.language]; c < l.length; c += 1) {
          var u = l[c]
            , f = u.toLowerCase()
            , d = f.substring(0, 2);
          if (n[f])
              return n[f];
          for (var g = 0, p = Fo; g < p.length; g += 1) {
              var _ = p[g]
                , h = _.codes
                , m = _.pattern
                , v = h.find((function(t) {
                  return e.includes(t)
              }
              ));
              if (v && m.test(u))
                  return v
          }
          if (t[d]) {
              if ("zh" === d)
                  continue;
              var y = t[d].indexOf(d);
              return y >= 0 ? n[t[d][y]] : n[t[d].shift()]
          }
      }
  }
  function Wo() {
      if (window.location.search.indexOf("no_redirect=true") > -1)
          Ho(Be());
      else if (!(!Ia.auto_switch || Ia.subdirectory && Ia.injectedData || Je({
          type: "cookie"
      }).getItem("WG_CHOOSE_ORIGINAL") || xe() || Ia.visual_editor)) {
          var e = Uo();
          return e && !yt(e) ? e : Ia.auto_switch_fallback && !yt(Ia.auto_switch_fallback) ? Ia.auto_switch_fallback : void 0
      }
  }
  function Ho(e) {
      if (e === Ia.language_from) {
          var t = new Date;
          t.setTime(t.getTime() + 2592e6),
          Je({
              type: "cookie"
          }).setItem("WG_CHOOSE_ORIGINAL", "1", {
              expires: t.toUTCString()
          })
      } else
          Je({
              type: "cookie"
          }).removeItem("WG_CHOOSE_ORIGINAL")
  }
  function Mo() {
      ve(me(J))
  }
  function qo() {
      var e = me("wg_progress").firstElementChild
        , t = e.getAttribute("aria-valuenow")
        , n = parseInt(t) + (4 * Math.random() + 2);
      n <= 100 && (e.setAttribute("aria-valuenow", n.toString()),
      e.style.width = n + "%")
  }
  function zo(e) {
      clearInterval(e),
      ve(me("wg_progress"))
  }
  var Bo = function(e, t) {
      return Array.prototype.slice.call(e, t)
  }
    , $o = null;
  "undefined" != typeof WorkerGlobalScope && self instanceof WorkerGlobalScope ? $o = self : "undefined" != typeof global ? $o = global : window && ($o = window);
  var Vo = $o
    , Go = $o.document
    , Jo = ["load", "loadend", "loadstart"]
    , Xo = ["progress", "abort", "error", "timeout"]
    , Yo = function(e) {
      return ["returnValue", "totalSize", "position"].includes(e)
  }
    , Ko = function(e, t) {
      for (var n in e)
          if (!Yo(n)) {
              var r = e[n];
              try {
                  t[n] = r
              } catch (e) {}
          }
      return t
  }
    , Zo = function(e, t, n) {
      for (var r = function(e) {
          return function(r) {
              var o = {};
              for (var a in r)
                  if (!Yo(a)) {
                      var i = r[a];
                      o[a] = i === t ? n : i
                  }
              return n.dispatchEvent(e, o)
          }
      }, o = 0, a = Array.from(e); o < a.length; o += 1) {
          var i = a[o];
          n._has(i) && (t["on" + i] = r(i))
      }
  }
    , Qo = function(e) {
      if (Go && null != Go.createEventObject) {
          var t = Go.createEventObject();
          return t.type = e,
          t
      }
      try {
          return new Event(e)
      } catch (t) {
          return {
              type: e
          }
      }
  }
    , ea = function(e) {
      var t = {}
        , n = function(e) {
          return t[e] || []
      }
        , r = {
          addEventListener: function(e, r, o) {
              t[e] = n(e),
              t[e].indexOf(r) >= 0 || (o = void 0 === o ? t[e].length : o,
              t[e].splice(o, 0, r))
          },
          removeEventListener: function(e, r) {
              if (void 0 !== e) {
                  void 0 === r && (t[e] = []);
                  var o = n(e).indexOf(r);
                  -1 !== o && n(e).splice(o, 1)
              } else
                  t = {}
          },
          dispatchEvent: function() {
              var t = Bo(arguments)
                , o = t.shift();
              e || (t[0] = Ko(t[0], Qo(o)),
              Object.defineProperty(t[0], "target", {
                  writable: !1,
                  value: this
              }));
              var a = r["on" + o];
              a && a.apply(r, t);
              for (var i = n(o).concat(n("*")), s = 0; s < i.length; s++) {
                  var c = i[s];
                  c.apply(r, t)
              }
          },
          _has: function(e) {
              return !(!t[e] && !r["on" + e])
          }
      };
      return e && (r.listeners = function(e) {
          return Bo(n(e))
      }
      ,
      r.on = r.addEventListener,
      r.off = r.removeEventListener,
      r.fire = r.dispatchEvent,
      r.once = function(e, t) {
          var n = function() {
              return r.off(e, n),
              t.apply(null, arguments)
          };
          return r.on(e, n)
      }
      ,
      r.destroy = function() {
          return t = {}
      }
      ),
      r
  }
    , ta = function(e, t) {
      switch (typeof e) {
      case "object":
          return n = e,
          Object.entries(n).map((function(e) {
              var t = e[0]
                , n = e[1];
              return t.toLowerCase() + ": " + n
          }
          )).join("\r\n");
      case "string":
          return function(e, t) {
              null == t && (t = {});
              for (var n = 0, r = e.split("\r\n"); n < r.length; n += 1) {
                  var o = r[n];
                  if (/([^:]+):\s*(.+)/.test(o)) {
                      var a = null != RegExp.$1 ? RegExp.$1.toLowerCase() : void 0
                        , i = RegExp.$2;
                      null == t[a] && (t[a] = i)
                  }
              }
              return t
          }(e, t)
      }
      var n;
      return []
  }
    , na = ea(!0)
    , ra = function(e) {
      return void 0 === e ? null : e
  }
    , oa = Vo.XMLHttpRequest
    , aa = function() {
      var e = new oa
        , t = {}
        , n = null
        , r = void 0
        , o = void 0
        , a = void 0
        , i = 0
        , s = function() {
          if (a.status = n || e.status,
          -1 !== n && (a.statusText = e.statusText),
          -1 === n)
              ;
          else {
              var t = ta(e.getAllResponseHeaders());
              for (var r in t) {
                  var o = t[r];
                  if (!a.headers[r]) {
                      var i = r.toLowerCase();
                      a.headers[i] = o
                  }
              }
          }
      }
        , c = function() {
          d.status = a.status,
          d.statusText = a.statusText
      }
        , l = function() {
          r || d.dispatchEvent("load", {}),
          d.dispatchEvent("loadend", {}),
          r && (d.readyState = 0)
      }
        , u = function(e) {
          for (; e > i && i < 4; )
              d.readyState = ++i,
              1 === i && d.dispatchEvent("loadstart", {}),
              2 === i && c(),
              4 === i && (c(),
              "text"in a && (d.responseText = a.text),
              "xml"in a && (d.responseXML = a.xml),
              "data"in a && (d.response = a.data),
              "finalUrl"in a && (d.responseURL = a.finalUrl)),
              d.dispatchEvent("readystatechange", {}),
              4 === i && (!1 === t.async ? l() : setTimeout(l, 0))
      }
        , f = function(e) {
          if (4 === e) {
              var n = na.listeners("after")
                , r = function() {
                  if (n.length > 0) {
                      var e = n.shift();
                      2 === e.length ? (e(t, a),
                      r()) : 3 === e.length && t.async ? e(t, a, r) : r()
                  } else
                      u(4)
              };
              r()
          } else
              u(e)
      }
        , d = ea();
      t.xhr = d,
      e.onreadystatechange = function(t) {
          try {
              2 === e.readyState && s()
          } catch (e) {}
          4 === e.readyState && (o = !1,
          s(),
          function() {
              if (e.responseType && "text" !== e.responseType)
                  "document" === e.responseType ? (a.xml = e.responseXML,
                  a.data = e.responseXML) : a.data = e.response;
              else {
                  a.text = e.responseText,
                  a.data = e.responseText;
                  try {
                      a.xml = e.responseXML
                  } catch (e) {}
              }
              "responseURL"in e && (a.finalUrl = e.responseURL)
          }()),
          f(e.readyState)
      }
      ;
      var g = function() {
          r = !0
      };
      d.addEventListener("error", g),
      d.addEventListener("timeout", g),
      d.addEventListener("abort", g),
      d.addEventListener("progress", (function(t) {
          i < 3 ? f(3) : e.readyState <= 3 && d.dispatchEvent("readystatechange", {})
      }
      )),
      "withCredentials"in e && (d.withCredentials = !1),
      d.status = 0;
      for (var p = 0, _ = Array.from(Xo.concat(Jo)); p < _.length; p += 1) {
          var h = _[p];
          d["on" + h] = null
      }
      if (d.open = function(e, n, s, c, l) {
          i = 0,
          r = !1,
          o = !1,
          t.headers = {},
          t.headerNames = {},
          t.status = 0,
          t.method = e,
          t.url = n,
          t.async = !1 !== s,
          t.user = c,
          t.pass = l,
          (a = {}).headers = {},
          f(1)
      }
      ,
      d.send = function(n) {
          for (var r, i, s = 0, c = ["type", "timeout", "withCredentials"]; s < c.length; s += 1)
              (i = "type" === (r = c[s]) ? "responseType" : r)in d && (t[r] = d[i]);
          t.body = n;
          var l = na.listeners("before")
            , u = function() {
              if (!l.length)
                  return function() {
                      Zo(Xo, e, d),
                      d.upload && Zo(Xo.concat(Jo), e.upload, d.upload),
                      o = !0,
                      e.open(t.method, t.url, t.async, t.user, t.pass);
                      for (var n = 0, a = ["type", "timeout", "withCredentials"]; n < a.length; n += 1)
                          i = "type" === (r = a[n]) ? "responseType" : r,
                          r in t && (e[i] = t[r]);
                      for (var s in t.headers) {
                          var c = t.headers[s];
                          s && e.setRequestHeader(s, c)
                      }
                      e.send(t.body)
                  }();
              var n = function(e) {
                  if ("object" == typeof e && ("number" == typeof e.status || "number" == typeof a.status))
                      return Ko(e, a),
                      "data"in e || (e.data = e.response || e.text),
                      void f(4);
                  u()
              };
              n.head = function(e) {
                  Ko(e, a),
                  f(2)
              }
              ,
              n.progress = function(e) {
                  Ko(e, a),
                  f(3)
              }
              ;
              var s = l.shift();
              1 === s.length ? n(s(t)) : 2 === s.length && t.async ? s(t, n) : n()
          };
          u()
      }
      ,
      d.abort = function() {
          n = -1,
          o ? e.abort() : d.dispatchEvent("abort", {})
      }
      ,
      d.setRequestHeader = function(e, n) {
          var r = null != e ? e.toLowerCase() : void 0
            , o = t.headerNames[r] = t.headerNames[r] || e;
          t.headers[o] && (n = t.headers[o] + ", " + n),
          t.headers[o] = n
      }
      ,
      d.getResponseHeader = function(e) {
          return ra(a.headers[e ? e.toLowerCase() : void 0])
      }
      ,
      d.getAllResponseHeaders = function() {
          return ra(ta(a.headers))
      }
      ,
      e.overrideMimeType && (d.overrideMimeType = function() {
          e.overrideMimeType.apply(e, arguments)
      }
      ),
      e.upload) {
          var m = ea();
          d.upload = m,
          t.upload = m
      }
      return d.UNSENT = 0,
      d.OPENED = 1,
      d.HEADERS_RECEIVED = 2,
      d.LOADING = 3,
      d.DONE = 4,
      d.response = "",
      d.responseText = "",
      d.responseXML = null,
      d.readyState = 0,
      d.statusText = "",
      d
  };
  aa.UNSENT = 0,
  aa.OPENED = 1,
  aa.HEADERS_RECEIVED = 2,
  aa.LOADING = 3,
  aa.DONE = 4;
  var ia = {
      patch: function() {
          oa && (Vo.XMLHttpRequest = aa)
      },
      unpatch: function() {
          oa && (Vo.XMLHttpRequest = oa)
      },
      Native: oa,
      Xhook: aa
  };
  function sa(e, t, n, r) {
      return new (n || (n = Promise))((function(t, o) {
          function a(e) {
              try {
                  s(r.next(e))
              } catch (e) {
                  o(e)
              }
          }
          function i(e) {
              try {
                  s(r.throw(e))
              } catch (e) {
                  o(e)
              }
          }
          function s(e) {
              var r;
              e.done ? t(e.value) : (r = e.value,
              r instanceof n ? r : new n((function(e) {
                  e(r)
              }
              ))).then(a, i)
          }
          s((r = r.apply(e, [])).next())
      }
      ))
  }
  var ca = Vo.fetch;
  function la(e) {
      return e instanceof Headers ? ua([].concat(e.entries())) : Array.isArray(e) ? ua(e) : e
  }
  function ua(e) {
      return e.reduce((function(e, t) {
          var n = t[0]
            , r = t[1];
          return e[n] = r,
          e
      }
      ), {})
  }
  var fa = function(e, t) {
      void 0 === t && (t = {
          headers: {}
      });
      var n, r, o = Object.assign(Object.assign({}, t), {
          isFetch: !0
      });
      if (e instanceof Request) {
          var a = (n = e,
          r = {},
          ["method", "headers", "body", "mode", "credentials", "cache", "redirect", "referrer", "referrerPolicy", "integrity", "keepalive", "signal", "url"].forEach((function(e) {
              return r[e] = n[e]
          }
          )),
          r)
            , i = Object.assign(Object.assign({}, la(a.headers)), la(o.headers));
          o = Object.assign(Object.assign(Object.assign({}, a), t), {
              headers: i,
              acceptedRequest: !0
          })
      } else
          o.url = e;
      var s = na.listeners("before")
        , c = na.listeners("after");
      return new Promise((function(t, n) {
          var r = this
            , a = t
            , i = function(e) {
              if (!c.length)
                  return a(e);
              var t = c.shift();
              return 2 === t.length ? (t(o, e),
              i(e)) : 3 === t.length ? t(o, e, i) : i(e)
          }
            , l = function(e) {
              if (void 0 !== e) {
                  var n = new Response(e.body || e.text,e);
                  return t(n),
                  void i(n)
              }
              u()
          }
            , u = function() {
              if (s.length) {
                  var e = s.shift();
                  return 1 === e.length ? l(e(o)) : 2 === e.length ? e(o, l) : void 0
              }
              f()
          }
            , f = function() {
              return sa(r, 0, void 0, (function*() {
                  var t = o.url;
                  o.isFetch,
                  o.acceptedRequest;
                  var r = function(e, t) {
                      var n = {};
                      for (var r in e)
                          Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
                      if (null != e && "function" == typeof Object.getOwnPropertySymbols) {
                          var o = 0;
                          for (r = Object.getOwnPropertySymbols(e); o < r.length; o++)
                              t.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[o]) && (n[r[o]] = e[r[o]])
                      }
                      return n
                  }(o, ["url", "isFetch", "acceptedRequest"]);
                  return e instanceof Request && r.body instanceof ReadableStream && (r.body = yield new Response(r.body).text()),
                  ca(t, r).then((function(e) {
                      return i(e)
                  }
                  )).catch((function(e) {
                      return a = n,
                      i(e),
                      n(e)
                  }
                  ))
              }
              ))
          };
          u()
      }
      ))
  }
    , da = {
      patch: function() {
          ca && (Vo.fetch = fa)
      },
      unpatch: function() {
          ca && (Vo.fetch = ca)
      },
      Native: ca,
      Xhook: fa
  }
    , ga = na;
  function pa(e, t) {
      var n = Ia.xhr_hooks
        , r = Ia.language_from
        , o = Be();
      if (r === o || yt())
          t();
      else {
          var a = e.url
            , i = n.filter(_a).find((function(e) {
              return t = a,
              !(!(n = e.url_wildcard) || "*" === n) && new RegExp("^" + n.replace(/\?/g, ".").replace(/\*/g, ".*") + "$").test(t);
              var t, n
          }
          ));
          if (i)
              return "proxify" === i.action ? (e.url = function(e, t) {
                  var n = Ia.language_from;
                  return "https://proxy.weglot.com/" + Ia.api_key + "/" + n + "/" + t + "/" + ("/" === e.slice(0, 1) && "//" !== e.slice(0, 2) ? "" + window.location.hostname + e : e).replace(/^(https?:)?\/\//, "")
              }(a, o),
              void t()) : void function(e, t, n) {
                  var r = n.target_source
                    , o = n.target_key
                    , a = n.action
                    , i = e.url
                    , s = e.body;
                  function c(e, t) {
                      "reverse_translate" === a && Gt(e, t),
                      "reverse_handle_path" === a && t(Me().convertLocale(Ia.language_from, e))
                  }
                  switch (r) {
                  case "url_query":
                      try {
                          var l = new de(i,"https://" + window.location.hostname)
                            , u = l.searchParams.get(o);
                          if (!u)
                              return void t();
                          c(u, (function(n) {
                              l.searchParams.set(o, n),
                              e.url = l.toString(),
                              t()
                          }
                          ))
                      } catch (e) {
                          t()
                      }
                      break;
                  case "url":
                      try {
                          var f = new RegExp(o)
                            , d = i.match(f)
                            , g = d && d[1];
                          if (!g)
                              return void t();
                          var p = !1
                            , _ = g;
                          try {
                              (_ = decodeURIComponent(g)) !== g && (p = !0)
                          } catch (e) {}
                          c(_, (function(n) {
                              var r = p ? encodeURIComponent(n) : n;
                              e.url = i.replace(g, r),
                              t()
                          }
                          ))
                      } catch (e) {
                          t()
                      }
                      break;
                  case "form_data_payload":
                      try {
                          var h = s.get(o);
                          if (!h)
                              return void t();
                          c(h, (function(n) {
                              e.body.set(o, n),
                              t()
                          }
                          ))
                      } catch (e) {
                          t()
                      }
                      break;
                  case "json_payload":
                      try {
                          var m = JSON.parse(s)[o];
                          if (!m)
                              return void t();
                          c(m, (function(n) {
                              var r;
                              e.body = JSON.stringify(Object.assign({}, JSON.parse(s), ((r = {})[o] = n,
                              r))),
                              t()
                          }
                          ))
                      } catch (e) {
                          t()
                      }
                      break;
                  default:
                      t()
                  }
              }(e, t, i);
          t()
      }
  }
  function _a(e) {
      if (!e)
          return !1;
      var t = e.url_wildcard
        , n = e.action
        , r = e.target_source
        , o = e.target_key;
      return !!t && ("proxify" === n ? "url" === r : !!["reverse_translate", "reverse_handle_path"].some((function(e) {
          return e === n
      }
      )) && (r && o))
  }
  function ha(e, t, n) {
      if (n || !e || window.top !== window || !ya(e)) {
          var r = [];
          try {
              Wt(r = Ft())
          } catch (e) {
              B.warn(e)
          }
          var o, a, i = yt();
          if (e && t && !i && kt(e),
          !Ia.is_connect || Ia.dynamicPushState || !i && e !== Ia.language_from ? function(e) {
              void 0 === e && (e = !0);
              var t = Ia.excluded_blocks
                , n = Ia.is_connect;
              if (Ao = e)
                  if (Co = t && t.length && t.map((function(e) {
                      return e.value
                  }
                  )).join(","),
                  n && Lo.length > 0)
                      for (var r = function() {
                          var e = a[o]
                            , t = e.mutations
                            , n = e.documentElement
                            , r = function() {
                              var e = t.splice(0, 100);
                              e.length > 0 && (jo(e, n),
                              setTimeout(r, 0))
                          };
                          r()
                      }, o = 0, a = Lo; o < a.length; o += 1)
                          r();
                  else
                      Lo = []
          }() : function() {
              if (0 !== No.length) {
                  for (var e = 0, t = No; e < t.length; e += 1)
                      t[e].disconnect();
                  Lo = []
              }
          }(),
          o = Ia.xhr_hooks,
          a = Ia.is_connect,
          !(o && Array.isArray(o) && o.some(_a)) || a && yt() || (ga.enable(),
          ga.before(pa)),
          n || i)
              va(e);
          else if (Ia.is_connect && !i && je("onConnectPageLoad", e),
          Ia.force_translation) {
              for (var s = [], c = 0, l = r; c < l.length; c += 1) {
                  var u = l[c];
                  (u.closest && u.closest(Ia.force_translation) || !u.closest && u.parentNode && u.parentNode.closest && u.parentNode.closest(Ia.force_translation)) && s.push(u)
              }
              Do(s)
          }
          i && !i.language_button_displayed && i.allExcluded || yo(),
          i || (Ia.remove_unused_link_hooks && function() {
              var e = wt()
                , t = Ia.languages.map((function(e) {
                  return e.custom_code || e.language_to
              }
              )).filter((function(t) {
                  return !e.includes(t)
              }
              ));
              1 === e.length && t.push(Ia.language_from);
              for (var n = t.map((function(e) {
                  return ba(e)
              }
              )).join(","), r = pe(document, n), o = 0, a = r; o < a.length; o += 1) {
                  ve(a[o])
              }
          }(),
          xo(),
          bo(),
          function() {
              window.addEventListener("message", Kt, !1);
              var e = Ia.translate_iframes;
              if (e)
                  for (var t = 0, n = pe(document.body, e); t < n.length; t += 1) {
                      var r = n[t];
                      r.contentWindow && Jt.push(r.contentWindow)
                  }
              Xt({}),
              Te("onPageLanguageSet", Yt),
              "with-window-top" === be() && window.top.postMessage({
                  message: "Weglot.iframe"
              }, "*")
          }(),
          ["alert"].forEach((function(e) {
              var t = window[e];
              window[e] = function() {
                  var e = arguments;
                  if ("string" == typeof arguments[0]) {
                      var n = Be();
                      return Ia.language_from === n ? t.apply(window, arguments) : Vt([{
                          t: 2,
                          w: arguments[0]
                      }], n, {
                          title: !1,
                          cdn: !0
                      }).then((function(n) {
                          return e[0] = n.to_words[0],
                          t.apply(window, e)
                      }
                      ))
                  }
              }
          }
          ))),
          Ie("initialized", e)
      }
  }
  function ma(e) {
      var t = Be();
      e !== t && (Ia.visual_editor ? rt(e, (function(n) {
          if ("#" === n)
              return va(e, t);
          window.dispatchEvent(new CustomEvent("veLanguageChangeUrl",{
              detail: {
                  targetUrl: n
              }
          }))
      }
      )) : va(e, t))
  }
  function va(e, t) {
      if (!wt().includes(e))
          return Mo(),
          void B.warn(e + " isn't a language you have added", {
              sendToDatadog: !1
          });
      Ia.auto_switch && Ho(e);
      var n = yt();
      if (Ia.is_connect || n || kt(e),
      !ya(e)) {
          if (Ia.loading_bar)
              var r = function() {
                  try {
                      var e = document.createElement("div");
                      return e.className = "wg-progress",
                      e.id = "wg_progress",
                      e.innerHTML = '<div class="wg-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0"></div>',
                      document.body.appendChild(e),
                      setInterval(qo, 100)
                  } catch (e) {}
              }();
          if (function(e) {
              var t = we("lang");
              if (t && t !== e) {
                  var n = window.location.search.replace("lang=" + t, "lang=" + e);
                  try {
                      window.history.replaceState(null, "", window.location.pathname + n)
                  } catch (e) {}
              }
              Ue = e
          }(e),
          yt())
              return Mo(),
              void zo(r);
          if (e === Ia.language_from)
              return je("onPageLanguageSet", e),
              Mo(),
              Mt(null, e),
              Ia.loading_bar && zo(r),
              document.documentElement.setAttribute("lang", e),
              void Ie("languageChanged", e, t || "");
          Vt(Ht(), e).then((function(n) {
              Mo(),
              Mt(n, e),
              document.documentElement.setAttribute("lang", e),
              Ie("languageChanged", e, t || ""),
              Ia.loading_bar && zo(r)
          }
          )).catch((function(e) {
              throw Ia.loading_bar && zo(r),
              Mo(),
              Je().removeItem(G),
              e
          }
          )),
          je("onPageLanguageSet", e)
      }
  }
  function ya(e) {
      return !(!Ia.is_connect || Be() === e) && (!Ia.host || Ia.previewHash && window.location.hostname.includes(V) || function() {
          if (Ia.subdirectory)
              return [Ia.host].concat(l);
          return Ia.languages.map((function(e) {
              return e.connect_host_destination && e.connect_host_destination.host
          }
          )).concat([Ia.host].concat(l))
      }().includes(window.location.hostname) ? (rt(e, (function(e) {
          return window.location.replace(e)
      }
      )),
      !0) : (be() || B.warn('"' + window.location.hostname + '" is not configured with Weglot. Please contact support@weglot.com', {
          sendToDatadog: !1
      }),
      !1))
  }
  ga.EventEmitter = ea,
  ga.before = function(e, t) {
      if (e.length < 1 || e.length > 2)
          throw "invalid hook";
      return ga.on("before", e, t)
  }
  ,
  ga.after = function(e, t) {
      if (e.length < 2 || e.length > 3)
          throw "invalid hook";
      return ga.on("after", e, t)
  }
  ,
  ga.enable = function() {
      ia.patch(),
      da.patch()
  }
  ,
  ga.disable = function() {
      ia.unpatch(),
      da.unpatch()
  }
  ,
  ga.XMLHttpRequest = ia.Native,
  ga.fetch = da.Native,
  ga.headers = ta,
  ga.enable(),
  ga.disable(),
  Pe("initialized", (function() {
      Ia.translate_search && !Ia.switcher_editor && function() {
          var e = Ia.search_forms
            , t = Ia.search_parameter;
          if (t) {
              for (var n = 0, r = pe(document, e); n < r.length; n += 1) {
                  var o = r[n];
                  o.addEventListener("submit", (function(e) {
                      e.preventDefault();
                      var n = e.target.elements[t].value;
                      Gt(n, (function(e) {
                          z.set({
                              name: "wg-search-form",
                              value: n,
                              options: Ia
                          }),
                          o.elements[t].value = e,
                          o.submit()
                      }
                      ))
                  }
                  ));
                  var a = void 0;
                  -1 !== window.location.search.indexOf(t + "=") && o.elements && o.elements[t] && (a = z.get("wg-search-form")) && (o.elements[t].value = a)
              }
              z.erase({
                  name: "wg-search-form",
                  options: Ia
              })
          } else
              B.warn("Search parameter name required for search translation.", {
                  sendToDatadog: !1
              })
      }()
  }
  ), !0);
  var wa = [];
  function ba(e) {
      var t = Ia.linkHooksConfig && Ia.linkHooksConfig.buildAdditionalSelectors;
      return ["a[href='#Weglot-" + e + "']", "a[href*='change-language.weglot.com/" + e + "']"].concat(t ? t(e) : []).join(",")
  }
  function ka(e, t) {
      var n = wa.find((function(t) {
          return t.language === e
      }
      ));
      n && -1 !== n.links.indexOf(t) || (n || (n = {
          language: e,
          links: [],
          onLinkClick: function(t) {
              t.preventDefault(),
              t.stopPropagation(),
              ma(e)
          }
      },
      wa.push(n)),
      t.setAttribute(X, ""),
      t.classList.add("weglot-link", "weglot-link-" + e),
      e === Be() && (t.classList.add("weglot-link--active"),
      Ia.linkHooksConfig && Ia.linkHooksConfig.onLinkActive && Ia.linkHooksConfig.onLinkActive(t)),
      rt(e, (function(e) {
          return t.setAttribute("href", e)
      }
      )),
      t.addEventListener("click", n.onLinkClick),
      n.links.push(t))
  }
  var xa = {};
  function Ea(e) {
      return e ? "string" != typeof e ? e : e.split(",").map((function(e) {
          return {
              value: e
          }
      }
      )) : []
  }
  function Ca(e, t) {
      if (void 0 === t && (t = ""),
      !e)
          return le.button_style;
      var n = e.classF || ""
        , r = n.match(/flag-(\d)/)
        , o = {
          with_name: e.withname,
          full_name: !!e.fullname,
          is_dropdown: !!e.is_dropdown,
          with_flags: -1 !== n.indexOf("wg-flags"),
          flag_type: r && r[1] ? ue[r[1]] : "",
          invert_flags: !0
      };
      return t && (o.custom_css = t),
      o
  }
  function Oa(e) {
      var t = e.styleOpt
        , n = e.containerCss
        , r = e.target
        , o = e.sibling;
      return {
          style: Ca(t, n),
          location: {
              target: r,
              sibling: o
          }
      }
  }
  xa[Z] = function() {
      Te("onWeglotSetup", (function() {
          !1 !== Ia.original_shopify_checkout && Ia.is_connect && !Ia.subdirectory && Ia.language_from === Be() && it()
      }
      )),
      Pe("initialized", (function() {
          var e = Je({
              type: "cookie"
          }).getItem("wg_checkout_redirect");
          e && (Je({
              type: "cookie"
          }).removeItem("wg_checkout_redirect"),
          Je({
              type: "cookie"
          }).setItem("wg_checkout_language", e),
          st(e)),
          window.langify && B.log("%c Please, uninstall langify to properly use Weglot", {
              sendToDatadog: !1
          }),
          xe() || !Ia.order_tag || Ia.is_connect && Ia.language_from !== Be() || dt(),
          ct();
          var t, n = document.querySelectorAll("[data-wg-only-display]");
          n.length && $e(n),
          Ia.customer_tag && ut(),
          document.getElementsByClassName("shopify-payment-button").length && (t = window.fetch,
          window.fetch = function() {
              if ("/wallets/checkouts.json" === arguments[0])
                  try {
                      var e = JSON.parse(arguments[1].body)
                        , n = lt(Be());
                      e.checkout.attributes = {},
                      Ia.cart_attributes.forEach((function(t) {
                          return e.checkout.attributes[t] = n
                      }
                      )),
                      arguments[1].body = JSON.stringify(e)
                  } catch (e) {}
              return t.apply(window, arguments)
          }
          )
      }
      ), !0),
      Te("onConnectPageLoad", (function(e) {
          return gt(e)
      }
      )),
      Te("onPageLanguageSet", (function(e) {
          return gt(e)
      }
      )),
      Te("onDynamicDetected", (function() {
          ct(Be())
      }
      )),
      Te("startWhen", (function() {
          return me("admin-bar-iframe") || me("preview-bar-iframe") || Ia.private_mode || function() {
              for (var e = 0, t = document.scripts; e < t.length; e += 1)
                  if (-1 !== t[e].src.indexOf("preview_bar_injector"))
                      return !0;
              return !1
          }()
      }
      ));
      var e = [".shopify-payment-button button"].concat(pt).concat(Ia.is_connect ? [] : ["form.cart.ajaxcart", "form.cart-drawer", "#cross-sell", ".wheelio_holder", ".mini-cart", "#shopify-product-reviews", "#esc-oos-form", ".product__add-to-cart-button", "select.product-variants>option:not([value])", ".ui-autocomplete", ".shopify-payment-button__button", "#shopify-section-static-recently-viewed-products", "#recently-viewed-products", "#shopify-section-product-recommendations", ".action_button.add_to_cart"])
        , t = /^\/(\d+\/checkouts|checkouts\/[a-z]{1,2})\/(?:\w{2}-)?\w{32}/.test(document.location.pathname)
        , n = "loox.io" === document.location.hostname && be();
      return Object.assign({}, {
          cart_attributes: ["lang", "Invoice Language"],
          excluded_blocks: ["input[type='radio']", ".money", ".price", ".product__prices", "#admin-bar-iframe", ".notranslate", ".skiptranslate", "#isp_refine_nevigation", "#isp_header_subtitle", ".isp_sorting_and_result_view_wrapper", "#isp_results_did_you_mean > span", ".isp_facet_show_hide_values", "#isp_main_search_box", ".snize-filter-variant-count", ".snize-search-results-header a", ".snize-search-results-header b", ".hc-author__text", ".hc-avatar__initials", ".hc-rating-chart__count", ".hc-rating-chart__percentage-value", ".yotpo-review-date", ".yotpo-user-name", ".yotpo-user-letter", ".yotpo .avg-score", ".yotpo .sr-only", ".yotpo-mandatory-mark"].map((function(e) {
              return {
                  value: e
              }
          }
          )),
          search_forms: "form[action='/pages/search-results'],form[action='/search']",
          search_parameter: "q"
      }, n && Ia.is_connect && {
          dynamicPushState: !0
      }, {
          dynamics: e.map((function(e) {
              return {
                  value: e
              }
          }
          )),
          extra_definitions: [{
              type: 1,
              selector: ".snize-color-swatch",
              attribute: "data-sntooltip"
          }, {
              type: 1,
              selector: "button[data-pf-type=ProductATC]",
              attribute: "data-soldout"
          }, {
              type: 1,
              selector: "button[data-pf-type=ProductATC]",
              attribute: "data-adding"
          }, {
              type: 1,
              selector: "button[data-pf-type=ProductATC]",
              attribute: "data-added"
          }],
          shopifyCheckout: t
      })
  }
  ,
  xa[Q] = function() {
      return Te("onPageLanguageSet", (function(e) {
          !function(e) {
              for (var t = 0, n = document.querySelectorAll('[href*="/checkout.php"],[href*="/cart.php"]'); t < n.length; t += 1) {
                  var r = n[t];
                  r.setAttribute("href", Ce(r.getAttribute("href"), "lang", e))
              }
          }(e)
      }
      )),
      {
          dynamics: [".quick-shop-details", "#QuickViewProductDetails", ".QuickViewModal", ".modalContainer", ".ng-checkout-container", ".previewCartAction", "#checkout-app"].map((function(e) {
              return {
                  value: e
              }
          }
          )),
          search_forms: "form[action='/search.php']",
          search_parameter: "search_query"
      }
  }
  ,
  xa[ae] = function() {
      return Ia.is_connect ? {} : {
          dynamics: [{
              value: ".content"
          }]
      }
  }
  ,
  xa[ee] = function() {
      return {
          excluded_blocks: ['[data-display="cms-only"]', ".j-admin-links", ".cc-m-status-empty"].map((function(e) {
              return {
                  value: e
              }
          }
          ))
      }
  }
  ,
  xa[te] = function() {
      var e = Ia.force_translation || []
        , t = ["body.sqs-is-page-editing"];
      document.getElementById("sqs-cart-root") && (e.push("#sqs-cart-container"),
      t.push("#sqs-cart-container [class*=subtotalPrice]", "#sqs-cart-container .cart-container .item-price")),
      document.getElementById("sqs-standard-checkout") && (e.push("#checkout"),
      t.push("#checkout span.money", "#checkout [data-test*=incomplete] [class^=PaymentCard-container]", "#checkout [data-test*=incomplete] [class^=CustomerAddress-container]", "#checkout [class^=CustomerInfoSection-email]", "#checkout [class^=GoogleResultsList]")),
      document.getElementById("order-status-page-root") && (e.push("#order-status-page-root"),
      t.push("#order-status-page-root #order-number", "#order-status-page-root h2 + div > p"));
      var n = window.location.host.endsWith("squarespace.com");
      if (Pe("initialized", (function() {
          try {
              var e = window.ExtensionScriptsSDK;
              if (!e)
                  return;
              e["1.0"].page.events.dispatchScriptLoadEvent("Weglot")
          } catch (e) {}
      }
      )),
      !Ia.is_connect)
          try {
              document.querySelectorAll(".animation-segment-wrapper").forEach((function(e) {
                  e.parentNode.dataset.dynamicStrings = e.textContent
              }
              )),
              document.querySelectorAll(".animation-segment-parent-hidden").forEach((function(e) {
                  e.dataset.dynamicStrings = ""
              }
              )),
              t.push(".animation-segment-wrapper"),
              t.push(".animation-segment-parent-hidden > *")
          } catch (e) {}
      return {
          force_translation: e.join(","),
          dynamics: ["#sqs-cart-container", "#checkout", ".sqs-widgets-confirmation", ".video-player", ".jdgm-widget", ".calendar-block", ".opentable-v2-block", ".blog-item-comments"].map((function(e) {
              return {
                  value: e
              }
          }
          )).concat(Ia.is_connect ? [{
              value: ".sqs-add-to-cart-button.cart-adding"
          }, {
              value: ".sqs-add-to-cart-button.cart-added"
          }] : [{
              value: "[data-dynamic-strings]"
          }, {
              value: ".sqs-add-to-cart-button"
          }, {
              value: ".variant-select-wrapper"
          }]),
          excluded_blocks: t.map((function(e) {
              return {
                  value: e
              }
          }
          )).concat(Ia.is_connect ? [{
              value: ".comment-body"
          }] : []),
          forceDisableConnect: n,
          merged_selectors_remove: [{
              value: ".plyr__menu__container"
          }, {
              value: ".product-price .original-price"
          }, {
              value: ".comment-btn-wrapper"
          }],
          extra_definitions: [{
              type: 1,
              selector: ".variant-select-wrapper",
              attribute: "data-text"
          }]
      }
  }
  ,
  xa[ne] = function() {
      var e = {
          dynamics: document.documentElement.getAttribute("data-wg-translated") ? [] : [{
              value: "#SITE_CONTAINER"
          }],
          dynamicPushState: !0
      };
      if (window.wixBiSession && "bolt" !== window.wixBiSession.renderType && !Ia.visual_editor && (document.addEventListener("DOMContentLoaded", (function() {
          new MutationObserver((function(e) {
              for (var t = 0; t < e.length; t++) {
                  "SUCCESS" === e[t].target.getAttribute("data-santa-render-status") && (this.disconnect(),
                  Ie("start"))
              }
          }
          )).observe(document.getElementById("SITE_CONTAINER"), {
              attributes: !0,
              attributeFilter: ["data-santa-render-status"]
          })
      }
      )),
      e.delayStart = !0,
      e.wait_transition = !1),
      window.wixBiSession && "bolt" === window.wixBiSession.renderType) {
          var t = 0
            , n = setInterval((function() {
              (document.body && window.sssr || 40 === t) && (Ie("start"),
              clearInterval(n)),
              t++
          }
          ), 100);
          e.delayStart = !0,
          e.wait_transition = !1
      }
      return e
  }
  ,
  xa[re] = function() {
      return Pe("switchersReady", (function() {
          var e = document.querySelector(".weglot-container");
          e && e.classList.add("weglot-container--left")
      }
      )),
      {
          forceDisableConnect: window.Webflow && window.Webflow.env && !!window.Webflow.env("editor"),
          excluded_blocks: [".wg-element-wrapper"].map((function(e) {
              return {
                  value: e
              }
          }
          )),
          linkHooksConfig: {
              additionalCheckSelectors: [".weglot-switcher-component a[lang]"],
              buildAdditionalSelectors: function(e) {
                  return ['.weglot-switcher-component a[lang="' + e + '"]']
              },
              onLinkActive: function(e) {
                  var t = e.closest(".weglot-switcher-component.w-dropdown");
                  if (t) {
                      var n = t.querySelector(".w-dropdown-toggle");
                      if (n) {
                          var r = n.textContent
                            , o = n.getAttribute("lang");
                          n.textContent = e.textContent,
                          n.setAttribute("lang", e.getAttribute("lang")),
                          function(e, t) {
                              var n = wa.find((function(t) {
                                  return t.language === e
                              }
                              ));
                              if (n) {
                                  var r = n.links.indexOf(t);
                                  -1 !== r && (n.links.splice(r, 1),
                                  t.removeEventListener("click", n.onLinkClick))
                              }
                          }(e.getAttribute("lang"), e),
                          ka(o, e),
                          e.textContent = r,
                          e.setAttribute("lang", o)
                      }
                  } else
                      e.classList.add("w--current"),
                      e.setAttribute("aria-current", "lang")
              },
              offLinkActive: function(e) {
                  e.classList.remove("w--current"),
                  e.removeAttribute("aria-current")
              }
          }
      }
  }
  ,
  xa[oe] = function() {
      return {
          dynamics: [".w-container", ".w-wrapper", ".product-header", ".product-messages", ".error", "button"].map((function(e) {
              return {
                  value: e
              }
          }
          ))
      }
  }
  ,
  xa[ie] = function() {
      return {
          ignoreDynamicFragments: !0,
          dynamicPushState: !0,
          merged_selectors_remove: [{
              value: ".themeProfileMenu"
          }]
      }
  }
  ;
  var Sa = [{
      from: "originalLanguage",
      to: "language_from"
  }, {
      from: "autoSwitch",
      to: "auto_switch"
  }, {
      from: "autoSwitchFallback",
      to: "auto_switch_fallback"
  }, {
      from: "waitTransition",
      to: "wait_transition"
  }, {
      from: "subDomain",
      to: "subdomain"
  }, {
      from: "translateSearch",
      to: "translate_search"
  }, {
      from: "searchsForms",
      to: "search_forms"
  }, {
      from: "searchParameter",
      to: "search_parameter"
  }, {
      from: "hideSwitcher",
      to: "hide_switcher"
  }, {
      from: "dangerouslyForceDynamic",
      to: "dangerously_force_dynamic"
  }, {
      from: "loadingBar",
      to: "loading_bar"
  }, {
      from: "customerTag",
      to: "customer_tag"
  }, {
      from: "orderTag",
      to: "order_tag"
  }, {
      from: "translateImages",
      to: "media_enabled"
  }, {
      from: "extraDefinitions",
      to: "extra_definitions"
  }, {
      from: "excludePaths",
      to: "excluded_paths",
      func: function(e) {
          return e ? "string" != typeof e ? e : e.split(",").filter((function(e) {
              return !!e
          }
          )).map((function(e) {
              return {
                  value: e,
                  type: "CONTAIN"
              }
          }
          )) : []
      }
  }, {
      from: "exceptions",
      to: "excluded_blocks",
      func: Ea
  }, {
      from: "whiteList",
      to: "whitelist",
      func: Ea
  }, {
      from: "styleOpt",
      to: "button_style",
      func: Ca
  }, {
      from: "destinationLanguages",
      to: "languages",
      func: function(e) {
          return "string" != typeof e ? e : e.split(",").map((function(e) {
              return {
                  language_to: e,
                  provider: null,
                  automatic_translation_enabled: !0
              }
          }
          ))
      }
  }];
  function La(e) {
      var t = Object.assign({}, e);
      return t.switchers && ("string" == typeof t.switchers && (t.switchers = JSON.parse(t.switchers)),
      t.switchers.length && t.switchers[0].styleOpt && (t.switchers = t.switchers.map(Oa)),
      t.scriptParamSwitcher = !0),
      Array.isArray(t.dynamic) && (t.dynamic = t.dynamic.join(",")),
      Array.isArray(t.translate_iframes) && (t.translate_iframes = t.translate_iframes.join(",")),
      t.translate_images && (t.media_enabled = !0),
      Sa.forEach((function(e) {
          var n = e.from
            , r = e.to
            , o = e.func;
          void 0 !== t[n] && (t[r] = o ? o(t[n]) : t[n],
          delete t[n])
      }
      )),
      t
  }
  function Na(e, t) {
      var n = {};
      for (var r in e)
          Object.prototype.hasOwnProperty.call(e, r) && -1 === t.indexOf(r) && (n[r] = e[r]);
      return n
  }
  var Ta = {};
  function ja(e) {
      if (!e || !e.api_key)
          throw Error("You have to provide at least a key");
      var t = e.api_key.split("wg_").pop()
        , n = La(e);
      return function(e) {
          if (u(window.location.hostname))
              return fetch("https://api.weglot.com/projects/settings?api_key=wg_" + e).then((function(e) {
                  return e.json()
              }
              ));
          var t = Aa();
          if (t) {
              var n = t.settings
                , r = Na(t, ["settings"]);
              return n.injectedData = r,
              Promise.resolve(n)
          }
          var o = function(e) {
              if (!e.includes(V))
                  return null;
              var t = e.split(".")[0];
              if (t.includes("-")) {
                  return t.split("-").reverse()[0]
              }
              return t
          }(window.location.hostname);
          if (o)
              return fetch("" + $ + o + ".json").then((function(e) {
                  return e.json()
              }
              )).then((function(e) {
                  return "SUBDOMAIN" === e.url_type && (e.languages = e.languages.map((function(e) {
                      return Object.assign({}, e, {
                          connect_host_destination: Object.assign({}, e.connect_host_destination, {
                              is_dns_set: !0,
                              created_on_aws: 1,
                              host: (e.custom_code || e.language_to) + "-" + o + "." + V
                          })
                      })
                  }
                  ))),
                  e.is_dns_set = !0,
                  e.previewHash = o,
                  e
              }
              ));
          return fetch("" + $ + e + ".json").then((function(e) {
              return e.json()
          }
          ))
      }(t).then((function(e) {
          var t = e.custom_settings
            , r = Na(e, ["custom_settings"]);
          n.button_style = Object.assign(t ? t.button_style : {}, n.button_style);
          var o = r.language_from
            , a = r.languages;
          o && (n.language_from = o),
          a && (n.languages = a),
          t && t.localeRules && (n.localeRules = t.localeRules);
          var i = Pa(Object.assign({}, r, t, n));
          return Ie("onOptionsReady"),
          i
      }
      )).catch((function(e) {
          B.error(e, {
              consoleOverride: e && e.wgErrMsg || "Cannot fetch Weglot options. Is your key correct?",
              sendToDatadog: !1
          })
      }
      ))
  }
  function Aa() {
      var e = me("weglot-data");
      if (!e)
          return null;
      try {
          var t = JSON.parse(e.textContent);
          return t.settings ? t : null
      } catch (e) {
          return null
      }
  }
  function Ra() {
      var e = Aa();
      e && (delete e.settings,
      Ta.injectedData = e)
  }
  function Pa(e) {
      if (e.deleted_at)
          throw {
              wgErrMsg: "Cannot load Weglot because the project has been deleted"
          };
      e.injectedData || Oe(Ra),
      "SUBDIRECTORY" === e.url_type && e.is_dns_set && (e.subdirectory = !0),
      e.languages.length || (e.languages = []),
      Ta.is_connect = e.subdirectory || e.languages.some((function(e) {
          return e.connect_host_destination && e.connect_host_destination.is_dns_set && e.connect_host_destination.created_on_aws
      }
      )),
      e.subdomain = !e.subdirectory && (e.subdomain || Ta.is_connect),
      e.dynamic && (e.dynamics || (e.dynamics = e.dynamic.split(",").map((function(e) {
          return {
              value: e.trim()
          }
      }
      ))),
      delete e.dynamic),
      u(window.location.hostname) && (Ta.visual_editor = !0),
      Ta.private_mode = function() {
          -1 !== location.search.indexOf("weglot-private=0") && Je().removeItem("wg-private-mode");
          var e = document.getElementById("admin-bar-iframe") || document.getElementById("preview-bar-iframe") || -1 !== location.search.indexOf("weglot-private=1") || u(window.location.hostname) || "1" === Je({
              type: "cookie"
          }).getItem("wg-private-mode");
          return e && Je({
              type: "cookie"
          }).setItem("wg-private-mode", "1"),
          e
      }();
      var t, n, r, o = e.technology_name || Ta.technology_name, a = (t = o) && xa[t] ? xa[t]() : {}, i = Object.assign({}, le, a);
      if (Object.assign(Ta, i, e),
      se.forEach((function(e) {
          var t, n;
          Ta[e] !== i[e] && (Ta[e] = (t = Ta[e],
          (n = i[e]) ? Array.isArray(t) ? [].concat(t, n) : "object" == typeof t ? Object.assign({}, t, n) : (t = t.split(",").filter((function(e) {
              return e
          }
          )).join(",")) && t.length > 0 && t !== n ? t += "," + n : t = n : t))
      }
      )),
      n = "https://cdn.weglot.com/weglot.min.css?v=5",
      (r = document.createElement("link")).rel = "stylesheet",
      r.type = "text/css",
      r.href = n,
      document.head.appendChild(r),
      Ta.button_style && Ta.button_style.custom_css && ke(Ta.button_style.custom_css, "weglot-custom-style"),
      Ta.switchers && 0 !== Ta.switchers.length ? Ta.switchers = Ta.switchers.map((function(e) {
          var t = e.button_style
            , n = Na(e, ["button_style"]);
          return Object.assign({}, {
              style: n.style || t
          }, n)
      }
      )) : Ta.switchers = [{
          style: Ta.button_style,
          location: {},
          default: !0
      }],
      Ta.cache && Ta.visual_editor && (Ta.cache = !1),
      Ta.api_key.length < 36 && (Ta.translation_engine = 1),
      Ta.excluded_blocks_remove && (Ta.excluded_blocks = Ta.excluded_blocks.filter((function(e) {
          return !Ta.excluded_blocks_remove.includes(e.value)
      }
      ))),
      Ta.dangerously_force_dynamic && (Ta.dynamics = Ta.dynamics.concat(Ta.dangerously_force_dynamic.split(",").map((function(e) {
          return {
              value: e.trim()
          }
      }
      )))),
      Ta.excluded_blocks = Ta.excluded_blocks.filter((function(e) {
          return Ee(e.value)
      }
      )),
      Ta.dynamics = Ta.dynamics.filter((function(e) {
          return Ee(e.value)
      }
      )),
      Ta.dynamics_remove && (Ta.dynamics = Ta.dynamics.filter((function(e) {
          return !Ta.dynamics_remove.includes(e.value)
      }
      ))),
      Ta.is_tld = !1,
      a.forceDisableConnect && (Ta.is_connect = !1),
      Ta.is_connect && !Ta.previewHash) {
          var s = Ta.host.split("www.").pop();
          Ta.is_tld = Ta.languages.some((function(e) {
              if (e.connect_host_destination && e.connect_host_destination.host)
                  return -1 === e.connect_host_destination.host.indexOf(s)
          }
          ))
      }
      return Ta.whitelist && !Array.isArray(Ta.whitelist) && (Ta.whitelist = [{
          value: String(Ta.whitelist)
      }]),
      Ta
  }
  var Ia = Ta;
  var Da, Fa, Ua, Wa = {
      "Node.prototype.contains": document.contains,
      "Element.prototype.cloneNode": "document"in self && "cloneNode"in document.documentElement,
      "location.origin": "location"in self && "origin"in self.location,
      MutationObserver: "MutationObserver"in self,
      Promise: "Promise"in self && "resolve"in Promise,
      "Element.prototype.matches": "document"in self && "matches"in document.documentElement,
      "Element.prototype.closest": "document"in self && "closest"in document.documentElement,
      "Element.prototype.classList": "document"in self && "classList"in document.documentElement && function() {
          var e = document.createElement("div");
          if (!(e.classList && e.classList.add && e.classList.remove && e.classList.contains && e.classList.toggle))
              return !1;
          var t = !0;
          e.classList.add("add1", "add2"),
          t = t && e.className.indexOf("add1") >= 0 && e.className.indexOf("add2") >= 0,
          e.className = "remove1 remove2 remove3",
          e.classList.remove("remove1", "remove3"),
          t = t && -1 === e.className.indexOf("remove1") && e.className.indexOf("remove2") >= 0 && -1 === e.className.indexOf("remove3");
          try {
              e.remove()
          } catch (t) {
              e = null
          }
          return t
      }(),
      "String.prototype.includes": "includes"in String.prototype,
      fetch: "fetch"in self,
      "Array.prototype.find": "find"in Array.prototype,
      "Array.prototype.findIndex": "findIndex"in Array.prototype,
      "Object.assign": "assign"in Object,
      "Array.prototype.includes": "includes"in Array.prototype,
      URL: function(e) {
          try {
              var t = new e.URL("http://weglot.com");
              if ("href"in t && "searchParams"in t) {
                  var n = new URL("http://weglot.com");
                  if (n.search = "a=1&b=2",
                  "http://weglot.com/?a=1&b=2" === n.href && (n.search = "",
                  "http://weglot.com/" === n.href)) {
                      var r = new e.URLSearchParams("a=1")
                        , o = new e.URLSearchParams(r);
                      if ("a=1" === String(o))
                          return !0
                  }
              }
              return !1
          } catch (e) {
              return !1
          }
      }(self)
  }, Ha = !1;
  function Ma() {
      Ha = !0,
      Ie("polyfillReady")
  }
  function qa() {
      return Ha
  }
  !function(e) {
      window.Prototype && (delete Object.prototype.toJSON,
      delete Array.prototype.toJSON);
      var t = Object.keys(Wa).filter((function(e) {
          return !Wa[e]
      }
      ));
      if (t.length) {
          !function(e, t, n) {
              var r = !1;
              function o() {
                  r || (r = !0,
                  setTimeout((function() {
                      return t(n)
                  }
                  ), 20))
              }
              var a = document.getElementsByTagName("head")[0] || document.documentElement
                , i = document.createElement("script");
              i.type = "text/javascript",
              i.src = e,
              i.addEventListener ? (i.addEventListener("load", o, !1),
              i.addEventListener("error", o, !1)) : i.readyState && (i.onreadystatechange = o),
              a.insertBefore(i, a.firstChild)
          }("https://cdn.polyfill.io/v2/polyfill.min.js?callback=Weglot.polyReady&features=" + t.join(","), (function() {}
          ))
      } else
          e()
  }(Ma);
  var za = !1;
  function Ba() {
      window.addEventListener("message", Ga, !1);
      var e = document.createElement("meta");
      e.name = "google",
      e.content = "notranslate",
      document.head && document.head.appendChild(e);
      document.documentElement && -1 === ["cms.e.jimdo.com", "proxy.weglot.com"].indexOf(window.location.host) && document.documentElement.setAttribute("translate", "no");
      var t = document.head.querySelector("link[href*=weglot_shopify]");
      t && document.head.removeChild(t)
  }
  function $a() {
      if (Ia.api_key) {
          Pe("initialized", (function() {
              Ia.page_views_enabled && (Ia.is_connect ? rt(Ia.language_from, (function(e) {
                  return $t(e)
              }
              )) : $t())
          }
          ), !0);
          try {
              M(document, Ia)
          } catch (e) {
              B.error(e)
          }
          if (je("onWeglotSetup"),
          !Xa.initialized || window.Turbolinks) {
              Fa = function() {
                  var e = wt();
                  if (Ia.is_connect) {
                      var t = document.documentElement.dataset.wgTranslated || (Ia.subdirectory ? ze() : qe());
                      if (t !== Ia.language_from)
                          return t;
                      if (Ia.technology_name === Z) {
                          if (z.get("wg_checkout_redirect"))
                              return Ia.language_from;
                          var n = z.get("wg_checkout_language");
                          if (n && !Ia.shopifyCheckout && !be() && e.includes(n))
                              return z.erase({
                                  name: "wg_checkout_language",
                                  options: Ia
                              }),
                              n
                      }
                      var r = Wo();
                      return t === Ia.language_from && r && e.includes(r) ? r : Ia.language_from
                  }
                  var o = we("lang");
                  if (o && e.includes(o))
                      return za = !0,
                      o;
                  var a = bt();
                  if (a && e.includes(a))
                      return a;
                  var i = Wo();
                  if (i && e.includes(i))
                      return za = !0,
                      i;
                  return Ia.language_from
              }(),
              Be();
              var e = yt();
              if ((Ua = Fa && Fa !== Ia.language_from && document.documentElement.dataset.wgTranslated !== Fa && !e && !document.documentElement.dataset.wgExcludedUrl && !Ia.switcher_editor) && Ia.wait_transition ? ke("@keyframes wg{from{color:transparent;}to{color:transparent;}}body *{color:transparent!important;animation:1s linear infinite wg!important;}", J) : Mo(),
              Ia.delayStart)
                  return Pe("start", (function() {
                      return Va()
                  }
                  ), !0);
              Oe(Va)
          }
      }
  }
  function Va() {
      if (!document.querySelector("#has-script-tags") || document.querySelector("#has-script-tags") && (document.head.innerHTML.indexOf("weglot_script_tag") > 0 || document.documentElement.innerHTML.indexOf("weglot_script_tag") > 0))
          try {
              ha(Fa, za, Ua)
          } catch (e) {
              Mo(),
              B.error(e, {
                  consoleOverride: "There has been an error initializing, " + e.stack
              })
          }
      else
          Mo();
      Da = !1,
      Xa.initialized = !0
  }
  function Ga(e) {
      if (e.data)
          try {
              var t = JSON.parse(e.data);
              switch (t.message) {
              case "Weglot.detect":
                  e.source.postMessage(JSON.stringify({
                      message: "Weglot.ready",
                      data: {
                          initialized: Xa.initialized,
                          options: Ia
                      }
                  }), e.origin);
                  break;
              case "Weglot.switchTo":
                  ma(t.language)
              }
          } catch (e) {}
  }
  function Ja(e) {
      try {
          for (var t = null, n = 0, r = [/cdn\.weglot\.(?:com|us|dev)\/weglot\.min\.js\?([^#]+)/, /cdn\.weglot\.(?:com|us|dev)\/weglot-switcher-editor\.js\?([^#]+)/, /cdn\.weglot\.(?:com|us|dev)\/weglot_squarespace-[0-9]+\.min\.js\?([^#]+)/]; n < r.length; n += 1) {
              if (t = r[n].exec(e))
                  break
          }
          if (!t)
              return null;
          var o = t[1].split("&").map((function(e) {
              var t = e.split("=")
                , n = t[0]
                , r = t[1];
              try {
                  return [n, decodeURIComponent(r)]
              } catch (e) {
                  return [n, r]
              }
          }
          )).reduce((function(e, t) {
              var n, r = t[0], o = t[1];
              return Object.assign({}, e, ((n = {})[r] = "true" === o || "false" !== o && o,
              n))
          }
          ), {
              api_key: ""
          });
          return o.api_key ? o : null
      } catch (e) {
          B.warn(e)
      }
  }
  var Xa = window.Weglot || {
      initialized: !1,
      options: Ia,
      dynamic: "",
      switchTo: ma,
      setup: function(e) {
          Ba(),
          Da || (Da = !0,
          Re(qa(), "polyfillReady", (function() {
              ja(e).then((function() {
                  return $a()
              }
              )).catch((function() {
                  B.warn("Your setup is deprecated, please save settings in your dashboard to hide this message.", {
                      sendToDatadog: !1
                  });
                  var t = e.api_key;
                  e.translation_engine = t && t.length >= 36 ? 2 : 1,
                  function(e) {
                      try {
                          var t = ["api_key", "originalLanguage", "destinationLanguages"];
                          if (!e || t.some((function(t) {
                              return !e[t]
                          }
                          )))
                              throw {
                                  wgErrMsg: "You have to provide at least: " + t.join(", ")
                              };
                          Pa(La(e))
                      } catch (e) {
                          throw new Error(e && e.wgErrMsg || "Error while reading Weglot options")
                      }
                  }(e),
                  $a()
              }
              ))
          }
          )))
      },
      initialize: function(e) {
          Ba(),
          Da || (Da = !0,
          Re(qa(), "polyfillReady", (function() {
              ja(e).then((function() {
                  return $a()
              }
              ))
          }
          )))
      },
      on: function(e, t) {
          return Pe(e, t, !1)
      },
      off: function(e, t) {
          var n, r = !1, o = function(t) {
              return Ae[t].name === e && !Ae[t].internal
          };
          n = "function" == typeof t ? function(e) {
              return o(e) && Ae[e].callback === t
          }
          : function(e) {
              return o(e)
          }
          ;
          for (var a = Ae.length - 1; a >= 0; a--)
              n(a) && (Ae.splice(a, 1),
              r = !0);
          return r
      },
      getStoredLang: bt,
      getLanguageName: qr,
      getCurrentLang: Be,
      polyReady: Ma,
      getCache: function() {
          return Ct
      },
      addNodes: function(e) {
          var t = Ft(e);
          return Wt(t),
          Do(t)
      },
      search: Gt,
      translate: function(e, t) {
          void 0 === e && (e = {});
          var n = e.words
            , r = e.languageTo;
          if (void 0 === r && (r = Be()),
          !Array.isArray(n) || "object" != typeof n[0]) {
              var o = "Weglot.translate: 1st arg must be an array of objects";
              return B.error(o, {
                  sendToDatadog: !1
              }),
              t && t(null, o),
              Promise.reject()
          }
          return r === Ia.language_from ? (t && t(n.map((function(e) {
              return e.w
          }
          ))),
          Promise.resolve(n.map((function(e) {
              return e.w
          }
          )))) : new Promise((function(e, o) {
              Vt(n, r, {
                  title: !1,
                  cdn: !0
              }).then((function(n) {
                  if (!n || !n.to_words)
                      throw n;
                  t && t(n.to_words),
                  e(n.to_words)
              }
              )).catch((function(e) {
                  o(e),
                  t && t(null, e)
              }
              ))
          }
          ))
      },
      getBestAvailableLanguage: Uo,
      getAvailableLanguages: wt
  };
  return Re(qa(), "polyfillReady", (function() {
      Ro(document);
      for (var e = 0, t = [document.currentScript].concat(Array.from(document.scripts)).filter(Boolean); e < t.length; e += 1) {
          var n = t[e]
            , r = n.src || n.getAttribute && n.getAttribute("data-src");
          if (r) {
              var o = Ja(r);
              if (o)
                  return void Xa.initialize(o)
          }
      }
  }
  )),
  Xa
}();
