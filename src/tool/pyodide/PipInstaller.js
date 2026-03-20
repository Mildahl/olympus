
import { UISpinner } from "../../ui/base/ui.js";

export class PipInstaller {
  constructor(pyodideManager) {
    this.pyodideManager = pyodideManager;
    this.isDropdownVisible = false;
    this.installQueue = [];
    this._spinner = null;
  }
  createPipInstallButton() {
    if (document.getElementById("pip-install-btn")) return;
    const pipButton = UIHelper.createButton({
      id: "pip-install-btn",
      className: "badge pip-badge",
      text: "pip install",
      icon: "download",
      onClick: () => this.toggleDropdown(),
    });
    const codeEditorPanel = document.getElementById('code-editor-panel');
    const xpBadge = document.getElementById('xp-points-display');
    if (codeEditorPanel) {
      codeEditorPanel.appendChild(pipButton);
      if (xpBadge) {
        pipButton.style.position = 'absolute';
        pipButton.style.top = '10px';
        pipButton.style.right = '120px';
        pipButton.style.zIndex = '1000';
      }
    }
    return pipButton;
  }
  toggleDropdown() {
    if (this.isDropdownVisible) {
      this.hideDropdown();
    } else {
      this.showDropdown();
    }
  }
  showDropdown() {
    this.hideDropdown();
    this.updateInstalledPackagesList();
    this.updateCommonPackageStates();
    const dropdown = this.createDropdown();
    document.body.appendChild(dropdown);
    this.isDropdownVisible = true;
    const button = document.getElementById("pip-install-btn");
    if (button) {
      const buttonRect = button.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (buttonRect.bottom + 5) + 'px';
      dropdown.style.right = (window.innerWidth - buttonRect.right) + 'px';
      dropdown.style.zIndex = '1001';
    }
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick.bind(this), true);
    }, 0);
  }
  hideDropdown() {
    const dropdown = document.getElementById("pip-install-dropdown");
    if (dropdown) {
      dropdown.remove();
    }
    this.isDropdownVisible = false;
    document.removeEventListener('click', this.handleOutsideClick.bind(this), true);
  }
  handleOutsideClick(event) {
    const dropdown = document.getElementById("pip-install-dropdown");
    const button = document.getElementById("pip-install-btn");
    if (dropdown && !dropdown.contains(event.target) &&
        button && !button.contains(event.target)) {
      this.hideDropdown();
    }
  }
  createDropdown() {
    const dropdown = document.createElement('div');
    dropdown.id = 'pip-install-dropdown';
    dropdown.className = 'pip-install-dropdown';
    dropdown.innerHTML = `
      <div class="pip-dropdown-header">
        <h4>Install Python Packages</h4>
      </div>
      <div class="pip-dropdown-content">
        <div class="pip-input-section">
          <div class="pip-input-group">
            <input type="text" id="pip-package-input" placeholder="Enter package name (e.g., requests, numpy)" />
            <button id="pip-install-submit" class="bim-button primary">Install</button>
          </div>
          <div class="pip-common-packages">
            <label>Common packages:</label>
            <div class="pip-package-tags">
              <span class="pip-package-tag" data-package="requests">requests</span>
              <span class="pip-package-tag" data-package="numpy">numpy</span>
              <span class="pip-package-tag" data-package="pandas">pandas</span>
              <span class="pip-package-tag" data-package="matplotlib">matplotlib</span>
              <span class="pip-package-tag" data-package="geopy">geopy</span>
              <span class="pip-package-tag" data-package="pillow">pillow</span>
              <span class="pip-package-tag" data-package="scipy">scipy</span>
              <span class="pip-package-tag" data-package="plotly">plotly</span>
            </div>
          </div>
        </div>
        <div class="pip-installed-section">
          <label>Installed packages:</label>
          <div id="pip-installed-list" class="pip-installed-list">
          </div>
        </div>
      </div>
    `;
    this.setupDropdownEvents(dropdown);
    return dropdown;
  }
  setupDropdownEvents(dropdown) {
    const installButton = dropdown.querySelector('#pip-install-submit');
    const packageInput = dropdown.querySelector('#pip-package-input');
    installButton.addEventListener('click', () => {
      const packageName = packageInput.value.trim();
      if (packageName) {
        this.install(packageName);
      }
    });
    packageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const packageName = packageInput.value.trim();
        if (packageName) {
          this.install(packageName);
        }
      }
    });
    const packageTags = dropdown.querySelectorAll('.pip-package-tag');
    packageTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const packageName = tag.dataset.package;
        packageInput.value = packageName;
        this.install(packageName);
      });
    });
  }
  async install(packageName) {
    if (this.installQueue.includes(packageName)) {
      return `Package '${packageName}' is being installed`
    }
    if (this.pyodideManager.isPackageInstalled(packageName)) {
      return `Package '${packageName}' is already installed`
    }
    this.installQueue.push(packageName);
    this._spinner = new UISpinner({ text: `Installing ${packageName}...` });
    this._spinner.show("#code-editor-panel");
    this.updatePackageInstallState(packageName, 'installing');
    try {
      const success = await this.pyodideManager.install(packageName);
      if (success) {
        this.updatePackageInstallState(packageName, 'installed');
        this.updateInstalledPackagesList();
        const packageInput = document.getElementById('pip-package-input');
        if (packageInput) {
          packageInput.value = '';
        }
      } else {
        this.updatePackageInstallState(packageName, 'error');
      }
    } catch (error) {
      this.updatePackageInstallState(packageName, 'error');
      return `Failed to install '${packageName}': ${error.message}`;
    } finally {
      this.installQueue = this.installQueue.filter(p => p !== packageName);
      if (this._spinner) {
        this._spinner.hide();
        this._spinner = null;
      }
    }
  }
  updatePackageInstallState(packageName, state) {
    const dropdown = document.getElementById('pip-install-dropdown');
    if (!dropdown) return;
    const packageTags = dropdown.querySelectorAll('.pip-package-tag');
    packageTags.forEach(tag => {
      if (tag.dataset.package === packageName) {
        tag.className = `pip-package-tag ${state}`;
        switch (state) {
          case 'installing':
            tag.innerHTML = `${packageName} <span class="pip-status">⏳</span>`;
            break;
          case 'installed':
            tag.innerHTML = `${packageName} <span class="pip-status">✓</span>`;
            break;
          case 'error':
            tag.innerHTML = `${packageName} <span class="pip-status">✗</span>`;
            break;
          default:
            tag.innerHTML = packageName;
        }
      }
    });
  }
  updateInstalledPackagesList() {
    const installedList = document.getElementById('pip-installed-list');
    if (!installedList) return;
    const installedPackages = this.pyodideManager.getInstalledPackages();
    if (installedPackages.length === 0) {
      installedList.innerHTML = '<span class="pip-no-packages">No packages installed yet</span>';
      return;
    }
    installedList.innerHTML = installedPackages.map(pkg =>
      `<span class="pip-installed-package">${pkg} <span class="pip-status">✓</span></span>`
    ).join('');
  }
  init() {
    this.createPipInstallButton();
  }
  updateCommonPackageStates() {
    const dropdown = document.getElementById('pip-install-dropdown');
    if (!dropdown) return;
    const packageTags = dropdown.querySelectorAll('.pip-package-tag');
    packageTags.forEach(tag => {
      const packageName = tag.dataset.package;
      if (this.pyodideManager.isPackageInstalled(packageName)) {
        this.updatePackageInstallState(packageName, 'installed');
      }
    });
  }
}
