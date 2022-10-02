# kap-cam

> [Kap](https://github.com/wulkano/kap) plugin - Show a camera while recording

## Install

In the `Kap` menu, go to `Preferences…`, select the `Plugins` pane, find `cam`, and toggle it.

## Usage

Click the `…` icon in the cropper, or right-click the tray icon, then `Plugins`, and make sure `Show Camera` is enabled.

The Camera does not appear until recording is started.

---

## Working

This plugin creates an overlay window showing the selected camera on the bottom-left corner of the recording.

## Misc

This is based off of [kap-camera](https://github.com/karaggeorge/kap-camera/) by [@karaggeorge's](https://github.com/karaggeorge). I wanted a more Loom-like flavour to the UI of this plugin and decided to fork my own.

### TODOs

-   [x] remove active window frame on macOS
-   [x] consolidate camera shape and size options
-   [ ] show camera even when recording is not started (?)

![demo](https://user-images.githubusercontent.com/30227512/193449667-19bd8411-2151-47af-8d9f-2dc5d8205450.gif)
