import { Operator } from "../../operators/Operator.js";

class ChangeNavigationSettings extends Operator {
  static operatorName = "navigation.change_settings";

  static operatorLabel = "Change Navigation Settings";

  static operatorOptions = ["REGISTER"];

  constructor( context, navigationConfig ) {
      super( context );

      this.context = context;

      this.navigationConfig = navigationConfig;
  }

  execute() {
      this.context.config.app.Navigation = this.context._deepMerge(
        this.context.config.app.Navigation, 
        this.navigationConfig
      );

      this.context._saveConfig();
      if (this.context.editor && this.context.editor.navigationController) {
          const nav = this.context.editor.navigationController;

          nav.keyMappings = this.context.config.app.Navigation;

          nav.flySettings.moveSpeed = this.context.config.app.Navigation.fly.movementSpeed;

          nav.flySettings.lookSensitivity = this.context.config.app.Navigation.fly.lookSpeed;

          nav.flySettings.verticalMin = this.context.config.app.Navigation.fly.verticalMin;

          nav.flySettings.verticalMax = this.context.config.app.Navigation.fly.verticalMax;

          nav.driveSettings.moveSpeed = this.context.config.app.Navigation.drive.movementSpeed;

          nav.driveSettings.verticalMin = this.context.config.app.Navigation.drive.verticalMin;

          nav.driveSettings.verticalMax = this.context.config.app.Navigation.drive.verticalMax;
      }

      return { status: "FINISHED" };
  }
}

export default [ChangeNavigationSettings];
