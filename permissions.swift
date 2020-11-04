import AVFoundation

if AVCaptureDevice.authorizationStatus(for: .video) ==  .authorized {
  print("true")
  exit(0)
} else {
  AVCaptureDevice.requestAccess(for: .video, completionHandler: { (granted: Bool) in
      if granted {
          print("true")
          exit(0)
      } else {
          print("false")
          exit(0)
      }
  })
}

RunLoop.main.run()
