chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Auto-Fill Assistant installed");

    // Initialize storage with default structure
    chrome.storage.local.set({
      personalInfo: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        workAuthorization: "",
        veteranStatus: "",
        disabilityStatus: "",
        linkedinUrl: "",
        websiteUrl: "",
      },
      settings: {
        showNotifications: true,
        autoDetectForms: true,
        highlightFillableFields: true,
      },
    });

    // Show welcome notification
    showNotification(
      "Auto-Fill Assistant Installed!",
      "Click the extension icon to configure your information and start auto-filling forms."
    );
  }
});

// Create context menu for auto-fill
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autoFillPage",
    title: "Auto-fill this page",
    contexts: ["page"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "autoFillPage") {
    await handleContextMenuAutoFill(tab);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autoFillFromContext") {
    handleContextMenuAutoFill(sender.tab)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === "getTabInfo") {
    sendResponse({
      tabId: sender.tab.id,
      url: sender.tab.url,
      title: sender.tab.title,
    });
  }
});

async function handleContextMenuAutoFill(tab) {
  try {
    // Get personal information
    const data = await chrome.storage.local.get(["personalInfo"]);
    const personalInfo = data.personalInfo;

    if (!personalInfo || !personalInfo.firstName || !personalInfo.email) {
      showNotification(
        "Setup Required",
        "Please configure your personal information in the extension popup first."
      );
      return;
    }

    // Execute auto-fill script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fillFormFields,
      args: [personalInfo],
    });

    const result = results[0].result;

    if (result.success) {
      showNotification(
        "Auto-Fill Complete",
        `Successfully filled ${result.fieldsFound} field(s) on ${tab.title}`
      );
    } else {
      showNotification(
        "Auto-Fill Failed",
        result.message || "No fillable fields found on this page"
      );
    }
  } catch (error) {
    console.error("Context menu auto-fill error:", error);
    showNotification(
      "Auto-Fill Error",
      "Failed to auto-fill the page. Please try again."
    );
  }
}

function showNotification(title, message) {
  // Check if notifications are enabled
  chrome.storage.local.get(["settings"]).then((data) => {
    const settings = data.settings || { showNotifications: true };

    if (settings.showNotifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: title,
        message: message,
      });
    }
  });
}

// Badge management - show number of fillable forms
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    try {
      // Get form info from content script
      const response = await chrome.tabs.sendMessage(tabId, {
        action: "getFormInfo",
      });

      if (response && response.formCount > 0) {
        // Set badge to show number of fillable forms
        chrome.action.setBadgeText({
          tabId: tabId,
          text: response.formCount.toString(),
        });

        chrome.action.setBadgeBackgroundColor({
          tabId: tabId,
          color: "#4285f4",
        });
      } else {
        // Clear badge if no forms
        chrome.action.setBadgeText({
          tabId: tabId,
          text: "",
        });
      }
    } catch (error) {
      // Content script not loaded or no forms - clear badge
      chrome.action.setBadgeText({
        tabId: tabId,
        text: "",
      });
    }
  }
});

// Clear badge when tab becomes inactive
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const response = await chrome.tabs.sendMessage(activeInfo.tabId, {
      action: "getFormInfo",
    });

    if (response && response.formCount > 0) {
      chrome.action.setBadgeText({
        tabId: activeInfo.tabId,
        text: response.formCount.toString(),
      });
    } else {
      chrome.action.setBadgeText({
        tabId: activeInfo.tabId,
        text: "",
      });
    }
  } catch (error) {
    chrome.action.setBadgeText({
      tabId: activeInfo.tabId,
      text: "",
    });
  }
});

// Inject the same fillFormFields function that's used in popup.js
function fillFormFields(personalInfo) {
  let fieldsFound = 0;

  console.log("Auto-fill starting from background...", personalInfo);

  // Field mapping with comprehensive selectors
  const fieldMappings = [
    // First Name
    {
      value: personalInfo.firstName,
      selectors: [
        'input[name*="firstName" i]',
        'input[name*="first_name" i]',
        'input[name*="first-name" i]',
        'input[id*="firstName" i]',
        'input[id*="first_name" i]',
        'input[id*="first-name" i]',
        'input[placeholder*="first name" i]',
        'input[aria-label*="first name" i]',
        'input[name="fname"]',
        'input[id="fname"]',
      ],
    },

    // Last Name
    {
      value: personalInfo.lastName,
      selectors: [
        'input[name*="lastName" i]',
        'input[name*="last_name" i]',
        'input[name*="last-name" i]',
        'input[id*="lastName" i]',
        'input[id*="last_name" i]',
        'input[id*="last-name" i]',
        'input[placeholder*="last name" i]',
        'input[aria-label*="last name" i]',
        'input[name="lname"]',
        'input[id="lname"]',
      ],
    },

    // Full Name (if no separate first/last fields)
    {
      value: `${personalInfo.firstName} ${personalInfo.lastName}`,
      selectors: [
        'input[name*="fullName" i]',
        'input[name*="full_name" i]',
        'input[name*="full-name" i]',
        'input[name*="name" i]:not([name*="first" i]):not([name*="last" i]):not([name*="company" i]):not([name*="user" i])',
        'input[id*="fullName" i]',
        'input[id*="full_name" i]',
        'input[id*="full-name" i]',
        'input[placeholder*="full name" i]',
        'input[aria-label*="full name" i]',
      ],
    },

    // Email
    {
      value: personalInfo.email,
      selectors: [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]',
        'input[aria-label*="email" i]',
      ],
    },

    // Phone
    {
      value: personalInfo.phone,
      selectors: [
        'input[type="tel"]',
        'input[name*="phone" i]',
        'input[name*="mobile" i]',
        'input[id*="phone" i]',
        'input[id*="mobile" i]',
        'input[placeholder*="phone" i]',
        'input[aria-label*="phone" i]',
      ],
    },

    // Address
    {
      value: personalInfo.address,
      selectors: [
        'input[name*="address" i]:not([name*="email" i])',
        'input[name*="street" i]',
        'input[id*="address" i]:not([id*="email" i])',
        'input[id*="street" i]',
        'input[placeholder*="address" i]',
        'input[aria-label*="address" i]',
      ],
    },

    // City
    {
      value: personalInfo.city,
      selectors: [
        'input[name*="city" i]',
        'input[id*="city" i]',
        'input[placeholder*="city" i]',
        'input[aria-label*="city" i]',
      ],
    },

    // State
    {
      value: personalInfo.state,
      selectors: [
        'input[name*="state" i]',
        'input[name*="province" i]',
        'input[id*="state" i]',
        'input[id*="province" i]',
        'select[name*="state" i]',
        'select[id*="state" i]',
        'input[placeholder*="state" i]',
        'input[aria-label*="state" i]',
      ],
    },

    // ZIP Code
    {
      value: personalInfo.zipCode,
      selectors: [
        'input[name*="zip" i]',
        'input[name*="postal" i]',
        'input[id*="zip" i]',
        'input[id*="postal" i]',
        'input[placeholder*="zip" i]',
        'input[placeholder*="postal" i]',
        'input[aria-label*="zip" i]',
      ],
    },

    // LinkedIn URL
    {
      value: personalInfo.linkedinUrl,
      selectors: [
        'input[name*="linkedin" i]',
        'input[id*="linkedin" i]',
        'input[placeholder*="linkedin" i]',
        'input[aria-label*="linkedin" i]',
      ],
    },

    // Website/Portfolio
    {
      value: personalInfo.websiteUrl,
      selectors: [
        'input[name*="website" i]',
        'input[name*="portfolio" i]',
        'input[id*="website" i]',
        'input[id*="portfolio" i]',
        'input[placeholder*="website" i]',
        'input[placeholder*="portfolio" i]',
        'input[aria-label*="website" i]',
      ],
    },
  ];

  // Fill text inputs
  fieldMappings.forEach((mapping) => {
    if (mapping.value && mapping.value.trim()) {
      const filled = fillFieldBySelectors(
        mapping.selectors,
        mapping.value.trim()
      );
      if (filled) fieldsFound++;
    }
  });

  // Handle select dropdowns
  const selectMappings = [
    {
      value: personalInfo.workAuthorization,
      selectors: [
        'select[name*="authorization" i]',
        'select[name*="visa" i]',
        'select[name*="work_status" i]',
        'select[id*="authorization" i]',
        'select[id*="visa" i]',
        'select[id*="work_status" i]',
      ],
      valueMap: {
        citizen: [
          "us citizen",
          "citizen",
          "us_citizen",
          "united states citizen",
        ],
        permanent_resident: [
          "permanent resident",
          "green card",
          "permanent_resident",
          "pr",
        ],
        h1b: ["h1b", "h-1b", "h1b visa"],
        opt: ["opt", "f1 opt", "f-1 opt"],
        need_sponsorship: [
          "need sponsorship",
          "require sponsorship",
          "sponsorship required",
        ],
      },
    },

    {
      value: personalInfo.veteranStatus,
      selectors: ['select[name*="veteran" i]', 'select[id*="veteran" i]'],
      valueMap: {
        not_veteran: ["not a veteran", "no", "not veteran"],
        veteran: ["veteran", "yes"],
        disabled_veteran: ["disabled veteran"],
        recently_separated: ["recently separated"],
        decline: ["prefer not", "decline"],
      },
    },

    {
      value: personalInfo.disabilityStatus,
      selectors: ['select[name*="disability" i]', 'select[id*="disability" i]'],
      valueMap: {
        no: ["no", "not disabled", "no disability"],
        yes: ["yes", "disabled", "have disability"],
        decline: ["prefer not", "decline"],
      },
    },
  ];

  // Fill select dropdowns
  selectMappings.forEach((mapping) => {
    if (mapping.value) {
      const filled = fillSelectByValue(
        mapping.selectors,
        mapping.value,
        mapping.valueMap
      );
      if (filled) fieldsFound++;
    }
  });

  console.log(`Auto-fill completed. Found and filled ${fieldsFound} fields.`);

  return {
    success: fieldsFound > 0,
    fieldsFound: fieldsFound,
    message:
      fieldsFound > 0
        ? `Successfully filled ${fieldsFound} fields`
        : "No matching form fields found on this page",
  };

  // Helper functions
  function fillFieldBySelectors(selectors, value) {
    for (const selector of selectors) {
      const fields = document.querySelectorAll(selector);
      for (const field of fields) {
        if (field && !field.value && !field.disabled && !field.readOnly) {
          fillField(field, value);
          return true;
        }
      }
    }
    return false;
  }

  function fillSelectByValue(selectors, value, valueMap) {
    for (const selector of selectors) {
      const selects = document.querySelectorAll(selector);
      for (const select of selects) {
        if (select && !select.disabled) {
          const options = Array.from(select.options);

          // Try direct value match first
          let matchedOption = options.find(
            (opt) => opt.value.toLowerCase() === value.toLowerCase()
          );

          // Try mapped values
          if (!matchedOption && valueMap[value]) {
            const mappedValues = valueMap[value];
            matchedOption = options.find((opt) =>
              mappedValues.some(
                (mappedValue) =>
                  opt.text.toLowerCase().includes(mappedValue.toLowerCase()) ||
                  opt.value.toLowerCase().includes(mappedValue.toLowerCase())
              )
            );
          }

          if (matchedOption) {
            select.value = matchedOption.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
        }
      }
    }
    return false;
  }

  function fillField(field, value) {
    // Focus the field
    field.focus();

    // Clear existing value
    field.value = "";

    // Set new value
    field.value = value;

    // Trigger events to ensure the form recognizes the input
    const events = ["input", "change", "blur", "keyup"];
    events.forEach((eventType) => {
      field.dispatchEvent(new Event(eventType, { bubbles: true }));
    });

    console.log(`Filled field with value: ${value}`);
  }
}
