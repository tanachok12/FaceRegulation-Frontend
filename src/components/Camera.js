import React, { useRef, useEffect } from 'react';

function Camera({ onCapture }) {
  const videoRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch(err => {
        console.error("Error accessing the camera: ", err);
      });
  }, []);

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      onCapture(blob);
    }, 'image/jpeg');
  };

  return (
    <div>
      <video ref={videoRef} style={{ width: '320px', height: '240px' }}></video>
      <br />
      <button onClick={capturePhoto}>Capture Photo</button>
    </div>
  );
}

export default Camera;
