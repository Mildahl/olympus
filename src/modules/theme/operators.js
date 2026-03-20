import { Operator } from "../../operators/Operator.js";

function applyTheme( cssPropertydata ) {
    
    for ( const key in cssPropertydata ) {

      const cssData = cssPropertydata[ key ];
      
      document.documentElement.style.setProperty( cssData.key, cssData.value );
        
    }

}

function whichHalfDay() {

    const currentHour = new Date().getHours();
    if (currentHour >= 7 && currentHour < 19) {
        return 'day';
    } else {
        return 'night';
    }
    
  }
class ChangeTheme extends Operator {
  static operatorName = "theme.change_to";

  static operatorLabel = "Change Theme";

  static operatorOptions = ["REGISTER"];

  constructor( context, theme ) {
    super( context );

    this.context = context;

    this.theme = theme;

  }

  execute() {

    if (this.theme == 'auto') {
        this.theme = whichHalfDay();
    }

    const ui = this.context.config?.ui;
    if (!ui?.theme) {
        return { status: "CANCELLED", message: "Theme config not available (context.config.ui not set by AECO initialisation)" };
    }

    ui.theme.current = this.theme;

    const cssPropertydata = ui.theme.colors[this.theme];
    if (!cssPropertydata) {
        return { status: "ERROR", message: `Theme '${this.theme}' not found in config` };
    }

    applyTheme( cssPropertydata );

    if (cssPropertydata["background"] && this.context.editor?.signals?.sceneBackgroundChanged) {
        this.context.editor.signals.sceneBackgroundChanged.dispatch( 'Color', cssPropertydata["background"].value, null, null, null, null, null, null );
    }

    this.context.signals.themeChanged.dispatch(this.theme);

    this.context._saveConfig();
    
    return { status: "FINISHED" };
  }

}

class ChangeThemeColors extends Operator {
    static operatorName = "theme.change_to_colors";

    static operatorLabel = "Change Theme Colors";

    static operatorOptions = ["REGISTER"];

    constructor( context, options ) {
        super( context );

        this.context = context;

        this.colors = options.colors;
    }

    execute() {
        const ui = this.context.config?.ui;
        if (!ui?.theme) {
            return { status: "CANCELLED", message: "Theme config not available (context.config.ui not set by AECO initialisation)" };
        }

        ui.theme.colors = this.colors;
        const currentTheme = ui.theme.current || 'night';

        const cssPropertydata = this.colors[currentTheme];
        if (!cssPropertydata) {
            return { status: "ERROR", message: `Theme '${currentTheme}' not found in colors` };
        }

        applyTheme( cssPropertydata );
        const backgroundColor = cssPropertydata["background"];

        if (backgroundColor && this.context.editor?.signals?.sceneBackgroundChanged) {
            this.context.editor.signals.sceneBackgroundChanged.dispatch( 'Color', backgroundColor.value, null, null, null, null, null, null );
        }

        this.context.signals.themeChanged.dispatch(currentTheme);

        this.context._saveConfig();

        return { status: "FINISHED" };
    }
    
}
export default [ ChangeTheme, ChangeThemeColors];