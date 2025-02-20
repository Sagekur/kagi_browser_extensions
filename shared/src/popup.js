import { updateSettings } from './lib/utils.js';

if (!globalThis.browser) {
  globalThis.browser = chrome;
}

let IS_CHROME = true;

// Very hacky, but currently works flawlessly
if (typeof browser.runtime.getBrowserInfo === 'function') {
  IS_CHROME = false;
}

function setStatus(type) {
  const statusElement = document.querySelector('#status');
  const statusPermissionMessageElement = document.querySelector(
    '#status_permission_message',
  );
  const statusErrorMessageElement = document.querySelector(
    '#status_error_message',
  );
  const statusLoadingMessageElement = document.querySelector(
    '#status_loading_message',
  );

  const statusIcons = statusElement.querySelectorAll('svg');

  const statusErrorIcon = statusIcons[0];
  const statusLoadingIcon = statusIcons[1];
  const statusGoodIcon = statusIcons[2];

  statusLoadingMessageElement.style.display = 'none';
  statusLoadingIcon.style.display = 'none';

  switch (type) {
    case 'no_session': {
      const openKagiElement = document.querySelector('#open_kagi');
      const permission = {
        origins: ['https://kagi.com/*'],
      };
      browser.permissions.contains(permission).then((hasPermission) => {
        openKagiElement.onclick = async (e) => {
          e.preventDefault();
          const grant = await browser.permissions.request(permission);
          if (grant) {
            browser.tabs.create({
              url: 'https://kagi.com/',
            });
          } else {
            statusPermissionMessageElement.style.display = '';
          }
        };
      });
      statusErrorMessageElement.style.display = '';
      statusErrorIcon.style.display = '';
      statusGoodIcon.style.display = 'none';
      statusElement.setAttribute('title', 'No session found!');
      break;
    }
    case 'manual_token': {
      statusErrorMessageElement.style.display = 'none';
      statusErrorIcon.style.display = 'none';
      statusGoodIcon.style.display = '';
      statusElement.setAttribute('title', 'Token found!');
      break;
    }
    case 'auto_token': {
      statusErrorMessageElement.style.display = 'none';
      statusErrorIcon.style.display = 'none';
      statusGoodIcon.style.display = '';
      statusElement.setAttribute('title', 'Session found!');
      break;
    }
    default:
      break;
  }
}

async function setup() {
  const eTokenDiv = document.querySelector('#token');
  if (!eTokenDiv) {
    console.error('Could not find token div');
    return;
  }

  const eTokenInput = document.querySelector('#token_input');
  if (!eTokenInput) {
    console.error('Could not set token because no input exists');
    return;
  }

  eTokenInput.addEventListener('focus', (e) => {
    e.target.select();
  });

  eTokenInput.addEventListener('click', () =>
    this.value ? this.setSelectionRange(0, this.value.length) : null,
  );

  const eApiTokenInput = document.querySelector('#api_token_input');
  if (!eApiTokenInput) {
    console.error('Could not set API token because no input exists');
    return;
  }

  eApiTokenInput.addEventListener('focus', (e) => {
    e.target.select();
  });

  eApiTokenInput.addEventListener('click', () =>
    this.value ? this.setSelectionRange(0, this.value.length) : null,
  );

  const eApiEngineSelect = document.querySelector('#engine');
  if (!eApiEngineSelect) {
    console.error('Could not set API engine because no select exists');
    return;
  }

  const eAdvanced = document.querySelector('#advanced');
  if (!eAdvanced) {
    console.error('Could not find advanced toggle');
    return;
  }

  const eSummarize = document.querySelector('#summarize');
  if (!eSummarize) {
    console.error('Could not find summarize section');
    return;
  }

  const eSummarizePage = document.querySelector('#summarize_page');
  if (!eSummarizePage) {
    console.error('Could not find summarize page button');
    return;
  }

  const eApiParams = document.querySelectorAll('.api_param');
  if (!eApiParams.length) {
    console.error('Could not find api param divs');
    return;
  }

  eApiParams.forEach((element) => {
    element.style.display = 'none';
  });

  const eSaveToken = document.querySelector('#token_save');
  if (!eSaveToken) {
    console.error('Could not find save settings button');
    return;
  }

  eSaveToken.addEventListener('click', async () => {
    const eToken = document.querySelector('#token_input');
    if (!eToken) {
      console.error('No token input found.');
      return;
    }

    let token = eToken.value;

    if (token.startsWith('https://kagi.com')) {
      const url = new URL(token);
      token = url.searchParams.get('token');

      if (token) eToken.value = token;
    }

    const eApiToken = document.querySelector('#api_token_input');
    if (!eApiToken) {
      console.error('No API token input found.');
      return;
    }

    const api_token = eApiToken.value;

    const eApiEngine = document.querySelector('#engine');
    if (!eApiEngine) {
      console.error('No API engine select found.');
      return;
    }

    const api_engine = eApiEngine.value;

    eSaveToken.innerText = 'Saving...';

    await browser.runtime.sendMessage({
      type: 'save_token',
      token,
      api_token,
      api_engine,
    });
  });

  function toggleAdvancedDisplay(forceState) {
    const icons = eAdvanced.querySelectorAll('svg');
    const showSettingsIcon = icons[0];
    const closeSettingsIcon = icons[1];

    if (forceState === 'close' || eTokenDiv.style.display === '') {
      showSettingsIcon.style.display = '';
      closeSettingsIcon.style.display = 'none';
      eTokenDiv.style.display = 'none';
      if (eTokenInput.value) {
        eSummarize.style.display = '';
      }
      eAdvanced.setAttribute('title', 'Advanced settings');
    } else {
      showSettingsIcon.style.display = 'none';
      closeSettingsIcon.style.display = '';
      eTokenDiv.style.display = '';
      eSummarize.style.display = 'none';
      eAdvanced.setAttribute('title', 'Close advanced settings');
    }
  }
  eAdvanced.addEventListener('click', () => toggleAdvancedDisplay());

  eSummarizePage.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const eSummaryType = document.querySelector('#summary_type');
    if (!eSummaryType) {
      console.error('No summary type select found.');
      return;
    }

    const eTargetLanguage = document.querySelector('#target_language');
    if (!eTargetLanguage) {
      console.error('No target language select found.');
      return;
    }

    const eEngine = document.querySelector('#engine');
    if (!eEngine) {
      console.error('No engine select found.');
      return;
    }

    const eApiToken = document.querySelector('#api_token_input');
    if (!eApiToken) {
      console.error('No API token input found.');
      return;
    }

    const tabs = await browser.tabs.query({ active: true });

    // Chrome/Firefox might give us more than one active tab when something like "chrome://*" or "about:*" is also open
    const tab =
      tabs.find(
        (tab) =>
          tab?.url?.startsWith('http://') || tab?.url?.startsWith('https://'),
      ) || tabs[0];

    if (!tab) {
      console.error('No tab/url found.');
      console.error(tabs);
      return;
    }

    const { url } = tab;

    const searchParams = {
      url,
      summary_type: eSummaryType.value,
      target_language: eTargetLanguage.value,
      token: eTokenInput.value,
      api_token: eApiToken.value,
      api_engine: eEngine.value,
    };

    const urlSearchParams = new URLSearchParams({ ...searchParams });

    await browser.windows.create({
      url: `${browser.runtime.getURL(
        'src/summarize_result.html',
      )}?${urlSearchParams.toString()}`,
      focused: true,
      width: 600,
      height: 500,
      type: 'popup',
    });

    window.close();
  });

  async function handleGetData({
    token,
    api_token,
    sync_existing,
    api_engine,
  } = {}) {
    if (token) {
      eTokenInput.value = token;

      if (api_token) {
        eApiTokenInput.value = api_token;
      }

      eSummarize.style.display = '';

      if (sync_existing) {
        setStatus('auto_token');
      } else {
        setStatus('manual_token');
      }

      if (api_token) {
        eApiParams.forEach((element) => {
          element.style.display = '';
        });
      }

      if (api_engine) {
        eApiEngineSelect.value = api_engine;
      }

      const hasIncognitoAccess =
        await browser.extension.isAllowedIncognitoAccess();

      if (!hasIncognitoAccess) {
        const eIncognito = document.querySelector('#incognito');

        if (!eIncognito) {
          console.error('No incognito div to place text');
          return;
        }

        eIncognito.style.display = '';

        const eFirefoxExt = document.querySelector('#firefox_ext');
        const eChromeExt = document.querySelector('#chrome_ext');

        if (!IS_CHROME) {
          eFirefoxExt.style.display = '';
          eChromeExt.style.display = 'none';
        } else {
          eFirefoxExt.style.display = 'none';
          eChromeExt.style.display = '';
        }

        // NOTE: slight little hack to make the chrome://extensions link not be blocked.
        if (IS_CHROME) {
          const eChromeLink = document.querySelector('#chrome_link');
          if (eChromeLink) {
            eChromeLink.addEventListener('click', async () => {
              await browser.runtime.sendMessage({ type: 'open_extension' });
            });
          }
        }
      }
    } else {
      setStatus('no_session');
    }
  }

  await updateSettings(handleGetData);

  let savingButtonTextTimeout = undefined;

  browser.runtime.onMessage.addListener(async (data) => {
    if (data.type === 'synced') {
      setStatus('manual_token');
      eSaveToken.innerText = 'Saved!';

      await updateSettings();

      if (savingButtonTextTimeout) {
        clearTimeout(savingButtonTextTimeout);
      }

      savingButtonTextTimeout = setTimeout(() => {
        eSaveToken.innerText = 'Save settings';
      }, 2000);

      if (eTokenDiv.style.display === 'none') {
        if (data.token) {
          eSummarize.style.display = '';
        } else {
          eSummarize.style.display = 'none';
        }
      }

      if (data.api_token) {
        eApiParams.forEach((element) => {
          element.style.display = '';
        });
      } else {
        eApiParams.forEach((element) => {
          element.style.display = 'none';
        });
      }
    } else if (data.type === 'reset') {
      setStatus('no_session');
      eTokenDiv.style.display = 'none';
      eAdvanced.style.display = '';
      toggleAdvancedDisplay('close');
    }
  });
}

document.addEventListener('DOMContentLoaded', setup);
