import { Components as UIComponents } from "./Components.js";

import { getPresetOptions, applyPresetToContext } from "../../configuration/config.presets.js";

import { UI_LANGUAGE_SELECT_OPTIONS } from "../language/uiLanguageSelectOptions.js";

class WelcomeScreen {
  constructor({ context, operators, container }) {
    this.context = context;

    this.operators = operators;

    this.container = container || document.body;

    this.overlay = null;

    /** Set to true when user changes the preset dropdown so we can reload on Continue */
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
      borderRadius: '6px',
      padding: '1.25rem 1.5rem',
      minWidth: '280px',
      maxWidth: '380px',
      width: '90vw',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
      pointerEvents: 'auto',
    });

    const title = document.createElement('div');
    title.textContent = 'Welcome';
    Object.assign(title.style, {
      margin: '0 0 0.25rem 0',
      color: '#fff',
      fontSize: '1.1rem',
      fontWeight: '600',
    });
    card.appendChild(title);

    card.appendChild(this._buildPresetRow());
    card.appendChild(this._buildPersistSettingsRow());
    card.appendChild(this._buildThemeRow());
    card.appendChild(this._buildLanguageRow());
    card.appendChild(this._buildToastsRow());
    card.appendChild(this._buildFooter());

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
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
    });
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, { color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem' });
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
    Object.assign(footer.style, { display: 'flex', justifyContent: 'center', paddingTop: '0.25rem' });
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
