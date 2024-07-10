import React, { useEffect, useRef, useCallback, useState } from 'react';
import jwtDecode from 'jwt-decode';
import axios from 'axios';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

Modal.setAppElement('#root'); // ระบุ element หลักของแอป

const Home = () => {
  const [user, setUser] = useState(null);
  const [isValidUser, setIsValidUser] = useState(true); // Add this state
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        let video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(error => {
            console.error('Error playing video:', error);
          });
        };
      })
      .catch((err) => {
        console.error('Error accessing the camera', err);
      });
  };

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/png');
      const base64Image = imageData.split(',')[1]; // Remove the base64 prefix

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      };

      try {
        console.log('Sending request to /check_motion');
        const motionResponse = await axios.post('http://127.0.0.1:5001/check_motion', { image: base64Image }, { headers });
        console.log('Received response from /check_motion:', motionResponse.data);

        if (motionResponse.data.motion_detected) {
          console.log('Motion detected: human');
          toast.success('Motion detected: human');

          console.log('Sending request to /check_face');
          const faceResponse = await axios.post('http://127.0.0.1:5001/check_face', { image: base64Image }, { headers });
          console.log('Received response from /check_face:', faceResponse.data);

          console.log('Sending request to /check_face_count');
          const faceCountResponse = await axios.post('http://127.0.0.1:5001/check_face_count', { image: base64Image }, { headers });
          console.log('Received response from /check_face_count:', faceCountResponse.data);

          if (faceResponse.data.error) {
            console.log('Error in /check_face:', faceResponse.data.error);
            toast.error(`Face check error: ${faceResponse.data.error}`);
          } else if (faceCountResponse.data.error) {
            console.log('Error in /check_face_count:', faceCountResponse.data.error);
            toast.error(`Face count error: ${faceCountResponse.data.error}`);
          } else {
            const faceCount = faceCountResponse.data.face_count;
            if (faceCount > 1) {
              toast.error(`More than one face detected: ${faceCount} faces`);
            } else if (faceCount === 0) {
              toast.error('No face detected in the image');
            } else if (faceResponse.data.match) {
              setUser(faceResponse.data.user);
              setIsValidUser(true); // Set as valid user
              setShowModal(false); // ปิด modal หากตรงกัน
              toast.success('User identified successfully');
            } else {
              setUser(null);
              setIsValidUser(false); // Set as invalid user
              setShowModal(true); // แสดง modal หากไม่ตรงกัน
              toast.error('Face mismatch detected');
            }
          }
        } else {
          console.log('Motion not detected: not a human');
          toast.error('Motion not detected: not a human');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred during identification');
      }
    }
  }, []);

  useEffect(() => {
    startVideo();
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = jwtDecode(token);
      console.log('Decoded token:', decodedToken);
    }

    const intervalId = setInterval(handleCapture, 3000); // Capture every 3 seconds
    return () => clearInterval(intervalId);
  }, [handleCapture]);

  return (
    <div>
      <h2>Home</h2>
      <video ref={videoRef} style={{ width: '50%' }} />
      {user ? (
        <div>
          <h3>Identified User:</h3>
          <p>{user.first_name} {user.last_name}</p>
          <p>{user.email}</p>
        </div>
      ) : (
        isValidUser ? (
          <p>No match found</p>
        ) : (
          <p>Invalid User</p>
        )
      )}
      <Modal
        isOpen={showModal}
        onRequestClose={() => setShowModal(false)}
        contentLabel="Face Mismatch Warning"
      >
        <h2>Face Mismatch</h2>
        <p>The face detected does not match the registered user.</p>
        <button onClick={() => setShowModal(false)}>Close</button>
      </Modal>
      <ToastContainer />
    </div>
  );
};

export default Home;
