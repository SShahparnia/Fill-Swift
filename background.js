(function () {
  "use strict";

  let formCount = 0;
  let extensionIndicator = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  function initialize() {
    detectForms();

    const observer = new MutationObserver(debounce(detectForms, 1000));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function detectForms() {
    const forms = document.querySelectorAll("form");
    let fillableFormsCount = 0;

    forms.forEach((form) => {
      const fillableInputs = form.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], ' +
          'input[name*="name" i], input[name*="email" i], input[name*="phone" i], ' +
          'select[name*="veteran" i], select[name*="disability" i], select[name*="authorization" i]'
      );

      if (fillableInputs.length >= 2) {
        fillableFormsCount++;
        addFormHighlight(form);
      }
    });

    formCount = fillableFormsCount;

    if (formCount > 0) {
      showExtensionIndicator();
    }
  }

  function addFormHighlight(form) {
    if (!form.dataset.autoFillDetected) {
      form.dataset.autoFillDetected = "true";
      form.style.outline = "2px solid rgba(66, 133, 244, 0.3)";
      form.style.borderRadius = "4px";
    }
  }

  function showExtensionIndicator() {
    if (extensionIndicator) return;

    extensionIndicator = document.createElement("div");
    extensionIndicator.id = "auto-fill-indicator";
    extensionIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>🖊️</span>
                <span>Auto-Fill Available (${formCount} form${
      formCount > 1 ? "s" : ""
    })</span>
            </div>
        `;

    extensionIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4285f4;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        `;

    extensionIndicator.addEventListener("mouseenter", () => {
      extensionIndicator.style.background = "#3367d6";
      extensionIndicator.style.transform = "translateY(-2px)";
      extensionIndicator.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
    });

    extensionIndicator.addEventListener("mouseleave", () => {
      extensionIndicator.style.background = "#4285f4";
      extensionIndicator.style.transform = "translateY(0)";
      extensionIndicator.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    });

    extensionIndicator.addEventListener("click", () => {
      showClickMessage();
    });

    document.body.appendChild(extensionIndicator);

    setTimeout(() => {
      if (extensionIndicator) {
        extensionIndicator.style.opacity = "0";
        setTimeout(() => {
          if (extensionIndicator && extensionIndicator.parentNode) {
            extensionIndicator.remove();
            extensionIndicator = null;
          }
        }, 300);
      }
    }, 5000);
  }

  function showClickMessage() {
    const message = document.createElement("div");
    message.textContent =
      "Click the extension icon in your toolbar to auto-fill";
    message.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

    document.body.appendChild(message);

    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getFormInfo") {
      sendResponse({
        formCount: formCount,
        url: window.location.href,
        title: document.title,
      });
    }
  });
})();
