var Weglot = function() {
  "use strict";
  var elements = {
    v1: [],
    v2: ["ABBR", "ACRONYM", "B", "BDO", "BIG", "CITE", "EM", "I", "KBD", "Q", "SMALL", "STRONG", "SUB", "SUP", "U"],
    v3: ["A", "BDI", "BR", "DEL", "DFN", "INS", "S", "SPAN"]
  };
  elements.v2.unshift("#text");

  var config = {
    excluded_blocks: [],
    media_enabled: false,
    external_enabled: false,
    extra_definitions: [],
    translation_engine: 2,
    noTranslateAttribute: "data-wg-notranslate",
    mergeNodes: []
  };

  var ddtags = "env:dev";
  var clientToken = "pub4efaec96ce2494088ba70a2049d58dc3";
  var site = "datadoghq.com";

  var customAttributes = {
    "dd-api-key": "pub4efaec96ce2494088ba70a2049d58dc3",
    ddsource: "browser"
  };

  var environment = "dev";
  function createLogger(service) {
    function log(level, message, options = {}) {
      const { sendToConsole = true, consoleOverride, sendToDatadog = true } = options;
      if (sendToDatadog && "dev" !== environment) {
        const logData = {
          service,
          status: level,
          message,
          stack: options.stack,
          logStatus: options.status,
          view: window.location ? { url: window.location.href } : undefined,
          projectInfo: window.Weglot && window.Weglot.options ? {
            host: window.Weglot.options.host,
            api_key: window.Weglot.options.api_key,
            url_type: window.Weglot.options.url_type,
            technology_name: window.Weglot.options.technology_name,
            technology_id: window.Weglot.options.technology_id,
            is_connect: window.Weglot.options.is_connect,
            auto_switch: window.Weglot.options.auto_switch
          } : undefined
        };
        const queryParams = Object.keys(customAttributes).map(key => `${key}=${customAttributes[key]}`).join("&");
        fetch(`https://http-intake.logs.datadoghq.com/api/v2/logs?${queryParams}`, {
          method: "POST",
          body: JSON.stringify(logData),
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      if (sendToConsole) {
        const logLevel = consoleOverride || level;
        const consoleMethod = ["notice", "info"].includes(level) ? "log" : level;
        console[consoleMethod]("[Weglot]", logLevel);
      }
    }

    return {
      log: (message, options) => log("info", message, options),
      info: (message, options) => log("info", message, options),
      notice: (message, options) => log("notice", message, options),
      warn: (message, options) => log("warn", message, options),
      error: (message, options) => log("error", message, options)
    };
  }

  const logger = createLogger("html-parser-engine");
  var s = createLogger("html-parser-engine");
  var c = {
    TRANSLATION: "translations.weglot.io",
    SWITCHER: "switchers.weglot.io",
    EXCLUSION: "exclusions.weglot.io",
    DEFINITION: "definitions.weglot.io"
  };
  var l = Object.keys(c).map(function(e) {
    return c[e];
  });

  function isExternalUrl(url) {
    for (var i = 0; i < l.length; i++) {
      if (url.indexOf(l[i]) !== -1) {
        return true;
      }
    }
    return false;
  }
  function f(e, t, n) {
    var cachedResult = t && t[e];
    if (cachedResult && cachedResult.textContent === t.textContent) {
      return cachedResult.result;
    }
    var result = n(t);
    if (t) {
      t[e] = {
        result: result,
        textContent: t.textContent
      };
    }
    return result;
  }

  function containsNoTranslateNodes(e) {
    return f("__containsNoTranslateNodes", e, function (element) {
      return (
        element.nodeType === 1 &&
        (!!element.querySelector("[" + config.noTranslateAttribute + "]") ||
          isExternalUrl(element))
      );
    });
  }

  function isValidMergeNodes(element) {
    return (
      f("__validMergeNodes", element, function (el) {
        return el && isElement(el) && isTextNode(el) && !containsNoTranslateNodes(el);
      })
    );
  }
  function filterValidTextNodes(element, trimWhitespace = true) {
    return f("__validTextNodes", element, (node) => {
      if (!node.textContent || (trimWhitespace && !node.textContent.trim()) || node.textContent.indexOf("BESbswy") !== -1 || (node.parentNode && node.parentNode.nodeName && ["script", "style", "noscript"].includes(node.parentNode.nodeName.toLowerCase())) || isJsonString(node.textContent)) {
        return false;
      }
      return true;
    });
  }

  function shouldRemoveElement(element) {
    try {
      if (config.mergedSelectorRemove && k(element, config.mergedSelectorRemove)) {
        return false;
      }
    } catch (error) {}
    return (!config.mergeNodes || config.mergeNodes.indexOf(element.nodeName) !== -1) || (element.dataset && element.dataset.wgMerge || (config.selectorMerging && element.matches && element.matches(config.selectorMerging)));
  }
  function hasOnlyInlineChildNodes(element) {
    return filterValidTextNodes(element, false) && Array.from(element.childNodes).every(childNode => {
      if (!childNode.weglot || !isValidMergeNodes(childNode) || !hasOnlyInlineChildNodes(childNode)) {
        return false;
      }
      return true;
    });
  }

  function hasNoTranslateChildren(element) {
    if (!element.children) {
      return false;
    }
    return Array.from(element.children).some(child => {
      if (child.wgNoTranslate || hasNoTranslateChildren(child)) {
        return true;
      }
      return false;
    });
  }

  function hasNoTranslateAncestor(element) {
    if (!element) {
      return false;
    }
    const closestElement = element.closest ? element : element.parentNode;
    return closestElement && closestElement.matches(`[${config.noTranslateAttribute}]`) || hasNoTranslateAncestor(element.parentNode);
  }

  function shouldTranslate(element) {
    if (!element) {
      return false;
    }
    const closestElement = element.closest ? element : element.parentNode;
    return !(!closestElement || !closestElement.matches(`[${config.noTranslateAttribute}]`)) || hasNoTranslateAncestor(element);
  }
  var findElements = function(querySelectorAll, defaultValue) {
    return function(context, selector) {
      try {
        var result = selector;
        return -1 !== result.indexOf(":") && (result = result.replace(/([^\\]):/g, "$1\\:")),
        context[querySelectorAll] ? context[querySelectorAll](result) : defaultValue
      } catch (error) {
        try {
          return context[querySelectorAll] ? context[querySelectorAll](selector) : defaultValue
        } catch (error) {
          console.warn(error, {
            consoleOverride: "Your CSS rules are incorrect: " + selector,
            sendToDatadog: false
          })
        }
      }
      return defaultValue
    }
  }

  var querySelectorAll = findElements("querySelectorAll", []);
  var matches = findElements("matches", false);
  var closest = findElements("closest", null);

  function isHTMLString(str) {
    return str.indexOf("<") > -1 && str.indexOf(">") > -1;
  }
  var elementMap = new WeakMap;

  function getTranslatedElements(element) {
    if (!element) {
      return [];
    }

    var targetElement = element.querySelectorAll ? element : element.parentNode;
    if (!targetElement) {
      return [];
    }

    if (shouldExcludeElement(targetElement)) {
      return [];
    }

    if (!shouldTranslateWithWhitelist(targetElement)) {
      return getTranslatedElementsFromChildren(targetElement);
    }

    var whitelistSelectors = getWhitelistSelectors();
    if (isElementInWhitelist(targetElement, whitelistSelectors)) {
      return getTranslatedElementsFromChildren(targetElement);
    }

    var translatedElements = [];
    var childElements = getElementsMatchingSelectors(targetElement, whitelistSelectors);
    for (var i = 0; i < childElements.length; i++) {
      var childElement = childElements[i];
      translatedElements.push(...getTranslatedElementsFromChildren(childElement));
    }

    return translatedElements;
  }

  function shouldExcludeElement(element) {
    var excludedBlocks = config.excluded_blocks;
    if (excludedBlocks && excludedBlocks.length) {
      var excludedSelectors = excludedBlocks.map(function(block) {
        return block.value;
      });
      var excludedSelectorString = excludedSelectors.join(",");
      if (elementMatchesSelectors(element, excludedSelectorString)) {
        if (config.private_mode) {
          var matchedSelector = excludedSelectors.find(function(selector) {
            return elementMatchesSelectors(element, selector);
          });
          element.wgNoTranslate = "Excluded by selector: " + matchedSelector;
        } else {
          element.wgNoTranslate = true;
        }
        return true;
      }

      var nestedElements = getElementsMatchingSelectors(element, excludedSelectorString);
      if (nestedElements) {
        for (var j = 0; j < nestedElements.length; j++) {
          var nestedElement = nestedElements[j];
          if (config.private_mode) {
            var matchedSelector = excludedSelectors.find(function(selector) {
              return elementMatchesSelectors(nestedElement, selector);
            });
            nestedElement.wgNoTranslate = "Excluded by selector: " + matchedSelector;
          } else {
            nestedElement.wgNoTranslate = true;
          }
        }
      }
    }
    return false;
  }

  function shouldTranslateWithWhitelist(element) {
    return !config.whitelist || !config.whitelist.length;
  }

  function getTranslatedElementsFromChildren(element) {
    var translatedElements = [];
    if (element.childNodes) {
      for (var i = 0; i < element.childNodes.length; i++) {
        var childNode = element.childNodes[i];
        if (isTextNode(childNode)) {
          var translatedElement = translateTextNode(childNode);
          if (translatedElement) {
            translatedElements.push(translatedElement);
          }
        } else if (isElementNode(childNode)) {
          var translatedChildElements = getTranslatedElements(childNode);
          translatedElements.push(...translatedChildElements);
        }
      }
    }
    return translatedElements;
  }

  function isTextNode(node) {
    return node.nodeType === Node.TEXT_NODE;
  }

  function isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
  }

  function translateTextNode(textNode) {
    var textContent = textNode.textContent;
    if (!isEmptyString(textContent)) {
      return {
        element: textNode,
        words: textContent,
        type: 1,
        properties: {}
      };
    }
    return null;
  }

  function isEmptyString(str) {
    return !str || !str.trim() || !isNaN(str) || str === "​";
  }

  function getElementsMatchingSelectors(element, selectors) {
    if (!element || !selectors) {
      return [];
    }
    var querySelectorAll = element.querySelectorAll ? element : element.parentNode;
    if (!querySelectorAll) {
      return [];
    }
    return querySelectorAll(selectors);
  }

  function elementMatchesSelectors(element, selectors) {
    if (!element || !selectors) {
      return false;
    }
    var matches = element.matches ? element.matches : element.parentNode.matches;
    if (!matches) {
      return false;
    }
    return matches(selectors);
  }

  function isElementInWhitelist(element, whitelistSelectors) {
    return isElementNode(element) && elementMatchesSelectors(element, whitelistSelectors);
  }

  function getWhitelistSelectors() {
    var whitelist = config.whitelist;
    if (!whitelist) {
      return [];
    }
    return whitelist.map(function(item) {
      return item.value;
    }).join(",");
  }

  var translatedElements = getTranslatedElements(targetElement);
  function getTranslatedElementsAndTextNodes(element) {
    var translatedElements = [];
    var textNodes = [];
    
    // Find translated elements
    var elements = findTranslatedElements(element);
    translatedElements = elements.map(function(el) {
      var words = getWordsFromElement(el);
      var type = getTypeOfElement(el);
      var properties = getPropertiesOfElement(el);
      var attrSetter = getAttributeSetterOfElement(el);
      var attrName = getAttributeNameOfElement(el);
      
      return {
        element: el,
        words: words,
        type: type,
        properties: properties,
        attrSetter: attrSetter,
        attrName: attrName
      };
    });
    
    // Find text nodes
    var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = treeWalker.nextNode()) {
      var words = getWordsFromTextNode(node);
      if (words) {
        textNodes.push({
          element: node,
          words: words,
          type: 1,
          properties: {}
        });
      }
    }
    
    return translatedElements.concat(textNodes);
  }

  function findTranslatedElements(element) {
    var selectors = [
      "[title]",
      "input[type='submit']",
      "input[type='button']",
      "button",
      "input[placeholder]",
      "textarea[placeholder]",
      "meta[name='description']",
      "meta[property='og:description']",
      "meta[property='og:site_name']",
      "meta[property='og:image:alt']",
      "meta[name='twitter:description']",
      "meta[itemprop='description']",
      "meta[itemprop='name']",
      "img",
      "[href$='.pdf']",
      "[href$='.docx']",
      "[href$='.doc']",
      "meta[property='og:title']",
      "meta[name='twitter:title']",
      "iframe[src*='youtube.com']",
      "iframe[src*='youtu.be']",
      "iframe[src*='vimeo.com']",
      "iframe[src*='dailymotion.com']",
      "img",
      "source"
    ];
    
    var translatedElements = [];
    selectors.forEach(function(selector) {
      var elements = element.querySelectorAll(selector);
      elements.forEach(function(el) {
        if (!isElementTranslated(el)) {
          translatedElements.push(el);
        }
      });
    });
    
    return translatedElements;
  }

  function isElementTranslated(element) {
    return element.hasAttribute("data-wg-translated");
  }

  function getWordsFromElement(element) {
    var attribute = element.getAttribute("data-wg-words");
    return attribute ? attribute.trim() : "";
  }

  function getTypeOfElement(element) {
    var attribute = element.getAttribute("data-wg-type");
    return attribute ? parseInt(attribute) : 0;
  }

  function getPropertiesOfElement(element) {
    var attribute = element.getAttribute("data-wg-properties");
    return attribute ? JSON.parse(attribute) : {};
  }

  function getAttributeSetterOfElement(element) {
    var attribute = element.getAttribute("data-wg-attr-setter");
    return attribute ? attribute.trim() : null;
  }

  function getAttributeNameOfElement(element) {
    var attribute = element.getAttribute("data-wg-attr-name");
    return attribute ? attribute.trim() : null;
  }

  function getWordsFromTextNode(textNode) {
    var words = textNode.textContent.trim();
    return words ? words : null;
  }
  function findResolvedElement(element, treeWalker) {
    var resolvedElement = false;
    if (element.wgResolved) {
      return false;
    }
    var currentNode = element;
    do {
      if (currentNode.wgResolved) {
        return currentNode;
      }
      currentNode = currentNode.parentElement || currentNode.parentNode;
    } while (currentNode !== null && currentNode.nodeType === 1);
    return false;
  }

  function getResolvedElementData(element, resolvedElementsMap) {
    if (resolvedElementsMap.has(element)) {
      var resolvedElementData = resolvedElementsMap.get(element);
      return {
        element: resolvedElementData[0],
        words: resolvedElementData[1],
        type: 1,
        properties: resolvedElementData[2]
      };
    }
    var clonedElement = element.cloneNode(true);
    if (config.translation_engine > 2) {
      traverseElement(element, function(node) {
        if (node.nodeType === 1) {
          var attributes = Array.from(node.attributes);
          resolvedElements.push({
            attributes: attributes,
            child: node
          });
        }
      });
      var attributeIndex = 1;
      traverseElement(clonedElement, function(node) {
        if (node.nodeType === 1) {
          removeAttributes(node);
          node.setAttribute("wg-" + attributeIndex++, "");
        }
      });
    }
    if (element) {
      element.wgResolved = true;
      return [element, (clonedElement.innerHTML || clonedElement.textContent || "").replace(/<!--[^>]*-->/g, ""), resolvedElements];
    }
  }

  function getTextElementData(element) {
    var textContent = element.textContent;
    if (!isEmptyString(textContent)) {
      return {
        element: element,
        words: textContent,
        type: 1,
        properties: {}
      };
    }
  }

  function traverseElement(element, callback) {
    var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    while (treeWalker.nextNode()) {
      callback(treeWalker.currentNode);
    }
  }

  function removeAttributes(element) {
    if (!element.attributes) {
      return element;
    }
    while (element.attributes.length > 0) {
      element.removeAttribute(element.attributes[0].name);
    }
  }

  var resolvedElementsMap = new Map();

  function getResolvedElement(element, treeWalker) {
    var resolvedElement = findResolvedElement(element, treeWalker);
    if (resolvedElement && resolvedElementsMap.has(resolvedElement)) {
      var resolvedElementData = resolvedElementsMap.get(resolvedElement);
      return {
        element: resolvedElementData[0],
        words: resolvedElementData[1],
        type: 1,
        properties: resolvedElementData[2]
      };
    }
    var resolvedElementData = getResolvedElementData(element, resolvedElementsMap);
    if (resolvedElementData) {
      var resolvedElement = resolvedElementData[0];
      var words = resolvedElementData[1];
      var properties = resolvedElementData[2];
      if (!isEmptyString(words)) {
        resolvedElementsMap.set(resolvedElement, resolvedElementData);
        return {
          element: resolvedElement,
          words: words,
          type: 1,
          properties: properties
        };
      }
    }
  }

  function getTextElement(element) {
    var textContent = element.textContent;
    if (!isEmptyString(textContent)) {
      return {
        element: element,
        words: textContent,
        type: 1,
        properties: {}
      };
    }
  function traverseAndCallback(element, callback) {
    var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    while (treeWalker.nextNode()) {
      callback(treeWalker.currentNode);
    }
  }

  function translateElement(element, translations) {
    if (element.childNodes) {
      for (var i = 0; i < element.childNodes.length; i += 1) {
        var childNode = element.childNodes[i];
        if (!childNode) {
          return;
        }
        callback(childNode);
        traverseAndCallback(childNode, callback);
      }
    }
  }

  function isNullOrWhitespace(value) {
    return !value || !value.trim() || !isNaN(value) || value === "​";
  }

  function applyTranslations(elements, language) {
    for (var i = 0; i < elements.length; i += 1) {
      var element = elements[i];
      var content = element.weglot.content;
      if (content && element.isConnected) {
        for (var j = 0; j < content.length; j += 1) {
          var translation = content[j].translations[language] || content[j].original;
          var properties = content[j].properties;
          var attrSetter = content[j].attrSetter;
          if (properties) {
            element.weglot.setted = true;
            replaceText(element, translation, properties, content[j].original, elements);
          }
          if (attrSetter) {
            element.weglot.setted = true;
            attrSetter(element, translation, content[j].original);
          }
        }
        element.wgResolved = false;
      }
    }
  }

  function replaceText(element, translation, properties, original, elements) {
    if (element.nodeType === 1) {
      var wrapper = createWrapper(translation, element, properties);
      element.innerHTML = "";
      element.appendChild(wrapper);
    }
    if (isHTMLString(translation) && !isHTMLString(original)) {
      if (!element.parentNode) {
        console.warn("Unable to translate some words, please contact support@weglot.com.");
        console.warn(element, { sendToDatadog: false });
        return;
      }
      if (element.parentNode.childNodes.length === 1) {
        element.parentNode.weglot = element.weglot;
        replaceText(element.parentNode, translation, properties, original, elements);
      } else {
        var translationWrapper = element.closest && element.closest("[data-wg-translation-wrapper]") || element.parentNode.closest("[data-wg-translation-wrapper]");
        if (!translationWrapper || translationWrapper.innerHTML !== translation) {
          var wrapper = document.createElement("span");
          wrapper.dataset.wgTranslationWrapper = "";
          wrapper.weglot = element.weglot;
          element.parentNode.replaceChild(wrapper, element);
          replaceText(element.parentNode, translation, properties, original, elements);
        }
      }
    } else {
      element.textContent = translation;
    }
  }

  function createWrapper(translation, element, properties) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = translation;
    applyProperties(properties, wrapper);
    return wrapper;
  }

  function applyProperties(properties, element) {
    if (!properties) {
      return;
    }
    for (var i = 0; i < properties.length; i += 1) {
      var property = properties[i];
      var attributeName = property.name;
      var attributeValue = property.get(element);
      property.set(element, attributeValue);
    }
  }
      var createTranslatedFragment = function(element, translations) {
        var fragment = document.createDocumentFragment();
        if (element.nodeType !== 1) {
          return fragment.appendChild(translations);
        }
        var translationNodesLength = translations.childNodes.length;
        for (var i = 0; i < translationNodesLength; i++) {
          var translationNode = translations.firstChild;
          var translationIndex = getTranslationIndex(translationNode);
          if (translationIndex) {
            var translation = translations[translationIndex - 1];
            if (!translation) {
              continue;
            }
            var clonedNode = translation.used ? translation.child.cloneNode(true) : translation.child;
            var translatedFragment = processTranslatedFragment(clonedNode, translationNode, translations);
            if (translatedFragment.contains(clonedNode)) {
              console.error("There is an HTML error in the translation of: " + element.innerHTML.toString());
              return fragment;
            }
            clonedNode.innerHTML = "";
            clonedNode.appendChild(translatedFragment);
            fragment.appendChild(clonedNode);
            document.createDocumentFragment().appendChild(translationNode);
            translation.used = true;
          } else {
            fragment.appendChild(translationNode);
          }
        }
        return fragment;
      }

      function getTranslationIndex(node) {
        if (node && node.nodeType === 1 && node.attributes && node.attributes[0]) {
          var attributeName = node.attributes[0].name;
          var index = parseInt(attributeName.split("wg-")[1]);
          return isNaN(index) ? undefined : index;
        }
      }

      function getAttributeGetterSetter(attributeName) {
        return {
          name: attributeName,
          get: function(element) {
            return element.getAttribute(attributeName);
          },
          set: function(element, value) {
            return element.setAttribute(attributeName, value);
          }
        };
      }
              
  function updatePictureSourceSet(element, newSourceSet) {
    if (element.parentNode && element.parentNode.tagName === "PICTURE") {
      const pictureChildren = element.parentNode.children;
      for (let i = 0; i < pictureChildren.length; i++) {
        const child = pictureChildren[i];
        if (child.tagName === "SOURCE") {
          if (child.getAttribute("srcset")) {
            child.setAttribute("srcset", newSourceSet);
          }
        }
      }
    }
  }

  function extractDomain(url) {
    return url && url.split && url.split("www.")[1] || url;
  }
  function getTranslationTypes(options) {
    var translationTypes = [{
      type: 1,
      selectors: ["[title]"],
      attribute: getAttribute("title")
    }, {
      type: 2,
      selectors: ["input[type='submit']", "input[type='button']", "button"],
      attribute: getAttribute("value")
    }, {
      type: 3,
      selectors: ["input[placeholder]", "textarea[placeholder]"],
      attribute: getAttribute("placeholder")
    }, {
      type: 4,
      selectors: ["meta[name='description']", "meta[property='og:description']", "meta[property='og:site_name']", "meta[property='og:image:alt']", "meta[name='twitter:description']", "meta[itemprop='description']", "meta[itemprop='name']"],
      attribute: getAttribute("content")
    }, {
      type: 7,
      selectors: ["img"],
      attribute: getAttribute("alt")
    }, {
      type: 8,
      selectors: ["[href$='.pdf']", "[href$='.docx']", "[href$='.doc']"],
      attribute: getAttribute("href")
    }, {
      type: 9,
      selectors: ["meta[property='og:title']", "meta[name='twitter:title']"],
      attribute: getAttribute("content")
    }];

    if (!options) {
      return translationTypes;
    }

    if (options.media_enabled) {
      translationTypes.push({
        type: 5,
        selectors: ["youtube.com", "youtu.be", "vimeo.com", "dailymotion.com"].map(function (site) {
          return "iframe[src*='" + site + "']";
        }),
        attribute: getAttribute("src")
      }, {
        type: 6,
        selectors: ["img", "source"],
        attribute: {
          name: "src",
          get: function (element) {
            var src = element.getAttribute("src");
            if (!src || !src.split) {
              return "";
            }
            if (src.indexOf("data:image") === 0) {
              return "";
            }
            var parts = src.split("?");
            if (parts[1]) {
              element.queryString = parts[1];
            }
            return parts[0];
          },
          set: function (element, oldValue, newValue) {
            var src = element.getAttribute("src");
            var srcset = element.getAttribute("srcset");
            if (oldValue === newValue) {
              if (element.isChanged) {
                var newSrc = "" + oldValue + (element.queryString ? "?" + element.queryString : "");
                element.setAttribute("src", newSrc);
                F(element, newSrc);
                if (element.hasAttribute("wgsrcset")) {
                  element.setAttribute("srcset", element.getAttribute("wgsrcset") || element.dataset.srcset);
                  element.removeAttribute("wgsrcset");
                }
              }
            } else if (src.split("?")[0] !== oldValue && newValue !== oldValue) {
              element.setAttribute("src", oldValue);
              F(element, oldValue);
              if (element.hasAttribute("srcset")) {
                element.setAttribute("wgsrcset", srcset);
                element.setAttribute("srcset", "");
              }
              element.dataset.wgtranslated = true;
              element.isChanged = true;
            }
          }
        }
      }, {
        type: 6,
        selectors: ["meta[property='og:image']", "meta[property='og:logo']"],
        attribute: getAttribute("content")
      }, {
        type: 6,
        selectors: ["img"],
        attribute: getAttribute("srcset")
      });
    }

    if (options.translate_aria) {
      translationTypes.push({
        type: 1,
        selectors: ["[aria-label]"],
        attribute: getAttribute("aria-label")
      });
    }

    if (options.external_enabled) {
      var currentHostname = getCurrentHostname();
      translationTypes.push({
        type: 10,
        selectors: ["iframe"],
        attribute: getAttribute("src")
      }, {
        type: 10,
        selectors: ["a[rel=external]"],
        attribute: getAttribute("href")
      }, {
        type: 10,
        selectors: ['[href^="mailto"]'],
        attribute: getAttribute("href")
      }, {
        type: 10,
        selectors: ['[href^="tel"]'],
        attribute: getAttribute("href")
      }, {
        type: 10,
        selectors: ["http:", "https:", "//"].map(function (protocol) {
          return '[href^="' + protocol + '"]:not(link)';
        }),
        attribute: {
          name: "href",
          get: function (element) {
            if (!element.href || !element.href.split) {
              return "";
            }
            var hostname = element.href.split("/")[2];
            return hostname && U(hostname) !== currentHostname ? element.getAttribute("href") : "";
          },
          set: function (element, newValue) {
            return element.setAttribute("href", newValue);
          }
        }
      });
    }

    if (options.extra_definitions && options.extra_definitions.length) {
      for (var i = 0; i < options.extra_definitions.length; i++) {
        var extraDefinition = options.extra_definitions[i];
        var type = extraDefinition.type;
        var selector = extraDefinition.selector;
        var attribute = extraDefinition.attribute;
        if (attribute && selector) {
          translationTypes.push({
            type: type,
            selectors: [selector],
            attribute: {
              name: attribute,
              get: function (element) {
                return element.getAttribute(attribute);
              },
              set: function (element, newValue) {
                return element.setAttribute(attribute, newValue);
              }
            }
          });
        } else {
          console.warn("Each extra definition option needs at least {attribute,selector}", {
            sendToDatadog: false
          });
        }
      }
    }

    return translationTypes;
  }
  // Create a TreeWalker object
  var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);

  // Traverse the element and its descendants
  while (treeWalker.nextNode()) {
    // Callback function to be executed for each node
    callback(treeWalker.currentNode);
  }
  function createTranslationEngine(document, options) {
    if (!options || !options.translation_engine) {
      throw "translation_engine is required";
    }
    
    var translationEngine = options.translation_engine;
    var mergedNodes = [];
    
    Object.assign(elements, options);
    elements.document = document;
    
    // Determine the merged nodes based on the translation engine
    Object.keys(elements).forEach(function(key, index) {
      if (translationEngine >= index + 1) {
        mergedNodes.push.apply(mergedNodes, elements[key]);
      }
    });
    
    if (Array.isArray(elements.extra_merged_selectors)) {
      elements.selectorMerging = options.extra_merged_selectors.filter(function(selector) {
        return selector && typeof selector === "string";
      }).join(",");
    }
    
    if (options.merged_selectors_remove) {
      elements.mergedSelectorRemove = options.merged_selectors_remove.map(function(selector) {
        return selector.value;
      }).join(",");
    }
    
    return {
      getTextNodes: getTextNodes,
      setTextNodes: setTextNodes,
      definitions: getDefinitions(options)
    };
  }
  var hasCookieSupport;
  try {
    document.cookie;
    hasCookieSupport = true;
  } catch (error) {
    hasCookieSupport = false;
  }
  function setCookie(options) {
    var name = options.name;
    var value = options.value;
    var domain = options.domain || null;
    var path = options.path || null;
    var expires = options.expires || null;
    var host = options.options.host;
    var isConnect = options.options.is_connect;
    var subdirectory = options.options.subdirectory;
    
    if (document.cookie && name) {
      name = encodeURIComponent(name.replace(/[^+#$&^`|]/g, encodeURIComponent).replace("(", "%28").replace(")", "%29"));
      value = value.toString().replace(/[^+#$&/:<-[\]-}]/g, encodeURIComponent);
      
      if (!domain && isConnect && host) {
        domain = subdirectory ? host : host.split("www.").pop();
      }
      
      var domainString = domain ? ";domain=" + domain : "";
      var expiresString = expires ? ";expires=" + expires : "";
      var pathString = ";path=/" + (path || "");
      
      document.cookie = name + "=" + value + domainString + pathString + expiresString + ";SameSite=None;Secure";
    }
  }
  
  function getCookie(name) {
    if (!document.cookie) {
      return null;
    }
    
    var cookies = document.cookie.split(";");
    
    while (cookies.length) {
      var cookie = cookies.pop();
      var index = cookie.indexOf("=");
      index = index < 0 ? cookie.length : index;
      
      if (decodeURIComponent(cookie.slice(0, index).replace(/^\s+/, "")) === name) {
        return decodeURIComponent(cookie.slice(index + 1));
      }
    }
    
    return null;
  }
  
  function eraseCookie(options) {
    var name = options.name;
    var domain = options.domain || null;
    var path = options.path || null;
    var cookieOptions = options.options;
    
    setCookie({
      name: name,
      value: "",
      domain: domain,
      path: path,
      expires: "Thu, 01 Jan 1970 00:00:00 GMT",
      options: cookieOptions
    });
  }
  var Weglot = function() {
    "use strict";
    var libraryService = i({
      service: "js-library"
    });
    var projectSettingsURL = "https://cdn.weglot.com/projects-settings/";
    var previewURL = "preview.weglot.io";
    var languageCookieName = "wglang";
    var styleTransAttribute = "wg-style-trans";
    var noTranslateAttribute = "data-wg-notranslate";
    var translationsAttribute = "wg-translations";
    var slugsAttribute = "wg-slugs";
    var shopifyPlatform = "Shopify";
    var bigCommercePlatform = "BigCommerce";
    var jimdoPlatform = "Jimdo";
    var squarespacePlatform = "Squarespace";
    var wixPlatform = "Wix";
    var webflowPlatform = "Webflow";
    var squareOnlinePlatform = "Square Online";
    var bubblePlatform = "Bubble";
    var salesforcePlatform = "Salesforce";
    var configKeys = ["excluded_blocks", "excluded_blocks_remove", "dynamics", "excluded_paths", "dangerously_force_dynamic", "extra_definitions", "translate_event"];
    var eventKeys = ["polyfillReady", "languageChanged", "initialized", "start", "switchersReady"];
    var defaultOptions = {
      button_style: {
        full_name: true,
        with_name: true,
        is_dropdown: true,
        with_flags: false,
        flag_type: ""
      },
      switchers: [],
      auto_switch: false,
      auto_switch_fallback: "",
      excluded_blocks: [],
      excluded_blocks_remove: [],
      whitelist: [],
      translate_event: [{
        selector: "[data-wg-translate-event]",
        eventName: null
      }],
      customer_tag: false,
      order_tag: true,
      dynamics: [],
      excluded_paths: [],
      wait_transition: true,
      hide_switcher: false,
      translate_search: false,
      media_enabled: false,
      search_forms: "",
      cache: false,
      live: true,
      loading_bar: true,
      search_parameter: "",
      translation_engine: 2,
      override_hreflang: true
    };
    var switcherStyles = ["none", "shiny", "square", "circle", "rectangle_mat"];
    var globalVariables = {};

    // Rest of the code...
  }();
  (function() {
    var hasIterator = function() {
      try {
        return !!Symbol.iterator;
      } catch (error) {
        return false;
      }
    };

    var createIterator = function(array) {
      var index = 0;
      return {
        next: function() {
          var value = array[index];
          index++;
          return {
            done: value === undefined,
            value: value
          };
        }
      };
    };

    var encodeURIComponent = function(str) {
      try {
        return encodeURIComponent(str).replace(/%20/g, "+");
      } catch (error) {
        return str;
      }
    };

    var decodeURIComponent = function(str) {
      try {
        return decodeURIComponent(String(str).replace(/\+/g, " "));
      } catch (error) {
        return str;
      }
    };

    (function() {
      try {
        var hasURLSearchParams = typeof URLSearchParams !== 'undefined';
        if (hasURLSearchParams) {
          var testParams = new URLSearchParams('?a=1');
          var isSetFunction = typeof testParams.set === 'function';
          var isEntriesFunction = typeof testParams.entries === 'function';
          return testParams.toString() === 'a=1' && isSetFunction && isEntriesFunction;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    })() || (function() {
      var URLSearchParamsPolyfill = function(input) {
        Object.defineProperty(this, '_entries', {
          writable: true,
          value: {}
        });
        var inputType = typeof input;
        if (inputType === 'undefined') {
          // Do nothing
        } else if (inputType === 'string') {
          if (input !== '') {
            this._fromString(input);
          }
        } else if (input instanceof URLSearchParamsPolyfill) {
          var self = this;
          input.forEach(function(value, key) {
            self.append(key, value);
          });
        } else {
          if (input === null || inputType !== 'object') {
            throw new TypeError('Unsupported input type for URLSearchParams');
          }
          if (Object.prototype.toString.call(input) === '[object Array]') {
            for (var i = 0; i < input.length; i++) {
              var entry = input[i];
              if (Object.prototype.toString.call(entry) !== '[object Array]' || entry.length !== 2) {
                throw new TypeError('Expected [string, any] as entry at index ' + i + ' of URLSearchParams input');
              }
              this.append(entry[0], entry[1]);
            }
          } else {
            for (var key in input) {
              if (input.hasOwnProperty(key)) {
                this.append(key, input[key]);
              }
            }
          }
        }
      };

      var proto = URLSearchParamsPolyfill.prototype;

      proto.append = function(name, value) {
        if (name in this._entries) {
          this._entries[name].push(String(value));
        } else {
          this._entries[name] = [String(value)];
        }
      };

      proto.delete = function(name) {
        delete this._entries[name];
      };

      proto.get = function(name) {
        return name in this._entries ? this._entries[name][0] : null;
      };

      proto.getAll = function(name) {
        return name in this._entries ? this._entries[name].slice(0) : [];
      };

      proto.has = function(name) {
        return name in this._entries;
      };

      proto.set = function(name, value) {
        this._entries[name] = [String(value)];
      };

      proto.forEach = function(callback, thisArg) {
        for (var name in this._entries) {
          if (this._entries.hasOwnProperty(name)) {
            var values = this._entries[name];
            for (var i = 0; i < values.length; i++) {
              callback.call(thisArg, values[i], name, this);
            }
          }
        }
      };

      proto.keys = function() {
        var keys = [];
        this.forEach(function(value, name) {
          keys.push(name);
        });
        return new URLSearchParamsPolyfillIterator(keys);
      };

      proto.values = function() {
        var values = [];
        this.forEach(function(value) {
          values.push(value);
        });
        return new URLSearchParamsPolyfillIterator(values);
      };

      proto.entries = function() {
        var entries = [];
        this.forEach(function(value, name) {
          entries.push([name, value]);
        });
        return new URLSearchParamsPolyfillIterator(entries);
      };

      if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        proto[Symbol.iterator] = proto.entries;
      }

      proto.toString = function() {
        var params = [];
        this.forEach(function(value, name) {
          params.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
        });
        return params.join('&');
      };

      function URLSearchParamsPolyfillIterator(items) {
        this._items = items;
        this._index = 0;
      }

      var iteratorProto = URLSearchParamsPolyfillIterator.prototype;

      iteratorProto.next = function() {
        if (this._index < this._items.length) {
          var value = this._items[this._index];
          this._index++;
          return {
            done: false,
            value: value
          };
        } else {
          return {
            done: true,
            value: undefined
          };
        }
      };

      if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        iteratorProto[Symbol.iterator] = function() {
          return this;
        };
      }

      return URLSearchParamsPolyfill;
    })();

    var sortSearchParams = function() {
      var params = this;
      var entries = [];

      params.forEach(function(value, name) {
        entries.push([name, value]);
        if (params._entries) {
          params.delete(name);
        }
      });

      entries.sort(function(a, b) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      });

      if (params._entries) {
        params._entries = {};
      }

      for (var i = 0; i < entries.length; i++) {
        params.append(entries[i][0], entries[i][1]);
      }
    };

    var fromStringSearchParams = function(str) {
      var params = this;

      if (params._entries) {
        params._entries = {};
      } else {
        var keys = [];
        params.forEach(function(value, name) {
          keys.push(name);
        });
        for (var i = 0; i < keys.length; i++) {
          params.delete(keys[i]);
        }
      }

      var pairs = (str.replace(/^\?/, "")).split("&");

      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        var name = decodeURIComponent(pair[0]);
        var value = pair.length > 1 ? decodeURIComponent(pair[1]) : "";
        params.append(name, value);
      }
    };

    var URLSearchParams = fe.URLSearchParams.prototype;

    if (typeof URLSearchParams.sort !== "function") {
      URLSearchParams.sort = sortSearchParams;
    }

    if (typeof URLSearchParams._fromString !== "function") {
      Object.defineProperty(URLSearchParams, "_fromString", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: fromStringSearchParams
      });
    }
  })(fe),
  (function (fe) {
    if (
      ((function () {
        try {
          var url = new fe.URL("b", "http://a");
          return (
            (url.pathname = "c d"),
            "http://a/c%20d" === url.href && url.searchParams
          );
        } catch (e) {
          return !1;
        }
      })() ||
        (function () {
          var url = fe.URL,
            doc = document;
          if (typeof doc === "undefined") {
            return;
          }
          var baseElement = doc.createElement("base");
          baseElement.href = "http://a";
          doc.head.appendChild(baseElement);
          var anchorElement = doc.createElement("a");
          anchorElement.href = "b";
          doc.body.appendChild(anchorElement);
          url.prototype = {
            get href() {
              return anchorElement.href.replace(/\?$/, "");
            },
            set href(value) {
              anchorElement.href = value;
            },
            get protocol() {
              return anchorElement.protocol;
            },
            set protocol(value) {
              anchorElement.protocol = value;
            },
            get username() {
              return anchorElement.username;
            },
            set username(value) {
              anchorElement.username = value;
            },
            get password() {
              return anchorElement.password;
            },
            set password(value) {
              anchorElement.password = value;
            },
            get host() {
              return anchorElement.host;
            },
            set host(value) {
              anchorElement.host = value;
            },
            get hostname() {
              return anchorElement.hostname;
            },
            set hostname(value) {
              anchorElement.hostname = value;
            },
            get port() {
              return anchorElement.port;
            },
            set port(value) {
              anchorElement.port = value;
            },
            get pathname() {
              return anchorElement.pathname;
            },
            set pathname(value) {
              anchorElement.pathname = value;
            },
            get search() {
              return anchorElement.search;
            },
            set search(value) {
              anchorElement.search = value;
            },
            get hash() {
              return anchorElement.hash;
            },
            set hash(value) {
              anchorElement.hash = value;
            },
            toString: function () {
              return this.href;
            },
          };
          try {
            Object.defineProperty(url.prototype, "origin", {
              get: function () {
                return (
                  this.protocol +
                  "//" +
                  this.hostname +
                  (this.port ? ":" + this.port : "")
                );
              },
            });
          } catch (e) {}
          fe.URL = url;
        })(),
      void 0 !== fe.location && !("origin" in fe.location))
    ) {
      var getLocationOrigin = function() {
        return (
          fe.location.protocol +
          "//" +
          fe.location.hostname +
          (fe.location.port ? ":" + fe.location.port : "")
        );
      };
      try {
        Object.defineProperty(fe.location, "origin", {
          get: getLocationOrigin,
          enumerable: true,
        });
      } catch (error) {
        setInterval(function() {
          fe.location.origin = getLocationOrigin();
        }, 100);
      }
    }
  })(fe);
  var getElementBySelectorAll = function(selector, defaultValue) {
    return function(element, query) {
      if (!element || !element[selector] || !query) return defaultValue;
      try {
        return element[selector](query);
      } catch (error) {
        console.error(error, {
          consoleOverride: "The CSS selectors that you provided are incorrect: " + query,
          sendToDatadog: false,
        });
      }
      return defaultValue;
    };
  };

  var querySelectorAll = getElementBySelectorAll("querySelectorAll", []);
  var querySelector = getElementBySelectorAll("querySelector", null);
  var closest = getElementBySelectorAll("closest", null);
  var getElementById = function(id) {
    return document.getElementById(id);
  };
function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function decodeHtmlEntities(str) {
  str = "" + str;
  return ["&nbsp;", "&amp;", "&quot;", "&lt;", "&gt;"].some(function (entity) {
    return str.indexOf(entity) !== -1;
  })
    ? str
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
    : str;
}

function getQueryParam(name) {
  var params = window.location.search
    .slice(1)
    .split("&")
    .map(function (param) {
      return param && param.split("=");
    })
    .find(function (param) {
      return param[0] === name;
    });
  return params && params[1];
}

function getWindowType() {
  try {
    if (window.frameElement || window.self !== window.top) {
      return "with-window-top";
    }
  } catch (e) {
    return "no-window-top";
  }
}

function addCssStyle(css, id) {
  var styleElement = document.createElement("style");
  removeElement(document.getElementById(id));
  styleElement.id = id;
  styleElement.type = "text/css";
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    styleElement.appendChild(document.createTextNode(css));
  }
  if (document.head) {
    document.head.appendChild(styleElement);
  }
}

var isBot = function () {
  return /google|facebook|bing|yahoo|baidu|yandex|lighthouse/i.test(
    navigator.userAgent
  );
};

function isValidSelector(selector) {
  try {
    document.createDocumentFragment().querySelector(selector);
  } catch (e) {
    return false;
  }
  return true;
}

var buildUrlWithQueryParam = function (url, param, value) {
  var urlObject = new URL(url, location.href);
  urlObject.searchParams.set(param, value);
  return "" + urlObject.pathname + urlObject.search;
};

function runWhenDocumentReady(callback) {
  if (document.readyState !== "loading") {
    callback();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      callback();
    });
  }
}
var debounce = function (func, delay) {
  var timeoutId;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
};

var isCrossOriginFrame = function (frame) {
  var timestamp = new Date().getTime().toString();
  try {
    var contentWindow = frame.contentWindow;
    contentWindow[timestamp] = "test";
    return contentWindow[timestamp] === "test";
  } catch (error) {
    return false;
  }
};

var eventListeners = {};

var addEventListener = function (eventName, callback) {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);
};

var triggerEvent = function (eventName, data) {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach(function (callback) {
      callback(data);
    });
  }
};

var registeredEvents = [];

function registerEvent(condition, eventName, callback) {
  if (condition) {
    callback();
  } else {
    registerEvent(eventName, callback, true);
  }
}

function executeEvent(eventName, args) {
  var eventCallbacks = registeredEvents.filter(function (event) {
    return event.name === eventName;
  });
  eventCallbacks.forEach(function (eventCallback) {
    try {
      eventCallback.callback.apply(null, args);
    } catch (error) {
      if (!eventCallback.internal) {
        console.error("Error triggering callback function: " + error);
      } else {
        throw error;
      }
    }
  });
}

function getDocumentInfo() {
  if (!isValidHostname(window.location.hostname) || !document.baseURI) {
    var location = window.location;
    return {
      url: location.href,
      hostname: location.hostname,
      pathname: location.pathname,
      search: location.search,
    };
  }
  var parsedUrl = new URL(document.baseURI);
  return {
    url: document.baseURI,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
  };
}

var documentInfo = getDocumentInfo();
// Check if options are ready
Re(Ia && Object.keys(Ia).length > 0, "onOptionsReady", function () {
  if (Ia.dynamicPushState) {
    var originalPushState = history.pushState;
    history.pushState = function () {
      for (var i = [], len = arguments.length; len--; ) {
        i[len] = arguments[len];
      }
      originalPushState.apply(history, i);
      var currentLocation = De();
      (Fe.hostname = currentLocation.hostname),
        (Fe.pathname = currentLocation.pathname),
        (Fe.url = currentLocation.url),
        Ie("onCurrentLocationChanged");
    };
  }
});

var We = {};

function getLocaleRulesPathname() {
  var pathname = Fe.pathname;
  var localeRules = Ia.localeRules || [];
  var languages = Ia.languages;
  var defaultRule = {
    position: 0,
    translatedFormat: "CODE",
    originalFormat: "",
    addedByDefault: true,
  };
  var languageFrom = Ia.language_from;

  if (localeRules.length) {
    var positions = [];
    localeRules.forEach(function (rule) {
      var position = rule.position;
      var translatedFormat = rule.translatedFormat;
      if (translatedFormat && translatedFormat !== "CODE") {
        positions.push(position || 0);
      }
    });

    var uniquePositions = positions.filter(function (value, index, self) {
      return self.indexOf(value) === index;
    });

    var injectedRules = uniquePositions.map(function (position) {
      return Object.assign({}, defaultRule, { position: position });
    });

    localeRules.unshift.apply(localeRules, injectedRules);
  } else {
    localeRules.push(defaultRule);
  }

  var matchedRule = null;
  var matchedRegex = null;

  localeRules.find(function (rule) {
    var position = rule.position || 0;
    var translatedFormat = rule.translatedFormat || "CODE";
    var originalFormat = rule.originalFormat || "";
    var addedByDefault = rule.addedByDefault;

    if (!translatedFormat.includes("CODE")) {
      return false;
    }

    var pathSegments = pathname.split("/");
    if (pathSegments.length <= position) {
      return false;
    }

    var currentSegment = pathSegments[position + 1];

    var matchedLanguage = languages.find(function (language) {
      var code = language.custom_code || language.language_to;
      var regex = translatedFormat.replace("CODE", code);
      var regexObj = new RegExp("^" + regex + "$", "g");
      if (regexObj.test(currentSegment)) {
        matchedRegex = regexObj;
        return true;
      }
      return false;
    });

    if (matchedLanguage) {
      matchedRule = matchedLanguage.custom_code || matchedLanguage.language_to;
      return true;
    }

    if (originalFormat) {
      var originalRegex = originalFormat.replace("CODE", languageFrom);
      if (new RegExp("^" + originalRegex + "$", "g").test(currentSegment)) {
        return true;
      }
    }

    return !addedByDefault;
  });

  We.convertLocale = function (targetLocale, currentPathname, targetLanguage, fallbackPathname) {
    if (!currentPathname) {
      currentPathname = pathname;
    }
    if (!targetLanguage) {
      targetLanguage = matchedRule || languageFrom;
    }
    if (!fallbackPathname) {
      fallbackPathname = null;
    }

    if (targetLanguage === targetLocale) {
      return currentPathname;
    }

    var position = matchedRule.position || 0;
    var originalFormat = matchedRule.originalFormat || "";
    var translatedFormat = matchedRule.translatedFormat || "CODE";

    var pathSegments = currentPathname.split("/");
    if (pathSegments.length <= position) {
      return currentPathname;
    }

    var currentSegment = pathSegments[position + 1];

    if (targetLanguage === languageFrom) {
      var targetFormat = translatedFormat.replace(/CODE/g, targetLocale);
      var isFallback = false;

      if (originalFormat) {
        var originalRegex = originalFormat.replace(/CODE/g, languageFrom);
        var translatedValue = He(targetFormat);
        currentSegment = currentSegment.replace(originalRegex, translatedValue);
        if (fallbackPathname && !originalRegex.test(currentSegment)) {
          isFallback = true;
          currentSegment = fallbackPathname.split("/")[position + 1];
        }
      }

      var segmentCount = originalFormat && !isFallback ? 2 : 1;

      return pathSegments
        .slice(0, position + 1)
        .concat([currentSegment], pathSegments.slice(position + segmentCount))
        .join("/");
    }

    if (targetLocale === languageFrom && !originalFormat) {
      return pathSegments
        .slice(0, position + 1)
        .concat(pathSegments.slice(position + 2))
        .join("/");
    }

    var targetFormat = He((targetLocale === languageFrom ? originalFormat : translatedFormat).replace(/CODE/g, targetLocale));
    var replacedSegment = currentSegment.replace(matchedRegex, targetFormat);

    return pathSegments
      .slice(0, position + 1)
      .concat([replacedSegment], pathSegments.slice(position + 2))
      .join("/");
  };

  We.language = matchedRule ? matchedRule.custom_code || matchedRule.language_to : languageFrom;

  return We;
}

function getConnectHostLanguage() {
  var hostname = Fe.hostname;
  var matchedLanguage = Ia.languages.find(function (language) {
    return language.connect_host_destination && language.connect_host_destination.host === hostname;
  });
  return matchedLanguage ? matchedLanguage.custom_code || matchedLanguage.language_to : Ia.language_from;
}

function getCurrentLanguage() {
  return getLocaleRulesPathname().language;
}

function getDefaultLanguage() {
  if (Ue) {
    return Ue;
  }
  if (Ia.is_connect) {
    var translatedLanguage = document.documentElement.dataset.wgTranslated;
    if (translatedLanguage) {
      Ue = translatedLanguage;
      return translatedLanguage;
    }
    Ue = Ia.subdirectory ? getCurrentLanguage() : getConnectHostLanguage();
  } else {
    Ue = Ia.language_from;
  }
  return Ue;
}

function toggleDisplayByLanguage(elements, language) {
  if (!language) {
    language = getDefaultLanguage();
  }
  for (var i = 0; i < elements.length; i += 1) {
    var element = elements[i];
    if (!element || !element.dataset || !element.dataset.wgOnlyDisplay) {
      return;
    }
    element.hidden = element.dataset.wgOnlyDisplay !== language;
  }
}
function onCurrentLocationChanged() {
  We = {};
}

var storage = {
  getItem: function (key) {
    return z.get(key);
  },
  setItem: function (key, value, options) {
    options = options || {};
    var domain = options.domain;
    var path = options.path;
    var expires = options.expires;
    z.set({
      name: key,
      value: value,
      domain: domain,
      path: path,
      expires: expires,
      options: Ia,
    });
  },
  removeItem: function (key) {
    return z.erase({ name: key, options: Ia });
  },
};

var emptyStorage = {
  getItem: function () {},
  setItem: function () {},
  removeItem: function () {},
};

function getStorage(type) {
  type = type || "local";
  try {
    if (type === "cookie") {
      return storage;
    } else {
      return window[type + "Storage"];
    }
  } catch (e) {}
  if (type) {
    return emptyStorage;
  } else {
    return getStorage(type === "local" ? "cookie" : "local");
  }
}

var translationData = { slugs: {}, version: 0, network: undefined };

function fetchSlugTranslations() {
  return new Promise(function (resolve) {
    var languages = Ia.languages;
    var translations = {};
    var count = 0;

    function fetchTranslation(language) {
      var customCode = language.custom_code;
      var languageTo = language.language_to;

      fetchSlugTranslation(languageTo).then(function (result) {
        translations[customCode || languageTo] = result;
        count++;

        if (count === languages.length) {
          resolve(translations);
        }
      });
    }

    for (var i = 0; i < languages.length; i++) {
      fetchTranslation(languages[i]);
    }
  });
}

function fetchSlugTranslation(language) {
  var apiKey = Ia.api_key;
  var versions = Ia.versions;

  if (!versions || !versions.slugTranslation) {
    return Promise.resolve({});
  }

  var url =
    "https://cdn-api-weglot.com/translations/slugs?api_key=" +
    apiKey +
    "&language_to=" +
    language +
    "&v=" +
    versions.slugTranslation;

  return fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      return Array.isArray(data) ? {} : data;
    })
    .catch(function (error) {
      B.error(error);
      return {};
    });
}

function updateTranslationData(translations) {
  var versions = Ia.versions;

  if (versions && versions.slugTranslation) {
    var version = versions.slugTranslation;

    if (translationData.version < version) {
      if (translationData.network) {
        if (!translationData.network.resolved) {
          translationData.network.then(function (result) {
            updateTranslationData(Ke(result));
          });
        }
      } else {
        translationData.network = fetchSlugTranslations()
          .then(function (result) {
            translationData.network.resolved = true;
            updateTranslationData(Ke(result));
            return result;
          })
          .catch(function () {
            updateTranslationData({});
            return {};
          });
      }

      updateTranslationData(Ke(translationData.slugs));
    } else {
      updateTranslationData(Ke(translations));
    }
  } else {
    updateTranslationData({});
  }
}

function Ke(translations) {
  if (translations) {
    return Object.keys(translations).reduce(function (result, key) {
      result[key] = {
        original: {},
        translated: {},
      };

      Object.keys(translations[key]).forEach(function (original) {
        var translated = translations[key][original];

        if (translated) {
          result[key].original[original] = translated;
          result[key].translated[translated] = original;
        }
      });

      return result;
    }, {});
  } else {
    return {};
  }
}

updateTranslationData(Ke(translationData.slugs));
(function () {
  if (Object.keys(translationData.slugs).length) {
    return translationData.slugs;
  }
  try {
    var storage = getStorage({ type: "local" });
    if (!storage) {
      return {};
    }
    var storedData = storage.getItem("translationData");
    if (storedData) {
      Object.assign(translationData, JSON.parse(storedData));
      return translationData.slugs;
    }
  } catch (error) {
    return {};
  }
})();

var languageUrls = {};

function replaceSlugs(url, slugs) {
  return url
    .split("/")
    .map(function (segment) {
      return slugs[decodeURIComponent(segment)] || segment;
    })
    .join("/");
}

function updateSearchParams(language, searchParams) {
  if (options.autoSwitch && (options.isTld || options.rendered)) {
    if (language === options.fromLanguage) {
      searchParams.set("no_redirect", "true");
    } else {
      searchParams.delete("no_redirect");
    }
  }
}

function updateHostname(language, url) {
  var connectHost = getConnectHost(language);
  if (connectHost) {
    url.hostname = connectHost;
  }
}

function updatePathname(language, url) {
  var slugs = getSlugs();
  var currentPath = url.pathname;
  var fromLanguage = options.fromLanguage;
  if (!languageUrls.originalPath) {
    if (language !== fromLanguage && slugs[language]) {
      var translatedPath = slugs[language].translated;
      languageUrls.originalPath = replaceSlugs(currentPath, translatedPath);
    } else {
      languageUrls.originalPath = currentPath;
    }
  }
  if (language === fromLanguage) {
    url.pathname = languageUrls.originalPath;
  } else if (slugs[language] && slugs[language].original) {
    var originalPath = slugs[language].original;
    url.pathname = replaceSlugs(languageUrls.originalPath, originalPath);
  } else {
    url.pathname = currentPath;
  }
}

function updateSubdirectory(language, url) {
  if (options.subdirectory && language) {
    url.pathname = convertLocale(language, url.pathname);
  }
}

function generateUrl(language, callback) {
  if (!options.isConnect || !language) {
    return callback("#");
  }
  var dynamicPushState = options.dynamicPushState;
  var injectedData = options.injectedData || {};
  var allLanguageUrls = injectedData.allLanguageUrls || {};
  if (!dynamicPushState && allLanguageUrls[language]) {
    var languageUrl = new URL(allLanguageUrls[language]);
    updateSearchParams(language, languageUrl.searchParams);
    return callback(languageUrl.toString());
  }
  getDocumentInfo(function (documentInfo) {
    var newUrl = new URL(documentInfo.url);
    updateSearchParams(language, newUrl.searchParams);
    updateHostname(language, newUrl);
    updatePathname(language, newUrl);
    updateSubdirectory(language, newUrl);
    return callback(newUrl.toString());
  });
}
// Clear location cache when current location changes
Pe(
  "onCurrentLocationChanged",
  function () {
    Qe = {};
  },
  true
);

// Function to get the domain without "www."
function getDomain() {
  var host = Ia.host;
  if (typeof host === "undefined") {
    host = window.location.hostname;
  }
  return host.startsWith("www.") ? host.slice(3) : "." + host;
}

// Function to set the "cart" cookie
function setCartCookie() {
  var cookies = document.cookie.match(/(^cart=[^;]+|[\W]cart=[^;]+)/g);
  if (cookies) {
    var cartValues = cookies.map(function (cookie) {
      return cookie.split("=").pop();
    });
    if (cartValues.length === 1 || cartValues[0] === cartValues[1]) {
      z.set({ name: "cart", value: cartValues[0], domain: getDomain(), options: Ia });
    }
  } else {
    setTimeout(setCartCookie, 100);
  }
}

// Function to redirect to the checkout page with the specified locale
function redirectToCheckout(locale) {
  var url = "/checkout?locale=" + locale;
  fetch(url)
    .then(function (response) {
      document.location.href = encodeURI(response.url);
    })
    .catch(function () {
      document.location.href = encodeURI(url);
    });
}

// Function to update the locale in form actions and links
function updateLocaleInActionsAndLinks(locale) {
  var currentLocale = locale || Be();
  var languageCode = lt(currentLocale);
  var queryParams = [{ name: "locale", value: languageCode }];
  if (Ia.shopify_skip_shop_pay) {
    queryParams.push({ name: "skip_shop_pay", value: "true" });
  }

  var actionsAndLinks = [
    {
      name: "action",
      selector: [
        'form[method="post"][action*="/cart"]',
        'form[method="post"][action*="/checkout"]',
      ],
      testRegex: /\/(cart|checkout|)\/?(\?|$)/,
      event: "submit",
    },
    {
      name: "href",
      selector: ['a[href*="/checkout"]', 'a[href*="/cart/checkout"]'],
      testRegex: /\/(cart\/)?checkout\/?(\?|$)/,
      event: "click",
    },
  ];

  actionsAndLinks.forEach(function (item) {
    var name = item.name;
    var selector = item.selector;
    var testRegex = item.testRegex;
    var event = item.event;

    var elements = document.querySelectorAll(selector.join(","));
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var attributeValue = element.getAttribute(name);
      if (
        testRegex.test(attributeValue) &&
        !queryParams.every(function (param) {
          return attributeValue.includes(param.name + "=" + param.value);
        })
      ) {
        for (var j = 0; j < queryParams.length; j++) {
          var param = queryParams[j];
          attributeValue = Ce(attributeValue, param.name, param.value);
        }
        element.setAttribute(name, attributeValue);

        if (element.wgCheckoutListener) {
          element.removeEventListener(event, element.wgCheckoutListener);
        }

        if (
          currentLocale !== Ia.language_from &&
          Ia.fix_shopify_checkout_locale
        ) {
          element.wgCheckoutListener = function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (Ia.is_connect && !Ia.subdirectory) {
              Je({ type: "cookie" }).setItem("wg_checkout_redirect", currentLocale);
              document.location.href = encodeURI(
                (Ia.is_https ? "https:" : "http:") + "//" + Ia.host
              );
            } else {
              redirectToCheckout(languageCode);
            }
            return false;
          };
          element.addEventListener(event, element.wgCheckoutListener);
        }
      }
    }
  });
}

// Function to update customer tags with the current locale
function updateCustomerTags(locale) {
  var currentLocale = locale || Be();
  var form = document.getElementById("create_customer") ||
    document.querySelector(
      'form[action="' +
      ((currentLocale !== Ia.language_from && Ia.is_connect && ot["/account"])
        ? ot["/account"]
        : "/account") +
      '"]'
    ) ||
    (typeof Ia.customer_tag === "string" && _e(document, Ia.customer_tag));

  if (form) {
    var langForm = document.getElementById("weglot-lang-form");
    if (langForm) {
      langForm.parentNode.removeChild(langForm);
    }

    var input = document.createElement("input");
    Object.assign(input, {
      type: "hidden",
      id: "weglot-lang-form",
      name: "customer[tags]",
      value: "#wg" + currentLocale + "#wg",
    });

    form.appendChild(input);
  }
}

// Function to set the checkout_locale cookie
function setCheckoutLocaleCookie(locale) {
  var shopId = (function () {
    var features = document.getElementById("shopify-features");
    if (!features) {
      return null;
    }
    var match = features.textContent.match(/"shopId":(\d*)/);
    return match ? match[1] : null;
  })();

  if (shopId) {
    z.set({ name: "checkout_locale", value: lt(locale), path: shopId, options: Ia });
  }
}

// Call the necessary functions
setCartCookie();
updateLocaleInActionsAndLinks();
updateCustomerTags();
setCheckoutLocaleCookie();
function updateCartAttributes(language) {
  var currentLanguage = language || getCurrentLanguage();
  if (!isVisualEditor() && !isPreview()) {
    var cartAttributes = getCartAttributes(),
      isConnect = isConnectShop(),
      isOriginalShopifyCheckout = isOriginalShopifyCheckoutEnabled(),
      subdirectory = getSubdirectory(),
      languageFrom = getLanguageFrom(),
      cart = getCart(),
      cartUpdateToken = getSessionStorageItem("wg-cart-update-token");
    if (
      getSessionStorageItem("wg-cart-update-lang") !== currentLanguage ||
      cart !== cartUpdateToken
    ) {
      var attributes = cartAttributes
          .map(function (attribute) {
            return "attributes[" + attribute + "]=" + currentLanguage;
          })
          .join("&"),
        updateCartRequest = fetch("/cart/update.js", {
          method: "POST",
          body: attributes,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          credentials: "same-origin",
        });
      if (!isOriginalShopifyCheckout && isConnect && !subdirectory && languageFrom === getCurrentLanguage()) {
        updateCartRequest
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            var token = data.token;
            return setCookie({
              name: "cart",
              value: token,
              domain: getDomain(),
              options: getCookieOptions(),
            });
          });
      }
      setSessionStorageItem("wg-cart-update-token", cart);
      setSessionStorageItem("wg-cart-update-lang", currentLanguage);
    }
    var cartLinks = document.querySelectorAll('a[href*="/cart/"]');
    var languageAttribute = "attributes[lang]=" + currentLanguage;
    for (var i = 0; i < cartLinks.length; i++) {
      var link = cartLinks[i];
      var href = link.getAttribute("href");
      if (href) {
        var match = href.match(/\/cart\/\d+:\d+(\?)?/);
        if (match) {
          href = href.replace(/&?attributes\[lang\]=([a-zA-Z-]+)/g, "");
          link.setAttribute("href", href + (match[1] ? "&" : "?") + languageAttribute);
        }
      }
    }
  }
}

function switchLanguage(language) {
  if (getCurrentLanguage() !== language) {
    window.Shopify && (window.Shopify.locale = language);
    if (!isPreview()) {
      if (!isCrossOriginFrame()) {
        updateCartAttributes(language);
      }
      updateLocaleInActionsAndLinks(language);
      updateCustomerTags(language);
      var elementsWithLanguageAttribute = document.querySelectorAll("[data-wg-only-display]");
      if (elementsWithLanguageAttribute.length) {
        toggleDisplayByLanguage(elementsWithLanguageAttribute, language);
      }
      if (hasCustomerTag()) {
        updateCustomerTags(language);
      }
    }
  }
}

registerEvent(
  "onCurrentLocationChanged",
  function () {
    clearCachedTranslations();
  },
  true
);
var excludedSelectors = [
  "#isp_search_result_page_container",
  ".snize-ac-results",
  "#snize_results",
  ".snize-recommendation",
  ".snize-modal",
  ".snize-search-results-header",
  "div>span.cc-message",
  ".hc-widget",
  ".jdgm-rev-widg__header",
  ".jdgm-rev__body",
  ".jdgm-rev-title",
  ".yotpo-main-widget",
  "#swell-popup",
  ".swell-tab",
  ".yotpo-widget-override-css",
  ".cw-row",
  ".mini-popup-container",
  "email-field cw-form-control",
  "phone-field cw-form-control",
  ".sms-policy-text",
  ".wlo-content-holder",
  ".wlo-wheel-holder",
  ".yotpo-smsbump-modal__content",
  ".cw-compliance-text",
  "#saso-notifications",
  ".saso-cross-sell-popup",
  ".saso-cart-item-discount-notes",
  ".saso-cart-item-upsell-notes",
  ".saso-volume-discount-tiers",
  ".opw-leading-normal",
  ".opw-my-2.opw-leading-normal.opw-text-lg.opw-text-left",
  ".opinew-navbar.opw-flex.opw-items-center.opw-justify-between.opw-flex-wrap.opw-py-4.opw-px-6",
  ".main-content-container.opw--mx-1",
  ".opw-text-center.opw-text-sm.opw-border-solid.opw-border-0.opw-mt-3",
  ".summary-card-container.opw-mx-1",
  ".opw-reviews-container.opw-mt-3.opw--mx-1",
  ".opinew-reviews-title.opw-flex.opw-items-center.opw-flex-no-shrink.opw-mr-6",
  ".opw-flex.opw-flex-row-reverse",
  "#opinew-app-container",
  ".gem_dynamic-content",
  ".pp_tracking_content",
  ".pp_all_form_div",
  ".pp_tracking_result_title",
  ".progress-bar-style",
  ".pp_tracking_left",
  ".pp_num_status_show",
  ".pp_tracking_status_tips",
  ".pp_page_map_div",
  ".pp_tracking_result_parent",
  ".pp_tracking_right",
  ".pp_recommend_product_parent",
  ".currency-converter-cart-note",
  ".cbb-shipping-rates-calculator",
  ".cbb-frequently-bought-container",
  ".cbb-frequently-bought-discount-applied-message",
  ".cbb-also-bought-container",
  "#zonos",
  ".buddha-menu-item",
  ".R-GlobalModal",
  ".ruk-rating-snippet-count",
  ".R-ContentList-container",
  ".R-ReviewsList-container",
  ".R-SliderIndicator-group",
  ".R-TextBody",
  ".widgetId-reviewsio-carousel-widget",
  ".REVIEWSIO-FloatingMinimised",
  ".REVIEWSIO-FloatingMinimised__Container",
  ".reviewsio-carousel-widget",
  ".reviews-io-floating-widget",
  ".reviews_container",
  ".site-nav.style--sidebar .site-nav-container .subtitle",
  ".search-more",
  ".variant-quantity",
  ".lion-claimed-rewards-list",
  ".lion-header",
  ".lion-header__join-buttons",
  ".lion-header__join-today",
  ".lion-history-table",
  ".lion-integrated-page-section__heading-text",
  ".lion-loyalty-panel",
  ".lion-loyalty-splash",
  ".lion-loyalty-widget",
  ".lion-modal__content",
  ".lion-modal__header",
  ".lion-referral-widget",
  ".lion-rewards-list",
  ".lion-rules-list",
  ".lion-tier-overview",
  ".ccpops-popup__content__bottom-text",
  ".ccpops-popup__content__top-text",
  ".ccpops-trigger__text",
  ".ks-table-row",
  ".klaviyo-form",
];

function getLanguageCode(language) {
  if (language && language.toLowerCase) {
    var lowercaseLanguage = language.toLowerCase();
    var matchedLanguage = Ia.languages.find(function (lang) {
      var langTo = lang.language_to;
      var customCode = lang.custom_code;
      return langTo === lowercaseLanguage || (customCode ? customCode.toLowerCase() === lowercaseLanguage : undefined);
    });
    return matchedLanguage ? matchedLanguage.language_to : language;
  }
}

var languageCache = {};

function isExcludedPath(language) {
  var excludedPaths = Ia.excluded_paths;
  var lowercasePath = Fe.pathname.toLowerCase();

  if (window.location.host === "shopify.weglot.com" || !excludedPaths || !excludedPaths.length) {
    return false;
  }

  if (typeof excludedPaths === "string" && excludedPaths.split(",").some(function (path) {
    return new RegExp(path, "i").test(lowercasePath);
  })) {
    return { allExcluded: true, language_button_displayed: true };
  }

  var languageCode = language || getLanguageCode(Be());

  return (
    (languageCache[languageCode] && languageCache.currentLang === languageCode) ||
    ((languageCache.currentLang = languageCode),
    Ia.injectedData &&
      Ia.injectedData.originalPath &&
      (lowercasePath = Ia.injectedData.originalPath.toLowerCase()),
    excludedPaths.some(function (path) {
      var type = path.type;
      var value = path.value;
      var excludedLanguages = path.excluded_languages;
      var languageButtonDisplayed = path.language_button_displayed;
      var regex = path.regex;
      value = value.toLowerCase();

      var result = {
        language_button_displayed: languageButtonDisplayed,
        allExcluded: !(!excludedLanguages || !(excludedLanguages.length === 0 || excludedLanguages.length >= Ia.languages.length)),
      };

      if (excludedLanguages && excludedLanguages.length && !excludedLanguages.includes(languageCode)) {
        return false;
      }

      var pathMatcher = vt(lowercasePath);
      if (regex && !type.startsWith("NOT") ? pathMatcher.MATCH_REGEX(regex) : pathMatcher[type](value)) {
        languageCache[languageCode] = result;
        return true;
      }

      var decodedPath = lowercasePath;
      try {
        decodedPath = decodeURIComponent(lowercasePath);
      } catch (e) {
        return;
      }

      if (decodedPath !== lowercasePath) {
        var decodedPathMatcher = vt(decodedPath);
        return regex && !type.startsWith("NOT") ? decodedPathMatcher.MATCH_REGEX(regex) : decodedPathMatcher[type](value)
          ? ((languageCache[languageCode] = result), true)
          : undefined;
      }
    })),
    languageCache[languageCode]
  );
}

function getEnabledLanguages() {
  if (languageCache.enabledLanguages) {
    return languageCache.enabledLanguages;
  }

  if (!Ia.api_key) {
    B.warn("Weglot must be initialized to use it.", { sendToDatadog: false });
    return [];
  }

  var publicLanguages = (Ia.languages || [])
    .filter(function (lang) {
      var languageButtonDisplayed = isExcludedPath(lang.language_to)?.language_button_displayed;
      return (!false || Ia.private_mode) && languageButtonDisplayed && (!Ia.subdirectory || !Ia.is_connect || (lang.connect_host_destination && lang.connect_host_destination.created_on_aws));
    })
    .map(function (lang) {
      return lang.custom_code || lang.language_to;
    });

  var enabledLanguages = [Ia.language_from].concat(publicLanguages);

  if (publicLanguages.length === 0) {
    B.log("No public language available.", { sendToDatadog: false });
  }

  languageCache.enabledLanguages = enabledLanguages;
  return enabledLanguages;
}

function getCurrentLanguage() {
  var language = Je().getItem(G);
  if (language && getEnabledLanguages().includes(language)) {
    return language;
  }
}
// Clear location cache when current location changes
registerEvent(
  "onCurrentLocationChanged",
  function () {
    mt = {};
  },
  true
);

registerEvent(
  "onCurrentLocationChanged",
  function () {
    ht = null;
  },
  true
);

var setItemInLocalStorage = function (key, value) {
  return value && localStorage.setItem(G, value);
};

var urlPatterns = [
  {
    condition: [{ type: "TECHNOLOGY_ID", payload: 2 }],
    value: [
      {
        original: "^/checkouts/(?:[\\w]{32})(/.*)?$",
        formatted: "/checkouts$1",
      },
      {
        original: "^/account/(orders|activate)/(?:[\\w]{32})$",
        formatted: "/account/$1/",
      },
      { original: "^/orders/(?:[\\w]{32})$", formatted: "/orders/" },
      {
        original: "^/wallets/checkouts/(?:.*)$",
        formatted: "/wallets/checkouts/",
      },
      { original: "^/(.+)\\.(json|xml)$", formatted: "/$1" },
    ],
  },
];

var isInitialized = false;
var cache = {};
var emptyCache = {};

var localStorage = getStorage({ type: "local" });

if (storage.getItem('translationCache')) {
  try {
    const translationCache = JSON.parse(storage.getItem('translationCache'));
    Object.keys(translationCache).forEach((language) => {
      Object.keys(translationCache[language]).forEach((key) => {
        if (key.length === 2) {
          languageMap[key] || (languageMap[key] = {});
          const translation = translationCache[language][key];
          languageMap[key][translation] = language;
        }
      });
    });
    isTranslationCacheLoaded = true;
  } catch (error) {
    isTranslationCacheLoaded = true;
  }
}

function getTranslation(language) {
  return translationCache[language];
}

function setTranslation(language, translation, key) {
  const languageTranslations = getTranslation(language);
  if (languageTranslations) {
    languageTranslations[key] = translation;
    languageTranslations.createdTime = new Date().getTime();
    languageTranslations.t = language;
  } else {
    translationCache[language] = {
      [key]: translation,
      createdTime: new Date().getTime(),
      t: language,
    };
  }
  languageMap[key] || (languageMap[key] = {});
  languageMap[key][translation] = language;
  if (options.cache) {
    saveTranslationCache();
  }
}

const saveTranslationCache = () => {
  if (translationCache) {
    storage.setItem('translationCache', JSON.stringify(translationCache));
  }
};

const translationObservers = [];
const observedElements = new Set();
let isObserving = false;

const isElementObserved = (element) => {
  return observedElements.has(getElementKey(element));
};

const observeElement = (element) => {
  observedElements.add(getElementKey(element));
};

function getElementKey(element) {
  return sanitizeHTML(element)
    .replace(/<([^>]+)\/>/g, '<$1>')
    .replace(/[\n\r]+/g, '');
}

function sanitizeHTML(html) {
  return html;
}

function processElement(element) {
  const { element, words, type, properties, attrSetter } = element;
  if (!element.weglot) {
    element.weglot = { content: [] };
  }
  const weglotData = element.weglot;
  const translations = {};
  let processedWords = words;
  const languageKey = getLanguageKey(type);
  if (languageKey && languageMap[languageKey] && languageMap[languageKey][words]) {
    translations[languageKey] = words;
    processedWords = languageMap[languageKey][words];
  }
  if (properties) {
    const htmlContent = weglotData.content.find((content) => content.html);
    if (htmlContent) {
      Object.assign(htmlContent, {
        original: words,
        properties: properties,
        translations: translations,
      });
    } else {
      weglotData.content.push({
        html: true,
        original: words,
        type: type,
        properties: properties,
        translations: translations,
      });
    }
  }
  if (attrSetter) {
    const attrContent = weglotData.content.find((content) => content.attrSetter === attrSetter);
    const attrData = {
      attrSetter: attrSetter,
      original: words,
      type: type,
      translations: translations,
    };
    if (attrContent) {
      Object.assign(attrContent, attrData);
    } else {
      weglotData.content.push(attrData);
    }
  }
  return element;
}

function processElements(rootElement = document.documentElement) {
  const elements = findElements(rootElement);
  return elements.filter((element) => isElementValid(element)).map(processElement);
}

function findElements(rootElement) {
  const allElements = rootElement.getElementsByTagName('*');
  return Array.from(allElements);
}

function isElementValid(element) {
  return (isValidElement || isElementTranslatable)(element);
}

function isValidElement(element) {
  return true;
}

function isElementTranslatable(element) {
  return true;
}
function isTranslationMissing(element) {
  var targetElement = element.element;
  var targetWords = element.words;
  return (
    !targetElement.weglot ||
    !targetElement.weglot.content ||
    !targetElement.weglot.content.some(function (content) {
      var originalText = content.original;
      var translations = content.translations;
      return (
        originalText === targetWords ||
        Object.keys(translations).map(function (key) {
          return translations[key];
        }).includes(normalizeText(targetWords))
      );
    })
  );
}

function filterExcludedWords(words) {
  var filteredWords = [];
  for (var i = 0; i < words.length; i += 1) {
    var word = words[i];
    if (excludedWords.indexOf(word) === -1) {
      filteredWords.push(word);
    }
  }
  return [].concat(filteredWords);
}
function getTranslationWords(elements, language) {
  const translationWords = [];
  const visited = {};

  for (const element of elements) {
    const contents = element.weglot.content || [];

    for (const content of contents) {
      const original = content.original;

      if (!visited[original]) {
        visited[original] = true;
        const translationWord = {
          type: content.type,
          word: original,
        };

        if (language.label) {
          translationWord.label = language.label;
        }

        translationWords.push(translationWord);
      }
    }
  }

  return translationWords;
}

function updateTranslations(translations, language, options = {}) {
  const fromWords = translations.from_words;
  const toWords = translations.to_words;

  for (const element of options.elements) {
    const contents = element.weglot.content || [];

    for (const content of contents) {
      const original = content.original;
      const translations = content.translations;
      const index = fromWords.indexOf(original);

      if (index !== -1 && !translations[language]) {
        let translation = toWords[index];

        if (translation && translation.replace) {
          translation = translation.replace(/wg-(\d+)=""(\s*)\/(\s*)>/g, 'wg-$1="">');
        }

        if (options.preventRetranslation) {
          preventRetranslation(translation);
        }

        translations[language] = translation;
      }
    }
  }

  try {
    applyTranslations(options.elements, language);
  } catch (error) {
    console.error(error);
  }
}
function translateWords(words, language) {
  var cachedWords = getCachedWords(words, language);
  var newWords = [];
  
  if (cachedWords.to_words.length) {
    if (!newWords.length) {
      return Promise.resolve(cachedWords);
    }
    updateCachedWords(cachedWords, language);
  }
  
  if (newWords.length) {
    var requestUrl = getRequestUrl();
    var requestData = {
      request_url: requestUrl,
      words: newWords,
    };
    
    return sendTranslationRequest(requestData)
      .then(function(response) {
        updateTranslations(newWords, response.to_words, language);
        return response;
      });
  } else {
    return Promise.resolve({ to_words: [], from_words: [] });
  }
}

function getCachedWords(words, language) {
  var toWords = [];
  var fromWords = [];
  var newWords = [];
  
  words.forEach(function(word) {
    var translation = getTranslationFromCache(word);
    if (translation && translation[language]) {
      toWords.push(translation[language]);
      fromWords.push(word);
    } else {
      newWords.push(word);
    }
  });
  
  return { to_words: toWords, from_words: fromWords, newWords: newWords };
}

function updateCachedWords(cachedWords, language) {
  var toWords = cachedWords.to_words;
  var fromWords = cachedWords.from_words;
  
  toWords.forEach(function(toWord, index) {
    var word = fromWords[index];
    var translation = getTranslationFromCache(word);
    if (translation) {
      translation[language] = toWord;
    }
  });
  
  updateTranslationCache();
}

function getTranslationFromCache(word) {
  var translationCache = getTranslationCache();
  return translationCache[word];
}

function updateTranslationCache() {
  var translationCache = getTranslationCache();
  saveTranslationCache(translationCache);
}

function getTranslationCache() {
  var storage = getStorage({ type: "local" });
  var translationCache = storage.getItem("translationCache");
  return translationCache ? JSON.parse(translationCache) : {};
}

function saveTranslationCache(translationCache) {
  var storage = getStorage({ type: "local" });
  storage.setItem("translationCache", JSON.stringify(translationCache));
}

function getRequestUrl() {
  var url = getCurrentUrl();
  var patterns = getUrlPatterns();
  
  for (var i = 0; i < patterns.length; i++) {
    var pattern = patterns[i];
    try {
      for (var j = 0; j < pattern.value.length; j++) {
        var original = pattern.value[j].original;
        var formatted = pattern.value[j].formatted;
        var regex = new RegExp(original);
        if (regex.test(url.pathname)) {
          url.pathname = url.pathname.replace(regex, formatted);
          return url.toString();
        }
      }
    } catch (error) {
      console.warn(error);
    }
  }
  
  return url.toString();
}

function sendTranslationRequest(requestData) {
  var apiKey = getApiKey();
  var version = getVersion();
  var apiUrl = getApiUrl(apiKey, version);
  
  return fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify(requestData),
  })
    .then(handleResponse)
    .then(function(response) {
      if (!response || !response.to_words) {
        throw new Error("An error occurred, please try again later");
      }
      return response;
    });
}

function handleResponse(response) {
  return response.json();
}

function updateTranslations(words, translations, language) {
  words.forEach(function(word, index) {
    var translation = translations[index];
    setTranslation(word, translation, language);
  });
}

function setTranslation(word, translation, language) {
  var translationCache = getTranslationCache();
  if (!translationCache[word]) {
    translationCache[word] = {};
  }
  translationCache[word][language] = translation;
  updateTranslationCache();
}

function getCurrentUrl() {
  if (Ia.visual_editor) {
    return new URL(Fe.url);
  }
  
  var technologyName = Ia.technology_name;
  var injectedData = Ia.injectedData;
  
  if (technologyName === ne) {
    return new URL(window.location.href);
  }
  
  if (injectedData && injectedData.originalCanonicalUrl) {
    try {
      return new URL(injectedData.originalCanonicalUrl);
    } catch (error) {}
  }
  
  var canonicalLink = document.querySelector("link[rel='canonical'][href]");
  if (canonicalLink) {
    try {
      return new URL(canonicalLink.href);
    } catch (error) {}
  }
  
  return new URL(window.location.href);
}

function getUrlPatterns() {
  return xt.filter(function(pattern) {
    return pattern.condition.some(function(condition) {
      return condition.type === "TECHNOLOGY_ID" && condition.payload === Ia.technology_id;
    });
  });
}

function getApiKey() {
  return Ia.api_key;
}

function getVersion() {
  return (Ia.versions && Ia.versions.translation) || 1;
}

function getApiUrl(apiKey, version) {
  var baseUrl = Ia.bypass_cdn_api ? "api.weglot.com" : "cdn-api-weglot.com";
  return "https://" + baseUrl + "/translate?api_key=" + apiKey + "&v=" + version;
}
function escapeUnicode(str) {
  return str.replace(/[\u007F-\uFFFF]/g, function (char) {
    return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).substr(-4);
  });
}

function handleFetchResponse(response) {
  if (response.status === 400) {
    throw Error("You reached Weglot limitation. Please upgrade your plan.");
  }
  if (response.status === 401) {
    throw Error("Your Weglot API key seems wrong.");
  }
  if (response.status >= 402) {
    throw Error(response.statusText);
  }
  return response;
}

function sendPageView(url) {
  var apiKey = Ia.api_key;
  return fetch("https://api.weglot.com/pageviews?api_key=" + apiKey, {
    method: "POST",
    body: JSON.stringify({
      url: url || Fe.url,
      language: getCurrentLanguage(),
      browser_language: navigator.language,
    }),
  });
}

function translateWords(words, targetLanguage, options = {}) {
  options = Object.assign({}, { title: true, cdn: false, search: false }, options);
  var translationRequest = {
    l_from: getDefaultLanguage(),
    l_to: targetLanguage,
    words: words,
  };
  if (options.title) {
    translationRequest.title = document.title;
  }
  return translateRequest(translationRequest, options);
}

function translateAndExecuteCallback(text, callback) {
  if (typeof text !== "string" || typeof callback !== "function") {
    return false;
  }
  var currentLanguage = getCurrentLanguage();
  if (currentLanguage === getDefaultLanguage()) {
    callback(text);
    return false;
  }
  translateRequest(
    { l_from: currentLanguage, l_to: getDefaultLanguage(), words: [{ t: 2, w: text }] },
    { cdn: true, search: true }
  )
    .then(function (response) {
      return response.to_words[0].toLowerCase().trim();
    })
    .then(callback);
  return true;
}
var iframeListeners = [];

function proxyIframes(language) {
  var langTo = language || getCurrentLanguage();
  var iframes = document.querySelectorAll(Ia.proxify_iframes.join(","));
  var apiKey = Ia.api_key;
  var languageFrom = Ia.language_from;

  if (iframes.length && Array.isArray(iframes)) {
    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      var src = iframe.src;

      if (!src) return;

      if (!src.includes("proxy.weglot.com/")) {
        iframe.weglot = iframe.weglot || {};
        iframe.weglot.originalFrameSrc = src;

        if (langTo === languageFrom) return;

        try {
          iframe.src = src.replace(
            "://",
            "://proxy.weglot.com/" + apiKey + "/" + languageFrom + "/" + langTo + "/"
          );
        } catch (e) {}
        return;
      }

      if (!langTo || langTo === languageFrom) {
        var originalSrc = iframe.weglot.originalFrameSrc;
        if (originalSrc) iframe.src = originalSrc;
        return;
      }

      var regex = new RegExp(apiKey + "/" + languageFrom + "/[^/]+/");
      iframe.src = src.replace(regex, apiKey + "/" + languageFrom + "/" + langTo + "/");
    }
  }
}

function setLanguage(language) {
  language = language || getCurrentLanguage();
  postMessageToIframes({ message: "Weglot.setLanguage", payload: language });
  proxyIframes(language);
}

function handleMessage(event) {
  if (event.data && event.origin !== "null") {
    var message = event.data.message;
    var payload = event.data.payload;

    if (message) {
      if (message === "Weglot.iframe") {
        var response = { message: "Weglot.setLanguage", payload: getCurrentLanguage() };
        event.source.postMessage(response, event.origin);
        iframeListeners.push(event.source);
      } else if (message === "Weglot.setLanguage") {
        setLanguage(payload);
      }
    }
  }
}
var componentMap,
  componentQueue,
  componentIndex,
  componentKey,
  componentRef,
  componentCache = {},
  componentList = [],
  componentRegex = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

function assignProps(target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
  return target;
}

function removeElement(element) {
  var parent = element.parentNode;
  if (parent) {
    parent.removeChild(element);
  }
}

function createElement(type, props, key, ref, children) {
  var component = {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __k: null,
    __: null,
    __b: 0,
    __e: null,
    __d: undefined,
    __c: null,
    __h: null,
    constructor: undefined,
    __v: null,
  };

  if (children) {
    if (arguments.length > 5) {
      component.children = Array.prototype.slice.call(arguments, 5);
    } else {
      component.children = children;
    }
  }

  if (typeof type === "function" && type.defaultProps) {
    for (var prop in type.defaultProps) {
      if (props[prop] === undefined) {
        props[prop] = type.defaultProps[prop];
      }
    }
  }

  return createComponent(component, null);
}

function createComponent(component, parent) {
  var instance = {
    __: component,
    __k: component.key,
    __e: null,
    __d: undefined,
    __c: null,
    __h: null,
    constructor: undefined,
    __v: parent ? parent.__v : null,
  };

  if (component.constructor) {
    instance.__h = component.constructor;
  }

  if (component.ref) {
    instance.__d = component.ref;
  }

  if (component.__) {
    component.__.__c = instance;
  }

  return instance;
}

function getChildren(component) {
  return component.children;
}

function findDOMElement(component, index) {
  if (index === undefined) {
    return component.__ ? findDOMElement(component.__, component.__.__k.indexOf(component) + 1) : null;
  }

  for (; index < component.__.__k.length; index++) {
    var child = component.__.__k[index];
    if (child && child.__e) {
      return child.__e;
    }
  }

  return typeof component.type === "function" ? findDOMElement(component) : null;
}

function removeComponent(component) {
  if (component.__ && component.__.__c) {
    component.__.__e = component.__.__c.base = null;
    for (var index = 0; index < component.__.__k.length; index++) {
      var child = component.__.__k[index];
      if (child && child.__e) {
        component.__.__e = component.__.__c.base = child.__e;
        break;
      }
    }
    removeComponent(component.__);
  }
}

function updateComponent(component) {
  if (!component.__d) {
    component.__d = true;
    tn.push(component);
    if (!yn.__r++) {
      if (nn !== Qt.debounceRendering) {
        nn = Qt.debounceRendering;
      } else {
        rn(yn);
      }
    }
  }
}

function renderComponents() {
  tn.sort(sortComponents);
  while (component = tn.shift()) {
    if (component.__d) {
      var componentIndex = tn.length;
      var parentComponent = component.__v;
      var domElement = component.__e;
      var parentElement = component.__P;
      if (parentElement) {
        var newComponent = Object.assign({}, parentComponent);
        newComponent.__v = parentComponent.__v + 1;
        updateNestedComponents(
          parentElement,
          parentComponent,
          newComponent,
          component.__n,
          parentElement.ownerSVGElement !== undefined,
          parentComponent.__h ? [domElement] : null,
          [],
          domElement ? null : getHostNode(parentComponent),
          parentComponent.__h
        );
        updateChildComponents([], parentComponent);
        if (parentComponent.__e !== domElement) {
          removeNode(parentComponent);
        }
      }
      if (tn.length > componentIndex) {
        tn.sort(sortComponents);
      }
    }
  }
  yn.__r = 0;
}

function updateNestedComponents(
  rootElement,
  component,
  newComponent,
  childNodes,
  isSVG,
  siblingNodes,
  removedNodes,
  parentNode,
  hostNode
) {
  var childComponents = (component && component.__k) || cn;
  var numChildComponents = childComponents.length;
  newComponent.__k = [];
  for (var i = 0; i < childNodes.length; i++) {
    var childNode = childNodes[i];
    var newChildComponent = null;
    if (childNode !== null && typeof childNode !== "boolean" && typeof childNode !== "function") {
      if (typeof childNode === "string" || typeof childNode === "number" || typeof childNode === "bigint") {
        newChildComponent = createTextComponent(null, childNode, null, null, childNode);
      } else if (Array.isArray(childNode)) {
        newChildComponent = createFragmentComponent(pn, { children: childNode }, null, null, null);
      } else if (childNode.__b > 0) {
        newChildComponent = createComponent(
          childNode.type,
          childNode.props,
          childNode.key,
          childNode.ref ? childNode.ref : null,
          childNode.__v
        );
      } else {
        newChildComponent = childNode;
      }
    }
    if (newChildComponent) {
      newChildComponent.__ = newComponent;
      newChildComponent.__b = newComponent.__b + 1;
      var existingComponent = childComponents[i];
      if (existingComponent === null || (existingComponent && newChildComponent.key === existingComponent.key && newChildComponent.type === existingComponent.type)) {
        childComponents[i] = undefined;
      } else {
        for (var j = 0; j < numChildComponents; j++) {
          var currentComponent = childComponents[j];
          if (currentComponent && newChildComponent.key === currentComponent.key && newChildComponent.type === currentComponent.type) {
            childComponents[j] = undefined;
            break;
          }
          currentComponent = null;
        }
      }
      updateComponentTree(rootElement, newChildComponent, existingComponent || sn, isSVG, siblingNodes, removedNodes, parentNode, hostNode);
      var newChildNode = newChildComponent.__e;
      var ref = newChildComponent.ref;
      if (ref && existingComponent && existingComponent.ref !== ref) {
        if (!removedNodes) {
          removedNodes = [];
        }
        if (existingComponent.ref) {
          removedNodes.push(existingComponent.ref, null, newChildComponent);
        }
        removedNodes.push(ref, newChildComponent.__c || newChildNode, newChildComponent);
      }
      if (newChildNode !== null) {
        if (parentNode === null) {
          parentNode = newChildNode;
        }
        if (typeof newComponent.type === "function") {
          newComponent.__d = hostNode = updateComponent(newChildComponent, hostNode, rootElement);
        } else {
          hostNode = updateChildComponent(rootElement, newChildComponent, existingComponent || sn, childComponents, newChildNode, hostNode);
        }
        if (typeof component.type === "function") {
          component.__d = hostNode;
        }
      } else if (hostNode && existingComponent.__e === hostNode && hostNode.parentNode !== rootElement) {
        hostNode = getHostNode(existingComponent);
      }
    }
  }
  newComponent.__e = parentNode;
  for (var i = numChildComponents; i--; ) {
    if (childComponents[i] !== undefined) {
      if (typeof component.type === "function" && childComponents[i].__e && childComponents[i].__e === component.__d) {
        component.__d = En(rootElement).nextSibling;
      }
      removeComponent(childComponents[i], childComponents[i]);
    }
  }
  if (removedNodes) {
    for (var i = 0; i < removedNodes.length; i += 3) {
      An(removedNodes[i], removedNodes[i + 1], removedNodes[i + 2]);
    }
  }
}

function updateComponentTree(
  rootElement,
  component,
  existingComponent,
  childNodes,
  isSVG,
  siblingNodes,
  removedNodes,
  parentNode,
  hostNode
) {
  if (typeof component.type === "function") {
    updateNestedComponents(
      rootElement,
      component,
      existingComponent,
      childNodes,
      isSVG,
      siblingNodes,
      removedNodes,
      parentNode,
      hostNode
    );
  } else {
    updateChildComponents(childNodes, component);
    if (existingComponent.__e !== hostNode) {
      removeNode(existingComponent);
    }
  }
}

function updateChildComponents(childNodes, component) {
  var childComponents = (component && component.__k) || cn;
  for (var i = 0; i < childComponents.length; i++) {
    var childComponent = childComponents[i];
    if (childComponent) {
      childComponent.__ = component;
      childComponent.__b = component.__b + 1;
      if (childNodes[i] !== null && typeof childNodes[i] !== "boolean" && typeof childNodes[i] !== "function") {
        if (typeof childNodes[i] === "string" || typeof childNodes[i] === "number" || typeof childNodes[i] === "bigint") {
          childComponents[i] = createTextComponent(null, childNodes[i], null, null, childNodes[i]);
        } else if (Array.isArray(childNodes[i])) {
          childComponents[i] = createFragmentComponent(pn, { children: childNodes[i] }, null, null, null);
        } else if (childNodes[i].__b > 0) {
          childComponents[i] = createComponent(
            childNodes[i].type,
            childNodes[i].props,
            childNodes[i].key,
            childNodes[i].ref ? childNodes[i].ref : null,
            childNodes[i].__v
          );
        } else {
          childComponents[i] = childNodes[i];
        }
      }
      if (typeof component.type === "function") {
        component.__d = updateComponent(childComponent, component.__d, component.__e);
      } else {
        component.__d = updateChildComponent(component.__e, childComponent, component.__d);
      }
    }
  }
}

function updateChildComponent(rootElement, component, existingComponent) {
  var domElement = component.__e;
  var parentElement = component.__P;
  if (parentElement) {
    var newComponent = Object.assign({}, component);
    newComponent.__v = component.__v + 1;
    updateNestedComponents(
      rootElement,
      component,
      newComponent,
      component.__n,
      parentElement.ownerSVGElement !== undefined,
      null,
      null,
      domElement ? null : getHostNode(component),
      component.__h
    );
    updateChildComponents([], component);
    if (component.__e !== domElement) {
      removeNode(component);
    }
  }
  if (domElement && existingComponent.__e === domElement && domElement.parentNode !== rootElement) {
    return getHostNode(existingComponent);
  }
  return null;
}

function sortComponents(a, b) {
  return a.__b - b.__b;
}

function removeNode(component) {
  if (typeof component.type === "function") {
    removeComponent(component, component);
  } else {
    removeComponent(component.__e, component);
  }
}

function removeComponent(component, parentComponent) {
  var ref = component.ref;
  if (ref) {
    if (parentComponent.ref) {
      An(parentComponent.ref, null, component);
    }
    An(ref, component.__c || component.__e, component);
  }
  if (component.__c) {
    component.__c(component);
  }
  if (component.__k) {
    for (var i = 0; i < component.__k.length; i++) {
      if (component.__k[i] !== undefined) {
        removeComponent(component.__k[i], component.__k[i]);
      }
    }
  }
  if (component.__e) {
    Rn(component.__e, component);
  }
}

function getHostNode(component) {
  while (component && !component.__e) {
    component = component.__;
  }
  return component && component.__e;
}

function createTextComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function createFragmentComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function createComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function En(component) {
  var domElement = component.__e;
  while (component && !domElement && (component = component.__)) {
    domElement = component.__e;
  }
  return domElement;
}

function Rn(domElement, component) {
  if (domElement) {
    if (typeof component.type === "function") {
      removeComponent(component, component);
    } else {
      removeComponent(domElement, component);
    }
  }
}

function An(ref, domElement, component) {
  if (typeof ref === "function") {
    ref(domElement, component);
  } else {
    ref.current = domElement;
  }
}

function xn(rootElement, component, existingComponent, childComponents, domElement, hostNode) {
  if (typeof component.type === "function") {
    return updateNestedComponents(
      rootElement,
      component,
      existingComponent,
      component.__n,
      rootElement.ownerSVGElement !== undefined,
      null,
      null,
      domElement ? null : getHostNode(component),
      component.__h
    );
  } else {
    return updateChildComponent(rootElement, component, existingComponent);
  }
}

function hn(component) {
  while (component && !component.__e) {
    component = component.__;
  }
  return component && component.__e;
}

function getComponentKey(component) {
  while (component && !component.__k) {
    component = component.__;
  }
  return component && component.__k;
}

function updateComponent(component, hostNode, rootElement) {
  var domElement = component.__e;
  var parentElement = component.__P;
  if (parentElement) {
    var newComponent = Object.assign({}, component);
    newComponent.__v = component.__v + 1;
    updateNestedComponents(
      rootElement,
      component,
      newComponent,
      component.__n,
      parentElement.ownerSVGElement !== undefined,
      null,
      null,
      domElement ? null : getHostNode(component),
      component.__h
    );
    updateChildComponents([], component);
    if (component.__e !== domElement) {
      removeNode(component);
    }
  }
  if (domElement && domElement.parentNode !== rootElement) {
    return getHostNode(component);
  }
  return null;
}

function sortComponents(a, b) {
  return a.__b - b.__b;
}

function removeNode(component) {
  if (typeof component.type === "function") {
    removeComponent(component, component);
  } else {
    removeComponent(component.__e, component);
  }
}

function removeComponent(component, parentComponent) {
  var ref = component.ref;
  if (ref) {
    if (parentComponent.ref) {
      An(parentComponent.ref, null, component);
    }
    An(ref, component.__c || component.__e, component);
  }
  if (component.__c) {
    component.__c(component);
  }
  if (component.__k) {
    for (var i = 0; i < component.__k.length; i++) {
      if (component.__k[i] !== undefined) {
        removeComponent(component.__k[i], component.__k[i]);
      }
    }
  }
  if (component.__e) {
    Rn(component.__e, component);
  }
}

function getHostNode(component) {
  while (component && !component.__e) {
    component = component.__;
  }
  return component && component.__e;
}

function createTextComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function createFragmentComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function createComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function En(component) {
  var domElement = component.__e;
  while (component && !domElement && (component = component.__)) {
    domElement = component.__e;
  }
  return domElement;
}

function Rn(domElement, component) {
  if (domElement) {
    if (typeof component.type === "function") {
      removeComponent(component, component);
    } else {
      removeComponent(domElement, component);
    }
  }
}

function An(ref, domElement, component) {
  if (typeof ref === "function") {
    ref(domElement, component);
  } else {
    ref.current = domElement;
  }
}

function xn(rootElement, component, existingComponent, childComponents, domElement, hostNode) {
  if (typeof component.type === "function") {
    return updateNestedComponents(
      rootElement,
      component,
      existingComponent,
      component.__n,
      rootElement.ownerSVGElement !== undefined,
      null,
      null,
      domElement ? null : getHostNode(component),
      component.__h
    );
  } else {
    return updateChildComponent(rootElement, component, existingComponent);
  }
}

function hn(component) {
  while (component && !component.__e) {
    component = component.__;
  }
  return component && component.__e;
}

function getComponentKey(component) {
  while (component && !component.__k) {
    component = component.__;
  }
  return component && component.__k;
}

function updateComponent(component, hostNode, rootElement) {
  var domElement = component.__e;
  var parentElement = component.__P;
  if (parentElement) {
    var newComponent = Object.assign({}, component);
    newComponent.__v = component.__v + 1;
    updateNestedComponents(
      rootElement,
      component,
      newComponent,
      component.__n,
      parentElement.ownerSVGElement !== undefined,
      null,
      null,
      domElement ? null : getHostNode(component),
      component.__h
    );
    updateChildComponents([], component);
    if (component.__e !== domElement) {
      removeNode(component);
    }
  }
  if (domElement && domElement.parentNode !== rootElement) {
    return getHostNode(component);
  }
  return null;
}

function sortComponents(a, b) {
  return a.__b - b.__b;
}

function removeNode(component) {
  if (typeof component.type === "function") {
    removeComponent(component, component);
  } else {
    removeComponent(component.__e, component);
  }
}

function removeComponent(component, parentComponent) {
  var ref = component.ref;
  if (ref) {
    if (parentComponent.ref) {
      An(parentComponent.ref, null, component);
    }
    An(ref, component.__c || component.__e, component);
  }
  if (component.__c) {
    component.__c(component);
  }
  if (component.__k) {
    for (var i = 0; i < component.__k.length; i++) {
      if (component.__k[i] !== undefined) {
        removeComponent(component.__k[i], component.__k[i]);
      }
    }
  }
  if (component.__e) {
    Rn(component.__e, component);
  }
}

function getHostNode(component) {
  while (component && !component.__e) {
    component = component.__;
  }
  return component && component.__e;
}

function createTextComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
}

function createFragmentComponent(type, props, key, ref, value) {
  return {
    type: type,
    props: props,
    key: key,
    ref: ref,
    __v: value,
    __e: null,
    __d: null,
    __c: null,
    __b: 0,
  };
function traverseAndCollect(element, collection) {
  if (element === null || typeof element === "boolean") {
    return collection;
  }
  if (Array.isArray(element)) {
    element.forEach((item) => {
      traverseAndCollect(item, collection);
    });
  } else {
    collection.push(element);
  }
  return collection;
}

function insertOrAppendChild(parent, child, nextSibling, previousSibling) {
  let insertedNode;
  if (typeof child.__d !== "undefined") {
    insertedNode = child.__d;
    child.__d = undefined;
  } else if (
    child === null ||
    nextSibling !== previousSibling ||
    child.parentNode === null
  ) {
    if (nextSibling === null || nextSibling.parentNode !== parent) {
      parent.appendChild(child);
      insertedNode = null;
    } else {
      let sibling = nextSibling;
      let index = 0;
      while (sibling && index < previousSibling.length) {
        if (sibling === previousSibling[index]) {
          break;
        }
        sibling = sibling.nextSibling;
        index += 1;
      }
      parent.insertBefore(child, nextSibling);
      insertedNode = nextSibling;
    }
  }
  return insertedNode !== undefined ? insertedNode : child.nextSibling;
}

function findLastRenderedNode(element) {
  let lastNode;
  if (element.type === null || typeof element.type === "string") {
    return element.__e;
  }
  if (element.__k) {
    for (let i = element.__k.length - 1; i >= 0; i--) {
      const child = element.__k[i];
      if (child && (lastNode = findLastRenderedNode(child))) {
        return lastNode;
      }
    }
  }
  return null;
}

function applyStyleProperty(element, property, value) {
  if (property[0] === "-") {
    element.setProperty(property, value === null ? "" : value);
  } else {
    element[property] =
      value === null
        ? ""
        : typeof value !== "number" || isNaN(value)
        ? value
        : value + "px";
  }
}

function applyEventProperty(element, property, handler, useCapture) {
  let eventType = property.slice(2);
  let isCapture = property !== property.replace(/Capture$/, "");
  eventType = eventType.toLowerCase();
  element.l = element.l || {};
  element.l[eventType + isCapture] = handler;
  if (handler) {
    if (!useCapture) {
      element.addEventListener(eventType, isCapture ? handleCapture : handleBubble);
    } else {
      element.removeEventListener(eventType, isCapture ? handleCapture : handleBubble);
    }
  }
}

function handleBubble(event) {
  return this.l[event.type + false](event);
}

function handleCapture(event) {
  return this.l[event.type + true](event);
}

function applyProperty(element, property, value, previousValue, isSVG) {
  if (property === "style") {
    if (typeof value === "string") {
      element.style.cssText = value;
    } else {
      if (typeof previousValue === "string") {
        element.style.cssText = previousValue = "";
      }
      if (previousValue) {
        for (let prop in previousValue) {
          if (value == null || !(prop in value)) {
            applyStyleProperty(element.style, prop, "");
          }
        }
      }
      if (value) {
        for (let prop in value) {
          if (previousValue == null || value[prop] !== previousValue[prop]) {
            applyStyleProperty(element.style, prop, value[prop]);
          }
        }
      }
    }
  } else if (property[0] === "o" && property[1] === "n") {
    let eventType = property !== property.replace(/Capture$/, "");
    eventType = eventType.toLowerCase().slice(2);
    element.l = element.l || {};
    element.l[eventType + eventType] = value;
    if (value) {
      if (!previousValue) {
        element.addEventListener(eventType, eventType ? handleCapture : handleBubble);
      } else {
        element.removeEventListener(eventType, eventType ? handleCapture : handleBubble);
      }
    }
  } else if (property !== "dangerouslySetInnerHTML") {
    if (isSVG) {
      property = property.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    } else if (
      property !== "width" &&
      property !== "height" &&
      property !== "href" &&
      property !== "list" &&
      property !== "form" &&
      property !== "tabIndex" &&
      property !== "download" &&
      property in element
    ) {
      try {
        element[property] = value === null ? "" : value;
      } catch (error) {}
    }
    if (typeof value === "function" || value === null || (value === false && property[4] !== "-")) {
      element.removeAttribute(property);
    } else {
      element.setAttribute(property, value);
    }
  }
}

function render(element) {
  let parent, nextSibling, previousSibling;
  if (element === null || typeof element === "boolean") {
    return null;
  }
  const renderedNodes = [];
  traverseAndCollect(element, renderedNodes);
  for (let i = 0; i < renderedNodes.length; i++) {
    const renderedNode = renderedNodes[i];
    parent = renderedNode.parent;
    nextSibling = renderedNode.nextSibling;
    previousSibling = renderedNode.previousSibling;
    if (renderedNode.type === "text") {
      if (previousSibling && previousSibling.type === "text") {
        previousSibling.nodeValue += renderedNode.text;
        parent.removeChild(renderedNode);
      } else {
        const textNode = document.createTextNode(renderedNode.text);
        parent.insertBefore(textNode, nextSibling);
        parent.removeChild(renderedNode);
      }
    } else if (renderedNode.type === "element") {
      if (renderedNode.element) {
        if (renderedNode.element.type === renderedNode.type) {
          if (renderedNode.element.key === renderedNode.key) {
            if (renderedNode.element.props === renderedNode.props) {
              renderedNode.element.__e = renderedNode;
              renderedNode.element.__d = renderedNode.element.__d;
              renderedNode.element.__c = renderedNode.element.__c;
              renderedNode.element.__b = renderedNode.element.__b;
              renderedNode.element.__v = renderedNode.element.__v;
              renderedNode.element.__k = renderedNode.element.__k;
              renderedNode.element.__r = renderedNode.element.__r;
              renderedNode.element.__p = renderedNode.element.__p;
              renderedNode.element.__h = renderedNode.element.__h;
              renderedNode.element.__s = renderedNode.element.__s;
              renderedNode.element.__a = renderedNode.element.__a;
              renderedNode.element.__i = renderedNode.element.__i;
              renderedNode.element.__l = renderedNode.element.__l;
              renderedNode.element.__n = renderedNode.element.__n;
              renderedNode.element.__o = renderedNode.element.__o;
              renderedNode.element.__q = renderedNode.element.__q;
              renderedNode.element.__t = renderedNode.element.__t;
              renderedNode.element.__u = renderedNode.element.__u;
              renderedNode.element.__w = renderedNode.element.__w;
              renderedNode.element.__x = renderedNode.element.__x;
              renderedNode.element.__y = renderedNode.element.__y;
              renderedNode.element.__z = renderedNode.element.__z;
              renderedNode.element.__A = renderedNode.element.__A;
              renderedNode.element.__B = renderedNode.element.__B;
              renderedNode.element.__C = renderedNode.element.__C;
              renderedNode.element.__D = renderedNode.element.__D;
              renderedNode.element.__E = renderedNode.element.__E;
              renderedNode.element.__F = renderedNode.element.__F;
              renderedNode.element.__G = renderedNode.element.__G;
              renderedNode.element.__H = renderedNode.element.__H;
              renderedNode.element.__I = renderedNode.element.__I;
              renderedNode.element.__J = renderedNode.element.__J;
              renderedNode.element.__K = renderedNode.element.__K;
              renderedNode.element.__L = renderedNode.element.__L;
              renderedNode.element.__M = renderedNode.element.__M;
              renderedNode.element.__N = renderedNode.element.__N;
              renderedNode.element.__O = renderedNode.element.__O;
              renderedNode.element.__P = renderedNode.element.__P;
              renderedNode.element.__Q = renderedNode.element.__Q;
              renderedNode.element.__R = renderedNode.element.__R;
              renderedNode.element.__S = renderedNode.element.__S;
              renderedNode.element.__T = renderedNode.element.__T;
              renderedNode.element.__U = renderedNode.element.__U;
              renderedNode.element.__V = renderedNode.element.__V;
              renderedNode.element.__W = renderedNode.element.__W;
              renderedNode.element.__X = renderedNode.element.__X;
              renderedNode.element.__Y = renderedNode.element.__Y;
              renderedNode.element.__Z = renderedNode.element.__Z;
              renderedNode.element.__$ = renderedNode.element.__$;
              renderedNode.element.__aa = renderedNode.element.__aa;
              renderedNode.element.__ab = renderedNode.element.__ab;
              renderedNode.element.__ac = renderedNode.element.__ac;
              renderedNode.element.__ad = renderedNode.element.__ad;
              renderedNode.element.__ae = renderedNode.element.__ae;
              renderedNode.element.__af = renderedNode.element.__af;
              renderedNode.element.__ag = renderedNode.element.__ag;
              renderedNode.element.__ah = renderedNode.element.__ah;
              renderedNode.element.__ai = renderedNode.element.__ai;
              renderedNode.element.__aj = renderedNode.element.__aj;
              renderedNode.element.__ak = renderedNode.element.__ak;
              renderedNode.element.__al = renderedNode.element.__al;
              renderedNode.element.__am = renderedNode.element.__am;
              renderedNode.element.__an = renderedNode.element.__an;
              renderedNode.element.__ao = renderedNode.element.__ao;
              renderedNode.element.__ap = renderedNode.element.__ap;
              renderedNode.element.__aq = renderedNode.element.__aq;
              renderedNode.element.__ar = renderedNode.element.__ar;
              renderedNode.element.__as = renderedNode.element.__as;
              renderedNode.element.__at = renderedNode.element.__at;
              renderedNode.element.__au = renderedNode.element.__au;
              renderedNode.element.__av = renderedNode.element.__av;
              renderedNode.element.__aw = renderedNode.element.__aw;
              renderedNode.element.__ax = renderedNode.element.__ax;
              renderedNode.element.__ay = renderedNode.element.__ay;
              renderedNode.element.__az = renderedNode.element.__az;
              renderedNode.element.__ba = renderedNode.element.__ba;
              renderedNode.element.__bb = renderedNode.element.__bb;
              renderedNode.element.__bc = renderedNode.element.__bc;
              renderedNode.element.__bd = renderedNode.element.__bd;
              renderedNode.element.__be = renderedNode.element.__be;
              renderedNode.element.__bf = renderedNode.element.__bf;
              renderedNode.element.__bg = renderedNode.element.__bg;
              renderedNode.element.__bh = renderedNode.element.__bh;
              renderedNode.element.__bi = renderedNode.element.__bi;
              renderedNode.element.__bj = renderedNode.element.__bj;
              renderedNode.element.__bk = renderedNode.element.__bk;
              renderedNode.element.__bl = renderedNode.element.__bl;
              renderedNode.element.__bm = renderedNode.element.__bm;
              renderedNode.element.__bn = renderedNode.element.__bn;
              renderedNode.element.__bo = renderedNode.element.__bo;
              renderedNode.element.__bp = renderedNode.element.__bp;
              renderedNode.element.__bq = renderedNode.element.__bq;
              renderedNode.element.__br = renderedNode.element.__br;
              renderedNode.element.__bs = renderedNode.element.__bs;
              renderedNode.element.__bt = renderedNode.element.__bt;
              renderedNode.element.__bu = renderedNode.element.__bu;
              renderedNode.element.__bv = renderedNode.element.__bv;
              renderedNode.element.__bw = renderedNode.element.__bw;
              renderedNode.element.__bx = renderedNode.element.__bx;
              renderedNode.element.__by = renderedNode.element.__by;
              renderedNode.element.__bz = renderedNode.element.__bz;
              renderedNode.element.__ca = renderedNode.element.__ca;
              renderedNode.element.__cb = renderedNode.element.__cb;
              renderedNode.element.__cc = renderedNode.element.__cc;
              renderedNode.element.__cd = renderedNode.element.__cd;
              renderedNode.element.__ce = renderedNode.element.__ce;
              renderedNode.element.__cf = renderedNode.element.__cf;
              renderedNode.element.__cg = renderedNode.element.__cg;
              renderedNode.element.__ch = renderedNode.element.__ch;
              renderedNode.element.__ci = renderedNode.element.__ci;
              renderedNode.element.__cj = renderedNode.element.__cj;
              renderedNode.element.__ck = renderedNode.element.__ck;
              renderedNode.element.__cl = renderedNode.element.__cl;
              renderedNode.element.__cm = renderedNode.element.__cm;
              renderedNode.element.__cn = renderedNode.element.__cn;
              renderedNode.element.__co = renderedNode.element.__co;
              renderedNode.element.__cp = renderedNode.element.__cp;
              renderedNode.element.__cq = renderedNode.element.__cq;
              renderedNode.element.__cr = renderedNode.element.__cr;
              renderedNode.element.__cs = renderedNode.element.__cs;
              renderedNode.element.__ct = renderedNode.element.__ct;
              renderedNode.element.__cu = renderedNode.element.__cu;
              renderedNode.element.__cv = renderedNode.element.__cv;
              renderedNode.element.__cw = renderedNode.element.__cw;
              renderedNode.element.__cx = renderedNode.element.__cx;
              renderedNode.element.__cy = renderedNode.element.__cy;
              renderedNode.element.__cz = renderedNode.element.__cz;
              renderedNode.element.__da = renderedNode.element.__da;
              renderedNode.element.__db = renderedNode.element.__db;
              renderedNode.element.__dc = renderedNode.element.__dc;
              renderedNode.element.__dd = renderedNode.element.__dd;
              renderedNode.element.__de = renderedNode.element.__de;
              renderedNode.element.__df = renderedNode.element.__df;
              renderedNode.element.__dg = renderedNode.element.__dg;
              renderedNode.element.__dh = renderedNode.element.__dh;
              renderedNode.element.__di = renderedNode.element.__di;
              renderedNode.element.__dj = renderedNode.element.__dj;
              renderedNode.element.__dk = renderedNode.element.__dk;
              renderedNode.element.__dl = renderedNode.element.__dl;
              renderedNode.element.__dm = renderedNode.element.__dm;
              renderedNode.element.__dn = renderedNode.element.__dn;
              renderedNode.element.__do = renderedNode.element.__do;
              renderedNode.element.__dp = renderedNode.element.__dp;
              renderedNode.element.__dq = renderedNode.element.__dq;
              renderedNode.element.__dr = renderedNode.element.__dr;
              renderedNode.element.__ds = renderedNode.element.__ds;
              renderedNode.element.__dt = renderedNode.element.__dt;
              renderedNode.element.__du = renderedNode.element.__du;
              renderedNode.element.__dv = renderedNode.element.__dv;
              renderedNode.element.__dw = renderedNode.element.__dw;
              renderedNode.element.__dx = renderedNode.element.__dx;
              renderedNode.element.__dy = renderedNode.element.__dy;
              renderedNode.element.__dz = renderedNode.element.__dz;
              renderedNode.element.__ea = renderedNode.element.__ea;
              renderedNode.element.__eb = renderedNode.element.__eb;
              renderedNode.element.__ec = renderedNode.element.__ec;
              renderedNode.element.__ed = renderedNode.element.__ed;
              renderedNode.element.__ee = renderedNode.element.__ee;
              renderedNode.element.__ef = renderedNode.element.__ef;
              renderedNode.element.__eg = renderedNode.element.__eg;
              renderedNode.element.__eh = renderedNode.element.__eh;
              renderedNode.element.__ei = renderedNode.element.__ei;
              renderedNode.element.__ej = renderedNode.element.__ej;
              renderedNode.element.__ek = renderedNode.element.__ek;
              renderedNode.element.__el = renderedNode.element.__el;
              renderedNode.element.__em = renderedNode.element.__em;
              renderedNode.element.__en = renderedNode.element.__en;
              renderedNode.element.__eo = renderedNode.element.__eo;
              renderedNode.element.__ep = renderedNode.element.__ep;
              renderedNode.element.__eq = renderedNode.element.__eq;
              renderedNode.element.__er = renderedNode.element.__er;
              renderedNode.element.__es = renderedNode.element.__es;
              renderedNode.element.__et = renderedNode.element.__et;
              renderedNode.element.__eu = renderedNode.element.__eu;
              renderedNode.element.__ev = renderedNode.element.__ev;
              renderedNode.element.__ew = renderedNode.element.__ew;
              renderedNode.element.__ex = renderedNode.element.__ex;
              renderedNode.element.__ey = renderedNode.element.__ey;
              renderedNode.element.__ez = renderedNode.element.__ez;
              renderedNode.element.__fa = renderedNode.element.__fa;
              renderedNode.element.__fb = renderedNode.element.__fb;
              renderedNode.element.__fc = renderedNode.element.__fc;
              renderedNode.element.__fd = renderedNode.element.__fd;
              renderedNode.element.__fe = renderedNode.element.__fe;
              renderedNode.element.__ff = renderedNode.element.__ff;
              renderedNode.element.__fg = renderedNode.element.__fg;
              renderedNode.element.__fh = renderedNode.element.__fh;
              renderedNode.element.__fi = renderedNode.element.__fi;
              renderedNode.element.__fj = renderedNode.element.__fj;
              renderedNode.element.__fk = renderedNode.element.__fk;
              renderedNode.element.__fl = renderedNode.element.__fl;
              renderedNode.element.__fm = renderedNode.element.__fm;
              renderedNode.element.__fn = renderedNode.element.__fn;
              renderedNode.element.__fo = renderedNode.element.__fo;
              renderedNode.element.__fp = renderedNode.element.__fp;
              renderedNode.element.__fq = renderedNode.element.__fq;
              renderedNode.element.__fr = renderedNode.element.__fr;
              renderedNode.element.__fs = renderedNode.element.__fs;
              renderedNode.element.__ft = renderedNode.element.__ft;
              renderedNode.element.__fu = renderedNode.element.__fu;
              renderedNode.element.__fv = renderedNode.element.__fv;
              renderedNode.element.__fw = renderedNode.element.__fw;
              renderedNode.element.__fx = renderedNode.element.__fx;
              renderedNode.element.__fy = renderedNode.element.__fy;
              renderedNode.element.__fz = renderedNode.element.__fz;
              renderedNode.element.__ga = renderedNode.element.__ga;
              renderedNode.element.__gb = renderedNode.element.__gb;
              renderedNode.element.__gc = renderedNode.element.__gc;
              renderedNode.element.__gd = renderedNode.element.__gd;
              renderedNode.element.__ge = renderedNode.element.__ge;
              renderedNode.element.__gf = renderedNode.element.__gf;
              renderedNode.element.__gg = renderedNode.element.__gg;
              renderedNode.element.__gh = renderedNode.element.__gh;
function updateNode(element, props) {
  element.__dj = element.__dj;
  element.__dk = element.__dk;
  element.__dl = element.__dl;
  element.__dm = element.__dm;
  element.__dn = element.__dn;
  element.__do = element.__do;
  element.__dp = element.__dp;
  element.__dq = element.__dq;
  element.__dr = element.__dr;
  element.__ds = element.__ds;
  element.__dt = element.__dt;
  element.__du = element.__du;
  element.__dv = element.__dv;
  element.__dw = element.__dw;
  element.__dx = element.__dx;
  element.__dy = element.__dy;
  element.__dz = element.__dz;
  element.__ea = element.__ea;
  element.__eb = element.__eb;
  element.__ec = element.__ec;
  element.__ed = element.__ed;
  element.__ee = element.__ee;
  element.__ef = element.__ef;
  element.__eg = element.__eg;
  element.__eh = element.__eh;
  element.__ei = element.__ei;
  element.__ej = element.__ej;
  element.__ek = element.__ek;
  element.__el = element.__el;
  element.__em = element.__em;
  element.__en = element.__en;
  element.__eo = element.__eo;
  element.__ep = element.__ep;
  element.__eq = element.__eq;
  element.__er = element.__er;
  element.__es = element.__es;
  element.__et = element.__et;
  element.__eu = element.__eu;
  element.__ev = element.__ev;
  element.__ew = element.__ew;
  element.__ex = element.__ex;
  element.__ey = element.__ey;
  element.__ez = element.__ez;
  element.__fa = element.__fa;
  element.__fb = element.__fb;
  element.__fc = element.__fc;
  element.__fd = element.__fd;
  element.__fe = element.__fe;
  element.__ff = element.__ff;
  element.__fg = element.__fg;
  element.__fh = element.__fh;
  element.__fi = element.__fi;
  element.__fj = element.__fj;
  element.__fk = element.__fk;
  element.__fl = element.__fl;
  element.__fm = element.__fm;
  element.__fn = element.__fn;
  element.__fo = element.__fo;
  element.__fp = element.__fp;
  element.__fq = element.__fq;
  element.__fr = element.__fr;
  element.__fs = element.__fs;
  element.__ft = element.__ft;
  element.__fu = element.__fu;
  element.__fv = element.__fv;
  element.__fw = element.__fw;
  element.__fx = element.__fx;
  element.__fy = element.__fy;
  element.__fz = element.__fz;
  element.__ga = element.__ga;
  element.__gb = element.__gb;
  element.__gc = element.__gc;
  element.__gd = element.__gd;
  element.__ge = element.__ge;
  element.__gf = element.__gf;
  element.__gg = element.__gg;
  element.__gh = element.__gh;
}

function updateComponent(e, t, n, r, o, a, i, s, c) {
  var l,
    u,
    f,
    d,
    g,
    p,
    _,
    h,
    m,
    v,
    y,
    w,
    b,
    k,
    x,
    E = t.type;
  if (void 0 !== t.constructor) return null;
  null != n.__h &&
    ((c = n.__h), (s = t.__e = n.__e), (t.__h = null), (a = [s])),
    (l = Qt.__b) && l(t);
  try {
    e: if ("function" == typeof E) {
      if (
        ((h = t.props),
        (m = (l = E.contextType) && r[l.__c]),
        (v = l ? (m ? m.props.value : l.__) : r),
        n.__c
          ? (_ = (u = t.__c = n.__c).__ = u.__E)
          : ("prototype" in E && E.prototype.render
              ? (t.__c = u = new E(h, v))
              : ((t.__c = u = new _n(h, v)),
                (u.constructor = E),
                (u.render = Pn)),
            m && m.sub(u),
            (u.props = h),
            u.state || (u.state = {}),
            (u.context = v),
            (u.__n = r),
            (f = u.__d = !0),
            (u.__h = []),
            (u._sb = [])),
        null == u.__s && (u.__s = u.state),
        null != E.getDerivedStateFromProps &&
          (u.__s == u.state && (u.__s = un({}, u.__s)),
          un(u.__s, E.getDerivedStateFromProps(h, u.__s))),
        (d = u.props),
        (g = u.state),
        (u.__v = t),
        f)
      )
        null == E.getDerivedStateFromProps &&
          null != u.componentWillMount &&
          u.componentWillMount(),
          null != u.componentDidMount && u.__h.push(u.componentDidMount);
      else {
        if (
          (null == E.getDerivedStateFromProps &&
            h !== d &&
            null != u.componentWillReceiveProps &&
            u.componentWillReceiveProps(h, v),
          (!u.__e &&
            null != u.shouldComponentUpdate &&
            !1 === u.shouldComponentUpdate(h, u.__s, v)) ||
            t.__v === n.__v)
        ) {
          for (
            t.__v !== n.__v &&
              ((u.props = h), (u.state = u.__s), (u.__d = !1)),
              u.__e = !1,
              t.__e = n.__e,
              t.__k = n.__k,
              t.__k.forEach(function (e) {
                e && (e.__ = t);
              }),
              y = 0;
            y < u._sb.length;
            y++
          )
            u.__h.push(u._sb[y]);
          (u._sb = []), u.__h.length && i.push(u);
          break e;
        }
        null != u.componentWillUpdate && u.componentWillUpdate(h, u.__s, v),
          null != u.componentDidUpdate &&
            u.__h.push(function () {
              u.componentDidUpdate(d, g, p);
            });
      }
      if (
        ((u.context = v),
        (u.props = h),
        (u.__P = e),
        (w = Qt.__r),
        (b = 0),
        "prototype" in E && E.prototype.render)
      ) {
        for (
          u.state = u.__s,
            u.__d = !1,
            w && w(t),
            l = u.render(u.props, u.state, u.context),
            k = 0;
          k < u._sb.length;
          k++
        )
          u.__h.push(u._sb[k]);
        u._sb = [];
      } else
        do {
          (u.__d = !1),
            w && w(t),
            (l = u.render(u.props, u.state, u.context)),
            (u.state = u.__s);
        } while (u.__d && ++b < 25);
      (u.state = u.__s),
        null != u.getChildContext && (r = un(un({}, r), u.getChildContext())),
        f ||
          null == u.getSnapshotBeforeUpdate ||
          (p = u.getSnapshotBeforeUpdate(d, g)),
        (x =
          null != l && l.type === pn && null == l.key ? l.props.children : l),
        wn(e, Array.isArray(x) ? x : [x], t, n, r, o, a, i, s, c),
        (u.base = t.__e),
        (t.__h = null),
        u.__h.length && i.push(u),
        _ && (u.__E = u.__ = null),
        (u.__e = !1);
    } else
      null == a && t.__v === n.__v
        ? ((t.__k = n.__k), (t.__e = n.__e))
        : (t.__e = jn(n.__e, t, n, r, o, a, i, c));
    (l = Qt.diffed) && l(t);
  } catch (e) {
    (t.__v = null),
      (c || null != a) &&
        ((t.__e = s), (t.__h = !!c), (a[a.indexOf(s)] = null)),
      Qt.__e(e, t, n);
  }
}
function updateNode(element, props) {
  // implementation
}

function updateComponent(e, t, n, r, o, a, i, s, c) {
  // implementation
}

function Tn(e, t) {
  Qt.__c && Qt.__c(t, e);
  e.forEach(function (t) {
    try {
      var callbacks = t.__h;
      t.__h = [];
      callbacks.forEach(function (callback) {
        callback.call(t);
      });
    } catch (error) {
      Qt.__e(error, t.__v);
    }
  });
}

function jn(e, t, n, r, o, a, i, s) {
  var element,
    oldAttributes,
    newAttributes,
    oldProps = n.props,
    newProps = t.props,
    type = t.type,
    index = 0;
  
  if (type === "svg") {
    o = true;
  }
  
  if (s !== null) {
    for (; index < s.length; index++) {
      if (
        (element = s[index]) &&
        "setAttribute" in element == !!type &&
        (type ? element.localName === type : element.nodeType === 3)
      ) {
        e = element;
        s[index] = null;
        break;
      }
    }
  }
  
  if (e === null) {
    if (type === null) {
      return document.createTextNode(newProps);
    }
    
    e = o
      ? document.createElementNS("http://www.w3.org/2000/svg", type)
      : document.createElement(type, newProps.is && newProps);
      
    s = null;
    i = false;
  }
  
  if (type === null) {
    oldProps === newProps || (i && e.data === newProps) || (e.data = newProps);
  } else {
    if (s !== null) {
      oldAttributes = {};
      for (index = 0; index < e.attributes.length; index++) {
        oldAttributes[e.attributes[index].name] = e.attributes[index].value;
      }
    }
    
    newAttributes = newProps.dangerouslySetInnerHTML;
    oldAttributes = oldProps.dangerouslySetInnerHTML;
    
    if (!i) {
      if (s !== null) {
        for (var attr in oldAttributes) {
          if (
            attr !== "children" &&
            attr !== "key" &&
            !(attr in newProps)
          ) {
            updateNode(e, attr, null, oldAttributes[attr], r);
          }
        }
      }
      
      if ((newAttributes || oldAttributes) && (newAttributes !== e.innerHTML)) {
        e.innerHTML = newAttributes || "";
      }
    }
    
    if (newAttributes) {
      t.__k = [];
    } else {
      var children = t.props.children;
      wn(
        e,
        Array.isArray(children) ? children : [children],
        t,
        n,
        r,
        o && type !== "foreignObject",
        s,
        i,
        s ? s[0] : n.__k && hn(n, 0),
        i
      );
      
      if (s !== null) {
        for (index = s.length; index--; ) {
          if (s[index] !== null) {
            fn(s[index]);
          }
        }
      }
      
      if (!i) {
        if ("value" in newProps && newProps.value !== e.value) {
          updateNode(e, "value", newProps.value, oldProps.value, false);
        }
        
        if ("checked" in newProps && newProps.checked !== e.checked) {
          updateNode(e, "checked", newProps.checked, oldProps.checked, false);
        }
      }
    }
  }
  
  return e;
}
function updateRef(ref, value, context) {
  try {
    if (typeof ref === "function") {
      ref(value);
    } else {
      ref.current = value;
    }
  } catch (error) {
    Qt.__e(error, context);
  }
}

function unmountComponent(component, context, isFunctionComponent) {
  var ref, childComponent;
  
  if (Qt.unmount) {
    Qt.unmount(component);
  }
  
  ref = component.ref;
  if (ref && (ref.current && ref.current !== component.__e)) {
    updateRef(ref, null, context);
  }
  
  if (component.__c !== null) {
    if (component.__c.componentWillUnmount) {
      try {
        component.__c.componentWillUnmount();
      } catch (error) {
        Qt.__e(error, context);
      }
    }
    
    component.__c.base = component.__c.__P = null;
    component.__c = null;
  }
  
  if (component.__k) {
    for (childComponent of component.__k) {
      if (childComponent) {
        unmountComponent(childComponent, context, typeof component.type !== "function");
      }
    }
  }
  
  if (!isFunctionComponent && component.__e !== null) {
    fn(component.__e);
  }
  
  component.__ = component.__e = component.__d = null;
}

function createComponent(type, props, context) {
  return this.constructor(type, context);
}

function stringifyProps(props) {
  var prop, result = "";
  
  if (typeof props === "string" || typeof props === "number") {
    result += props;
  } else if (typeof props === "object") {
    if (Array.isArray(props)) {
      for (prop of props) {
        if (prop) {
          result && (result += " ");
          result += stringifyProps(prop);
        }
      }
    } else {
      for (prop in props) {
        if (props[prop]) {
          result && (result += " ");
          result += prop;
        }
      }
    }
  }
  
  return result;
}
// Define variables
var slice = cn.slice;
var React = {
  __e: function (error, component, errorInfo, context) {
    for (var parentComponent, currentComponent, derivedState; (component = component.__); ) {
      if ((parentComponent = component.__c) && !parentComponent.__) {
        try {
          if (
            ((currentComponent = parentComponent.constructor) &&
              typeof currentComponent.getDerivedStateFromError === "function" &&
              (parentComponent.setState(currentComponent.getDerivedStateFromError(error)), (derivedState = parentComponent.__d)),
            typeof parentComponent.componentDidCatch === "function" &&
              (parentComponent.componentDidCatch(error, errorInfo || {}), (derivedState = parentComponent.__d)),
            derivedState)
          )
            return (parentComponent.__E = parentComponent);
        } catch (err) {
          error = err;
        }
      }
    }
    throw error;
  },
};

var componentId = 0;
var stateQueue = [];
var Component = function () {};
Component.prototype.setState = function (partialState, callback) {
  var newState;
  newState = this.__s && this.__s !== this.state ? this.__s : (this.__s = Object.assign({}, this.state));
  if (typeof partialState === "function") {
    partialState = partialState(Object.assign({}, newState), this.props);
  }
  if (partialState) {
    Object.assign(newState, partialState);
  }
  if (partialState && this.__v) {
    if (callback) {
      this._sb.push(callback);
    }
    enqueueUpdate(this);
  }
};
Component.prototype.forceUpdate = function (callback) {
  if (this.__v) {
    this.__e = true;
    if (callback) {
      this.__h.push(callback);
    }
    enqueueUpdate(this);
  }
};
Component.prototype.render = function () {};

var componentQueue = [];
var renderQueue = [];
var diffQueue = [];
var commitQueue = [];
var enqueueUpdate = function (component) {
  if (!componentQueue.includes(component)) {
    componentQueue.push(component);
  }
  if (!renderQueue.includes(component)) {
    renderQueue.push(component);
  }
  if (!diffQueue.includes(component)) {
    diffQueue.push(component);
  }
};

var rootId,
  rootComponent,
  rootElement,
  rootContext,
  rootContainer,
  rootRenderedComponent,
  rootRenderedElement,
  rootRenderedError,
  rootRenderedErrorInfo,
  rootRenderedContext,
  rootRenderedContainer,
  rootRenderedComponentId,
  rootRenderedComponentParentId,
  rootRenderedComponentSiblingIndex,
  rootRenderedComponentIsRoot,
  rootRenderedComponentIsPureReactComponent,
  rootRenderedComponentShouldUpdate,
  rootRenderedComponentProps,
  rootRenderedComponentState,
  rootRenderedComponentContext,
  rootRenderedComponentUpdater,
  rootRenderedComponentRef,
  rootRenderedComponentIsMounted,
  rootRenderedComponentIsUnmounting,
  rootRenderedComponentIsUpdating,
  rootRenderedComponentIsForceUpdating,
  rootRenderedComponentIsRendering,
  rootRenderedComponentIsBatchingUpdates,
  rootRenderedComponentIsPendingUpdate,
  rootRenderedComponentIsPendingForceUpdate,
  rootRenderedComponentIsPendingCallback,
  rootRenderedComponentIsPendingCallbackQueue,
  rootRenderedComponentIsPendingError,
  rootRenderedComponentIsPendingErrorInfo,
  rootRenderedComponentIsPendingContext,
  rootRenderedComponentIsPendingContextProvider,
  rootRenderedComponentIsPendingContextConsumer,
  rootRenderedComponentIsPendingContextConsumerRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRender,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
  rootRenderedComponentIsPendingContextConsumerRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildrenRenderChildren,
function Xn(e) {
  return (
    (Hn = 1),
    (function (e, t, n) {
      var r = Jn(Dn++, 2);
      if (
        ((r.t = e),
        !r.__c &&
          ((r.__ = [
            n ? n(t) : or(void 0, t),
            function (e) {
              var t = r.__N ? r.__N[0] : r.__[0],
                n = r.t(t, e);
              t !== n && ((r.__N = [n, r.__[1]]), r.__c.setState({}));
            },
          ]),
          (r.__c = Fn),
          !Fn.u))
      ) {
        var o = function (e, t, n) {
          if (!r.__c.__H) return !0;
          var o = r.__c.__H.__.filter(function (e) {
            return e.__c;
          });
          if (
            o.every(function (e) {
              return !e.__N;
            })
          )
            return !a || a.call(this, e, t, n);
          var i = !1;
          return (
            o.forEach(function (e) {
              if (e.__N) {
                var t = e.__[0];
                (e.__ = e.__N), (e.__N = void 0), t !== e.__[0] && (i = !0);
              }
            }),
            !(!i && r.__c.props === e) && (!a || a.call(this, e, t, n))
          );
        };
        Fn.u = !0;
        var a = Fn.shouldComponentUpdate,
          i = Fn.componentWillUpdate;
        (Fn.componentWillUpdate = function (e, t, n) {
          if (this.__e) {
            var r = a;
            (a = void 0), o(e, t, n), (a = r);
          }
          i && i.call(this, e, t, n);
        }),
          (Fn.shouldComponentUpdate = o);
      }
      return r.__N || r.__;
    })(or, e)
  );
}
function updateState(value, setter) {
  var state = createStateInstance();
  if (!isBatchUpdating() && shouldUpdate(state, setter)) {
    enqueueUpdate(state, setter, value);
  }
}

function createMemoizedValue(value) {
  return createStateInstance(function () {
    return { current: value };
  }, []);
}

function flushUpdates() {
  for (var update; (update = updateQueue.shift()); ) {
    if (update.component && update.state) {
      try {
        update.state.forEach(runEffectCleanup);
        update.state.forEach(runEffect);
        update.state = [];
      } catch (error) {
        update.state = [];
        handleError(error, update.component);
      }
    }
  }
}

(Qt.__b = function (e) {
  Fn = null;
  if (zn) {
    zn(e);
  }
}),
  (Qt.__r = function (e) {
    Bn && Bn(e);
    Dn = 0;
    var t = (Fn = e.__c).__H;
    if (t) {
      if (Un === Fn) {
        t.__h = [];
        Fn.__h = [];
        t.__.forEach(function (e) {
          if (e.__N) {
            e.__ = e.__N;
          }
          e.__V = qn;
          e.__N = e.i = void 0;
        });
      } else {
        t.__h.forEach(tr);
        t.__h.forEach(nr);
        t.__h = [];
      }
    }
    Un = Fn;
  }),
  (Qt.diffed = function (e) {
    if ($n) {
      $n(e);
    }
    var t = e.__c;
    if (t && t.__H) {
      if (
        t.__H.__h.length &&
        ((1 !== Mn.push(t) && Wn === Qt.requestAnimationFrame) ||
          ((Wn = Qt.requestAnimationFrame) || er)(Zn))
      ) {
        t.__H.__.forEach(function (e) {
          if (e.i) {
            e.__H = e.i;
          }
          if (e.__V !== qn) {
            e.__ = e.__V;
          }
          e.i = void 0;
          e.__V = qn;
        });
      }
    }
    Un = Fn = null;
  }),
  (Qt.__c = function (e, t) {
    t.some(function (e) {
      try {
        e.__h.forEach(tr);
        e.__h = e.__h.filter(function (e) {
          return !e.__ || nr(e);
        });
      } catch (n) {
        t.some(function (e) {
          e.__h && (e.__h = []);
        });
        t = [];
        Qt.__e(n, e.__v);
      }
    });
    if (Vn) {
      Vn(e, t);
    }
  }),
  (Qt.unmount = function (e) {
    if (Gn) {
      Gn(e);
    }
    var t,
      n = e.__c;
    if (n && n.__H) {
      n.__H.__.forEach(function (e) {
        try {
          tr(e);
        } catch (e) {
          t = e;
        }
      });
      n.__H = void 0;
      if (t) {
        Qt.__e(t, n.__v);
      }
    }
  });
var hasAnimationFrame = "function" == typeof requestAnimationFrame;

function debounce(callback) {
  var timeoutId,
    wrappedCallback = function () {
      clearTimeout(timeoutId);
      hasAnimationFrame && cancelAnimationFrame(animationFrameId);
      setTimeout(callback);
    },
    timeoutId = setTimeout(wrappedCallback, 100);

  if (hasAnimationFrame) {
    var animationFrameId = requestAnimationFrame(wrappedCallback);
  }
}

function cleanupCallback(component) {
  var previousRender = previousRenderCallback;
  var renderCallback = component.__renderCallback;
  if (typeof renderCallback === "function") {
    component.__renderCallback = undefined;
    renderCallback();
  }
  previousRenderCallback = previousRender;
}

function scheduleCallback(component) {
  var previousRender = previousRenderCallback;
  var renderCallback = component.__render;
  component.__renderCallback = component.__render();
  previousRenderCallback = previousRender;
}

function shouldUpdate(prevProps, nextProps) {
  return (
    !prevProps ||
    prevProps.length !== nextProps.length ||
    nextProps.some(function (nextProp, index) {
      return nextProp !== prevProps[index];
    })
  );
}

function applyTransform(value, transform) {
  return typeof transform === "function" ? transform(value) : transform;
}
function copyProperties(target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
  return target;
}

function hasChanged(prevProps, nextProps) {
  for (var key in prevProps) {
    if (key !== "__source" && !(key in nextProps)) {
      return true;
    }
  }
  for (var key in nextProps) {
    if (key !== "__source" && prevProps[key] !== nextProps[key]) {
      return true;
    }
  }
  return false;
}

function PureComponent(props) {
  this.props = props;
}

PureComponent.prototype = new Component();
PureComponent.prototype.isPureReactComponent = true;
PureComponent.prototype.shouldComponentUpdate = function (nextProps, nextState) {
  return hasChanged(this.props, nextProps) || hasChanged(this.state, nextState);
};

var beforeRender = React.__b;
React.__b = function (component) {
  if (component.type && component.type.__f && component.ref) {
    component.props.ref = component.ref;
    component.ref = null;
  }
  beforeRender && beforeRender(component);
};

var forwardRefSymbol =
  typeof Symbol !== "undefined" && Symbol.for && Symbol.for("react.forward_ref")
    ? Symbol.for("react.forward_ref")
    : 3911;

var unmountComponent = React.__e;
React.__e = function (component, parent, host, parentSuspense) {
  if (component.then) {
    for (var ancestor; (ancestor = ancestor.__); ) {
      if (ancestor.__c && ancestor.__c) {
        if (parent.__e == null) {
          parent.__e = host.__e;
          parent.__k = host.__k;
        }
        return ancestor.__c(component, parent);
      }
    }
  }
  unmountComponent(component, parent, host, parentSuspense);
};
var unmountComponent = Qt.unmount;

function cleanupComponent(component, parent, host) {
  if (component) {
    if (component.__c && component.__c.__H) {
      component.__c.__H.__.forEach(function (effect) {
        if (typeof effect.__c === "function") {
          effect.__c();
        }
      });
      component.__c.__H = null;
    }

    if (component.__c && component.__c.__P === host) {
      component.__c.__P = parent;
    }

    component.__c = null;

    if (component.__k) {
      component.__k = component.__k.map(function (child) {
        return cleanupComponent(child, parent, host);
      });
    }
  }

  return component;
}

function removeComponent(component, parent, host) {
  if (component) {
    component.__v = null;

    if (component.__k) {
      component.__k = component.__k.map(function (child) {
        return removeComponent(child, parent, host);
      });
    }

    if (component.__c && component.__c.__P === parent) {
      if (component.__e) {
        host.insertBefore(component.__e, component.__d);
      }

      component.__c.__e = true;
      component.__c.__P = host;
    }
  }

  return component;
}

function createCleanup() {
  this.__u = 0;
  this.t = null;
  this.__b = null;
}
function getComponentContext(component) {
  var context = component.__.__c;
  return context && context.__a && context.__a(component);
}

function ComponentWrapper() {
  this.queue = null;
  this.callback = null;
}

(Qt.unmount = function (component) {
  var context = component.__c;
  context && context.__R && context.__R();
  context && component.__h === true && (component.type = null);
  if (fr) {
    fr(component);
  }
}),
  ((ComponentWrapper.prototype = new _n()).__c = function (component, promise) {
    var context = promise.__c;
    var wrapper = this;
    if (wrapper.queue === null) {
      wrapper.queue = [];
    }
    wrapper.queue.push(context);
    var callback = getComponentContext(wrapper.__v);
    var isCallbackCalled = false;
    var resolvePromise = function () {
      if (!isCallbackCalled) {
        isCallbackCalled = true;
        context.__R = null;
        callback ? callback(updateState) : updateState();
      }
    };
    context.__R = resolvePromise;
    var updateState = function () {
      if (--wrapper.__u === 0) {
        if (wrapper.state.__a) {
          var element = wrapper.state.__a;
          wrapper.__v.__k[0] = createVNode(element, element.__c.__P, element.__c.__O);
        }
        var component;
        for (wrapper.setState({ __a: (wrapper.__b = null) }); (component = wrapper.queue.pop()); ) {
          component.forceUpdate();
        }
      }
    };
    var isFirstPromise = wrapper.__u++ === 0;
    if (!isFirstPromise && !promise.__h) {
      wrapper.setState({ __a: (wrapper.__b = wrapper.__v.__k[0]) });
    }
    promise.then(resolvePromise, resolvePromise);
  }),
  (ComponentWrapper.prototype.componentWillUnmount = function () {
    this.queue = [];
  }),
  (ComponentWrapper.prototype.render = function (props, state) {
    if (this.__b) {
      if (this.__v.__k) {
        var tempDiv = document.createElement("div");
        var componentContext = this.__v.__k[0].__c;
        this.__v.__k[0] = wrapComponent(this.__b, tempDiv, (componentContext.__O = componentContext.__P));
      }
      this.__b = null;
    }
    var fallbackNode = state.__a && createVNode(Placeholder, null, props.fallback);
    if (fallbackNode) {
      fallbackNode.__h = null;
    }
    return [createVNode(Placeholder, null, state.__a ? null : props.children), fallbackNode];
  });
var incrementCounter = function (element, counterMap, revealOrder) {
  counterMap[element][0]++;
  if (revealOrder && (revealOrder[0] !== 't' || Object.keys(counterMap).length === 0)) {
    for (var counter = counterMap[element]; counter; ) {
      while (counter.length > 3) {
        counter.pop()();
      }
      if (counter[1] < counter[0]) {
        break;
      }
      counterMap[element] = counter = counter[2];
    }
  }
};

var createCallback = function (element, counterMap, revealOrder) {
  var callback = function () {
    if (revealOrder) {
      counterMap[element].push(callback);
      incrementCounter(element, counterMap, revealOrder);
    } else {
      callback();
    }
  };
  return callback;
};

var RevealComponent = function (props) {
  this.counterMap = {};
  this.revealOrder = props.revealOrder;
  this.children = props.children;
};

RevealComponent.prototype.render = function () {
  this.counterMap = {};
  var reversedChildren = this.children.slice().reverse();
  for (var i = 0; i < reversedChildren.length; i++) {
    var child = reversedChildren[i];
    this.counterMap[child] = [1, 0, this.counterMap[child]];
  }
  return this.children;
};

RevealComponent.prototype.componentDidUpdate = function () {
  var self = this;
  Object.keys(this.counterMap).forEach(function (element) {
    incrementCounter(element, self.counterMap, self.revealOrder);
  });
};

var isReactElement = typeof Symbol !== 'undefined' && Symbol.for && Symbol.for('react.element');
var isSVGAttribute = function (attribute) {
  return isReactElement(attribute);
};

(_n.prototype.isReactComponent = {}),
  [
    "componentWillMount",
    "componentWillReceiveProps",
    "componentWillUpdate",
  ].forEach(function (lifecycleMethod) {
    Object.defineProperty(_n.prototype, lifecycleMethod, {
      configurable: true,
      get: function () {
        return this["UNSAFE_" + lifecycleMethod];
      },
      set: function (method) {
        Object.defineProperty(this, lifecycleMethod, {
          configurable: true,
          writable: true,
          value: method,
        });
      },
    });
  });

var originalEvent = Qt.event;

function persistEvent() {}

function isPropagationStopped() {
  return this.cancelBubble;
}

function isDefaultPrevented() {
  return this.defaultPrevented;
}

Qt.event = function (event) {
  return (
    originalEvent && (event = originalEvent(event)),
    (event.persist = persistEvent),
    (event.isPropagationStopped = isPropagationStopped),
    (event.isDefaultPrevented = isDefaultPrevented),
    (event.nativeEvent = event)
  );
};
var updateProps = {
  enumerable: false,
  configurable: true,
  get: function () {
    return this.class;
  },
};

var originalVnode = Qt.vnode;
Qt.vnode = function (element) {
  if (typeof element.type === "string") {
    (function (element) {
      var props = element.props;
      var type = element.type;
      var updatedProps = {};

      for (var key in props) {
        var value = props[key];

        if (
          !(
            (key === "value" && "defaultValue" in props && value === null) ||
            (kr && key === "children" && type === "noscript") ||
            key === "class" ||
            key === "className"
          )
        ) {
          var lowerCaseKey = key.toLowerCase();

          if (key === "defaultValue" && "value" in props && value === null) {
            key = "value";
          } else if (key === "download" && value === true) {
            value = "";
          } else if (lowerCaseKey === "ondoubleclick") {
            key = "ondblclick";
          } else if (
            lowerCaseKey !== "onchange" ||
            (type !== "input" && type !== "textarea") ||
            xr(props.type)
          ) {
            if (lowerCaseKey === "onfocus") {
              key = "onfocusin";
            } else if (lowerCaseKey === "onblur") {
              key = "onfocusout";
            } else if (wr.test(key)) {
              key = lowerCaseKey;
            } else if (-1 === type.indexOf("-") && yr.test(key)) {
              key = key.replace(br, "-$&").toLowerCase();
            } else if (value === null) {
              value = undefined;
            }
          } else {
            lowerCaseKey = key = "oninput";
          }

          if (lowerCaseKey === "oninput" && updatedProps[key]) {
            key = "oninputCapture";
          }

          updatedProps[key] = value;
        }
      }

      if (type === "select" && updatedProps.multiple && Array.isArray(updatedProps.value)) {
        updatedProps.value = kn(props.children).forEach(function (child) {
          child.props.selected = updatedProps.value.indexOf(child.props.value) !== -1;
        });
      }

      if (type === "select" && updatedProps.defaultValue !== null) {
        updatedProps.value = kn(props.children).forEach(function (child) {
          child.props.selected = updatedProps.multiple
            ? updatedProps.defaultValue.indexOf(child.props.value) !== -1
            : updatedProps.defaultValue === child.props.value;
        });
      }

      if (props.class && !props.className) {
        updatedProps.class = props.class;
        Object.defineProperty(updatedProps, "className", updateProps);
      } else if ((props.className && !props.class) || (props.class && props.className)) {
        updatedProps.class = updatedProps.className = props.className;
      }

      element.props = updatedProps;
    })(element);

    element.$$typeof = vr;
    if (originalVnode) {
      originalVnode(element);
    }
  }
};

var originalDiffed = Qt.diffed;
Qt.diffed = function (element) {
  if (originalDiffed) {
    originalDiffed(element);
  }

  var props = element.props;
  var node = element.__e;

  if (node !== null && element.type === "textarea" && "value" in props && props.value !== node.value) {
    node.value = props.value === null ? "" : props.value;
  }
};

var originalR = Qt.__r;
Qt.__r = function (element) {
  if (originalR) {
    originalR(element);
  }

  element.__c;
};

var incrementCounter = function (element, counterMap, revealOrder) {
  // TODO: Implement incrementCounter function logic
};

var createCallback = function (element, counterMap, revealOrder) {
  // TODO: Implement createCallback function logic
};

var RevealComponent = function (props) {
  // TODO: Implement RevealComponent function logic
};

RevealComponent.prototype.render = function () {
  // TODO: Implement render method logic
};

RevealComponent.prototype.componentDidUpdate = function () {
  // TODO: Implement componentDidUpdate method logic
};

var isReactElement = typeof Symbol !== "undefined" && Symbol.for && Symbol.for("react.element");

var isSVGAttribute = function (attribute) {
  // TODO: Implement isSVGAttribute function logic
};

(_n.prototype.isReactComponent = {}),
  [
    "componentWillMount",
    "componentWillReceiveProps",
    "componentWillUpdate",
  ].forEach(function (lifecycleMethod) {
    // TODO: Implement lifecycleMethod logic
  });

var originalEvent = Qt.event;

function persistEvent() {
  // TODO: Implement persistEvent function logic
}

function isPropagationStopped() {
  // TODO: Implement isPropagationStopped function logic
}

function isDefaultPrevented() {
  // TODO: Implement isDefaultPrevented function logic
}

Qt.event = function (event) {
  // TODO: Implement event function logic
};

var Ar,
  Rr = function (e, t) {
    // TODO: Implement Rr function logic
  };

function Ir(e) {
  // TODO: Implement Ir function logic
}
var React,
  Component = (function (e, t) {
    var n = {
      __c: (t = "__cC" + an++),
      __: e,
      Consumer: function (e, t) {
        return e.children(t);
      },
      Provider: function (e) {
        var n, r;
        return (
          this.getChildContext ||
            ((n = []),
            ((r = {})[t] = this),
            (this.getChildContext = function () {
              return r;
            }),
            (this.shouldComponentUpdate = function (e) {
              this.props.value !== e.value &&
                n.some(function (e) {
                  (e.__e = !0), vn(e);
                });
            }),
            (this.sub = function (e) {
              n.push(e);
              var t = e.componentWillUnmount;
              e.componentWillUnmount = function () {
                n.splice(n.indexOf(e), 1), t && t.call(e);
              };
            })),
          e.children
        );
      },
    };
    return (n.Provider.__ = n.Consumer.contextType = n);
  })({}),
  StyledDiv = ((React = "div"),
  function (e) {
    var t = {},
      n = t.shouldForwardProp,
      r = t.label,
      o = (function (e, t) {
        function n(e) {
          var n = this.props.ref,
            r = n == e.ref;
          return (
            !r && n && (n.call ? n(null) : (n.current = null)),
            t ? !t(this.props, e) || !r : ir(this.props, e)
          );
        }
        function r(t) {
          return (this.shouldComponentUpdate = n), dn(e, t);
        }
        return (
          (r.displayName = "Memo(" + (e.displayName || e.name) + ")"),
          (r.prototype.isReactComponent = !0),
          (r.__f = !0),
          r
        );
      })(
        (function (e) {
          function t(t) {
            var n = ar({}, t);
            return delete n.ref, e(n, t.ref || null);
          }
          return (
            (t.$$typeof = lr),
            (t.render = t),
            (t.prototype.isReactComponent = t.__f = !0),
            (t.displayName = "ForwardRef(" + (e.displayName || e.name) + ")"),
            t
          );
        })(function (t, r) {
          var o = t || {},
            a = o.children,
            i = o.as;
          void 0 === i && (i = React);
          var s = o.style;
          void 0 === s && (s = {});
          var c = (function (e, t) {
              var n = {};
              for (var r in e)
                Object.prototype.hasOwnProperty.call(e, r) &&
                  -1 === t.indexOf(r) &&
                  (n[r] = e[r]);
              return n;
            })(o, ["children", "as", "style"]),
            l = c,
            u = (function (e) {
              var t = Fn.context[e.__c],
                n = Jn(Dn++, 9);
              return (
                (n.c = e),
                t
                  ? (null == n.__ && ((n.__ = !0), t.sub(Fn)), t.props.value)
                  : e.__
              );
            })(Component);
          return dn(
            i,
            Object.assign(
              {},
              {
                ref: r,
                style: Object.assign(
                  {},
                  e(Object.assign({}, l, { theme: u })),
                  "function" == typeof s
                    ? s(Object.assign({}, l, { theme: u }))
                    : s
                ),
              },
              n
                ? (function (e, t) {
                    return Object.keys(e)
                      .filter(t)
                      .reduce(function (t, n) {
                        return (t[n] = e[n]), t;
                      }, {});
                  })(l, n)
                : l
            ),
            a
          );
        })
      );
    return (o.displayName = (r || React) + "💅"), o;
  })(function () {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
    };
  });
function Ir(e) {
  var t = e.displayError;
  void 0 === t && (t = !0);
  var n = e.logger;
  void 0 === n && (n = function () {});
  var r = e.children,
    o = (function (e) {
      var t = Jn(Dn++, 10),
        n = Xn();
      return (
        (t.__ = e),
        Fn.componentDidCatch ||
          (Fn.componentDidCatch = function (e, r) {
            t.__ && t.__(e, r), n[1](e);
          }),
        [
          n[0],
          function () {
            n[1](void 0);
          },
        ]
      );
    })(function (e) {
      return n(e.message);
    });
  return o[0] && t
    ? dn(
        Pr,
        null,
        dn(
          "p",
          null,
          "An error has occurred, we apologise for the inconvenience. ",
          dn("br", null),
          dn("br", null),
          "We have been notified and will rectify the situation as soon as possible. ",
          dn("br", null),
          dn("br", null),
          "Please try again later or contact support@weglot.com directly."
        )
      )
    : r;
}
var Dr = ["text_active", "text_inactive", "text_hover"],
  Fr = ["bg_active", "bg_inactive", "bg_hover"],
  Ur = [
    {
      name: "default",
      editorDropdown: !0,
      editableProps: [
        "flag_type",
        "with_flags",
        "is_dropdown",
        "with_name",
        "full_name",
        "invert_flags",
        "open_hover",
        "close_outside_click",
      ],
      defaultValues: {
        style: {
          with_name: !0,
          with_flags: !0,
          full_name: !0,
          is_dropdown: !0,
          invert_flags: !0,
          flag_type: "rectangle_mat",
        },
        opts: { open_hover: !1, close_outside_click: !1 },
      },
    },
    {
      name: "toggle",
      editableProps: Dr.concat(Fr),
      defaultValues: {
        style: { full_name: !1 },
        colors: {
          bg_active: "#3D46FB",
          bg_inactive: "transparent",
          bg_hover: "transparent",
          text_active: "#FFFFFF",
          text_inactive: "#000000",
          text_hover: "#000000",
        },
      },
    },
    {
      name: "bubble",
      editorDropdown: !0,
      editableProps: [
        "flag_type",
        "with_flags",
        "full_name",
        "color",
        "open_hover",
        "close_outside_click",
      ].concat(Dr),
      defaultValues: {
        style: {
          with_name: !0,
          with_flags: !0,
          full_name: !0,
          flag_type: "rectangle_mat",
        },
        opts: { open_hover: !1, close_outside_click: !0 },
        colors: {
          text_inactive: "#333333",
          text_active: "#555555",
          text_hover: "#555555",
        },
      },
    },
    {
      name: "vertical_expand",
      editorDropdown: !0,
      editableProps: [
        "with_flags",
        "full_name",
        "color",
        "open_hover",
        "close_outside_click",
      ].concat(Dr, Fr),
      defaultValues: {
        style: {
          with_name: !0,
          with_flags: !0,
          full_name: !1,
          flag_type: "square",
        },
        opts: { open_hover: !0, close_outside_click: !1 },
        colors: {
          text_active: "#000000",
          text_inactive: "#000000",
          text_hover: "#FFFFFF",
          bg_inactive: "#FFFFFF",
          bg_active: "#FFFFFF",
          bg_hover: "#3D46FB",
        },
      },
    },
    {
      name: "horizontal_expand",
      editorDropdown: !1,
      editableProps: ["open_hover", "close_outside_click"].concat(Dr, Fr),
      defaultValues: {
        style: {
          with_name: !0,
          with_flags: !1,
          full_name: !1,
          flag_type: "square",
        },
        opts: { open_hover: !0, close_outside_click: !1 },
        colors: {
          text_inactive: "#000000",
          text_active: "#FFFFFF",
          text_hover: "#FFFFFF",
          bg_inactive: "#FFFFFF",
          bg_active: "#3D46FB",
          bg_hover: "#3D46FB",
        },
      },
    },
    {
      name: "underline_edge",
      editableProps: ["full_name"].concat(Dr),
      maxLanguages: 10,
      minLanguages: null,
      defaultValues: {
        style: { full_name: !1 },
        colors: {
          text_active: "#FA8072",
          text_inactive: "#333333",
          text_hover: "#FA8072",
        },
      },
    },
    {
      name: "skewed",
      editorDropdown: !0,
      editableProps: [
        "with_flags",
        "full_name",
        "open_hover",
        "close_outside_click",
        "bg_active",
        "bg_inactive",
      ].concat(Dr),
      defaultValues: {
        style: {
          with_name: !0,
          with_flags: !0,
          full_name: !1,
          flag_type: "square",
        },
        opts: { open_hover: !0, close_outside_click: !1 },
        colors: {
          text_active: "#000000",
          text_inactive: "#000000",
          text_hover: "#3D46FB",
          bg_inactive: "#FFFFFF",
          bg_active: "transparent",
          bg_hover: "#FFFFFF",
        },
      },
    },
    {
      name: "underline_full",
      maxLanguages: 10,
      minLanguages: null,
      editableProps: ["with_flags", "flag_type"].concat(Dr),
      defaultValues: {
        style: { full_name: !0, with_flags: !0, flag_type: "rectangle_mat" },
        colors: {
          text_active: "#333333",
          text_inactive: "#333333",
          text_hover: "#3D46FB",
        },
      },
    },
  ].map(function (e) {
    return Object.assign({}, e, {
      defaultValues: Object.assign({}, e.defaultValues, {
        opts: Object.assign({}, e.defaultValues.opts, {
          is_responsive: !1,
          display_device: "mobile",
          pixel_cutoff: 768,
        }),
        style: Object.assign({}, e.defaultValues.style, { size_scale: 1 }),
      }),
      editableProps: e.editableProps.concat([
        "is_responsive",
        "display_device",
        "pixel_cutoff",
        "size_scale",
      ]),
    });
  });
function Wr(e) {
  var t = (function (e) {
      return Ur.find(function (t) {
        return t.name === e;
      });
    })(e),
    n = t.defaultValues;
  void 0 === n && (n = {});
  var r = n,
    o = r.style;
  void 0 === o && (o = {});
  var a = r.opts;
  void 0 === a && (a = {});
  var i = r.colors;
  return void 0 === i && (i = {}), { style: o, opts: a, colors: i };
}
var Hr = i({ service: "switcher-templates" }),
  Mr = {
    af: { name: "Afrikaans", flag: "za" },
    am: { name: "አማርኛ", flag: "et" },
    ar: { name: "العربية‏", flag: "sa" },
    az: { name: "Azərbaycan dili", flag: "az" },
    ba: { name: "башҡорт теле", flag: "ru" },
    be: { name: "Беларуская", flag: "by" },
    bg: { name: "Български", flag: "bg" },
    bn: { name: "বাংলা", flag: "bd" },
    br: { name: "Português Brasileiro", flag: "br" },
    bs: { name: "Bosanski", flag: "ba" },
    ca: { name: "Català", flag: "es-ca" },
    co: { name: "Corsu", flag: "fr-co" },
    cs: { name: "Čeština", flag: "cz" },
    cy: { name: "Cymraeg", flag: "gb-wls" },
    da: { name: "Dansk", flag: "dk" },
    de: { name: "Deutsch", flag: "de" },
    el: { name: "Ελληνικά", flag: "gr" },
    en: { name: "English", flag: "gb" },
    eo: { name: "Esperanto", flag: "eo" },
    es: { name: "Español", flag: "es" },
    et: { name: "Eesti", flag: "ee" },
    eu: { name: "Euskara", flag: "eus" },
    fa: { name: "فارسی", flag: "ir" },
    fi: { name: "Suomi", flag: "fi" },
    fj: { name: "Vosa Vakaviti", flag: "fj" },
    fl: { name: "Filipino", flag: "ph" },
    fr: { name: "Français", flag: "fr" },
    fy: { name: "frysk", flag: "nl" },
    ga: { name: "Gaeilge", flag: "ie" },
    gd: { name: "Gàidhlig", flag: "gb-sct" },
    gl: { name: "Galego", flag: "es-ga" },
    gu: { name: "ગુજરાતી", flag: "in" },
    ha: { name: "هَوُسَ", flag: "ne" },
    he: { name: "עברית", flag: "il" },
    hi: { name: "हिंदी", flag: "in" },
    hr: { name: "Hrvatski", flag: "hr" },
    ht: { name: "Kreyòl ayisyen", flag: "ht" },
    hu: { name: "Magyar", flag: "hu" },
    hw: { name: "‘Ōlelo Hawai‘i", flag: "hw" },
    hy: { name: "հայերեն", flag: "am" },
    id: { name: "Bahasa Indonesia", flag: "id" },
    ig: { name: "Igbo", flag: "ne" },
    is: { name: "Íslenska", flag: "is" },
    it: { name: "Italiano", flag: "it" },
    ja: { name: "日本語", flag: "jp" },
    jv: { name: "Wong Jawa", flag: "id" },
    ka: { name: "ქართული", flag: "ge" },
    kk: { name: "Қазақша", flag: "kz" },
    km: { name: "ភាសាខ្មែរ", flag: "kh" },
    kn: { name: "ಕನ್ನಡ", flag: "in" },
    ko: { name: "한국어", flag: "kr" },
    ku: { name: "كوردی", flag: "iq" },
    ky: { name: "кыргызча", flag: "kg" },
    la: { name: "Latine", flag: "it" },
    lb: { name: "Lëtzebuergesch", flag: "lu" },
    lo: { name: "ພາສາລາວ", flag: "la" },
    lt: { name: "Lietuvių", flag: "lt" },
    lv: { name: "Latviešu", flag: "lv" },
    lg: { name: "Oluganda", flag: "ug" },
    mg: { name: "Malagasy", flag: "mg" },
    mi: { name: "te reo Māori", flag: "nz" },
    mk: { name: "Македонски", flag: "mk" },
    ml: { name: "മലയാളം", flag: "in" },
    mn: { name: "Монгол", flag: "mn" },
    mr: { name: "मराठी", flag: "in" },
    ms: { name: "Bahasa Melayu", flag: "my" },
    mt: { name: "Malti", flag: "mt" },
    my: { name: "မျန္မာစာ", flag: "mm" },
    ne: { name: "नेपाली", flag: "np" },
    nl: { name: "Nederlands", flag: "nl" },
    no: { name: "Norsk", flag: "no" },
    ny: { name: "chiCheŵa", flag: "mw" },
    pa: { name: "ਪੰਜਾਬੀ", flag: "in" },
    pl: { name: "Polski", flag: "pl" },
    ps: { name: "پښتو", flag: "pk" },
    pt: { name: "Português", flag: "pt" },
    ro: { name: "Română", flag: "ro" },
    ru: { name: "Русский", flag: "ru" },
    sd: { name: '"سنڌي، سندھی, सिन्धी"', flag: "pk" },
    si: { name: "සිංහල", flag: "lk" },
    sk: { name: "Slovenčina", flag: "sk" },
    sl: { name: "Slovenščina", flag: "si" },
    sm: { name: '"gagana fa\'a Samoa"', flag: "ws" },
    sn: { name: "chiShona", flag: "zw" },
    so: { name: "Soomaaliga", flag: "so" },
    sq: { name: "Shqip", flag: "al" },
    sr: { name: "Српски", flag: "rs" },
    st: { name: "seSotho", flag: "ng" },
    su: { name: "Sundanese", flag: "sd" },
    sv: { name: "Svenska", flag: "se" },
    sw: { name: "Kiswahili", flag: "ke" },
    ta: { name: "தமிழ்", flag: "in" },
    te: { name: "తెలుగు", flag: "in" },
    tg: { name: "Тоҷикӣ", flag: "tj" },
    th: { name: "ภาษาไทย", flag: "th" },
    tl: { name: "Tagalog", flag: "ph" },
    to: { name: "faka-Tonga", flag: "to" },
    tr: { name: "Türkçe", flag: "tr" },
    tt: { name: "Tatar", flag: "tr" },
    tw: { name: "中文 (繁體)", flag: "tw" },
    ty: { name: '"te reo Tahiti, te reo Māʼohi"', flag: "pf" },
    uk: { name: "Українська", flag: "ua" },
    ur: { name: "اردو", flag: "pk" },
    uz: { name: '"O\'zbek"', flag: "uz" },
    vi: { name: "Tiếng Việt", flag: "vn" },
    xh: { name: "isiXhosa", flag: "za" },
    yi: { name: "ייִדיש", flag: "il" },
    yo: { name: "Yorùbá", flag: "ng" },
    zh: { name: "中文 (简体)", flag: "cn" },
    zu: { name: "isiZulu", flag: "za" },
    hm: { name: "Hmoob", flag: "hmn" },
    cb: { name: "Sugbuanon", flag: "ph" },
    or: { name: "ଓଡ଼ିଆ", flag: "in" },
    tk: { name: "Türkmen", flag: "tr" },
    ug: { name: "ئۇيغۇر", flag: "uig" },
    fc: { name: "Français (Canada)", flag: "ca" },
    as: { name: "অসমীয়া", flag: "in" },
    sa: { name: "Srpski", flag: "rs" },
    om: { name: "Afaan Oromoo", flag: "et" },
    iu: { name: "ᐃᓄᒃᑎᑐᑦ", flag: "ca" },
    ti: { name: "ቲግሪንያ", flag: "er" },
    bm: { name: "Bamanankan", flag: "ml" },
    bo: { name: "བོད་ཡིག", flag: "cn" },
    ak: { name: "Baoulé", flag: "gh" },
    rw: { name: "Kinyarwanda", flag: "rw" },
    kb: { name: "سۆرانی", flag: "iq" },
    fo: { name: "Føroyskt", flag: "fo" },
    il: { name: "Ilokano", flag: "ph" },
  };
function qr(e) {
  if (!e || !e.toLowerCase) return "Unknown";
  var t = e.toLowerCase(),
    n = Ia.languages.find(function (e) {
      var n = e.language_to,
        r = e.custom_code;
      return n === t || (r ? r.toLowerCase() === t : void 0);
    });
  return n && n.custom_local_name
    ? n.custom_local_name
    : n && n.custom_name
    ? n.custom_name
    : t === Ia.language_from && Ia.language_from_custom_name
    ? Ia.language_from_custom_name
    : Mr[t]
    ? Mr[t].name
    : "Unknown";
}
function zr(e, t) {
  return t[e] ? t[e].flag : "";
}
function Br(e) {
  return (function (e, t, n) {
    if (!e || !e.toLowerCase) return "";
    if (t.language_from === e) return t.language_from_custom_flag || zr(e, n);
    var r = e.toLowerCase(),
      o = t.languages.find(function (e) {
        var t = e.language_to,
          n = e.custom_code;
        return t === r || (n && n.toLowerCase() === r);
      });
    return o ? o.custom_flag || zr(o.language_to, n) : "";
  })(e, Ia, Mr);
}
function $r(e, t, n) {
  return t < e ? e : t > n ? n : t;
}
function Vr(e, t) {
  return t && 1 !== t ? Math.round(e * t * 100) / 100 : e;
}
function Gr(e, t) {
  return "WordPress" === Ia.technology_name &&
    Ia.injectedData &&
    !Ia.is_connect
    ? t(Ia.injectedData.switcher_links[e])
    : rt(e, t);
}
var Jr = 13,
  Xr = 27,
  Yr = 38,
  Kr = 40;
var Zr = ["none", "shiny", "square", "circle", "rectangle_mat"];
function Qr(e) {
  return e
    ? e.getBoundingClientRect()
    : { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
}
function eo() {
  var e = Xn(
      "WordPress" === Ia.technology_name && Ia.injectedData && !Ia.is_connect
        ? Ia.injectedData.current_language
        : Ia.switcher_editor
        ? Ia.language_from
        : window.Weglot.getCurrentLang()
    ),
    t = e[0],
    n = e[1];
  return (
    Yn(function () {
      Ia.is_connect ||
        "WordPress" === Ia.technology_name ||
        Ia.switcher_editor ||
        window.Weglot.on("languageChanged", function (e) {
          n(e);
        });
    }, []),
    [t, n]
  );
}
function to(e, t) {
  var n = window.innerWidth > 0 ? window.innerWidth : screen.width,
    r = t || 768;
  return "mobile" === e ? n <= r : n > r;
}
function no(e, t, n) {
  var r = Xn(!1),
    o = r[0],
    a = r[1],
    i = e.style;
  void 0 === i && (i = {});
  var s = e.colors;
  return (
    void 0 === s && (s = {}),
    Yn(function () {
      var e = i.size_scale;
      if (e && 1 !== e) {
        var r,
          o,
          c,
          l,
          u =
            ((r = t({ style: i, colors: s })),
            (o = n),
            (c = Ia.button_style && Ia.button_style.custom_css),
            (l = r
              .map(function (e) {
                var t = e.selector,
                  n = e.declarations;
                return [
                  "aside.country-selector.weglot_switcher." + o + t + " {",
                  Object.keys(n)
                    .map(function (e) {
                      return (
                        "\t" +
                        e
                          .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
                          .toLowerCase() +
                        ": " +
                        n[e] +
                        ";"
                      );
                    })
                    .join("\n"),
                  "}",
                ].join("\n");
              })
              .join("\n\n")),
            !c || Ia.switcher_gallery ? l : l + "\n\n" + c);
        !(function (e, t) {
          if (e) {
            var n = document.querySelector("style#weglot-switcher-" + t);
            if (n) n.textContent = e;
            else if (document.head) {
              var r = document.createElement("style");
              (r.id = "weglot-switcher-" + t),
                (r.textContent = e),
                document.head.appendChild(r);
            }
          }
        })(u, n),
          a(!0);
      }
    }, []),
    o
  );
}
function ro(e) {
  var t = e.close_outside_click;
  void 0 === t && (t = !1);
  var n = e.open_hover;
  void 0 === n && (n = !1);
  var r = eo(),
    o = r[0],
    a = r[1],
    i = Xn(!1),
    s = i[0],
    c = i[1],
    l = (function (e) {
      var t = Kn(null);
      return (
        Yn(
          function () {
            if (e)
              return (
                document.addEventListener("mousedown", n),
                function () {
                  document.removeEventListener("mousedown", n);
                }
              );
            function n(n) {
              t.current && !t.current.contains(n.target) && e();
            }
          },
          [t]
        ),
        t
      );
    })(t && !n && x),
    f = Kn(null),
    d = wt().filter(function (e) {
      return e !== o;
    }),
    g = Xn(null),
    p = g[0],
    _ = g[1],
    h = Xn(!1),
    m = h[0],
    v = h[1],
    y = Xn(!1),
    w = y[0],
    b = y[1];
  function k() {
    var e = Qr(l.current),
      t = e.bottom;
    void 0 === t && (t = 0);
    var n = e.left;
    void 0 === n && (n = 0),
      b(t > window.innerHeight / 2),
      v(n > window.innerWidth / 2),
      c(!0);
  }
  function x() {
    c(!1), _(null);
  }
  function E() {
    return s ? x() : k();
  }
  function C(e) {
    if (Ia.switcher_editor) return c(!1);
    var t;
    a(e),
      (t = e),
      "WordPress" === Ia.technology_name && Ia.injectedData && !Ia.is_connect
        ? Gr(t, function (e) {
            u(window.location.hostname)
              ? window.dispatchEvent(
                  new CustomEvent("veLanguageChangeUrl", {
                    detail: { targetUrl: e },
                  })
                )
              : window.location.replace(e);
          })
        : window.Weglot.switchTo(t),
      c(!1);
  }
  return (
    Yn(
      function () {
        p && f.current.scrollIntoView({ block: "center" });
      },
      [p]
    ),
    {
      open: s,
      opensUpward: w,
      opensLeftward: m,
      language: o,
      otherLanguages: d,
      focusedLanguage: p,
      switcherContainerRef: l,
      focusedLanguageRef: f,
      handleMouseEnter: function () {
        n && k();
      },
      handleMouseLeave: function () {
        n && x();
      },
      handleKeyDown: function (e) {
        return e.keyCode === Jr
          ? (e.preventDefault(), p && C(p), E())
          : e.keyCode === Kr || e.keyCode === Yr
          ? (e.preventDefault(),
            void (function (e) {
              var t = e === Kr ? "down" : "up",
                n = d.slice(-1).pop(),
                r = d[0],
                o = Qr(l.current).bottom;
              void 0 === o && (o = 0);
              var a = o > window.innerHeight / 2;
              if (!p || !s) {
                return (
                  _("down" === t ? r : n),
                  void (
                    !s &&
                    (("up" === t && a) || ("down" === t && !a)) &&
                    k()
                  )
                );
              }
              if (
                (!a && "up" === t && p === r) ||
                (a && "down" === t && p === n)
              )
                return void E();
              var i = "up" === t ? -1 : 1,
                c = d.indexOf(p) + i;
              if (c === d.length || -1 === c) return;
              _(d[c]);
            })(e.keyCode))
          : void (e.keyCode === Xr && s && (e.preventDefault(), E()));
      },
      switchLanguage: C,
      toggleOpen: E,
    }
  );
}
var oo = {
    rectangle_mat: { width: 30, height: 20 },
    shiny: { width: 30, height: 20 },
    circle: { width: 24, height: 24 },
    square: { width: 24, height: 24 },
  },
  ao = function (e) {
    var t = e.language,
      n = e.flagType;
    void 0 === n && (n = "circle");
    var r = e.size_scale,
      o = Br(t),
      a = oo[n] || {},
      i = a.width,
      s = a.height;
    if (o)
      return dn("img", {
        src:
          o.indexOf("http") > -1
            ? o
            : "https://cdn.weglot.com/flags/" + n + "/" + o + ".svg",
        width: Vr(i, r),
        height: Vr(s, r),
        className: "wg-flag",
        role: "none",
        alt: qr(t) + " flag",
      });
  },
  io = function (e) {
    var t = e.styleOpts,
      n = e.language,
      r = e.onClick,
      o = e.legacyFlags,
      a = e.open;
    void 0 === a && (a = !1);
    var i = e.url,
      s = e.focusedLanguage,
      c = e.isSelected;
    void 0 === c && (c = !1);
    var l = e.focusRef;
    void 0 === l && (l = null);
    var u = t.with_name;
    void 0 === u && (u = !0);
    var f = t.full_name;
    void 0 === f && (f = !0);
    var d = t.with_flags,
      g = t.size_scale,
      p = t.flag_type,
      _ = !!s && n === s,
      h = f ? qr(n) : n.toUpperCase(),
      m = c ? "div" : "li",
      v = Zr.indexOf(p || "rectangle_mat"),
      y = d ? " wg-flags" + (o ? " flag-" + v + " legacy" : "") : "",
      w = _ && !c ? " focus" : "",
      b = c ? " wgcurrent" : "";
    return dn(
      m,
      Object.assign(
        {},
        {
          "data-l": n,
          onClick: function (e) {
            return (function (e, t) {
              e.preventDefault(), r(t);
            })(e, n);
          },
          className: "wg-li " + n + b + y + w,
        },
        c
          ? {
              role: "combobox",
              "aria-activedescendant": s ? "weglot-language-" + s : "",
              "aria-label": "Language",
              tabindex: "0",
              "aria-expanded": a,
              "aria-controls": "weglot-listbox",
            }
          : { role: "none", id: "wg-" + n }
      ),
      dn(
        "a",
        Object.assign(
          {},
          c ? { target: "_self" } : { role: "option" },
          { href: i },
          !u && { "aria-label": h },
          _ && !c && { ref: l },
          { id: "weglot-language-" + n, tabIndex: -1 }
        ),
        d && !o && dn(ao, { language: n, flagType: p, size_scale: g }),
        u && h
      )
    );
  };
function so(e) {
  var t = e.style.size_scale,
    n = function (e) {
      return Vr(e, t);
    };
  return [
    {
      selector: ".wg-drop ul",
      declarations: { top: n(38) + "px", bottom: "auto" },
    },
    {
      selector: ".wg-drop.weg-openup ul",
      declarations: { bottom: n(38) + "px", top: "auto" },
    },
    { selector: " a", declarations: { fontSize: n(13) + "px" } },
    {
      selector: ".wg-drop a img.wg-flag",
      declarations: { height: n(30) + "px" },
    },
    {
      selector: ".wg-drop .wg-li.wgcurrent",
      declarations: {
        height: n(38) + "px",
        display: "flex",
        alignItems: "center",
      },
    },
    { selector: ".wg-drop a", declarations: { height: n(38) + "px" } },
    {
      selector: " .wgcurrent:after",
      declarations: { height: n(38) + "px", backgroundSize: n(9) + "px" },
    },
    {
      selector: ".wg-drop .wgcurrent a",
      declarations: {
        paddingRight: $r(22, n(40), 40) + "px",
        paddingLeft: $r(5, n(10), 10) + "px",
      },
    },
  ];
}
var co,
  lo,
  uo,
  fo = "default",
  go = (function (e, t) {
    return function (n) {
      var r = n || {},
        o = r.style;
      void 0 === o && (o = {});
      var a = r.opts;
      void 0 === a && (a = {});
      var i = r.colors;
      void 0 === i && (i = {});
      var s = Wr(t),
        c = s.style,
        l = s.opts,
        u = s.colors,
        f = document.createElement("div");
      return (
        (function (e, t, n) {
          var r, o, a;
          Qt.__ && Qt.__(e, t),
            (o = (r = "function" == typeof n) ? null : t.__k),
            (a = []),
            Nn(
              t,
              (e = ((!r && n) || t).__k = dn(pn, null, [e])),
              o || sn,
              sn,
              void 0 !== t.ownerSVGElement,
              !r && n
                ? [n]
                : o
                ? null
                : t.firstChild
                ? Zt.call(t.childNodes)
                : null,
              a,
              !r && n ? n : o ? o.__e : t.firstChild,
              r
            ),
            Tn(a, e);
        })(
          dn(
            Ir,
            { logger: Hr.error, displayError: !1 },
            dn(e, {
              style: Object.assign({}, c, o),
              opts: Object.assign({}, l, a),
              colors: Object.assign({}, u, i),
            })
          ),
          f
        ),
        f.classList.add("weglot-container"),
        f
      );
    };
  })(function (e) {
    var t = e.style,
      n = e.opts,
      r = ro(n),
      o = r.open,
      a = r.opensUpward,
      i = r.opensLeftward,
      s = r.language,
      c = r.focusedLanguage,
      l = r.switcherContainerRef,
      u = r.focusedLanguageRef,
      f = r.handleMouseEnter,
      d = r.handleMouseLeave,
      g = r.handleKeyDown,
      p = r.switchLanguage,
      _ = r.toggleOpen,
      h = (function () {
        var e = wt(),
          t = Xn(
            e.reduce(function (e, t) {
              var n;
              return Object.assign({}, e, (((n = {})[t] = ""), n));
            }, {})
          ),
          n = t[0],
          r = t[1];
        return (
          Yn(function () {
            Promise.all(
              e.map(function (e) {
                return new Promise(function (t) {
                  return Gr(e, function (n) {
                    return t({ l: e, url: n });
                  });
                });
              })
            ).then(function (e) {
              return r(
                e.reduce(function (e, t) {
                  var n,
                    r = t.l,
                    o = t.url;
                  return Object.assign({}, e, (((n = {})[r] = o), n));
                }, {})
              );
            });
          }, []),
          n
        );
      })(),
      m = (function (e) {
        var t = e.is_responsive,
          n = e.display_device,
          r = e.pixel_cutoff,
          o = Xn(!t || to(n, r)),
          a = o[0],
          i = o[1],
          s = function () {
            return i(to(n, r));
          };
        return (
          Yn(
            function () {
              if (t)
                return (
                  window.addEventListener("resize", s),
                  function () {
                    window.removeEventListener("resize", s);
                  }
                );
            },
            [t, n, r]
          ),
          a
        );
      })(n);
    no({ style: t }, so, fo);
    var v = Ia.switcher_editor,
      y = t.is_dropdown,
      w = t.invert_flags,
      b = y || w,
      k = wt().filter(function (e) {
        return !b || e !== s;
      }),
      x =
        /background-position/i.test(Ia.button_style.custom_css) &&
        !Ia.languages.some(function (e) {
          return e.custom_flag;
        }),
      E = (function () {
        for (
          var e, t, n = arguments, r = 0, o = "", a = arguments.length;
          r < a;
          r++
        )
          (e = n[r]) && (t = In(e)) && (o && (o += " "), (o += t));
        return o;
      })({
        open: o,
        closed: !o,
        "wg-drop": y,
        "wg-list": !y,
        "weg-openup": a && o,
        "weg-openleft": i && o,
        "wg-editor": v,
      });
    return m
      ? dn(
          "aside",
          {
            ref: l,
            "data-wg-notranslate": !0,
            onKeyDown: g,
            onMouseEnter: f,
            onMouseLeave: d,
            className: "weglot_switcher country-selector default " + E,
            "aria-label": "Language selected: " + qr(s),
          },
          b &&
            dn(io, {
              styleOpts: t,
              open: o,
              focusedLanguage: c,
              language: s,
              isSelected: !0,
              onClick: _,
              legacyFlags: x,
              url: "#",
            }),
          dn(
            "ul",
            {
              role: "listbox",
              id: "weglot-listbox",
              style: !o && t.is_dropdown && { display: "none" },
            },
            k.map(function (e) {
              return dn(io, {
                language: e,
                url: e === s ? "#" : h[e],
                onClick: p,
                isSelected: e === s,
                focusedLanguage: c,
                key: "wg-" + e,
                focusRef: u,
                styleOpts: t,
                legacyFlags: x,
              });
            })
          )
        )
      : dn(pn, null);
  }, fo),
  po = 0,
  _o = [];
function ho(e, t) {
  if ((void 0 === t && (t = document.documentElement), e && !e.ready)) {
    var n = e.style || Ia.button_style,
      r = e.location;
    void 0 === r && (r = {});
    var o = (function (e, t) {
        void 0 === e && (e = {});
        var n = e.target,
          r = e.sibling;
        if (!n) return { defaultPosition: !0 };
        var o = pe(t, n);
        if (!o.length)
          return {
            error: Ee(n)
              ? "The provided target is not on this page."
              : "The provided target is not a valid CSS selector.",
          };
        var a = pe(t, r);
        if (!r || !a.length) return { targetNode: o[0], siblingNode: null };
        var i = Array.from(o),
          s = Array.from(a),
          c = null,
          l = s.find(function (e) {
            return (
              (c = i.find(function (t) {
                return e.parentNode === t;
              })),
              !!c
            );
          });
        return l && c
          ? { targetNode: c, siblingNode: l }
          : {
              error:
                "The provided sibling selector does not belong to target element.",
            };
      })(r, t),
      a = o.error,
      i = o.targetNode,
      s = o.siblingNode,
      c = o.defaultPosition;
    if (!a) {
      var l = go(Object.assign({}, e, !Ia.switcher_editor && { style: n }));
      if (((l.weglotSwitcher = e), _o.push(l), c))
        return (
          l.classList.add("wg-default"),
          document.body.appendChild(l),
          (e.ready = !0),
          l
        );
      l.setAttribute("data-switcher-id", String(++po)),
        (l.id = "weglot-switcher-" + po),
        l.setAttribute("data-switcher-style-opt", JSON.stringify(n)),
        i.insertBefore(l, s),
        (e.ready = !0);
      for (
        var u = 0, f = t.querySelectorAll(".weglot-container:empty");
        u < f.length;
        u += 1
      ) {
        ve(f[u]);
      }
      return l;
    }
    B.warn(a, { sendToDatadog: !1 });
  }
}
function mo(e) {
  var t = e.name,
    n = e.hash;
  if (
    (void 0 === n && (n = null),
    _e(document.documentElement, "script#weglot-switcher-" + t))
  )
    return !1;
  var r = !Ia.switcher_editor && n ? t + "." + n : t,
    o = document.getElementsByTagName("head")[0] || document.documentElement,
    a = document.createElement("script");
  return (
    (a.type = "text/javascript"),
    (a.src = "https://cdn.weglot.com/switchers/" + r + ".min.js"),
    (a.id = "weglot-switcher-" + t),
    o.insertBefore(a, o.firstChild),
    !0
  );
}
function vo() {
  co || Ie("switchersReady", Be()),
    (co = !0),
    clearTimeout(uo),
    lo && lo.parentNode.removeChild(lo);
}
function yo(e) {
  if (
    (void 0 === e && (e = document),
    !(wt().length < 2 || Ia.hide_switcher || Ia.switcher_editor))
  ) {
    var t = e.isConnected ? e : document;
    (function (e) {
      void 0 === e && (e = document.body);
      var t =
        (Ia.linkHooksConfig && Ia.linkHooksConfig.additionalCheckSelectors) ||
        [];
      if (
        0 ===
        pe(
          e,
          ['a[href^="#Weglot-"]', 'a[href*="change-language.weglot.com/"]']
            .concat(t)
            .join(",")
        ).length
      )
        return;
      for (var n = !1, r = 0, o = wt(); r < o.length; r += 1) {
        var a = o[r],
          i = pe(e, ba(a));
        if (0 !== i.length) {
          n = !0;
          for (var s = 0, c = i; s < c.length; s += 1) {
            ka(a, c[s]);
          }
        }
      }
      return (
        Pe(
          "languageChanged",
          function (e) {
            for (var t = 0, n = wa; t < n.length; t += 1) {
              var r = n[t],
                o = r.language,
                a = r.links;
              if (o === e)
                for (var i = 0, s = a; i < s.length; i += 1) {
                  var c = s[i];
                  c.classList.add("weglot-link--active"),
                    Ia.linkHooksConfig &&
                      Ia.linkHooksConfig.onLinkActive &&
                      Ia.linkHooksConfig.onLinkActive(c);
                }
              else
                for (var l = 0, u = a; l < u.length; l += 1) {
                  var f = u[l];
                  f.classList.remove("weglot-link--active"),
                    Ia.linkHooksConfig &&
                      Ia.linkHooksConfig.offLinkActive &&
                      Ia.linkHooksConfig.offLinkActive(f);
                }
            }
          },
          !0
        ),
        n
      );
    })(t) && vo();
    var n = t.querySelectorAll(
      "#weglot_here:not(.weglot-container),.weglot_here:not(.weglot-container)"
    );
    if (n.length) {
      for (var r = 0, o = n; r < o.length; r += 1) {
        var a = o[r],
          i = go({ style: Ia.button_style });
        i.classList.add("weglot_here"),
          a.parentNode.insertBefore(i, a),
          ve(a);
      }
      vo();
    }
    for (var s = 0, c = Ia.switchers; s < c.length; s += 1) {
      var l = c[s];
      if (!l.default) {
        var u = l.template;
        if (u) {
          if (u.name) {
            if (!mo(u)) {
              var f =
                window.Weglot.switchers && window.Weglot.switchers[u.name];
              f && f.addSwitchers(t);
            }
            vo();
          }
        } else ho(l, t) && vo();
      }
    }
    if (!co && !lo) {
      var d = Ia.switchers.find(function (e) {
        return e.default;
      }) || { style: Ia.button_style };
      uo = setTimeout(function () {
        (lo = ho(d)), Ie("switchersReady", Be());
      });
    }
  }
}
Pe(
  "onCurrentLocationChanged",
  function () {
    _o.forEach(function (e) {
      return e.parentNode && e.parentNode.removeChild(e);
    }),
      _o.splice(0),
      (function () {
        for (
          var e = window.Weglot.switchers || {}, t = 0, n = Object.keys(e);
          t < n.length;
          t += 1
        )
          e[n[t]].removeSwitchers();
      })(),
      (co = null),
      (lo = null),
      (po = 0),
      (Ia.button_style.ready = !1),
      Ia.switchers.map(function (e) {
        return (e.ready = !1);
      }),
      yo();
  },
  !0
);
var wo = 0;
function bo() {
  var e = ["name", "value"];
  Ia.translate_event.forEach(function (t) {
    for (
      var n = pe(document.body, t.selector),
        r = function () {
          var n = a[o];
          if (n.alreadyListeningEventInput)
            return (
              !n.alreadyListeningEventInput.isConnected &&
                wo < 10 &&
                (wo++,
                n.parentNode.insertBefore(
                  n.alreadyListeningEventInput,
                  n.nextSibling
                )),
              {}
            );
          var r = n.cloneNode(!0);
          if (!r) return {};
          (r.name = ""),
            (n.alreadyListeningEventInput = r),
            n.parentNode.insertBefore(r, n.nextSibling),
            (n.style.display = "none"),
            new MutationObserver(function (t) {
              for (var o = 0, a = t; o < a.length; o += 1) {
                var i = a[o],
                  s = n.getAttribute(i.attributeName);
                e.includes(i.attributeName) &&
                  r.setAttribute(i.attributeName, s);
              }
            }).observe(n, { attributes: !0 });
          var i = Se(function (e) {
            13 === e.keyCode && e.target.form
              ? e.target.form.dispatchEvent(new Event("submit"))
              : Gt(e.target.value, function (e) {
                  Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                  ).set.call(n, e);
                  var r =
                      t.eventName ||
                      n.getAttribute("data-wg-translate-event"),
                    o = document.createEvent("HTMLEvents");
                  o.initEvent("focus", !0, !1),
                    n.dispatchEvent(o),
                    o.initEvent(r, !0, !1),
                    n.dispatchEvent(o);
                });
          }, 400);
          r.addEventListener("keydown", i);
        },
        o = 0,
        a = n;
      o < a.length;
      o += 1
    ) {
      var i = r();
      if (i) return i.v;
    }
  });
}
try {
  var ko = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (e) {
    var t = ko.call(this, e);
    return xo([this]), t;
  };
} catch (Kn) {}
function xo(e) {
  if (Ia.translate_shadow_roots) {
    e ||
      (e = pe(
        document,
        Ia.dynamics
          .map(function (e) {
            return e.value;
          })
          .join(",")
      ));
    for (var t = 0, n = e; t < n.length; t += 1) {
      var r = n[t];
      if (r.shadowRoot && !r.shadowRoot.wgTranslated) {
        (r.shadowRoot.wgTranslated = !0), Ro(r.shadowRoot);
        var o = Ft(r.shadowRoot);
        o.length && (Wt(o), Do(o));
      }
    }
  }
}
var Eo,
  Co = null,
  Oo = [],
  So = [X, "class", "id"],
  Lo = [],
  No = [];
function To(e, t) {
  Eo && clearTimeout(Eo);
  for (var n = 0, r = t; n < r.length; n += 1) {
    var o = r[n];
    1 === o.nodeType && Oo.push(o);
  }
  Oo.length &&
    (Eo = setTimeout(function () {
      yo(e),
        bo(),
        Ia.subdomain &&
          (function (e) {
            var t = window.location.hostname;
            if (-1 !== [Ia.host].concat(l).indexOf(t)) return;
            for (var n = 0, r = e; n < r.length; n += 1)
              for (
                var o = r[n], a = 0, i = pe(o, "[href]");
                a < i.length;
                a += 1
              ) {
                var s = i[a];
                if (!v(s)) {
                  var c = s.getAttribute("href");
                  c &&
                    c.includes("//" + Ia.host) &&
                    s.setAttribute("href", c.replace(Ia.host, t));
                }
              }
          })(Oo),
        Ia.proxify_iframes &&
          Ia.proxify_iframes.length &&
          Oo.forEach(function (e) {
            return Xt({ node: e });
          }),
        xo(Oo),
        je("onDynamicDetected"),
        (Oo = []);
    }, 100));
}
function jo(e, t) {
  var n = Ia.dynamics,
    r = Po;
  t !== document
    ? (r = function () {
        return !0;
      })
    : (n && 0 !== n.length) ||
      (r = function () {
        return !1;
      });
  try {
    if (yt()) return;
    if (
      ((e = (function (e, t) {
        var n = [],
          r = e.filter(function (e) {
            var r = e.addedNodes,
              o = e.type,
              a = e.target;
            "attributes" === o &&
              (function (e) {
                "IMG" === e.nodeName &&
                  e.srcset &&
                  e.dataset.wgtranslated &&
                  (e.setAttribute("wgsrcset", e.srcset), (e.srcset = ""));
              })(a);
            var i = (function (e) {
              do {
                if (e.weglot && e.weglot.setted) return e;
                e = e.parentElement || e.parentNode;
              } while (e);
            })(a);
            return i
              ? (n.push(i), !1)
              : r.length
              ? (setTimeout(function () {
                  return To(a, r);
                }),
                !Co || !a || !he(a, Co))
              : !So.includes(e.attributeName) &&
                t(a) &&
                ("characterData" === o || "attributes" === o);
          });
        if (n.length)
          for (var o = 0, a = n; o < a.length; o += 1) {
            a[o].weglot.setted = !1;
          }
        return r;
      })(e, r)),
      !n || 0 === n.length)
    )
      return;
    if (e.length)
      try {
        !(function (e, t, n) {
          void 0 === n && (n = !0);
          for (
            var r = [],
              o = function (e) {
                var n = e.outerHTML || e.textContent;
                if (e.wgParsedHTML !== n) {
                  e.wgParsedHTML = n;
                  for (
                    var o = Ft(e, function (e) {
                        var n = e.element;
                        return (
                          !(function (e) {
                            return e.weglot && e.weglot.dynamic > 20;
                          })(n) && t(n)
                        );
                      }),
                      a = 0,
                      i = o;
                    a < i.length;
                    a += 1
                  ) {
                    var s = i[a];
                    (Ia.ignoreDynamicFragments &&
                      !document.body.contains(s)) ||
                      (s.weglot.dynamic || (s.weglot.dynamic = 0),
                      s.weglot.dynamic++,
                      r.push(s));
                  }
                  return null;
                }
              },
              a = [],
              i = 0,
              s = e;
            i < s.length;
            i += 1
          ) {
            var c = s[i],
              l = c.type,
              u = c.target,
              f = c.addedNodes;
            switch (l) {
              case "attributes":
              case "characterData":
                if (a.includes(u)) break;
                a.push(u), o(u);
                break;
              case "childList":
                var d = f.length > 1 ? u : f[0];
                if (a.includes(d)) break;
                if ((o(d), a.push(d), !n)) break;
                for (var g = 0, p = f; g < p.length; g += 1) {
                  var _ = p[g],
                    h = [];
                  "IFRAME" === _.tagName
                    ? (h = [_])
                    : _.querySelectorAll &&
                      (h = _.querySelectorAll("iframe"));
                  for (var m = 0; m < h.length; m++) {
                    var y = h[m];
                    t(y) &&
                      Le(y) &&
                      !v(y) &&
                      (o(y.contentWindow.document),
                      Ro(y.contentWindow.document));
                  }
                }
            }
          }
          r.length && (Wt(r), Do(r));
        })(e, r);
      } catch (e) {
        B.warn(e);
      }
  } catch (e) {
    B.warn(e, { consoleOverride: "Error in MutationObserver" });
  }
}
var Ao = !1;
function Ro(e) {
  var t = e !== document ? e : e.body || e,
    n = new MutationObserver(function (t) {
      var n;
      if (Ao) jo(t, e);
      else {
        var r = Lo.find(function (t) {
          return t.documentElement === e;
        });
        r
          ? (n = r.mutations).push.apply(n, t)
          : Lo.push({ documentElement: e, mutations: [].concat(t) });
      }
    });
  n.observe(t, {
    childList: !0,
    subtree: !0,
    characterData: !0,
    attributes: !0,
  }),
    No.push(n);
}
function Po(e) {
  return (
    !(!Ia.dynamics || 0 === Ia.dynamics.length) &&
    ((e && e.closest) || (e = e.parentNode),
    e &&
      e.closest &&
      he(
        e,
        Ia.dynamics
          .map(function (e) {
            return e.value;
          })
          .join(", ")
      ))
  );
}
var Io = { times: [], timeout: null, nodes: [] };
function Do(e) {
  void 0 === e && (e = []), clearTimeout(Io.timeout);
  var t = Be();
  if (t !== Ia.language_from) {
    if (
      ((Io.times = Io.times.filter(function (e) {
        return e > Date.now() - 1e3;
      })),
      Io.times.length && (Io.timeout || Io.times.length >= 10))
    )
      return (
        (Io.nodes = Io.nodes.concat(e)),
        void (Io.timeout = setTimeout(function () {
          return Do();
        }, 1e3))
      );
    (Io.timeout = null), Io.times.push(Date.now());
    var n = Io.nodes.concat(e);
    return (
      (Io.nodes = []),
      Vt(Ht(n), t, { title: !1, cdn: !0, nodes: n }).then(function (e) {
        return Mt(e, t, n);
      })
    );
  }
}
var Fo = [
  { codes: ["no"], pattern: /^(nn|nb)(-[a-z]+)?$/i },
  { codes: ["zh"], pattern: /^zh(-hans(-\w{2})?)?(-(cn|sg))?$/i },
  { codes: ["tw", "zh-TW"], pattern: /^zh-(hant)?-?(tw|hk|mo)?$/i },
  { codes: ["br"], pattern: /^pt-br$/i },
  { codes: ["fl"], pattern: /^fil$/i },
];
function Uo(e) {
  void 0 === e && (e = wt());
  for (var t = {}, n = {}, r = 0, o = e; r < o.length; r += 1) {
    var a = o[r],
      i = a.toLowerCase(),
      s = i.substring(0, 2);
    t[s] || (t[s] = []), t[s].push(i), (n[i] = a);
  }
  for (
    var c = 0, l = navigator.languages || [navigator.language];
    c < l.length;
    c += 1
  ) {
    var u = l[c],
      f = u.toLowerCase(),
      d = f.substring(0, 2);
    if (n[f]) return n[f];
    for (var g = 0, p = Fo; g < p.length; g += 1) {
      var _ = p[g],
        h = _.codes,
        m = _.pattern,
        v = h.find(function (t) {
          return e.includes(t);
        });
      if (v && m.test(u)) return v;
    }
    if (t[d]) {
      if ("zh" === d) continue;
      var y = t[d].indexOf(d);
      return y >= 0 ? n[t[d][y]] : n[t[d].shift()];
    }
  }
}
function Wo() {
  if (window.location.search.indexOf("no_redirect=true") > -1) Ho(Be());
  else if (
    !(
      !Ia.auto_switch ||
      (Ia.subdirectory && Ia.injectedData) ||
      Je({ type: "cookie" }).getItem("WG_CHOOSE_ORIGINAL") ||
      xe() ||
      Ia.visual_editor
    )
  ) {
    var e = Uo();
    return e && !yt(e)
      ? e
      : Ia.auto_switch_fallback && !yt(Ia.auto_switch_fallback)
      ? Ia.auto_switch_fallback
      : void 0;
  }
}
function Ho(e) {
  if (e === Ia.language_from) {
    var t = new Date();
    t.setTime(t.getTime() + 2592e6),
      Je({ type: "cookie" }).setItem("WG_CHOOSE_ORIGINAL", "1", {
        expires: t.toUTCString(),
      });
  } else Je({ type: "cookie" }).removeItem("WG_CHOOSE_ORIGINAL");
}
function Mo() {
  ve(me(J));
}
function qo() {
  var e = me("wg_progress").firstElementChild,
    t = e.getAttribute("aria-valuenow"),
    n = parseInt(t) + (4 * Math.random() + 2);
  n <= 100 &&
    (e.setAttribute("aria-valuenow", n.toString()),
    (e.style.width = n + "%"));
}
function zo(e) {
  clearInterval(e), ve(me("wg_progress"));
}
var Bo = function (e, t) {
    return Array.prototype.slice.call(e, t);
  },
  $o = null;
"undefined" != typeof WorkerGlobalScope && self instanceof WorkerGlobalScope
  ? ($o = self)
  : "undefined" != typeof global
  ? ($o = global)
  : window && ($o = window);
var Vo = $o,
  Go = $o.document,
  Jo = ["load", "loadend", "loadstart"],
  Xo = ["progress", "abort", "error", "timeout"],
  Yo = function (e) {
    return ["returnValue", "totalSize", "position"].includes(e);
  },
  Ko = function (e, t) {
    for (var n in e)
      if (!Yo(n)) {
        var r = e[n];
        try {
          t[n] = r;
        } catch (e) {}
      }
    return t;
  },
  Zo = function (e, t, n) {
    for (
      var r = function (e) {
          return function (r) {
            var o = {};
            for (var a in r)
              if (!Yo(a)) {
                var i = r[a];
                o[a] = i === t ? n : i;
              }
            return n.dispatchEvent(e, o);
          };
        },
        o = 0,
        a = Array.from(e);
      o < a.length;
      o += 1
    ) {
      var i = a[o];
      n._has(i) && (t["on" + i] = r(i));
    }
  },
  Qo = function (e) {
    if (Go && null != Go.createEventObject) {
      var t = Go.createEventObject();
      return (t.type = e), t;
    }
    try {
      return new Event(e);
    } catch (t) {
      return { type: e };
    }
  },
  ea = function (e) {
    var t = {},
      n = function (e) {
        return t[e] || [];
      },
      r = {
        addEventListener: function (e, r, o) {
          (t[e] = n(e)),
            t[e].indexOf(r) >= 0 ||
              ((o = void 0 === o ? t[e].length : o), t[e].splice(o, 0, r));
        },
        removeEventListener: function (e, r) {
          if (void 0 !== e) {
            void 0 === r && (t[e] = []);
            var o = n(e).indexOf(r);
            -1 !== o && n(e).splice(o, 1);
          } else t = {};
        },
        dispatchEvent: function () {
          var t = Bo(arguments),
            o = t.shift();
          e ||
            ((t[0] = Ko(t[0], Qo(o))),
            Object.defineProperty(t[0], "target", {
              writable: !1,
              value: this,
            }));
          var a = r["on" + o];
          a && a.apply(r, t);
          for (var i = n(o).concat(n("*")), s = 0; s < i.length; s++) {
            var c = i[s];
            c.apply(r, t);
          }
        },
        _has: function (e) {
          return !(!t[e] && !r["on" + e]);
        },
      };
    return (
      e &&
        ((r.listeners = function (e) {
          return Bo(n(e));
        }),
        (r.on = r.addEventListener),
        (r.off = r.removeEventListener),
        (r.fire = r.dispatchEvent),
        (r.once = function (e, t) {
          var n = function () {
            return r.off(e, n), t.apply(null, arguments);
          };
          return r.on(e, n);
        }),
        (r.destroy = function () {
          return (t = {});
        })),
      r
    );
  },
  ta = function (e, t) {
    switch (typeof e) {
      case "object":
        return (
          (n = e),
          Object.entries(n)
            .map(function (e) {
              var t = e[0],
                n = e[1];
              return t.toLowerCase() + ": " + n;
            })
            .join("\r\n")
        );
      case "string":
        return (function (e, t) {
          null == t && (t = {});
          for (var n = 0, r = e.split("\r\n"); n < r.length; n += 1) {
            var o = r[n];
            if (/([^:]+):\s*(.+)/.test(o)) {
              var a = null != RegExp.$1 ? RegExp.$1.toLowerCase() : void 0,
                i = RegExp.$2;
              null == t[a] && (t[a] = i);
            }
          }
          return t;
        })(e, t);
    }
    var n;
    return [];
  },
  na = ea(!0),
  ra = function (e) {
    return void 0 === e ? null : e;
  },
  oa = Vo.XMLHttpRequest,
  aa = function () {
    var e = new oa(),
      t = {},
      n = null,
      r = void 0,
      o = void 0,
      a = void 0,
      i = 0,
      s = function () {
        if (
          ((a.status = n || e.status),
          -1 !== n && (a.statusText = e.statusText),
          -1 === n)
        );
        else {
          var t = ta(e.getAllResponseHeaders());
          for (var r in t) {
            var o = t[r];
            if (!a.headers[r]) {
              var i = r.toLowerCase();
              a.headers[i] = o;
            }
          }
        }
      },
      c = function () {
        (d.status = a.status), (d.statusText = a.statusText);
      },
      l = function () {
        r || d.dispatchEvent("load", {}),
          d.dispatchEvent("loadend", {}),
          r && (d.readyState = 0);
      },
      u = function (e) {
        for (; e > i && i < 4; )
          (d.readyState = ++i),
            1 === i && d.dispatchEvent("loadstart", {}),
            2 === i && c(),
            4 === i &&
              (c(),
              "text" in a && (d.responseText = a.text),
              "xml" in a && (d.responseXML = a.xml),
              "data" in a && (d.response = a.data),
              "finalUrl" in a && (d.responseURL = a.finalUrl)),
            d.dispatchEvent("readystatechange", {}),
            4 === i && (!1 === t.async ? l() : setTimeout(l, 0));
      },
      f = function (e) {
        if (4 === e) {
          var n = na.listeners("after"),
            r = function () {
              if (n.length > 0) {
                var e = n.shift();
                2 === e.length
                  ? (e(t, a), r())
                  : 3 === e.length && t.async
                  ? e(t, a, r)
                  : r();
              } else u(4);
            };
          r();
        } else u(e);
      },
      d = ea();
    (t.xhr = d),
      (e.onreadystatechange = function (t) {
        try {
          2 === e.readyState && s();
        } catch (e) {}
        4 === e.readyState &&
          ((o = !1),
          s(),
          (function () {
            if (e.responseType && "text" !== e.responseType)
              "document" === e.responseType
                ? ((a.xml = e.responseXML), (a.data = e.responseXML))
                : (a.data = e.response);
            else {
              (a.text = e.responseText), (a.data = e.responseText);
              try {
                a.xml = e.responseXML;
              } catch (e) {}
            }
            "responseURL" in e && (a.finalUrl = e.responseURL);
          })()),
          f(e.readyState);
      });
    var g = function () {
      r = !0;
    };
    d.addEventListener("error", g),
      d.addEventListener("timeout", g),
      d.addEventListener("abort", g),
      d.addEventListener("progress", function (t) {
        i < 3
          ? f(3)
          : e.readyState <= 3 && d.dispatchEvent("readystatechange", {});
      }),
      "withCredentials" in e && (d.withCredentials = !1),
      (d.status = 0);
    for (var p = 0, _ = Array.from(Xo.concat(Jo)); p < _.length; p += 1) {
      var h = _[p];
      d["on" + h] = null;
    }
    if (
      ((d.open = function (e, n, s, c, l) {
        (i = 0),
          (r = !1),
          (o = !1),
          (t.headers = {}),
          (t.headerNames = {}),
          (t.status = 0),
          (t.method = e),
          (t.url = n),
          (t.async = !1 !== s),
          (t.user = c),
          (t.pass = l),
          ((a = {}).headers = {}),
          f(1);
      }),
      (d.send = function (n) {
        for (
          var r, i, s = 0, c = ["type", "timeout", "withCredentials"];
          s < c.length;
          s += 1
        )
          (i = "type" === (r = c[s]) ? "responseType" : r) in d &&
            (t[r] = d[i]);
        t.body = n;
        var l = na.listeners("before"),
          u = function () {
            if (!l.length)
              return (function () {
                Zo(Xo, e, d),
                  d.upload && Zo(Xo.concat(Jo), e.upload, d.upload),
                  (o = !0),
                  e.open(t.method, t.url, t.async, t.user, t.pass);
                for (
                  var n = 0, a = ["type", "timeout", "withCredentials"];
                  n < a.length;
                  n += 1
                )
                  (i = "type" === (r = a[n]) ? "responseType" : r),
                    r in t && (e[i] = t[r]);
                for (var s in t.headers) {
                  var c = t.headers[s];
                  s && e.setRequestHeader(s, c);
                }
                e.send(t.body);
              })();
            var n = function (e) {
              if (
                "object" == typeof e &&
                ("number" == typeof e.status || "number" == typeof a.status)
              )
                return (
                  Ko(e, a),
                  "data" in e || (e.data = e.response || e.text),
                  void f(4)
                );
              u();
            };
            (n.head = function (e) {
              Ko(e, a), f(2);
            }),
              (n.progress = function (e) {
                Ko(e, a), f(3);
              });
            var s = l.shift();
            1 === s.length
              ? n(s(t))
              : 2 === s.length && t.async
              ? s(t, n)
              : n();
          };
        u();
      }),
      (d.abort = function () {
        (n = -1), o ? e.abort() : d.dispatchEvent("abort", {});
      }),
      (d.setRequestHeader = function (e, n) {
        var r = null != e ? e.toLowerCase() : void 0,
          o = (t.headerNames[r] = t.headerNames[r] || e);
        t.headers[o] && (n = t.headers[o] + ", " + n), (t.headers[o] = n);
      }),
      (d.getResponseHeader = function (e) {
        return ra(a.headers[e ? e.toLowerCase() : void 0]);
      }),
      (d.getAllResponseHeaders = function () {
        return ra(ta(a.headers));
      }),
      e.overrideMimeType &&
        (d.overrideMimeType = function () {
          e.overrideMimeType.apply(e, arguments);
        }),
      e.upload)
    ) {
      var m = ea();
      (d.upload = m), (t.upload = m);
    }
    return (
      (d.UNSENT = 0),
      (d.OPENED = 1),
      (d.HEADERS_RECEIVED = 2),
      (d.LOADING = 3),
      (d.DONE = 4),
      (d.response = ""),
      (d.responseText = ""),
      (d.responseXML = null),
      (d.readyState = 0),
      (d.statusText = ""),
      d
    );
  };
(aa.UNSENT = 0),
  (aa.OPENED = 1),
  (aa.HEADERS_RECEIVED = 2),
  (aa.LOADING = 3),
  (aa.DONE = 4);
var ia = {
  patch: function () {
    oa && (Vo.XMLHttpRequest = aa);
  },
  unpatch: function () {
    oa && (Vo.XMLHttpRequest = oa);
  },
  Native: oa,
  Xhook: aa,
};
function sa(e, t, n, r) {
  return new (n || (n = Promise))(function (t, o) {
    function a(e) {
      try {
        s(r.next(e));
      } catch (e) {
        o(e);
      }
    }
    function i(e) {
      try {
        s(r.throw(e));
      } catch (e) {
        o(e);
      }
    }
    function s(e) {
      var r;
      e.done
        ? t(e.value)
        : ((r = e.value),
          r instanceof n
            ? r
            : new n(function (e) {
                e(r);
              })).then(a, i);
    }
    s((r = r.apply(e, [])).next());
  });
}
var ca = Vo.fetch;
function la(e) {
  return e instanceof Headers
    ? ua([].concat(e.entries()))
    : Array.isArray(e)
    ? ua(e)
    : e;
}
function ua(e) {
  return e.reduce(function (e, t) {
    var n = t[0],
      r = t[1];
    return (e[n] = r), e;
  }, {});
}
var fa = function (e, t) {
    void 0 === t && (t = { headers: {} });
    var n,
      r,
      o = Object.assign(Object.assign({}, t), { isFetch: !0 });
    if (e instanceof Request) {
      var a =
          ((n = e),
          (r = {}),
          [
            "method",
            "headers",
            "body",
            "mode",
            "credentials",
            "cache",
            "redirect",
            "referrer",
            "referrerPolicy",
            "integrity",
            "keepalive",
            "signal",
            "url",
          ].forEach(function (e) {
            return (r[e] = n[e]);
          }),
          r),
        i = Object.assign(Object.assign({}, la(a.headers)), la(o.headers));
      o = Object.assign(Object.assign(Object.assign({}, a), t), {
        headers: i,
        acceptedRequest: !0,
      });
    } else o.url = e;
    var s = na.listeners("before"),
      c = na.listeners("after");
    return new Promise(function (t, n) {
      var r = this,
        a = t,
        i = function (e) {
          if (!c.length) return a(e);
          var t = c.shift();
          return 2 === t.length
            ? (t(o, e), i(e))
            : 3 === t.length
            ? t(o, e, i)
            : i(e);
        },
        l = function (e) {
          if (void 0 !== e) {
            var n = new Response(e.body || e.text, e);
            return t(n), void i(n);
          }
          u();
        },
        u = function () {
          if (s.length) {
            var e = s.shift();
            return 1 === e.length
              ? l(e(o))
              : 2 === e.length
              ? e(o, l)
              : void 0;
          }
          f();
        },
        f = function () {
          return sa(r, 0, void 0, function* () {
            var t = o.url;
            o.isFetch, o.acceptedRequest;
            var r = (function (e, t) {
              var n = {};
              for (var r in e)
                Object.prototype.hasOwnProperty.call(e, r) &&
                  t.indexOf(r) < 0 &&
                  (n[r] = e[r]);
              if (
                null != e &&
                "function" == typeof Object.getOwnPropertySymbols
              ) {
                var o = 0;
                for (r = Object.getOwnPropertySymbols(e); o < r.length; o++)
                  t.indexOf(r[o]) < 0 &&
                    Object.prototype.propertyIsEnumerable.call(e, r[o]) &&
                    (n[r[o]] = e[r[o]]);
              }
              return n;
            })(o, ["url", "isFetch", "acceptedRequest"]);
            return (
              e instanceof Request &&
                r.body instanceof ReadableStream &&
                (r.body = yield new Response(r.body).text()),
              ca(t, r)
                .then(function (e) {
                  return i(e);
                })
                .catch(function (e) {
                  return (a = n), i(e), n(e);
                })
            );
          });
        };
      u();
    });
  },
  da = {
    patch: function () {
      ca && (Vo.fetch = fa);
    },
    unpatch: function () {
      ca && (Vo.fetch = ca);
    },
    Native: ca,
    Xhook: fa,
  },
  ga = na;
function pa(e, t) {
  var n = Ia.xhr_hooks,
    r = Ia.language_from,
    o = Be();
  if (r === o || yt()) t();
  else {
    var a = e.url,
      i = n.filter(_a).find(function (e) {
        return (
          (t = a),
          !(!(n = e.url_wildcard) || "*" === n) &&
            new RegExp(
              "^" + n.replace(/\?/g, ".").replace(/\*/g, ".*") + "$"
            ).test(t)
        );
        var t, n;
      });
    if (i)
      return "proxify" === i.action
        ? ((e.url = (function (e, t) {
            var n = Ia.language_from;
            return (
              "https://proxy.weglot.com/" +
              Ia.api_key +
              "/" +
              n +
              "/" +
              t +
              "/" +
              ("/" === e.slice(0, 1) && "//" !== e.slice(0, 2)
                ? "" + window.location.hostname + e
                : e
              ).replace(/^(https?:)?\/\//, "")
            );
          })(a, o)),
          void t())
        : void (function (e, t, n) {
            var r = n.target_source,
              o = n.target_key,
              a = n.action,
              i = e.url,
              s = e.body;
            function c(e, t) {
              "reverse_translate" === a && Gt(e, t),
                "reverse_handle_path" === a &&
                  t(Me().convertLocale(Ia.language_from, e));
            }
            switch (r) {
              case "url_query":
                try {
                  var l = new de(i, "https://" + window.location.hostname),
                    u = l.searchParams.get(o);
                  if (!u) return void t();
                  c(u, function (n) {
                    l.searchParams.set(o, n), (e.url = l.toString()), t();
                  });
                } catch (e) {
                  t();
                }
                break;
              case "url":
                try {
                  var f = new RegExp(o),
                    d = i.match(f),
                    g = d && d[1];
                  if (!g) return void t();
                  var p = !1,
                    _ = g;
                  try {
                    (_ = decodeURIComponent(g)) !== g && (p = !0);
                  } catch (e) {}
                  c(_, function (n) {
                    var r = p ? encodeURIComponent(n) : n;
                    (e.url = i.replace(g, r)), t();
                  });
                } catch (e) {
                  t();
                }
                break;
              case "form_data_payload":
                try {
                  var h = s.get(o);
                  if (!h) return void t();
                  c(h, function (n) {
                    e.body.set(o, n), t();
                  });
                } catch (e) {
                  t();
                }
                break;
              case "json_payload":
                try {
                  var m = JSON.parse(s)[o];
                  if (!m) return void t();
                  c(m, function (n) {
                    var r;
                    (e.body = JSON.stringify(
                      Object.assign({}, JSON.parse(s), (((r = {})[o] = n), r))
                    )),
                      t();
                  });
                } catch (e) {
                  t();
                }
                break;
              default:
                t();
            }
          })(e, t, i);
    t();
  }
}
function _a(e) {
  if (!e) return !1;
  var t = e.url_wildcard,
    n = e.action,
    r = e.target_source,
    o = e.target_key;
  return (
    !!t &&
    ("proxify" === n
      ? "url" === r
      : !!["reverse_translate", "reverse_handle_path"].some(function (e) {
          return e === n;
        }) &&
        r &&
        o)
  );
}
function ha(e, t, n) {
  if (n || !e || window.top !== window || !ya(e)) {
    var r = [];
    try {
      Wt((r = Ft()));
    } catch (e) {
      B.warn(e);
    }
    var o,
      a,
      i = yt();
    if (
      (e && t && !i && kt(e),
      !Ia.is_connect || Ia.dynamicPushState || (!i && e !== Ia.language_from)
        ? (function (e) {
            void 0 === e && (e = !0);
            var t = Ia.excluded_blocks,
              n = Ia.is_connect;
            if ((Ao = e))
              if (
                ((Co =
                  t &&
                  t.length &&
                  t
                    .map(function (e) {
                      return e.value;
                    })
                    .join(",")),
                n && Lo.length > 0)
              )
                for (
                  var r = function () {
                      var e = a[o],
                        t = e.mutations,
                        n = e.documentElement,
                        r = function () {
                          var e = t.splice(0, 100);
                          e.length > 0 && (jo(e, n), setTimeout(r, 0));
                        };
                      r();
                    },
                    o = 0,
                    a = Lo;
                  o < a.length;
                  o += 1
                )
                  r();
              else Lo = [];
          })()
        : (function () {
            if (0 !== No.length) {
              for (var e = 0, t = No; e < t.length; e += 1) t[e].disconnect();
              Lo = [];
            }
          })(),
      (o = Ia.xhr_hooks),
      (a = Ia.is_connect),
      !(o && Array.isArray(o) && o.some(_a)) ||
        (a && yt()) ||
        (ga.enable(), ga.before(pa)),
      n || i)
    )
      va(e);
    else if (
      (Ia.is_connect && !i && je("onConnectPageLoad", e),
      Ia.force_translation)
    ) {
      for (var s = [], c = 0, l = r; c < l.length; c += 1) {
        var u = l[c];
        ((u.closest && u.closest(Ia.force_translation)) ||
          (!u.closest &&
            u.parentNode &&
            u.parentNode.closest &&
            u.parentNode.closest(Ia.force_translation))) &&
          s.push(u);
      }
      Do(s);
    }
    (i && !i.language_button_displayed && i.allExcluded) || yo(),
      i ||
        (Ia.remove_unused_link_hooks &&
          (function () {
            var e = wt(),
              t = Ia.languages
                .map(function (e) {
                  return e.custom_code || e.language_to;
                })
                .filter(function (t) {
                  return !e.includes(t);
                });
            1 === e.length && t.push(Ia.language_from);
            for (
              var n = t
                  .map(function (e) {
                    return ba(e);
                  })
                  .join(","),
                r = pe(document, n),
                o = 0,
                a = r;
              o < a.length;
              o += 1
            ) {
              ve(a[o]);
            }
          })(),
        xo(),
        bo(),
        (function () {
          window.addEventListener("message", Kt, !1);
          var e = Ia.translate_iframes;
          if (e)
            for (var t = 0, n = pe(document.body, e); t < n.length; t += 1) {
              var r = n[t];
              r.contentWindow && Jt.push(r.contentWindow);
            }
          Xt({}),
            Te("onPageLanguageSet", Yt),
            "with-window-top" === be() &&
              window.top.postMessage({ message: "Weglot.iframe" }, "*");
        })(),
        ["alert"].forEach(function (e) {
          var t = window[e];
          window[e] = function () {
            var e = arguments;
            if ("string" == typeof arguments[0]) {
              var n = Be();
              return Ia.language_from === n
                ? t.apply(window, arguments)
                : Vt([{ t: 2, w: arguments[0] }], n, {
                    title: !1,
                    cdn: !0,
                  }).then(function (n) {
                    return (e[0] = n.to_words[0]), t.apply(window, e);
                  });
            }
          };
        })),
      Ie("initialized", e);
  }
}
function ma(e) {
  var t = Be();
  e !== t &&
    (Ia.visual_editor
      ? rt(e, function (n) {
          if ("#" === n) return va(e, t);
          window.dispatchEvent(
            new CustomEvent("veLanguageChangeUrl", {
              detail: { targetUrl: n },
            })
          );
        })
      : va(e, t));
}
function va(e, t) {
  if (!wt().includes(e))
    return (
      Mo(),
      void B.warn(e + " isn't a language you have added", {
        sendToDatadog: !1,
      })
    );
  Ia.auto_switch && Ho(e);
  var n = yt();
  if ((Ia.is_connect || n || kt(e), !ya(e))) {
    if (Ia.loading_bar)
      var r = (function () {
        try {
          var e = document.createElement("div");
          return (
            (e.className = "wg-progress"),
            (e.id = "wg_progress"),
            (e.innerHTML =
              '<div class="wg-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0"></div>'),
            document.body.appendChild(e),
            setInterval(qo, 100)
          );
        } catch (e) {}
      })();
    if (
      ((function (e) {
        var t = we("lang");
        if (t && t !== e) {
          var n = window.location.search.replace("lang=" + t, "lang=" + e);
          try {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + n
            );
          } catch (e) {}
        }
        Ue = e;
      })(e),
      yt())
    )
      return Mo(), void zo(r);
    if (e === Ia.language_from)
      return (
        je("onPageLanguageSet", e),
        Mo(),
        Mt(null, e),
        Ia.loading_bar && zo(r),
        document.documentElement.setAttribute("lang", e),
        void Ie("languageChanged", e, t || "")
      );
    Vt(Ht(), e)
      .then(function (n) {
        Mo(),
          Mt(n, e),
          document.documentElement.setAttribute("lang", e),
          Ie("languageChanged", e, t || ""),
          Ia.loading_bar && zo(r);
      })
      .catch(function (e) {
        throw (Ia.loading_bar && zo(r), Mo(), Je().removeItem(G), e);
      }),
      je("onPageLanguageSet", e);
  }
}
function ya(e) {
  return (
    !(!Ia.is_connect || Be() === e) &&
    (!Ia.host ||
    (Ia.previewHash && window.location.hostname.includes(V)) ||
    (function () {
      if (Ia.subdirectory) return [Ia.host].concat(l);
      return Ia.languages
        .map(function (e) {
          return (
            e.connect_host_destination && e.connect_host_destination.host
          );
        })
        .concat([Ia.host].concat(l));
    })().includes(window.location.hostname)
      ? (rt(e, function (e) {
          return window.location.replace(e);
        }),
        !0)
      : (be() ||
          B.warn(
            '"' +
              window.location.hostname +
              '" is not configured with Weglot. Please contact support@weglot.com',
            { sendToDatadog: !1 }
          ),
        !1))
  );
}
(ga.EventEmitter = ea),
  (ga.before = function (e, t) {
    if (e.length < 1 || e.length > 2) throw "invalid hook";
    return ga.on("before", e, t);
  }),
  (ga.after = function (e, t) {
    if (e.length < 2 || e.length > 3) throw "invalid hook";
    return ga.on("after", e, t);
  }),
  (ga.enable = function () {
    ia.patch(), da.patch();
  }),
  (ga.disable = function () {
    ia.unpatch(), da.unpatch();
  }),
  (ga.XMLHttpRequest = ia.Native),
  (ga.fetch = da.Native),
  (ga.headers = ta),
  ga.enable(),
  ga.disable(),
  Pe(
    "initialized",
    function () {
      Ia.translate_search &&
        !Ia.switcher_editor &&
        (function () {
          var e = Ia.search_forms,
            t = Ia.search_parameter;
          if (t) {
            for (var n = 0, r = pe(document, e); n < r.length; n += 1) {
              var o = r[n];
              o.addEventListener("submit", function (e) {
                e.preventDefault();
                var n = e.target.elements[t].value;
                Gt(n, function (e) {
                  z.set({ name: "wg-search-form", value: n, options: Ia }),
                    (o.elements[t].value = e),
                    o.submit();
                });
              });
              var a = void 0;
              -1 !== window.location.search.indexOf(t + "=") &&
                o.elements &&
                o.elements[t] &&
                (a = z.get("wg-search-form")) &&
                (o.elements[t].value = a);
            }
            z.erase({ name: "wg-search-form", options: Ia });
          } else
            B.warn("Search parameter name required for search translation.", {
              sendToDatadog: !1,
            });
        })();
    },
    !0
  );
var wa = [];
function ba(e) {
  var t = Ia.linkHooksConfig && Ia.linkHooksConfig.buildAdditionalSelectors;
  return [
    "a[href='#Weglot-" + e + "']",
    "a[href*='change-language.weglot.com/" + e + "']",
  ]
    .concat(t ? t(e) : [])
    .join(",");
}
function ka(e, t) {
  var n = wa.find(function (t) {
    return t.language === e;
  });
  (n && -1 !== n.links.indexOf(t)) ||
    (n ||
      ((n = {
        language: e,
        links: [],
        onLinkClick: function (t) {
          t.preventDefault(), t.stopPropagation(), ma(e);
        },
      }),
      wa.push(n)),
    t.setAttribute(X, ""),
    t.classList.add("weglot-link", "weglot-link-" + e),
    e === Be() &&
      (t.classList.add("weglot-link--active"),
      Ia.linkHooksConfig &&
        Ia.linkHooksConfig.onLinkActive &&
        Ia.linkHooksConfig.onLinkActive(t)),
    rt(e, function (e) {
      return t.setAttribute("href", e);
    }),
    t.addEventListener("click", n.onLinkClick),
    n.links.push(t));
}
var xa = {};
function Ea(e) {
  return e
    ? "string" != typeof e
      ? e
      : e.split(",").map(function (e) {
          return { value: e };
        })
    : [];
}
function Ca(e, t) {
  if ((void 0 === t && (t = ""), !e)) return le.button_style;
  var n = e.classF || "",
    r = n.match(/flag-(\d)/),
    o = {
      with_name: e.withname,
      full_name: !!e.fullname,
      is_dropdown: !!e.is_dropdown,
      with_flags: -1 !== n.indexOf("wg-flags"),
      flag_type: r && r[1] ? ue[r[1]] : "",
      invert_flags: !0,
    };
  return t && (o.custom_css = t), o;
}
function Oa(e) {
  var t = e.styleOpt,
    n = e.containerCss,
    r = e.target,
    o = e.sibling;
  return { style: Ca(t, n), location: { target: r, sibling: o } };
}
(xa[Z] = function () {
  Te("onWeglotSetup", function () {
    !1 !== Ia.original_shopify_checkout &&
      Ia.is_connect &&
      !Ia.subdirectory &&
      Ia.language_from === Be() &&
      it();
  }),
    Pe(
      "initialized",
      function () {
        var e = Je({ type: "cookie" }).getItem("wg_checkout_redirect");
        e &&
          (Je({ type: "cookie" }).removeItem("wg_checkout_redirect"),
          Je({ type: "cookie" }).setItem("wg_checkout_language", e),
          st(e)),
          window.langify &&
            B.log("%c Please, uninstall langify to properly use Weglot", {
              sendToDatadog: !1,
            }),
          xe() ||
            !Ia.order_tag ||
            (Ia.is_connect && Ia.language_from !== Be()) ||
            dt(),
          ct();
        var t,
          n = document.querySelectorAll("[data-wg-only-display]");
        n.length && $e(n),
          Ia.customer_tag && ut(),
          document.getElementsByClassName("shopify-payment-button").length &&
            ((t = window.fetch),
            (window.fetch = function () {
              if ("/wallets/checkouts.json" === arguments[0])
                try {
                  var e = JSON.parse(arguments[1].body),
                    n = lt(Be());
                  (e.checkout.attributes = {}),
                    Ia.cart_attributes.forEach(function (t) {
                      return (e.checkout.attributes[t] = n);
                    }),
                    (arguments[1].body = JSON.stringify(e));
                } catch (e) {}
              return t.apply(window, arguments);
            }));
      },
      !0
    ),
    Te("onConnectPageLoad", function (e) {
      return gt(e);
    }),
    Te("onPageLanguageSet", function (e) {
      return gt(e);
    }),
    Te("onDynamicDetected", function () {
      ct(Be());
    }),
    Te("startWhen", function () {
      return (
        me("admin-bar-iframe") ||
        me("preview-bar-iframe") ||
        Ia.private_mode ||
        (function () {
          for (var e = 0, t = document.scripts; e < t.length; e += 1)
            if (-1 !== t[e].src.indexOf("preview_bar_injector")) return !0;
          return !1;
        })()
      );
    });
  var e = [".shopify-payment-button button"]
      .concat(pt)
      .concat(
        Ia.is_connect
          ? []
          : [
              "form.cart.ajaxcart",
              "form.cart-drawer",
              "#cross-sell",
              ".wheelio_holder",
              ".mini-cart",
              "#shopify-product-reviews",
              "#esc-oos-form",
              ".product__add-to-cart-button",
              "select.product-variants>option:not([value])",
              ".ui-autocomplete",
              ".shopify-payment-button__button",
              "#shopify-section-static-recently-viewed-products",
              "#recently-viewed-products",
              "#shopify-section-product-recommendations",
              ".action_button.add_to_cart",
            ]
      ),
    t = /^\/(\d+\/checkouts|checkouts\/[a-z]{1,2})\/(?:\w{2}-)?\w{32}/.test(
      document.location.pathname
    ),
    n = "loox.io" === document.location.hostname && be();
  return Object.assign(
    {},
    {
      cart_attributes: ["lang", "Invoice Language"],
      excluded_blocks: [
        "input[type='radio']",
        ".money",
        ".price",
        ".product__prices",
        "#admin-bar-iframe",
        ".notranslate",
        ".skiptranslate",
        "#isp_refine_nevigation",
        "#isp_header_subtitle",
        ".isp_sorting_and_result_view_wrapper",
        "#isp_results_did_you_mean > span",
        ".isp_facet_show_hide_values",
        "#isp_main_search_box",
        ".snize-filter-variant-count",
        ".snize-search-results-header a",
        ".snize-search-results-header b",
        ".hc-author__text",
        ".hc-avatar__initials",
        ".hc-rating-chart__count",
        ".hc-rating-chart__percentage-value",
        ".yotpo-review-date",
        ".yotpo-user-name",
        ".yotpo-user-letter",
        ".yotpo .avg-score",
        ".yotpo .sr-only",
        ".yotpo-mandatory-mark",
      ].map(function (e) {
        return { value: e };
      }),
      search_forms:
        "form[action='/pages/search-results'],form[action='/search']",
      search_parameter: "q",
    },
    n && Ia.is_connect && { dynamicPushState: !0 },
    {
      dynamics: e.map(function (e) {
        return { value: e };
      }),
      extra_definitions: [
        {
          type: 1,
          selector: ".snize-color-swatch",
          attribute: "data-sntooltip",
        },
        {
          type: 1,
          selector: "button[data-pf-type=ProductATC]",
          attribute: "data-soldout",
        },
        {
          type: 1,
          selector: "button[data-pf-type=ProductATC]",
          attribute: "data-adding",
        },
        {
          type: 1,
          selector: "button[data-pf-type=ProductATC]",
          attribute: "data-added",
        },
      ],
      shopifyCheckout: t,
    }
  );
}),
  (xa[Q] = function () {
    return (
      Te("onPageLanguageSet", function (e) {
        !(function (e) {
          for (
            var t = 0,
              n = document.querySelectorAll(
                '[href*="/checkout.php"],[href*="/cart.php"]'
              );
            t < n.length;
            t += 1
          ) {
            var r = n[t];
            r.setAttribute("href", Ce(r.getAttribute("href"), "lang", e));
          }
        })(e);
      }),
      {
        dynamics: [
          ".quick-shop-details",
          "#QuickViewProductDetails",
          ".QuickViewModal",
          ".modalContainer",
          ".ng-checkout-container",
          ".previewCartAction",
          "#checkout-app",
        ].map(function (e) {
          return { value: e };
        }),
        search_forms: "form[action='/search.php']",
        search_parameter: "search_query",
      }
    );
  }),
  (xa[ae] = function () {
    return Ia.is_connect ? {} : { dynamics: [{ value: ".content" }] };
  }),
  (xa[ee] = function () {
    return {
      excluded_blocks: [
        '[data-display="cms-only"]',
        ".j-admin-links",
        ".cc-m-status-empty",
      ].map(function (e) {
        return { value: e };
      }),
    };
  }),
  (xa[te] = function () {
    var e = Ia.force_translation || [],
      t = ["body.sqs-is-page-editing"];
    document.getElementById("sqs-cart-root") &&
      (e.push("#sqs-cart-container"),
      t.push(
        "#sqs-cart-container [class*=subtotalPrice]",
        "#sqs-cart-container .cart-container .item-price"
      )),
      document.getElementById("sqs-standard-checkout") &&
        (e.push("#checkout"),
        t.push(
          "#checkout span.money",
          "#checkout [data-test*=incomplete] [class^=PaymentCard-container]",
          "#checkout [data-test*=incomplete] [class^=CustomerAddress-container]",
          "#checkout [class^=CustomerInfoSection-email]",
          "#checkout [class^=GoogleResultsList]"
        )),
      document.getElementById("order-status-page-root") &&
        (e.push("#order-status-page-root"),
        t.push(
          "#order-status-page-root #order-number",
          "#order-status-page-root h2 + div > p"
        ));
    var n = window.location.host.endsWith("squarespace.com");
    if (
      (Pe("initialized", function () {
        try {
          var e = window.ExtensionScriptsSDK;
          if (!e) return;
          e["1.0"].page.events.dispatchScriptLoadEvent("Weglot");
        } catch (e) {}
      }),
      !Ia.is_connect)
    )
      try {
        document
          .querySelectorAll(".animation-segment-wrapper")
          .forEach(function (e) {
            e.parentNode.dataset.dynamicStrings = e.textContent;
          }),
          document
            .querySelectorAll(".animation-segment-parent-hidden")
            .forEach(function (e) {
              e.dataset.dynamicStrings = "";
            }),
          t.push(".animation-segment-wrapper"),
          t.push(".animation-segment-parent-hidden > *");
      } catch (e) {}
    return {
      force_translation: e.join(","),
      dynamics: [
        "#sqs-cart-container",
        "#checkout",
        ".sqs-widgets-confirmation",
        ".video-player",
        ".jdgm-widget",
        ".calendar-block",
        ".opentable-v2-block",
        ".blog-item-comments",
      ]
        .map(function (e) {
          return { value: e };
        })
        .concat(
          Ia.is_connect
            ? [
                { value: ".sqs-add-to-cart-button.cart-adding" },
                { value: ".sqs-add-to-cart-button.cart-added" },
              ]
            : [
                { value: "[data-dynamic-strings]" },
                { value: ".sqs-add-to-cart-button" },
                { value: ".variant-select-wrapper" },
              ]
        ),
      excluded_blocks: t
        .map(function (e) {
          return { value: e };
        })
        .concat(Ia.is_connect ? [{ value: ".comment-body" }] : []),
      forceDisableConnect: n,
      merged_selectors_remove: [
        { value: ".plyr__menu__container" },
        { value: ".product-price .original-price" },
        { value: ".comment-btn-wrapper" },
      ],
      extra_definitions: [
        {
          type: 1,
          selector: ".variant-select-wrapper",
          attribute: "data-text",
        },
      ],
    };
  }),
  (xa[ne] = function () {
    var e = {
      dynamics: document.documentElement.getAttribute("data-wg-translated")
        ? []
        : [{ value: "#SITE_CONTAINER" }],
      dynamicPushState: !0,
    };
    if (
      (window.wixBiSession &&
        "bolt" !== window.wixBiSession.renderType &&
        !Ia.visual_editor &&
        (document.addEventListener("DOMContentLoaded", function () {
          new MutationObserver(function (e) {
            for (var t = 0; t < e.length; t++) {
              "SUCCESS" ===
                e[t].target.getAttribute("data-santa-render-status") &&
                (this.disconnect(), Ie("start"));
            }
          }).observe(document.getElementById("SITE_CONTAINER"), {
            attributes: !0,
            attributeFilter: ["data-santa-render-status"],
          });
        }),
        (e.delayStart = !0),
        (e.wait_transition = !1)),
      window.wixBiSession && "bolt" === window.wixBiSession.renderType)
    ) {
      var t = 0,
        n = setInterval(function () {
          ((document.body && window.sssr) || 40 === t) &&
            (Ie("start"), clearInterval(n)),
            t++;
        }, 100);
      (e.delayStart = !0), (e.wait_transition = !1);
    }
    return e;
  }),
  (xa[re] = function () {
    return (
      Pe("switchersReady", function () {
        var e = document.querySelector(".weglot-container");
        e && e.classList.add("weglot-container--left");
      }),
      {
        forceDisableConnect:
          window.Webflow &&
          window.Webflow.env &&
          !!window.Webflow.env("editor"),
        excluded_blocks: [".wg-element-wrapper"].map(function (e) {
          return { value: e };
        }),
        linkHooksConfig: {
          additionalCheckSelectors: [".weglot-switcher-component a[lang]"],
          buildAdditionalSelectors: function (e) {
            return ['.weglot-switcher-component a[lang="' + e + '"]'];
          },
          onLinkActive: function (e) {
            var t = e.closest(".weglot-switcher-component.w-dropdown");
            if (t) {
              var n = t.querySelector(".w-dropdown-toggle");
              if (n) {
                var r = n.textContent,
                  o = n.getAttribute("lang");
                (n.textContent = e.textContent),
                  n.setAttribute("lang", e.getAttribute("lang")),
                  (function (e, t) {
                    var n = wa.find(function (t) {
                      return t.language === e;
                    });
                    if (n) {
                      var r = n.links.indexOf(t);
                      -1 !== r &&
                        (n.links.splice(r, 1),
                        t.removeEventListener("click", n.onLinkClick));
                    }
                  })(e.getAttribute("lang"), e),
                  ka(o, e),
                  (e.textContent = r),
                  e.setAttribute("lang", o);
              }
            } else
              e.classList.add("w--current"),
                e.setAttribute("aria-current", "lang");
          },
          offLinkActive: function (e) {
            e.classList.remove("w--current"),
              e.removeAttribute("aria-current");
          },
        },
      }
    );
  }),
  (xa[oe] = function () {
    return {
      dynamics: [
        ".w-container",
        ".w-wrapper",
        ".product-header",
        ".product-messages",
        ".error",
        "button",
      ].map(function (e) {
        return { value: e };
      }),
    };
  }),
  (xa[ie] = function () {
    return {
      ignoreDynamicFragments: !0,
      dynamicPushState: !0,
      merged_selectors_remove: [{ value: ".themeProfileMenu" }],
    };
  });
var Sa = [
  { from: "originalLanguage", to: "language_from" },
  { from: "autoSwitch", to: "auto_switch" },
  { from: "autoSwitchFallback", to: "auto_switch_fallback" },
  { from: "waitTransition", to: "wait_transition" },
  { from: "subDomain", to: "subdomain" },
  { from: "translateSearch", to: "translate_search" },
  { from: "searchsForms", to: "search_forms" },
  { from: "searchParameter", to: "search_parameter" },
  { from: "hideSwitcher", to: "hide_switcher" },
  { from: "dangerouslyForceDynamic", to: "dangerously_force_dynamic" },
  { from: "loadingBar", to: "loading_bar" },
  { from: "customerTag", to: "customer_tag" },
  { from: "orderTag", to: "order_tag" },
  { from: "translateImages", to: "media_enabled" },
  { from: "extraDefinitions", to: "extra_definitions" },
  {
    from: "excludePaths",
    to: "excluded_paths",
    func: function (e) {
      return e
        ? "string" != typeof e
          ? e
          : e
              .split(",")
              .filter(function (e) {
                return !!e;
              })
              .map(function (e) {
                return { value: e, type: "CONTAIN" };
              })
        : [];
    },
  },
  { from: "exceptions", to: "excluded_blocks", func: Ea },
  { from: "whiteList", to: "whitelist", func: Ea },
  { from: "styleOpt", to: "button_style", func: Ca },
  {
    from: "destinationLanguages",
    to: "languages",
    func: function (e) {
      return "string" != typeof e
        ? e
        : e.split(",").map(function (e) {
            return {
              language_to: e,
              provider: null,
              automatic_translation_enabled: !0,
            };
          });
    },
  },
];
function La(e) {
  var t = Object.assign({}, e);
  return (
    t.switchers &&
      ("string" == typeof t.switchers &&
        (t.switchers = JSON.parse(t.switchers)),
      t.switchers.length &&
        t.switchers[0].styleOpt &&
        (t.switchers = t.switchers.map(Oa)),
      (t.scriptParamSwitcher = !0)),
    Array.isArray(t.dynamic) && (t.dynamic = t.dynamic.join(",")),
    Array.isArray(t.translate_iframes) &&
      (t.translate_iframes = t.translate_iframes.join(",")),
    t.translate_images && (t.media_enabled = !0),
    Sa.forEach(function (e) {
      var n = e.from,
        r = e.to,
        o = e.func;
      void 0 !== t[n] && ((t[r] = o ? o(t[n]) : t[n]), delete t[n]);
    }),
    t
  );
}
function Na(e, t) {
  var n = {};
  for (var r in e)
    Object.prototype.hasOwnProperty.call(e, r) &&
      -1 === t.indexOf(r) &&
      (n[r] = e[r]);
  return n;
}
var Ta = {};
function ja(e) {
  if (!e || !e.api_key) throw Error("You have to provide at least a key");
  var t = e.api_key.split("wg_").pop(),
    n = La(e);
  return (function (e) {
    if (u(window.location.hostname))
      return fetch(
        "https://api.weglot.com/projects/settings?api_key=wg_" + e
      ).then(function (e) {
        return e.json();
      });
    var t = Aa();
    if (t) {
      var n = t.settings,
        r = Na(t, ["settings"]);
      return (n.injectedData = r), Promise.resolve(n);
    }
    var o = (function (e) {
      if (!e.includes(V)) return null;
      var t = e.split(".")[0];
      if (t.includes("-")) {
        return t.split("-").reverse()[0];
      }
      return t;
    })(window.location.hostname);
    if (o)
      return fetch("" + $ + o + ".json")
        .then(function (e) {
          return e.json();
        })
        .then(function (e) {
          return (
            "SUBDOMAIN" === e.url_type &&
              (e.languages = e.languages.map(function (e) {
                return Object.assign({}, e, {
                  connect_host_destination: Object.assign(
                    {},
                    e.connect_host_destination,
                    {
                      is_dns_set: !0,
                      created_on_aws: 1,
                      host:
                        (e.custom_code || e.language_to) + "-" + o + "." + V,
                    }
                  ),
                });
              })),
            (e.is_dns_set = !0),
            (e.previewHash = o),
            e
          );
        });
    return fetch("" + $ + e + ".json").then(function (e) {
      return e.json();
    });
  })(t)
    .then(function (e) {
      var t = e.custom_settings,
        r = Na(e, ["custom_settings"]);
      n.button_style = Object.assign(t ? t.button_style : {}, n.button_style);
      var o = r.language_from,
        a = r.languages;
      o && (n.language_from = o),
        a && (n.languages = a),
        t && t.localeRules && (n.localeRules = t.localeRules);
      var i = Pa(Object.assign({}, r, t, n));
      return Ie("onOptionsReady"), i;
    })
    .catch(function (e) {
      B.error(e, {
        consoleOverride:
          (e && e.wgErrMsg) ||
          "Cannot fetch Weglot options. Is your key correct?",
        sendToDatadog: !1,
      });
    });
}
function Aa() {
  var e = me("weglot-data");
  if (!e) return null;
  try {
    var t = JSON.parse(e.textContent);
    return t.settings ? t : null;
  } catch (e) {
    return null;
  }
}
function Ra() {
  var e = Aa();
  e && (delete e.settings, (Ta.injectedData = e));
}
function Pa(e) {
  if (e.deleted_at)
    throw {
      wgErrMsg: "Cannot load Weglot because the project has been deleted",
    };
  e.injectedData || Oe(Ra),
    "SUBDIRECTORY" === e.url_type && e.is_dns_set && (e.subdirectory = !0),
    e.languages.length || (e.languages = []),
    (Ta.is_connect =
      e.subdirectory ||
      e.languages.some(function (e) {
        return (
          e.connect_host_destination &&
          e.connect_host_destination.is_dns_set &&
          e.connect_host_destination.created_on_aws
        );
      })),
    (e.subdomain = !e.subdirectory && (e.subdomain || Ta.is_connect)),
    e.dynamic &&
      (e.dynamics ||
        (e.dynamics = e.dynamic.split(",").map(function (e) {
          return { value: e.trim() };
        })),
      delete e.dynamic),
    u(window.location.hostname) && (Ta.visual_editor = !0),
    (Ta.private_mode = (function () {
      -1 !== location.search.indexOf("weglot-private=0") &&
        Je().removeItem("wg-private-mode");
      var e =
        document.getElementById("admin-bar-iframe") ||
        document.getElementById("preview-bar-iframe") ||
        -1 !== location.search.indexOf("weglot-private=1") ||
        u(window.location.hostname) ||
        "1" === Je({ type: "cookie" }).getItem("wg-private-mode");
      return e && Je({ type: "cookie" }).setItem("wg-private-mode", "1"), e;
    })());
  var t,
    n,
    r,
    o = e.technology_name || Ta.technology_name,
    a = (t = o) && xa[t] ? xa[t]() : {},
    i = Object.assign({}, le, a);
  if (
    (Object.assign(Ta, i, e),
    se.forEach(function (e) {
      var t, n;
      Ta[e] !== i[e] &&
        (Ta[e] =
          ((t = Ta[e]),
          (n = i[e])
            ? Array.isArray(t)
              ? [].concat(t, n)
              : "object" == typeof t
              ? Object.assign({}, t, n)
              : (t = t
                  .split(",")
                  .filter(function (e) {
                    return e;
                  })
                  .join(",")) &&
                t.length > 0 &&
                t !== n
              ? (t += "," + n)
              : (t = n)
            : t));
    }),
    (n = "https://cdn.weglot.com/weglot.min.css?v=5"),
    ((r = document.createElement("link")).rel = "stylesheet"),
    (r.type = "text/css"),
    (r.href = n),
    document.head.appendChild(r),
    Ta.button_style &&
      Ta.button_style.custom_css &&
      ke(Ta.button_style.custom_css, "weglot-custom-style"),
    Ta.switchers && 0 !== Ta.switchers.length
      ? (Ta.switchers = Ta.switchers.map(function (e) {
          var t = e.button_style,
            n = Na(e, ["button_style"]);
          return Object.assign({}, { style: n.style || t }, n);
        }))
      : (Ta.switchers = [
          { style: Ta.button_style, location: {}, default: !0 },
        ]),
    Ta.cache && Ta.visual_editor && (Ta.cache = !1),
    Ta.api_key.length < 36 && (Ta.translation_engine = 1),
    Ta.excluded_blocks_remove &&
      (Ta.excluded_blocks = Ta.excluded_blocks.filter(function (e) {
        return !Ta.excluded_blocks_remove.includes(e.value);
      })),
    Ta.dangerously_force_dynamic &&
      (Ta.dynamics = Ta.dynamics.concat(
        Ta.dangerously_force_dynamic.split(",").map(function (e) {
          return { value: e.trim() };
        })
      )),
    (Ta.excluded_blocks = Ta.excluded_blocks.filter(function (e) {
      return Ee(e.value);
    })),
    (Ta.dynamics = Ta.dynamics.filter(function (e) {
      return Ee(e.value);
    })),
    Ta.dynamics_remove &&
      (Ta.dynamics = Ta.dynamics.filter(function (e) {
        return !Ta.dynamics_remove.includes(e.value);
      })),
    (Ta.is_tld = !1),
    a.forceDisableConnect && (Ta.is_connect = !1),
    Ta.is_connect && !Ta.previewHash)
  ) {
    var s = Ta.host.split("www.").pop();
    Ta.is_tld = Ta.languages.some(function (e) {
      if (e.connect_host_destination && e.connect_host_destination.host)
        return -1 === e.connect_host_destination.host.indexOf(s);
    });
  }
  return (
    Ta.whitelist &&
      !Array.isArray(Ta.whitelist) &&
      (Ta.whitelist = [{ value: String(Ta.whitelist) }]),
    Ta
  );
}
var Ia = Ta;
var Da,
  Fa,
  Ua,
  Wa = {
    "Node.prototype.contains": document.contains,
    "Element.prototype.cloneNode":
      "document" in self && "cloneNode" in document.documentElement,
    "location.origin": "location" in self && "origin" in self.location,
    MutationObserver: "MutationObserver" in self,
    Promise: "Promise" in self && "resolve" in Promise,
    "Element.prototype.matches":
      "document" in self && "matches" in document.documentElement,
    "Element.prototype.closest":
      "document" in self && "closest" in document.documentElement,
    "Element.prototype.classList":
      "document" in self &&
      "classList" in document.documentElement &&
      (function () {
        var e = document.createElement("div");
        if (
          !(
            e.classList &&
            e.classList.add &&
            e.classList.remove &&
            e.classList.contains &&
            e.classList.toggle
          )
        )
          return !1;
        var t = !0;
        e.classList.add("add1", "add2"),
          (t =
            t &&
            e.className.indexOf("add1") >= 0 &&
            e.className.indexOf("add2") >= 0),
          (e.className = "remove1 remove2 remove3"),
          e.classList.remove("remove1", "remove3"),
          (t =
            t &&
            -1 === e.className.indexOf("remove1") &&
            e.className.indexOf("remove2") >= 0 &&
            -1 === e.className.indexOf("remove3"));
        try {
          e.remove();
        } catch (t) {
          e = null;
        }
        return t;
      })(),
    "String.prototype.includes": "includes" in String.prototype,
    fetch: "fetch" in self,
    "Array.prototype.find": "find" in Array.prototype,
    "Array.prototype.findIndex": "findIndex" in Array.prototype,
    "Object.assign": "assign" in Object,
    "Array.prototype.includes": "includes" in Array.prototype,
    URL: (function (e) {
      try {
        var t = new e.URL("http://weglot.com");
        if ("href" in t && "searchParams" in t) {
          var n = new URL("http://weglot.com");
          if (
            ((n.search = "a=1&b=2"),
            "http://weglot.com/?a=1&b=2" === n.href &&
              ((n.search = ""), "http://weglot.com/" === n.href))
          ) {
            var r = new e.URLSearchParams("a=1"),
              o = new e.URLSearchParams(r);
            if ("a=1" === String(o)) return !0;
          }
        }
        return !1;
      } catch (e) {
        return !1;
      }
    })(self),
  },
  Ha = !1;
function Ma() {
  (Ha = !0), Ie("polyfillReady");
}
function qa() {
  return Ha;
}
!(function (e) {
  window.Prototype &&
    (delete Object.prototype.toJSON, delete Array.prototype.toJSON);
  var t = Object.keys(Wa).filter(function (e) {
    return !Wa[e];
  });
  if (t.length) {
    !(function (e, t, n) {
      var r = !1;
      function o() {
        r ||
          ((r = !0),
          setTimeout(function () {
            return t(n);
          }, 20));
      }
      var a =
          document.getElementsByTagName("head")[0] ||
          document.documentElement,
        i = document.createElement("script");
      (i.type = "text/javascript"),
        (i.src = e),
        i.addEventListener
          ? (i.addEventListener("load", o, !1),
            i.addEventListener("error", o, !1))
          : i.readyState && (i.onreadystatechange = o),
        a.insertBefore(i, a.firstChild);
    })(
      "https://cdn.polyfill.io/v2/polyfill.min.js?callback=Weglot.polyReady&features=" +
        t.join(","),
      function () {}
    );
  } else e();
})(Ma);
var za = !1;
function Ba() {
  window.addEventListener("message", Ga, !1);
  var e = document.createElement("meta");
  (e.name = "google"),
    (e.content = "notranslate"),
    document.head && document.head.appendChild(e);
  document.documentElement &&
    -1 ===
      ["cms.e.jimdo.com", "proxy.weglot.com"].indexOf(window.location.host) &&
    document.documentElement.setAttribute("translate", "no");
  var t = document.head.querySelector("link[href*=weglot_shopify]");
  t && document.head.removeChild(t);
}
function $a() {
  if (Ia.api_key) {
    Pe(
      "initialized",
      function () {
        Ia.page_views_enabled &&
          (Ia.is_connect
            ? rt(Ia.language_from, function (e) {
                return $t(e);
              })
            : $t());
      },
      !0
    );
    try {
      M(document, Ia);
    } catch (e) {
      B.error(e);
    }
    if ((je("onWeglotSetup"), !Xa.initialized || window.Turbolinks)) {
      (Fa = (function () {
        var e = wt();
        if (Ia.is_connect) {
          var t =
            document.documentElement.dataset.wgTranslated ||
            (Ia.subdirectory ? ze() : qe());
          if (t !== Ia.language_from) return t;
          if (Ia.technology_name === Z) {
            if (z.get("wg_checkout_redirect")) return Ia.language_from;
            var n = z.get("wg_checkout_language");
            if (n && !Ia.shopifyCheckout && !be() && e.includes(n))
              return (
                z.erase({ name: "wg_checkout_language", options: Ia }), n
              );
          }
          var r = Wo();
          return t === Ia.language_from && r && e.includes(r)
            ? r
            : Ia.language_from;
        }
        var o = we("lang");
        if (o && e.includes(o)) return (za = !0), o;
        var a = bt();
        if (a && e.includes(a)) return a;
        var i = Wo();
        if (i && e.includes(i)) return (za = !0), i;
        return Ia.language_from;
      })()),
        Be();
      var e = yt();
      if (
        ((Ua =
          Fa &&
          Fa !== Ia.language_from &&
          document.documentElement.dataset.wgTranslated !== Fa &&
          !e &&
          !document.documentElement.dataset.wgExcludedUrl &&
          !Ia.switcher_editor) && Ia.wait_transition
          ? ke(
              "@keyframes wg{from{color:transparent;}to{color:transparent;}}body *{color:transparent!important;animation:1s linear infinite wg!important;}",
              J
            )
          : Mo(),
        Ia.delayStart)
      )
        return Pe(
          "start",
          function () {
            return Va();
          },
          !0
        );
      Oe(Va);
    }
  }
}
function Va() {
  if (
    !document.querySelector("#has-script-tags") ||
    (document.querySelector("#has-script-tags") &&
      (document.head.innerHTML.indexOf("weglot_script_tag") > 0 ||
        document.documentElement.innerHTML.indexOf("weglot_script_tag") > 0))
  )
    try {
      ha(Fa, za, Ua);
    } catch (e) {
      Mo(),
        B.error(e, {
          consoleOverride: "There has been an error initializing, " + e.stack,
        });
    }
  else Mo();
  (Da = !1), (Xa.initialized = !0);
}
function Ga(e) {
  if (e.data)
    try {
      var t = JSON.parse(e.data);
      switch (t.message) {
        case "Weglot.detect":
          e.source.postMessage(
            JSON.stringify({
              message: "Weglot.ready",
              data: { initialized: Xa.initialized, options: Ia },
            }),
            e.origin
          );
          break;
        case "Weglot.switchTo":
          ma(t.language);
      }
    } catch (e) {}
}
function Ja(e) {
  try {
    for (
      var t = null,
        n = 0,
        r = [
          /cdn\.weglot\.(?:com|us|dev)\/weglot\.min\.js\?([^#]+)/,
          /cdn\.weglot\.(?:com|us|dev)\/weglot-switcher-editor\.js\?([^#]+)/,
          /cdn\.weglot\.(?:com|us|dev)\/weglot_squarespace-[0-9]+\.min\.js\?([^#]+)/,
        ];
      n < r.length;
      n += 1
    ) {
      if ((t = r[n].exec(e))) break;
    }
    if (!t) return null;
    var o = t[1]
      .split("&")
      .map(function (e) {
        var t = e.split("="),
          n = t[0],
          r = t[1];
        try {
          return [n, decodeURIComponent(r)];
        } catch (e) {
          return [n, r];
        }
      })
      .reduce(
        function (e, t) {
          var n,
            r = t[0],
            o = t[1];
          return Object.assign(
            {},
            e,
            (((n = {})[r] = "true" === o || ("false" !== o && o)), n)
          );
        },
        { api_key: "" }
      );
    return o.api_key ? o : null;
  } catch (e) {
    B.warn(e);
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

