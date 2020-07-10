import AVFoundation
print(AVCaptureDevice.devices(for: .video).map { $0.localizedName }.joined(separator: "\n"))