import { Components as UIComponents } from "./Components.js";

import { getPresetOptions, applyPresetToContext } from "../../configuration/config.presets.js";

import { UI_LANGUAGE_SELECT_OPTIONS } from "../language/uiLanguageSelectOptions.js";

class WelcomeScreen {
  constructor({ context, operators, container }) {
    this.context = context;

    this.operators = operators;

    this.container = container || document.body;

    this.overlay = null;

    this.presetChangedThisSession = false;

    this.render();
  }

  render() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'WelcomeScreenOverlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '9999', pointerEvents: 'none',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(40, 40, 42, 0.97)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
      padding: '0',
      minWidth: '300px',
      maxWidth: '400px',
      width: 'min(92vw, 400px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      pointerEvents: 'auto',
    });

    const splashHeader = document.createElement('div');
    Object.assign(splashHeader.style, {
      position: 'relative',
      width: '100%',
      height: 'clamp(150px, 42vw, 220px)',
      flexShrink: '0',
      overflow: 'hidden',
      background: '#1c1c1e',
    });

    let olympusRoot = '';
    if (typeof window !== 'undefined' && window.__OLYMPUS_ROOT__) {
      olympusRoot = window.__OLYMPUS_ROOT__;
    }
    const splashImageSource = olympusRoot + '/external/ifc/splash.png';
    const splashImage = document.createElement('img');
    splashImage.alt = '';
    splashImage.src = splashImageSource;
    Object.assign(splashImage.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center',
      display: 'block',
    });
    splashImage.addEventListener('error', () => {
      splashImage.style.display = 'none';
    });
    splashHeader.appendChild(splashImage);
    card.appendChild(splashHeader);

    const body = document.createElement('div');
    Object.assign(body.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem',
      padding: '0.9rem 1.25rem 1rem',
    });

    const title = document.createElement('div');
    title.textContent = 'Welcome';
    Object.assign(title.style, {
      margin: '0',
      padding: '0 0 0.15rem 0',
      color: 'rgba(255,255,255,0.55)',
      fontSize: '0.7rem',
      fontWeight: '600',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    });
    body.appendChild(title);

    body.appendChild(this._buildPresetRow());
    body.appendChild(this._buildPersistSettingsRow());
    body.appendChild(this._buildThemeRow());
    body.appendChild(this._buildLanguageRow());
    body.appendChild(this._buildToastsRow());
    body.appendChild(this._buildFooter());

    card.appendChild(body);

    this.overlay.appendChild(card);
    this.container.appendChild(this.overlay);
  }

  _buildPresetRow() {
    const currentPresetId = this.context.config?.app?.currentPresetId || 'full';

    const select = UIComponents.select();

    select.setOptions(getPresetOptions());

    select.setValue(currentPresetId);

    select.dom.addEventListener('change', () => {
      const value = select.getValue();
      if (applyPresetToContext(this.context, value, { savePresetId: true })) {
        this.context._saveConfig();
        this.presetChangedThisSession = true;
      }
    });

    const label = (this.context.strings && this.context.strings.getKey('welcome/preset')) || 'Module preset';
    return this._buildSettingRow(label, select);
  }

  _buildPersistSettingsRow() {
    const persistSettings = this.context.config?.app?.Settings?.persistSettings === true;
    const checkbox = UIComponents.checkbox(persistSettings);
    checkbox.dom.title = (this.context.strings && this.context.strings.getKey('welcome/persistSettings/title')) || 'Save my settings to this browser (localStorage). Uncheck to use config presets only.';
    checkbox.dom.addEventListener('change', () => {
      if (!this.context.config.app.Settings) this.context.config.app.Settings = {};
      this.context.config.app.Settings.persistSettings = checkbox.getValue();
      if (this.context.config.app.Settings.persistSettings) {
        this.context._saveConfig();
      } else {
        try {
          localStorage.removeItem('aeco-config');
        } catch (_) {}
      }
    });
    const label = (this.context.strings && this.context.strings.getKey('welcome/persistSettings')) || 'Save my settings';
    return this._buildSettingRow(label, checkbox);
  }

  _buildSettingRow(label, control) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.65rem',
      minHeight: '1.65rem',
    });
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      color: 'rgba(255,255,255,0.88)',
      fontSize: '0.78rem',
      lineHeight: '1.25',
    });
    row.appendChild(labelEl);
    if (control instanceof HTMLElement) row.appendChild(control);
    else if (control?.dom) row.appendChild(control.dom);
    return row;
  }

  _buildThemeRow() {
    const current = this.context.config.ui.theme?.current || this.context.config.ui.theme?.default || 'night';

    const select = UIComponents.select();

    select.setOptions({ day: 'Day', night: 'Night' });

    select.setValue(current);

    select.dom.addEventListener('change', () => {
      this.operators.execute('theme.change_to', this.context, select.getValue());
    });

    return this._buildSettingRow('Theme', select);
  }

  _buildLanguageRow() {
    const current = this.context.config.ui.language || 'en';

    const select = UIComponents.select();

    select.setOptions(UI_LANGUAGE_SELECT_OPTIONS);

    select.setValue(current);

    select.dom.addEventListener('change', () => {
      this.context.config.ui.language = select.getValue();

      this.context.setLanguage(select.getValue());

      this.context._saveConfig();
    });

    return this._buildSettingRow('Language', select);
  }

  _buildToastsRow() {
    const enabled = this.context.config.ui.notifications?.showToasts ?? false;

    const checkbox = UIComponents.checkbox(enabled);

    checkbox.dom.addEventListener('change', () => {
      if (!this.context.config.ui.notifications) this.context.config.ui.notifications = {};

      this.context.config.ui.notifications.showToasts = checkbox.getValue();

      this.context._saveConfig();
    });

    return this._buildSettingRow('Show notifications', checkbox);
  }

  _buildFooter() {
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '0.35rem',
      marginTop: '0.2rem',
    });
    const btn = UIComponents.button('Continue');
    Object.assign(btn.dom.style, {
      padding: '0.5rem 1.5rem', fontSize: '0.85rem', borderRadius: '4px',
      cursor: 'pointer', background: 'var(--brand-color, #a0ff96)', color: '#121212',
      border: 'none', fontWeight: '600',
    });
    btn.onClick(() => this.dismiss());
    footer.appendChild(btn.dom);
    return footer;
  }

  dismiss() {
    this.context._saveConfig();

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    this.overlay = null;

    if (this.presetChangedThisSession && typeof window !== 'undefined' && window.location?.reload) {
      window.location.reload();
    }
  }
}

export { WelcomeScreen };
