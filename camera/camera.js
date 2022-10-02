const electron = require('electron');
const { ipcRenderer } = electron;

const video = document.querySelector('#preview');

ipcRenderer.on('data', (_, {
	videoDeviceName,
	hoverOpacity,
	borderRadius
}) => {
	const css = `
      video {
        border-radius: ${borderRadius};
      }

      video:hover {
        opacity: ${hoverOpacity};
      }
    `;

	const style = document.createElement('style');
	style.appendChild(document.createTextNode(css));
	document.querySelector('head').appendChild(style);

	navigator.mediaDevices.enumerateDevices().then(devices => {
		const videoDevices = devices.filter(d => d.kind === 'videoinput');
		const [defaultDevice] = videoDevices;

		const device = (
			videoDeviceName && videoDevices.find(d => d.label.includes(videoDeviceName))
		) || defaultDevice;

		if (!device) {
			ipcRenderer.send('kap-camera-mount');
			return;
		}

		const { deviceId } = device;

		let errorCallback = (error) => {
			console.log(
				'There was an error connecting to the video stream:', error
			);
		};

		window.navigator.webkitGetUserMedia(
			{ video: true },
			(localMediaStream) => {
				video.src = window.URL.createObjectURL(localMediaStream);
				video.onloadedmetadata = bindSavingPhoto;
			}, errorCallback);

		navigator.mediaDevices.getUserMedia({ video: { deviceId } }).then(stream => {
			video.srcObject = stream;
			ipcRenderer.send('kap-camera-mount');
		}).catch(() => ipcRenderer.send('kap-camera-mount'));
	}).catch(() => ipcRenderer.send('kap-camera-mount'));
})