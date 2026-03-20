import { Operator } from "../../operators/Operator.js";

/**
 * Timeline Player core operators.
 *
 * These operators are intentionally lightweight:
 * they dispatch timeline signals. The timeline controller (owned by
 * the timeline_player module) is expected to react to those signals.
 */

class TimelinePlayer_OP_playAnimation extends Operator {
  static operatorName = "timeline_player.play_animation";
  static operatorLabel = "Play Timeline";
  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  async execute() {
    const controller = this.context.timelinePlayerController;

    // Ensure date range exists before starting.
    if ((!controller?.startDate || !controller?.endDate) && controller?.loadDateRangeFromSchedule) {
      await controller.loadDateRangeFromSchedule();
    }

    this.context.signals.scheduleAnimationPlaybackChanged?.dispatch({
      isPlaying: true,
      action: "play",
    });

    return { status: "FINISHED" };
  }
}

class TimelinePlayer_OP_pauseAnimation extends Operator {
  static operatorName = "timeline_player.pause_animation";
  static operatorLabel = "Pause Timeline";
  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    this.context.signals.scheduleAnimationPlaybackChanged?.dispatch({
      isPlaying: false,
      action: "pause",
    });

    return { status: "FINISHED" };
  }
}

class TimelinePlayer_OP_stopAnimation extends Operator {
  static operatorName = "timeline_player.stop_animation";
  static operatorLabel = "Stop Timeline";
  static operatorOptions = ["REGISTER"];

  constructor(context) {
    super(context);
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    this.context.signals.scheduleAnimationPlaybackChanged?.dispatch({
      isPlaying: false,
      action: "stop",
    });

    this.context.signals.scheduleAnimationReset?.dispatch();

    return { status: "FINISHED" };
  }
}

class TimelinePlayer_OP_setAnimationDate extends Operator {
  static operatorName = "timeline_player.set_animation_date";
  static operatorLabel = "Set Timeline Date";
  static operatorOptions = ["REGISTER"];

  constructor(context, targetDate) {
    super(context);
    this.targetDate = targetDate;
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    const controller = this.context.timelinePlayerController;

    const date = this.targetDate instanceof Date ? this.targetDate : new Date(this.targetDate);

    this.context.signals.scheduleAnimationDateChanged?.dispatch({
      currentDate: date,
      startDate: controller?.startDate ?? null,
      endDate: controller?.endDate ?? null,
      action: "setDate",
    });

    return { status: "FINISHED" };
  }
}

class TimelinePlayer_OP_setAnimationColorScheme extends Operator {
  static operatorName = "timeline_player.set_animation_color_scheme";
  static operatorLabel = "Set Timeline Color Scheme";
  static operatorOptions = ["REGISTER"];

  constructor(context, scheme, mode) {
    super(context);
    this.scheme = scheme;
    this.mode = mode;
  }

  poll() {
    return !!this.context?.timelinePlayerController;
  }

  execute() {
    this.context.signals.scheduleAnimationColorSchemeChanged?.dispatch({
      scheme: this.scheme,
      mode: this.mode,
    });

    return { status: "FINISHED" };
  }
}

export default [
  TimelinePlayer_OP_playAnimation,
  TimelinePlayer_OP_pauseAnimation,
  TimelinePlayer_OP_stopAnimation,
  TimelinePlayer_OP_setAnimationDate,
  TimelinePlayer_OP_setAnimationColorScheme,
];

