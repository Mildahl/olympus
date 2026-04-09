import { Components as UIComponents, UIPanel, makeResizable } from "../../ui/Components/Components.js";
const OPERATORS = {
  changeThemeColors: 'theme.change_to_colors',
}

/**
 * Theme panel UI. Uses context.config.ui (when provided by AECO initialisation) for theme state.
 */
class ThemePanel {

  constructor( { context, operators } ) {
    this.context = context;
    this.operators = operators;
  }

  listen(context, operators) {
    if (!context?.config?.ui?.theme) return;
    
  }

}

export default [ ThemePanel ];
