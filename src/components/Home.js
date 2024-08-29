import React, { useEffect, useRef, useCallback, useState } from 'react';
import jwtDecode from 'jwt-decode';
import axios from 'axios';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

Modal.setAppElement('#root'); // ระบุ element หลักของแอป

const Home = () => {
  const [user, setUser] = useState(null);
  const [isValidUser, setIsValidUser] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(""); // State for modal message
  const videoRef = useRef(null);
  const previousFrameRef = useRef(null);

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
      const base64Image = imageData.split(',')[1];

      // ตรวจจับการเคลื่อนไหว
      const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
      if (previousFrameRef.current) {
        const diff = calculateFrameDifference(previousFrameRef.current, currentFrame);
        if (diff < 10) { // someThreshold - ปรับแต่ง threshold ตามความเหมาะสม
          console.log('No significant motion detected, skipping...');
          return;
        }
      }
      previousFrameRef.current = currentFrame;

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      };

      try {
        console.log('Sending request to /check_motion');
        const motionResponse = await axios.post('http://103.29.189.112:80/check_motion', { image: base64Image }, { headers });
        console.log('Received response from /check_motion:', motionResponse.data);
  
        if (motionResponse.data.motion_detected) {
          console.log('Motion detected: human');
          toast.success('ตรวจพบการเคลื่อนไหว: มนุษย์');
  
          console.log('Sending request to /check_face');
          const faceResponse = await axios.post('http://103.29.189.112:80/check_face', { image: base64Image }, { headers });
          console.log('Received response from /check_face:', faceResponse.data);
  
          console.log('Sending request to /check_face_count');
          const faceCountResponse = await axios.post('http://103.29.189.112:80/check_face_count', { image: base64Image }, { headers });
          console.log('Received response from /check_face_count:', faceCountResponse.data);
  
          if (faceResponse.data.error) {
            console.log('Error in /check_face:', faceResponse.data.error);
            toast.error(`ข้อผิดพลาดในการตรวจสอบใบหน้า: ${faceResponse.data.error}`);
            if (faceResponse.data.error === "No blink detected") {
              setModalMessage("กรุณากระพริบตา");
              setShowModal(true);
            }
          } else if (faceCountResponse.data.error) {
            console.log('Error in /check_face_count:', faceCountResponse.data.error);
            toast.error(`ข้อผิดพลาดในการตรวจนับใบหน้า: ${faceCountResponse.data.error}`);
          } else {
            const faceCount = faceCountResponse.data.face_count;
            if (faceCount > 1) {
              toast.error(`ตรวจพบใบหน้ามากกว่าหนึ่งใบหน้า: ${faceCount} ใบหน้า`);
            } else if (faceCount === 0) {
              toast.error('ไม่พบใบหน้าในภาพ');
            } else if (faceResponse.data.match) {
              setUser(faceResponse.data.user);
              setIsValidUser(true);
              setShowModal(false);
              toast.success('ยืนยันตัวตนผู้ใช้สำเร็จ');
            } else {
              setUser(null);
              setIsValidUser(false);
              setModalMessage("ตรวจพบความไม่ตรงกันของใบหน้า");
              setShowModal(true);
              toast.error('ตรวจพบความไม่ตรงกันของใบหน้า');
            }
          }
        } else {
          console.log('Motion not detected: not a human');
          toast.error('ไม่พบการเคลื่อนไหว: ไม่ใช่มนุษย์');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }, []);

  function calculateFrameDifference(frame1, frame2) {
    let diff = 0;
    for (let i = 0; i < frame1.data.length; i += 4) {
      diff += Math.abs(frame1.data[i] - frame2.data[i]);
      diff += Math.abs(frame1.data[i + 1] - frame2.data[i + 1]);
      diff += Math.abs(frame1.data[i + 2] - frame2.data[i + 2]);
    }
    return diff / (frame1.data.length / 4);
  }

  useEffect(() => {
    startVideo();
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = jwtDecode(token);
      console.log('Decoded token:', decodedToken);
    }

    const intervalId = setInterval(handleCapture, 5000);
    return () => clearInterval(intervalId);
  }, [handleCapture]);

  return (
    <div>
      <h2>Home</h2>
      <video ref={videoRef} style={{ width: '50%' }} />
      {user ? (
        <div>
          <h3>ผู้ใช้ที่ยืนยันตัวตน:</h3>
          <p>{user.first_name} {user.last_name}</p>
          <p>{user.email}</p>
        </div>
      ) : (
        isValidUser ? (
          <p>ไม่พบการจับคู่</p>
        ) : (
          <p>ผู้ใช้ไม่ถูกต้อง</p>
        )
      )}
      <Modal
        isOpen={showModal}
        onRequestClose={() => setShowModal(false)}
        contentLabel="การแจ้งเตือนความไม่ตรงกันของใบหน้า"
        style={{
          content: {
            width: '300px',
            height: '200px',
            margin: 'auto',
            textAlign: 'center'
          }
        }}
      >
        <h2>{modalMessage}</h2>
        <button onClick={() => setShowModal(false)}>ปิด</button>
      </Modal>
      <ToastContainer />
    </div>
  );
};

export default Home;
