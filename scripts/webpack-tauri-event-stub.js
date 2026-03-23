export function listen(channelName, eventCallback) {
  void channelName;
  void eventCallback;
  return Promise.resolve(function unlisten() {});
}
