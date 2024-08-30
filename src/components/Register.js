import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css'; // Import the CSS file

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [confirmedPhoto, setConfirmedPhoto] = useState(null); // State to store confirmed photo
  const [showVideo, setShowVideo] = useState(true); // State to control video display
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (showVideo) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("error:", err));
    }
  }, [showVideo]); // Re-run the effect if showVideo changes

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');
    setPreviewPhoto(dataURL);
    setShowVideo(false); // Hide the video after capturing the photo
  };

  const confirmCapturedPhoto = () => {
    setPhotos([...photos, previewPhoto]);
    setConfirmedPhoto(previewPhoto); // Store the confirmed photo
    setPreviewPhoto(null);
  };

  const changePhoto = () => {
    setPreviewPhoto(null);
    setConfirmedPhoto(null); // Clear confirmed photo
    setShowVideo(true); // Show the video again to capture a new photo
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmedPhoto) {
      setMessage('Please capture and confirm a photo.');
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('email', email);
    formData.append('password', password);
  
    photos.forEach((photo, index) => {
      const byteString = atob(photo.split(',')[1]);
      const mimeString = photo.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      formData.append('image', blob, `photo${index}.png`);
    });
  
    try {
      const response = await axios.post('https://103.29.189.112/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      if (response.status === 201) {
        setMessage('Registration successful!');
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          navigate('/login');
        }, 3000);
      } else {
        setMessage('Registration failed. Please try again.');
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 3000);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setMessage('Error during registration. Please try again.');
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required />
        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        {showVideo && <button type="button" onClick={capturePhoto}>Capture Photo</button>}
        {previewPhoto && (
          <div>
            <h3>Preview</h3>
            <img src={previewPhoto} alt="Preview" style={{ width: '320px', height: '240px', border: '1px solid black' }} />
            <button type="button" onClick={confirmCapturedPhoto}>Confirm Photo</button>
            <button type="button" onClick={changePhoto}>Change Photo</button>
          </div>
        )}
        {confirmedPhoto && !previewPhoto && (
          <div>
            <h3>Confirmed Photo</h3>
            <img src={confirmedPhoto} alt="Confirmed" style={{ width: '320px', height: '240px', border: '1px solid black' }} />
            <button type="button" onClick={changePhoto}>Change Photo</button>
          </div>
        )}
        <button type="submit">Register</button>
      </form>
      {showVideo && <video ref={videoRef} style={{ width: '640px', height: '480px', border: '1px solid black' }} autoPlay></video>}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }}></canvas>
      {showPopup && <div className="popup">{message}</div>}
    </div>
  );
};

export default Register;
