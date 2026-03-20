import { UIRow, UIText } from "./../base/ui.js";

export class LoadingBar extends UIRow {
    constructor(context) {
        super();

        this.setClass('LoadingBar');

        this.context = context;

        this.options = {
            background: '#2c501bff',
            foreground: '#4ad64fff',
            borderRadius: '3px',
            showPercentage: true,
            showText: true,
            zIndex: 1000,
            fadeTime: 300,
        };

        this.progressElement = null;

        this.textElement = null;

        this.percentageElement = null;

        this.progress = 0;

        this.visible = false;

        this._createdoms();

        this.setListeners(context);
    }

    setListeners(context) {

        const startLoading = (text) => {
            this.show();

            this.update(0);

            this.textElement.setValue(text);

            console.log("Loading started");
        };

        context.signals.startLoading.add(startLoading);

        const updateLoading = (progress, text) => {
            this.update(progress, text);

            console.log(`Loading progress: ${progress * 100}%`);
        };

        context.signals.progressLoading.add(updateLoading);

        const endLoading = () => {
            this.update(1);

            this.hide();

            console.log("Loading ended");
        };

        context.signals.endLoading.add(endLoading);

        const fakeProgress = (duration) => {
            this.show();

            const startTime = Date.now();

            const interval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;

                const progress = Math.min(elapsed / duration, 1);

                this.update(progress);

                if (progress >= 1) {
                    clearInterval(interval);

                    this.hide();
                }
            }, 100); 
        }

        context.signals.fakeProgress.add(fakeProgress);

    }
    _createdoms() {
        this.dom.style.cssText = `
            background: ${this.options.background};
            border-radius: ${this.options.borderRadius};
            z-index: ${this.options.zIndex};
            transition: opacity ${this.options.fadeTime}ms ease;
            display: none;
        `;

        this.progressElement = document.createElement('div');

        this.progressElement.className = 'loading-bar-progress';

        this.progressElement.style.cssText = `
            width: 0%;
            height: 100%;
            background: ${this.options.foreground};
            transition: width 0.2s ease-out;
        `;

        if (this.options.showText || this.options.showPercentage) {
            const textContainer = document.createElement('div');

            textContainer.className = 'loading-bar-text-container';

            textContainer.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 4px;
                color: white;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;

            if (this.options.showText) {
                this.textElement = new UIText('Loading...');

                this.textElement.setClass('loading-bar-text');

                textContainer.appendChild(this.textElement.dom);
            }

            if (this.options.showPercentage) {
                this.percentageElement = document.createElement('div');

                this.percentageElement.className = 'loading-bar-percentage';

                this.percentageElement.textContent = '0%';

                textContainer.appendChild(this.percentageElement);
            }

            this.dom.appendChild(textContainer);
        }

        this.dom.appendChild(this.progressElement);

    }

    update(progress, text = null) {
        if (!this.visible) {
            this.show();
        }

        this.progress = Math.max(0, Math.min(1, progress));

        const percentage = Math.round(this.progress * 100);

        this.progressElement.style.width = `${percentage}%`;

        if (this.percentageElement) {
            this.percentageElement.textContent = `${percentage}%`;
        }

        if (text && this.textElement) {
            this.textElement.setValue(text);
        }
    }

    show() {
        if (this.visible) return;

        if (this.parentContainer && !this.dom.parentNode) {
            this.parentContainer.appendChild(this.dom);
        }

        this.dom.style.display = 'block';

        this.dom.offsetHeight;

        this.dom.style.opacity = '1';

        this.visible = true;
        this.parentContainer = this.dom.parentNode;
    }

    hide() {
        if (!this.visible) return;

        this.dom.style.opacity = '0';

        this.visible = false;

        this.parentContainer.removeChild(this.dom);
    }

}
