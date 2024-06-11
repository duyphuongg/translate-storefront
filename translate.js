(function () {
  var config = {
    excluded_blocks: [],
    media_enabled: false,
    external_enabled: false,
    extra_definitions: [],
    translation_engine: 2,
    noTranslateAttribute: "data-wg-notranslate",
    mergeNodes: []
  };

  function isValidMergeNodes(element) {
    return el && isElement(el) && isTextNode(el) && !containsNoTranslateNodes(el);
  }

  function filterValidTextNodes(element, trimWhitespace = true) {
    if (!node.textContent || (trimWhitespace && !node.textContent.trim()) || node.textContent.indexOf("BESbswy") !== -1 || (node.parentNode && node.parentNode.nodeName && ["script", "style", "noscript"].includes(node.parentNode.nodeName.toLowerCase())) || isJsonString(node.textContent)) {
      return false;
    }
    return true;
  }

  function isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  function shouldRemoveElement(element) {
    try {
      if (config.mergedSelectorRemove && k(element, config.mergedSelectorRemove)) {
        return false;
      }
    } catch (error) { }
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
  var findElements = function (querySelectorAll, defaultValue) {
    return function (context, selector) {
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
      var excludedSelectors = excludedBlocks.map(function (block) {
        return block.value;
      });
      var excludedSelectorString = excludedSelectors.join(",");
      if (elementMatchesSelectors(element, excludedSelectorString)) {
        if (config.private_mode) {
          var matchedSelector = excludedSelectors.find(function (selector) {
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
            var matchedSelector = excludedSelectors.find(function (selector) {
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
    return whitelist.map(function (item) {
      return item.value;
    }).join(",");
  }

  var translatedElements = getTranslatedElements(targetElement);
  function getTranslatedElementsAndTextNodes(element) {
    var translatedElements = [];
    var textNodes = [];

    // Find translated elements
    var elements = findTranslatedElements(element);
    translatedElements = elements.map(function (el) {
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
    selectors.forEach(function (selector) {
      var elements = element.querySelectorAll(selector);
      elements.forEach(function (el) {
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
      traverseElement(element, function (node) {
        if (node.nodeType === 1) {
          var attributes = Array.from(node.attributes);
          resolvedElements.push({
            attributes: attributes,
            child: node
          });
        }
      });
      var attributeIndex = 1;
      traverseElement(clonedElement, function (node) {
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
    var createTranslatedFragment = function (element, translations) {
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
        get: function (element) {
          return element.getAttribute(attributeName);
        },
        set: function (element, value) {
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
      Object.keys(elements).forEach(function (key, index) {
        if (translationEngine >= index + 1) {
          mergedNodes.push.apply(mergedNodes, elements[key]);
        }
      });

      if (Array.isArray(elements.extra_merged_selectors)) {
        elements.selectorMerging = options.extra_merged_selectors.filter(function (selector) {
          return selector && typeof selector === "string";
        }).join(",");
      }

      if (options.merged_selectors_remove) {
        elements.mergedSelectorRemove = options.merged_selectors_remove.map(function (selector) {
          return selector.value;
        }).join(",");
      }

      return {
        getTextNodes: getTextNodes,
        setTextNodes: setTextNodes,
        definitions: getDefinitions(options)
      };
    }
  }
})()
