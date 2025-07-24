document.addEventListener("DOMContentLoaded", async () => {
  // DOM elements
  const autoFillBtn = document.getElementById("autoFillBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const personalInfoForm = document.getElementById("personalInfoForm");
  const statusMessage = document.getElementById("statusMessage");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");

  // Load saved data and update UI
  await loadSavedData();
  updateSettingsStatus();

  // Event listeners
  autoFillBtn.addEventListener("click", handleAutoFill);
  settingsBtn.addEventListener("click", toggleSettings);
  personalInfoForm.addEventListener("submit", handleSaveSettings);

  async function handleAutoFill() {
    showStatus("Filling form fields...", "info");

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Get saved personal data
      const data = await chrome.storage.local.get(["personalInfo"]);
      const personalInfo = data.personalInfo;

      if (!personalInfo || !personalInfo.firstName || !personalInfo.email) {
        throw new Error(
          "Please complete your personal information in settings first"
        );
      }

      // Execute content script to fill forms
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: fillFormFields,
        args: [personalInfo],
      });

      const result = results[0].result;

      if (result.success) {
        showStatus(
          `✅ Filled ${result.fieldsFound} field(s) successfully!`,
          "success"
        );
      } else {
        showStatus(`⚠️ ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Auto-fill error:", error);
      showStatus(`❌ Error: ${error.message}`, "error");
    }
  }

  function toggleSettings() {
    const isHidden = settingsPanel.classList.contains("hidden");
    settingsPanel.classList.toggle("hidden", !isHidden);
    settingsBtn.textContent = isHidden ? "✕ Close Settings" : "⚙️ Settings";
  }

  async function handleSaveSettings(e) {
    e.preventDefault();

    try {
      const personalInfo = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        zipCode: document.getElementById("zipCode").value.trim(),
        workAuthorization: document.getElementById("workAuthorization").value,
        veteranStatus: document.getElementById("veteranStatus").value,
        disabilityStatus: document.getElementById("disabilityStatus").value,
        linkedinUrl: document.getElementById("linkedinUrl").value.trim(),
        websiteUrl: document.getElementById("websiteUrl").value.trim(),
      };

      // Basic validation
      if (
        !personalInfo.firstName ||
        !personalInfo.lastName ||
        !personalInfo.email
      ) {
        throw new Error("First name, last name, and email are required");
      }

      // Save to storage
      await chrome.storage.local.set({ personalInfo });

      showStatus("✅ Settings saved successfully!", "success");
      updateSettingsStatus();

      // Auto-close settings after successful save
      setTimeout(() => {
        toggleSettings();
      }, 1500);
    } catch (error) {
      showStatus(`❌ Error: ${error.message}`, "error");
    }
  }

  async function loadSavedData() {
    try {
      const data = await chrome.storage.local.get(["personalInfo"]);
      const personalInfo = data.personalInfo;

      if (personalInfo) {
        // Populate form fields
        document.getElementById("firstName").value =
          personalInfo.firstName || "";
        document.getElementById("lastName").value = personalInfo.lastName || "";
        document.getElementById("email").value = personalInfo.email || "";
        document.getElementById("phone").value = personalInfo.phone || "";
        document.getElementById("address").value = personalInfo.address || "";
        document.getElementById("city").value = personalInfo.city || "";
        document.getElementById("state").value = personalInfo.state || "";
        document.getElementById("zipCode").value = personalInfo.zipCode || "";
        document.getElementById("workAuthorization").value =
          personalInfo.workAuthorization || "";
        document.getElementById("veteranStatus").value =
          personalInfo.veteranStatus || "";
        document.getElementById("disabilityStatus").value =
          personalInfo.disabilityStatus || "";
        document.getElementById("linkedinUrl").value =
          personalInfo.linkedinUrl || "";
        document.getElementById("websiteUrl").value =
          personalInfo.websiteUrl || "";
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  }

  function updateSettingsStatus() {
    chrome.storage.local.get(["personalInfo"]).then((data) => {
      const personalInfo = data.personalInfo;
      const isComplete =
        personalInfo &&
        personalInfo.firstName &&
        personalInfo.lastName &&
        personalInfo.email;

      if (isComplete) {
        statusIndicator.className = "status-indicator status-ready";
        statusText.textContent = "Ready to auto-fill";
        autoFillBtn.disabled = false;
      } else {
        statusIndicator.className = "status-indicator status-incomplete";
        statusText.textContent = "Complete settings to enable auto-fill";
        autoFillBtn.disabled = true;
        autoFillBtn.style.opacity = "0.6";
      }
    });
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.classList.remove("hidden");

    // Auto-hide after 4 seconds
    setTimeout(() => {
      statusMessage.classList.add("hidden");
    }, 4000);
  }
});

// Function that gets injected into the page
function fillFormFields(personalInfo) {
  let fieldsFound = 0;

  console.log("Auto-fill starting...", personalInfo);

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

    console.log(`Filled field with selector pattern, value: ${value}`);
  }
}
